import { conf } from "@/setup/config";
import { SimpleCache } from "@/utils/cache";
import { getTurnstileToken } from "@/utils/turnstile";

import { getMediaDetails } from "./tmdb";
import { TMDBContentTypes, TMDBMovieData } from "./types/tmdb";
import type {
  CuratedMovieList,
  TraktListResponse,
  TraktNetworkResponse,
  TraktReleaseResponse,
} from "./types/trakt";

export const TRAKT_BASE_URL = "https://fed-airdate.pstream.mov";

// Map provider names to their Trakt endpoints
export const PROVIDER_TO_TRAKT_MAP = {
  "8": "netflixmovies", // Netflix Movies
  "8tv": "netflixtv", // Netflix TV Shows
  "2": "applemovie", // Apple TV+ Movies
  "2tv": "appletv", // Apple TV+ (both)
  "10": "primemovies", // Prime Video Movies
  "10tv": "primetv", // Prime Video TV Shows
  "15": "hulumovies", // Hulu Movies
  "15tv": "hulutv", // Hulu TV Shows
  "337": "disneymovies", // Disney+ Movies
  "337tv": "disneytv", // Disney+ TV Shows
  "1899": "hbomovies", // Max Movies
  "1899tv": "hbotv", // Max TV Shows
  "531": "paramountmovies", // Paramount+ Movies
  "531tv": "paramounttv", // Paramount+ TV Shows
} as const;

// Map provider names to their image filenames
export const PROVIDER_TO_IMAGE_MAP: Record<string, string> = {
  Max: "max",
  "Prime Video": "prime",
  Netflix: "netflix",
  "Disney+": "disney",
  Hulu: "hulu",
  "Apple TV+": "appletv",
  "Paramount+": "paramount",
};

// Cache for Trakt API responses
interface TraktCacheKey {
  endpoint: string;
}

const traktCache = new SimpleCache<TraktCacheKey, any>();
traktCache.setCompare((a, b) => a.endpoint === b.endpoint);
traktCache.initialize();

// Authentication state - only track concurrent requests
let isAuthenticating = false;
let authToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * Clears the authentication token
 */
function clearAuthToken(): void {
  authToken = null;
  tokenExpiry = null;
  localStorage.removeItem("trakt_auth_token");
  localStorage.removeItem("trakt_token_expiry");
}

/**
 * Stores the authentication token in memory and localStorage
 */
function storeAuthToken(token: string, expiresAt: string): void {
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    console.error("Invalid expiry date format:", expiresAt);
    return;
  }

  authToken = token;
  tokenExpiry = expiryDate;

  // Store in localStorage for persistence
  localStorage.setItem("trakt_auth_token", token);
  localStorage.setItem("trakt_token_expiry", expiresAt);
}

/**
 * Checks if user is authenticated by checking token validity
 */
function isAuthenticated(): boolean {
  // Check memory first
  if (authToken && tokenExpiry && tokenExpiry > new Date()) {
    return true;
  }

  // Check localStorage
  const storedToken = localStorage.getItem("trakt_auth_token");
  const storedExpiry = localStorage.getItem("trakt_token_expiry");

  if (storedToken && storedExpiry) {
    const expiryDate = new Date(storedExpiry);
    if (expiryDate > new Date()) {
      authToken = storedToken;
      tokenExpiry = expiryDate;
      return true;
    }
    // Token expired, clear it
    clearAuthToken();
  }

  return false;
}

/**
 * Authenticates with the Trakt API using Cloudflare Turnstile
 * Stores the auth token for use in API requests
 */
