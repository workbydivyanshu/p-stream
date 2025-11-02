import { SimpleCache } from "@/utils/cache";

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

// Base function to fetch from Trakt API
async function fetchFromTrakt<T = TraktListResponse>(
  endpoint: string,
): Promise<T> {
  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as T;
  }

  // Make the API request
  const response = await fetch(`${TRAKT_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
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

  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint: url };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as TraktReleaseResponse;
  }

  // Make the API request
  const response = await fetch(`${TRAKT_BASE_URL}${url}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch release details: ${response.statusText}`);
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

  for (const config of listConfigs) {
    try {
      const response = await fetchFromTrakt(config.endpoint);
      lists.push({
        listName: config.name,
        listSlug: config.slug,
        tmdbIds: response.movie_tmdb_ids.slice(0, 30), // Limit to first 30 items
        count: Math.min(response.movie_tmdb_ids.length, 30), // Update count to reflect the limit
      });
    } catch (error) {
      console.error(`Failed to fetch ${config.name}:`, error);
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
  for (let i = 0; i < limitedIds.length; i += batchSize) {
    const batch = limitedIds.slice(i, i + batchSize);
    const batchPromises = batch.map(async (id) => {
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
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(
      (result): result is TMDBMovieData => result !== null,
    );
    movieDetails.push(...validResults);
  }

  return movieDetails;
};
