import classNames from "classnames";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { NextEpisodeButton } from "@/components/player/atoms/NextEpisodeButton";
import { SegmentData } from "@/components/player/hooks/useSkipTime";
import { useSkipTracking } from "@/components/player/hooks/useSkipTracking";
import { Transition } from "@/components/utils/Transition";
import { PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";

function getSegmentText(
  type: "intro" | "recap" | "credits",
  t: (key: string) => string,
): string {
  switch (type) {
    case "intro":
      return t("player.skipTime.intro");
    case "recap":
      return t("player.skipTime.recap");
    case "credits":
      return t("player.skipTime.credits");
    default:
      return t("player.skipTime.intro");
  }
}

function shouldShowSkipButton(
  currentTime: number,
  segment: SegmentData | null,
): "always" | "hover" | "none" {
  if (!segment) return "none";

  // Convert current time to milliseconds for comparison
  const currentTimeMs = currentTime * 1000;

  // Handle start time (null means 0/start of video)
  const startMs = segment.start_ms ?? 0;

  // Handle end time (null means end of video, so we show until the end)
  const endMs = segment.end_ms ?? Infinity;

  // Check if current time is within the segment
  if (currentTimeMs >= startMs && currentTimeMs <= endMs) {
    // Show "always" for the first 10 seconds of the segment, then "hover"
    const timeInSegment = currentTimeMs - startMs;
    if (timeInSegment <= 10000) return "always"; // First 10 seconds
    return "hover";
  }

  return "none";
}

function Button(props: {
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        "font-bold rounded h-10 w-40 scale-95 hover:scale-100 transition-all duration-200",
        props.className,
      )}
      type="button"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function SkipSegmentButton(props: {
  controlsShowing: boolean;
  segments: SegmentData[];
  inControl: boolean;
  onChangeMeta?: (meta: PlayerMeta) => void;
}) {
  const { t } = useTranslation();
  const time = usePlayerStore((s) => s.progress.time);
  const _duration = usePlayerStore((s) => s.progress.duration);
  const status = usePlayerStore((s) => s.status);
  const display = usePlayerStore((s) => s.display);
  const meta = usePlayerStore((s) => s.meta);
  const { addSkipEvent } = useSkipTracking(20);

  // Check if we should show NextEpisodeButton instead of credits skip button
  const shouldShowNextEpisodeInsteadOfCredits =
    meta?.type === "show" &&
    props.segments.some((segment) => {
      if (segment.type !== "credits") return false;
      // Show NextEpisodeButton if credits end at video end (null means end of video)
      return segment.end_ms === null;
    });

  // Find segments that should be shown at the current time
  const activeSegments = props.segments.filter((segment) => {
    // Skip credits segments if we're showing NextEpisodeButton instead
    if (segment.type === "credits" && shouldShowNextEpisodeInsteadOfCredits) {
      return false;
    }
    const showingState = shouldShowSkipButton(time, segment);
    return showingState !== "none";
  });

  const handleSkip = useCallback(
    (segment: SegmentData) => {
      if (!display) return;

      const startTime = time;
      // Skip to the end of the segment (or end of video if end_ms is null)
      const targetTime = segment.end_ms ? segment.end_ms / 1000 : _duration;
      const skipDuration = targetTime - startTime;
      display.setTime(targetTime);

      // Add manual skip event with high confidence (user explicitly clicked skip)
      addSkipEvent({
        startTime,
        endTime: targetTime,
        skipDuration,
        confidence: 0.95, // High confidence for explicit user action
        meta: meta
          ? {
              title:
                meta.type === "show" && meta.episode
                  ? `${meta.title} - S${meta.season?.number || 0}E${meta.episode.number || 0}`
                  : meta.title,
              type: meta.type === "movie" ? "Movie" : "TV Show",
              tmdbId: meta.tmdbId,
              seasonNumber: meta.season?.number,
              episodeNumber: meta.episode?.number,
            }
          : undefined,
      });

      // eslint-disable-next-line no-console
      console.log(`Skip ${segment.type} button used: ${skipDuration}s total`);
    },
    [display, time, _duration, addSkipEvent, meta],
  );

  // Show NextEpisodeButton instead of credits skip button for TV shows when credits end at video end
  if (shouldShowNextEpisodeInsteadOfCredits && props.inControl) {
    return (
      <NextEpisodeButton
        controlsShowing={props.controlsShowing}
        onChange={props.onChangeMeta}
        inControl={props.inControl}
      />
    );
  }

  if (!props.inControl || activeSegments.length === 0) return null;

  // If status is not playing, don't show buttons
  if (status !== "playing") return null;

  return (
    <div className="absolute right-[calc(3rem+env(safe-area-inset-right))] bottom-0">
      {activeSegments.map((segment, index) => {
        const showingState = shouldShowSkipButton(time, segment);
        const animation = showingState === "hover" ? "slide-up" : "fade";

        let bottom = "bottom-[calc(6rem+env(safe-area-inset-bottom))]";
        if (showingState === "always") {
          bottom = props.controlsShowing
            ? bottom
            : "bottom-[calc(3rem+env(safe-area-inset-bottom))]";
        }

        // Offset multiple buttons vertically
        const verticalOffset = index * 60; // 60px spacing between buttons
        const adjustedBottom = bottom.replace(
          /bottom-\[calc\(([^)]+)\)\]/,
          `bottom-[calc($1 + ${verticalOffset}px)]`,
        );

        let show = false;
        if (showingState === "always") show = true;
        else if (showingState === "hover" && props.controlsShowing) show = true;

        return (
          <Transition
            key={segment.type}
            animation={animation}
            show={show}
            className="absolute right-0"
          >
            <div
              className={classNames([
                "absolute bottom-0 right-0 transition-[bottom] duration-200 flex items-center space-x-3",
                adjustedBottom,
              ])}
            >
              <Button
                onClick={() => handleSkip(segment)}
                className="bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText flex justify-center items-center"
              >
                <Icon className="text-xl mr-1" icon={Icons.SKIP_EPISODE} />
                {getSegmentText(segment.type, t)}
              </Button>
            </div>
          </Transition>
        );
      })}
    </div>
  );
}

export { SkipSegmentButton };