async function authenticateWithTurnstile(): Promise<void> {
  // Prevent concurrent authentication attempts
  if (isAuthenticating) {
    // Wait for existing authentication to complete
    await new Promise<void>((resolve) => {
      const checkAuth = () => {
        if (!isAuthenticating) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
    return;
  }

  isAuthenticating = true;

  try {
    const turnstileToken = await getTurnstileToken("0x4AAAAAAB6ocCCpurfWRZyC");

    // Authenticate with the API
    const response = await fetch(`${TRAKT_BASE_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: turnstileToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Authentication failed");
    }

    // Store the auth token
    storeAuthToken(result.auth_token, result.expires_at);
  } finally {
    isAuthenticating = false;
  }
}

// Base function to fetch from Trakt API
async function fetchFromTrakt<T = TraktListResponse>(
  endpoint: string,
): Promise<T> {
  // Check if Trakt is enabled
  if (!conf().ENABLE_TRAKT) {
    throw new Error("Trakt API is not enabled, using tmdb lists instead.");
  }

  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as T;
  }

  // Ensure we're authenticated
  if (!isAuthenticated()) {
    await authenticateWithTurnstile();
  }

  // Make the API request with authorization header
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response = await fetch(`${TRAKT_BASE_URL}${endpoint}`, {
    headers,
  });

  // If request fails, try re-authenticating and retry once
  if (!response.ok) {
    // If 401, clear token and re-authenticate
    if (response.status === 401) {
      clearAuthToken();
    }

    // Re-authenticate and retry
    await authenticateWithTurnstile();

    // Rebuild headers after re-authentication
    const retryHeaders: Record<string, string> = {};
    if (authToken) {
      retryHeaders.Authorization = `Bearer ${authToken}`;
    }

    response = await fetch(`${TRAKT_BASE_URL}${endpoint}`, {
      headers: retryHeaders,
    });

    // If retry also fails, throw error
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from ${endpoint}: ${response.statusText}`,
      );
    }
  }

  const result = await response.json();

  // Cache the result for 1 hour (3600 seconds)
  traktCache.set(cacheKey, result, 3600);

  return result as T;
}

// Release details
export async function getReleaseDetails(
  id: string,
  season?: number,
  episode?: number,
): Promise<TraktReleaseResponse> {
  let url = `/release/${id}`;
  if (season !== undefined && episode !== undefined) {
    url += `/${season}/${episode}`;
  }

  // Check if Trakt is enabled
  if (!conf().ENABLE_TRAKT) {
    throw new Error("Trakt API is not enabled");
  }

  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint: url };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as TraktReleaseResponse;
  }

  // Ensure we're authenticated
  if (!isAuthenticated()) {
    await authenticateWithTurnstile();
  }

  // Make the API request with authorization header
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response = await fetch(`${TRAKT_BASE_URL}${url}`, {
    headers,
  });

  // If request fails, try re-authenticating and retry once
  if (!response.ok) {
    // If 401, clear token and re-authenticate
    if (response.status === 401) {
      clearAuthToken();
    }

    // Re-authenticate and retry
    await authenticateWithTurnstile();

    // Rebuild headers after re-authentication
    const retryHeaders: Record<string, string> = {};
    if (authToken) {
      retryHeaders.Authorization = `Bearer ${authToken}`;
    }

    response = await fetch(`${TRAKT_BASE_URL}${url}`, {
      headers: retryHeaders,
    });

    // If retry also fails, throw error
    if (!response.ok) {
      throw new Error(
        `Failed to fetch release details: ${response.statusText}`,
      );
    }
  }

  const result = await response.json();

  // Cache the result for 1 hour (3600 seconds)
  traktCache.set(cacheKey, result, 3600);

  return result as TraktReleaseResponse;
}

// Latest releases
export const getLatestReleases = () => fetchFromTrakt("/latest");
export const getLatest4KReleases = () => fetchFromTrakt("/latest4k");
export const getLatestTVReleases = () => fetchFromTrakt("/latesttv");

// Streaming service releases
export const getAppleTVReleases = () => fetchFromTrakt("/appletv");
export const getAppleMovieReleases = () => fetchFromTrakt("/applemovie");
export const getNetflixMovies = () => fetchFromTrakt("/netflixmovies");
export const getNetflixTVShows = () => fetchFromTrakt("/netflixtv");
export const getPrimeMovies = () => fetchFromTrakt("/primemovies");
export const getPrimeTVShows = () => fetchFromTrakt("/primetv");
export const getHuluMovies = () => fetchFromTrakt("/hulumovies");
export const getHuluTVShows = () => fetchFromTrakt("/hulutv");
export const getDisneyMovies = () => fetchFromTrakt("/disneymovies");
export const getDisneyTVShows = () => fetchFromTrakt("/disneytv");
export const getHBOMovies = () => fetchFromTrakt("/hbomovies");
export const getHBOTVShows = () => fetchFromTrakt("/hbotv");
export const getParamountMovies = () => fetchFromTrakt("/paramountmovies");
export const getParamountTVShows = () => fetchFromTrakt("/paramounttv");

