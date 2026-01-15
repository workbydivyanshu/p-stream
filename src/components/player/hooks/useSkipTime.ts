import { useEffect, useState } from "react";

// import { proxiedFetch } from "@/backend/helpers/fetch";
import { mwFetch, proxiedFetch } from "@/backend/helpers/fetch";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";
import { getTurnstileToken } from "@/utils/turnstile";

// Thanks Nemo for this API
const THE_INTRO_DB_BASE_URL = "https://api.theintrodb.org/v1";
// const QUICKWATCH_BASE_URL = "https://skips.quickwatch.co";
const FED_SKIPS_BASE_URL = "https://fed-skips.pstream.mov";
// const VELORA_BASE_URL = "https://veloratv.ru/api/intro-end/confirmed";
const INTRODB_BASE_URL = "https://api.introdb.app/intro";
const MAX_RETRIES = 3;

// Track the source of the current skip time (for analytics filtering)
let currentSkipTimeSource:
  | "fed-skips"
  | "introdb"
  | "theintrodb"
  // | "quickwatch"
  | null = null;

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

        // Add intro segment if it has data
        if (data?.intro && data.intro.submission_count > 0) {
          fetchedSegments.push({
            type: "intro",
            start_ms: data.intro.start_ms,
            end_ms: data.intro.end_ms,
            confidence: data.intro.confidence,
            submission_count: data.intro.submission_count,
          });
        }

        // Add recap segment if it has data
        if (data?.recap && data.recap.submission_count > 0) {
          fetchedSegments.push({
            type: "recap",
            start_ms: data.recap.start_ms,
            end_ms: data.recap.end_ms,
            confidence: data.recap.confidence,
            submission_count: data.recap.submission_count,
          });
        }

        // Add credits segment if it has data
        if (data?.credits && data.credits.submission_count > 0) {
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

    // const fetchVeloraSkipTime = async (): Promise<number | null> => {
    //   if (!meta?.tmdbId) return null;

    //   try {
    //     let apiUrl = `${VELORA_BASE_URL}?tmdbId=${meta.tmdbId}`;
    //     if (meta.type !== "movie") {
    //       apiUrl += `&season=${meta.season?.number}&episode=${meta.episode?.number}`;
    //     }
    //     const data = await proxiedFetch(apiUrl);

    //     if (data.introSkippable && typeof data.introEnd === "number") {
    //       return data.introEnd;
    //     }

    //     return null;
    //   } catch (error) {
    //     console.error("Error fetching velora skip time:", error);
    //     return null;
    //   }
    // };

    // const fetchQuickWatchTime = async (): Promise<number | null> => {
    //   if (!meta?.title || meta.type === "movie") return null;
    //   if (!meta.season?.number || !meta.episode?.number) return null;

    //   try {
    //     const encodedName = encodeURIComponent(meta.title);
    //     const apiUrl = `${QUICKWATCH_BASE_URL}/api/skip-times?name=${encodedName}&season=${meta.season.number}&episode=${meta.episode.number}`;

    //     const data = await proxiedFetch(apiUrl);

    //     if (!Array.isArray(data) || data.length === 0) return null;

    //     // Find the first result with intro or credits data
    //     for (const item of data) {
    //       if (item.data) {
    //         // Check for intro end time
    //         if (
    //           item.data.intro?.end &&
    //           typeof item.data.intro.end === "number"
    //         ) {
    //           // Convert milliseconds to seconds
    //           return Math.floor(item.data.intro.end / 1000);
    //         }
    //         // Check for credits start time (use as intro end)
    //         if (
    //           item.data.credits?.start &&
    //           typeof item.data.credits.start === "number"
    //         ) {
    //           // Convert milliseconds to seconds
    //           return Math.floor(item.data.credits.start / 1000);
    //         }
    //       }
    //     }

    //     return null;
    //   } catch (error) {
    //     console.error("Error fetching QuickWatch time:", error);
    //     return null;
    //   }
    // };

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
      if (theIntroDBSegments.length > 0) {
        currentSkipTimeSource = "theintrodb";
        setSegments(theIntroDBSegments);
        return;
      }

      // QuickWatch API disabled
      // const quickWatchTime = await fetchQuickWatchTime();
      // if (quickWatchTime !== null) {
      //   currentSkipTimeSource = "quickwatch";
      //   setSegments([
      //     {
      //       type: "intro",
      //       start_ms: 0, // Assume starts at beginning
      //       end_ms: quickWatchTime * 1000, // Convert seconds to milliseconds
      //       confidence: null,
      //       submission_count: 1,
      //     },
      //   ]);
      //   return;
      // }

      // Fall back to Fed-skips if TheIntroDB and QuickWatch don't have anything
      // Note: Fed-skips only supports TV shows, not movies
      if (febboxKey && meta?.type !== "movie") {
        const fedSkipsTime = await fetchFedSkipsTime();
        if (fedSkipsTime !== null) {
          currentSkipTimeSource = "fed-skips";
          setSegments([
            {
              type: "intro",
              start_ms: 0, // Assume starts at beginning
              end_ms: fedSkipsTime * 1000, // Convert seconds to milliseconds
              confidence: null,
              submission_count: 1,
            },
          ]);
          return;
        }
      }

      // Last resort: Fall back to IntroDB API (TV shows only, available to all users)
      const introDBTime = await fetchIntroDBTime();
      if (introDBTime !== null) {
        currentSkipTimeSource = "introdb";
        setSegments([
          {
            type: "intro",
            start_ms: 0, // Assume starts at beginning
            end_ms: introDBTime * 1000, // Convert seconds to milliseconds
            confidence: null,
            submission_count: 1,
          },
        ]);
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
