import { useCallback, useEffect, useRef } from "react";

import { useSkipTracking } from "@/components/player/hooks/useSkipTracking";
import { usePlayerStore } from "@/stores/player/store";

/**
 * Component that tracks and reports completed skip sessions to analytics backend.
 * Sessions are detected when users accumulate 30+ seconds of forward movement
 * within a 5-second window and end after 8 seconds of no activity.
 * Ignores skips that start after 20% of video duration (unlikely to be intro skipping).
 */
export function SkipTracker() {
  const { latestSkip } = useSkipTracking(30);
  const lastLoggedSkipRef = useRef<number>(0);

  // Player metadata for context
  const meta = usePlayerStore((s) => s.meta);
  const turnstileToken = "";

  const sendSkipAnalytics = useCallback(async () => {
    if (!latestSkip) return;

    try {
      await fetch("https://skips.pstream.mov/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: latestSkip.startTime,
          end_time: latestSkip.endTime,
          skip_duration: latestSkip.skipDuration,
          content_id: meta?.tmdbId,
          content_type: meta?.type,
          season_id: meta?.season?.tmdbId,
          episode_id: meta?.episode?.tmdbId,
          turnstile_token: turnstileToken ?? "",
        }),
      });
    } catch (error) {
      console.error("Failed to send skip analytics:", error);
    }
  }, [latestSkip, meta]);

  useEffect(() => {
    if (!latestSkip || !meta) return;

    // Avoid processing the same skip multiple times
    if (latestSkip.timestamp === lastLoggedSkipRef.current) return;

    // Log completed skip session
    // eslint-disable-next-line no-console
    console.log(`Skip session completed: ${latestSkip.skipDuration}s total`);

    // Send analytics data to backend
    sendSkipAnalytics();

    lastLoggedSkipRef.current = latestSkip.timestamp;
  }, [latestSkip, meta, sendSkipAnalytics]);

  return null;
}