// Popular content
export const getPopularTVShows = () => fetchFromTrakt("/populartv");
export const getPopularMovies = () => fetchFromTrakt("/popularmovies");

// Discovery content used for the featured carousel
export const getDiscoverContent = () =>
  fetchFromTrakt<TraktListResponse>("/discover");

// Network information
export const getNetworkContent = (tmdbId: string) =>
  fetchFromTrakt<TraktNetworkResponse>(`/network/${tmdbId}`);

// Curated movie lists
export const getNarrativeMovies = () => fetchFromTrakt("/narrative");
export const getTopMovies = () => fetchFromTrakt("/top");
export const getLifetimeMovies = () => fetchFromTrakt("/lifetime");
export const getNeverHeardMovies = () => fetchFromTrakt("/never");
export const getLGBTQContent = () => fetchFromTrakt("/LGBTQ");
export const getMindfuckMovies = () => fetchFromTrakt("/mindfuck");
export const getTrueStoryMovies = () => fetchFromTrakt("/truestory");
export const getHalloweenMovies = () => fetchFromTrakt("/halloween");
// export const getGreatestTVShows = () => fetchFromTrakt("/greatesttv"); // We only have movies set up. TODO add more tv routes for curated lists so we can have a new page.

// Get all curated movie lists
export const getCuratedMovieLists = async (): Promise<CuratedMovieList[]> => {
  const listConfigs = [
    {
      name: "Halloween Movies",
      slug: "halloween",
      endpoint: "/halloween",
    },
    {
      name: "Letterboxd Top 250 Narrative Feature Films",
      slug: "narrative",
      endpoint: "/narrative",
    },
    {
      name: "1001 Greatest Movies of All Time",
      slug: "top",
      endpoint: "/top",
    },
    {
      name: "1001 Movies You Must See Before You Die",
      slug: "lifetime",
      endpoint: "/lifetime",
    },
    {
      name: "Great Movies You May Have Never Heard Of",
      slug: "never",
      endpoint: "/never",
    },
    {
      name: "LGBT Movies/Shows",
      slug: "LGBTQ",
      endpoint: "/LGBTQ",
    },
    {
      name: "Best Mindfuck Movies",
      slug: "mindfuck",
      endpoint: "/mindfuck",
    },
    {
      name: "Based on a True Story Movies",
      slug: "truestory",
      endpoint: "/truestory",
    },
    // {
    //   name: "Rolling Stone's 100 Greatest TV Shows",
    //   slug: "greatesttv",
    //   endpoint: "/greatesttv",
    // },
  ];

  const lists: CuratedMovieList[] = [];

  for (const listConfig of listConfigs) {
    try {
      const response = await fetchFromTrakt(listConfig.endpoint);
      lists.push({
        listName: listConfig.name,
        listSlug: listConfig.slug,
        tmdbIds: response.movie_tmdb_ids.slice(0, 30), // Limit to first 30 items
        count: Math.min(response.movie_tmdb_ids.length, 30), // Update count to reflect the limit
      });
    } catch (error) {
      console.error(`Failed to fetch ${listConfig.name}:`, error);
    }
  }

  return lists;
};

// Fetch movie details for multiple TMDB IDs
export const getMovieDetailsForIds = async (
  tmdbIds: number[],
  limit: number = 50,
): Promise<TMDBMovieData[]> => {
  const limitedIds = tmdbIds.slice(0, limit);
  const movieDetails: TMDBMovieData[] = [];

  // Process in smaller batches to avoid overwhelming the API
  const batchSize = 10;
  const batchPromises: Promise<TMDBMovieData[]>[] = [];

  for (let i = 0; i < limitedIds.length; i += batchSize) {
    const batch = limitedIds.slice(i, i + batchSize);
    const batchPromise = Promise.all(
      batch.map(async (id) => {
        try {
          const details = await getMediaDetails(
            id.toString(),
            TMDBContentTypes.MOVIE,
          );
          return details as TMDBMovieData;
        } catch (error) {
          console.error(`Failed to fetch movie details for ID ${id}:`, error);
          return null;
        }
      }),
    ).then((batchResults) =>
      batchResults.filter((result): result is TMDBMovieData => result !== null),
    );
    batchPromises.push(batchPromise);
  }

  // Process all batches in parallel
  const batchResults = await Promise.all(batchPromises);
  movieDetails.push(...batchResults.flat());

  return movieDetails;
};
