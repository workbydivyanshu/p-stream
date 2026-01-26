import { useEffect, useState } from "react";

// import { proxiedFetch } from "@/backend/helpers/fetch";
import { mwFetch, proxiedFetch } from "@/backend/helpers/fetch";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";
import { getTurnstileToken } from "@/utils/turnstile";

// Thanks Nemo for this API
const THE_INTRO_DB_BASE_URL = "https://api.theintrodb.org/v1";
const FED_SKIPS_BASE_URL = "https://fed-skips.pstream.mov";
const INTRODB_BASE_URL = "https://api.introdb.app/intro";
const MAX_RETRIES = 3;

// Track the source of the current skip time (for analytics filtering)
let currentSkipTimeSource: "fed-skips" | "introdb" | "theintrodb" | null = null;

export function useSkipTimeSource(): typeof currentSkipTimeSource {
  return currentSkipTimeSource;
}

export interface SegmentData {
  type: "intro" | "recap" | "credits";
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;
  submission_count: number;
}

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const febboxKey = usePreferencesStore((s) => s.febboxKey);

  useEffect(() => {
    // Validate segment data according to rules
    // eslint-disable-next-line camelcase
    const validateSegment = (
      type: "intro" | "recap" | "credits",
      // eslint-disable-next-line camelcase
      start_ms: number | null,
      // eslint-disable-next-line camelcase
      end_ms: number | null,
    ): boolean => {
      // eslint-disable-next-line camelcase
      const start = start_ms ?? 0;
      // eslint-disable-next-line camelcase
      const end = end_ms;

      if (type === "intro") {
        // Intro: end_ms is required, duration must be 0 or 5-200 seconds
        if (end === null) return false;
        const duration = (end - start) / 1000;
        if (duration === 0) return true; // No intro is valid
        return duration >= 5 && duration <= 200;
      }

      if (type === "recap") {
        // Recap: end_ms is required, duration must be 0 or 5-1200 seconds
        if (end === null) return false;
        const duration = (end - start) / 1000;
        if (duration === 0) return true; // No recap is valid
        return duration >= 5 && duration <= 1200;
      }

      if (type === "credits") {
        // Credits: start_ms is required
        // If end_ms is provided, duration must be at least 5 seconds
        // If end_ms is null, credits extend to end of video (valid)
        // eslint-disable-next-line camelcase
        if (start_ms === null) return false;
        if (end === null) return true; // Credits to end of video is valid
        const duration = (end - start) / 1000;
        return duration >= 5;
      }

      return false;
    };

    const fetchTheIntroDBSegments = async (): Promise<SegmentData[]> => {
      if (!meta?.tmdbId) return [];

      try {
        let apiUrl = `${THE_INTRO_DB_BASE_URL}/media?tmdb_id=${meta.tmdbId}`;
        if (
          meta.type !== "movie" &&
          meta.season?.number &&
          meta.episode?.number
        ) {
          apiUrl += `&season=${meta.season.number}&episode=${meta.episode.number}`;
        }

        const data = await mwFetch(apiUrl);

        const fetchedSegments: SegmentData[] = [];

        // Add intro segment if it has valid data
        if (
          data?.intro &&
          data.intro.submission_count > 0 &&
          validateSegment("intro", data.intro.start_ms, data.intro.end_ms)
        ) {
          fetchedSegments.push({
            type: "intro",
            start_ms: data.intro.start_ms,
            end_ms: data.intro.end_ms,
            confidence: data.intro.confidence,
            submission_count: data.intro.submission_count,
          });
        }

        // Add recap segment if it has valid data
        if (
          data?.recap &&
          data.recap.submission_count > 0 &&
          validateSegment("recap", data.recap.start_ms, data.recap.end_ms)
        ) {
          fetchedSegments.push({
            type: "recap",
            start_ms: data.recap.start_ms,
            end_ms: data.recap.end_ms,
            confidence: data.recap.confidence,
            submission_count: data.recap.submission_count,
          });
        }

        // Add credits segment if it has valid data
        if (
          data?.credits &&
          data.credits.submission_count > 0 &&
          validateSegment("credits", data.credits.start_ms, data.credits.end_ms)
        ) {
          fetchedSegments.push({
            type: "credits",
            start_ms: data.credits.start_ms,
            end_ms: data.credits.end_ms,
            confidence: data.credits.confidence,
            submission_count: data.credits.submission_count,
          });
        }

        return fetchedSegments;
      } catch (error) {
        console.error("Error fetching TIDB segments:", error);
        return [];
      }
    };

    const fetchFedSkipsTime = async (retries = 0): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;
      if (!conf().ALLOW_FEBBOX_KEY) return null;
      if (!febboxKey) return null;

      try {
        const apiUrl = `${FED_SKIPS_BASE_URL}/${meta.imdbId}/${meta.season?.number}/${meta.episode?.number}`;

        const turnstileToken = await getTurnstileToken(
          "0x4AAAAAAB6ocCCpurfWRZyC",
        );
        if (!turnstileToken) return null;

        const response = await fetch(apiUrl, {
          headers: {
            "cf-turnstile-response": turnstileToken,
          },
        });

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchFedSkipsTime(retries + 1);
          }
          throw new Error("Fed-skips API request failed");
        }

        const data = await response.json();

        const parseSkipTime = (timeStr: string | undefined): number | null => {
          if (!timeStr || typeof timeStr !== "string") return null;
          const match = timeStr.match(/^(\d+)s$/);
          if (!match) return null;
          return parseInt(match[1], 10);
        };

        const skipTime = parseSkipTime(data.introSkipTime);

        return skipTime;
      } catch (error) {
        console.error("Error fetching fed-skips time:", error);
        return null;
      }
    };

    const fetchIntroDBTime = async (): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;

      try {
        const apiUrl = `${INTRODB_BASE_URL}?imdb_id=${meta.imdbId}&season=${meta.season?.number}&episode=${meta.episode?.number}`;

        const data = await proxiedFetch(apiUrl);

        if (data && typeof data.end_ms === "number") {
          // Convert milliseconds to seconds
          return Math.floor(data.end_ms / 1000);
        }

        return null;
      } catch (error) {
        console.error("Error fetching IntroDB time:", error);
        return null;
      }
    };

    const fetchSkipTime = async (): Promise<void> => {
      // Reset source and segments
      currentSkipTimeSource = null;
      setSegments([]);

      // Try TheIntroDB API first (supports both movies and TV shows with full segment data)
      const theIntroDBSegments = await fetchTheIntroDBSegments();
      const hasIntroSegment = theIntroDBSegments.some(
        (s) => s.type === "intro",
      );
      const nonIntroSegments = theIntroDBSegments.filter(
        (s) => s.type !== "intro",
      );

      // If we have a valid intro from TIDB, use all TIDB segments
      if (hasIntroSegment) {
        currentSkipTimeSource = "theintrodb";
        setSegments(theIntroDBSegments);
        return;
      }

      // If TIDB doesn't have a valid intro, try fallbacks to get intro data
      // But keep any valid recap/credits segments from TIDB
      let fallbackIntroSegment: SegmentData | null = null;

      // Fall back to Fed-skips if TheIntroDB doesn't have intro
      // Note: Fed-skips only supports TV shows, not movies
      if (febboxKey && meta?.type !== "movie") {
        const fedSkipsTime = await fetchFedSkipsTime();
        if (fedSkipsTime !== null) {
          currentSkipTimeSource = "fed-skips";
          fallbackIntroSegment = {
            type: "intro",
            start_ms: 0, // Assume starts at beginning
            end_ms: fedSkipsTime * 1000, // Convert seconds to milliseconds
            confidence: null,
            submission_count: 1,
          };
        }
      }

      // Last resort: Fall back to IntroDB API (TV shows only, available to all users)
      if (!fallbackIntroSegment) {
        const introDBTime = await fetchIntroDBTime();
        if (introDBTime !== null) {
          currentSkipTimeSource = "introdb";
          fallbackIntroSegment = {
            type: "intro",
            start_ms: 0, // Assume starts at beginning
            end_ms: introDBTime * 1000, // Convert seconds to milliseconds
            confidence: null,
            submission_count: 1,
          };
        }
      }

      // Combine fallback intro with any valid TIDB segments (recap/credits)
      const finalSegments: SegmentData[] = [];
      if (fallbackIntroSegment) {
        finalSegments.push(fallbackIntroSegment);
      }
      // Add any valid recap/credits segments from TIDB
      finalSegments.push(...nonIntroSegments);

      if (finalSegments.length > 0) {
        setSegments(finalSegments);
      }
    };

    fetchSkipTime();
  }, [
    meta?.tmdbId,
    meta?.imdbId,
    meta?.title,
    meta?.type,
    meta?.season?.number,
    meta?.episode?.number,
    febboxKey,
  ]);

  return segments;
}
