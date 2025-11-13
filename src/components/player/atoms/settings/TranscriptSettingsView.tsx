import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";

import { Menu } from "@/components/player/internals/ContextMenu";
import { Input } from "@/components/player/internals/ContextMenu/Input";
import { Link } from "@/components/player/internals/ContextMenu/Links";
import {
  captionIsVisible,
  makeQueId,
  parseSubtitles,
  sanitize,
} from "@/components/player/utils/captions";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import { durationExceedsHour, formatSeconds } from "@/utils/formatSeconds";

import { wordOverrides } from "../../Player";

export function TranscriptSettingsView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const display = usePlayerStore((s) => s.display);
  const srtData = usePlayerStore((s) => s.caption.selected?.srtData);
  const language = usePlayerStore((s) => s.caption.selected?.language);
  const delay = useSubtitleStore((s) => s.delay);
  const { duration: timeDuration, time } = usePlayerStore((s) => s.progress);

  const [searchQuery, setSearchQuery] = useState("");

  const parsedCaptions = useMemo(
    () => (srtData ? parseSubtitles(srtData, language) : []),
    [srtData, language],
  );

  const showHours = useMemo(() => {
    return durationExceedsHour(timeDuration);
  }, [timeDuration]);

  const transcriptItems = useMemo(
    () =>
      parsedCaptions.map(({ start, end, content: raw }, i) => {
        const delayedStart = start / 1000 + delay;
        const delayedEnd = end / 1000 + delay;

        const textWithNewlines = (raw || "")
          .split(" ")
          .map((word) => wordOverrides[word] ?? word)
          .join(" ")
          .replaceAll(/ i'/g, " I'")
          .replaceAll("\n", "");

        return {
          key: makeQueId(i, start, end),
          startMs: start,
          endMs: end,
          start: delayedStart,
          end: delayedEnd,
          raw: textWithNewlines,
        };
      }),
    [parsedCaptions, delay],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return transcriptItems;
    const fuse = new Fuse(transcriptItems, {
      includeScore: true,
      isCaseSensitive: false,
      shouldSort: false,
      threshold: 0.2,
      keys: ["raw"],
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [transcriptItems, searchQuery]);

  // Determine currently visible caption with small buffer
  const { activeKey, nextKey } = useMemo(() => {
    if (parsedCaptions.length === 0)
      return {
        activeKey: null as string | null,
        nextKey: null as string | null,
      };

    const visibleIdx = parsedCaptions.findIndex(({ start, end }) =>
      captionIsVisible(start, end, delay, time),
    );

    const startsSec = parsedCaptions.map((c) => c.start / 1000 + delay);
    const endsSec = parsedCaptions.map((c) => c.end / 1000 + delay);

    // Next upcoming caption (first with start > now)
    const nextIdx = startsSec.findIndex((s) => s > time);
    const prevIdx =
      nextIdx === -1 ? parsedCaptions.length - 1 : Math.max(0, nextIdx - 1);

    let key: string | null = null;

    if (visibleIdx !== -1) {
      const v = parsedCaptions[visibleIdx]!;
      key = makeQueId(visibleIdx, v.start, v.end);
    } else if (nextIdx !== -1) {
      // If the gap between previous end and next start is < 2s, immediately jump to the next subtitle
      const gap = startsSec[nextIdx]! - endsSec[Math.max(0, nextIdx - 1)]!;
      if (nextIdx > 0 && gap < 2) {
        const n = parsedCaptions[nextIdx]!;
        key = makeQueId(nextIdx, n.start, n.end);
      } else {
        // Otherwise keep previous highlighted
        const p = parsedCaptions[prevIdx]!;
        key = makeQueId(prevIdx, p.start, p.end);
      }
    } else {
      // No next item, so keep last highlighted
      const lastIdx = parsedCaptions.length - 1;
      const last = parsedCaptions[lastIdx]!;
      key = makeQueId(lastIdx, last.start, last.end);
    }

    let nextKeyLocal: string | null = null;
    if (nextIdx !== -1) {
      const n = parsedCaptions[nextIdx]!;
      nextKeyLocal = makeQueId(nextIdx, n.start, n.end);
    }

    return { activeKey: key, nextKey: nextKeyLocal };
  }, [parsedCaptions, delay, time]);

  const scrollTargetKey = useMemo(() => {
    if (searchQuery.trim()) {
      const nextFiltered = filteredItems.find((it) => it.start > time);
      if (nextFiltered) return nextFiltered.key;

      const hasActive = filteredItems.some((it) => it.key === activeKey);
      if (hasActive) return activeKey;
      return null;
    }
    return nextKey ?? activeKey;
  }, [filteredItems, searchQuery, time, nextKey, activeKey]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollTargetKey) return;
    const el = document.querySelector<HTMLElement>(
      `[data-que-id="${scrollTargetKey}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [scrollTargetKey]);

  const handleSeek = (seconds: number) => {
    display?.setTime(seconds);
  };

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        Transcript
      </Menu.BackLink>
      <Menu.Section>
        <div className="mt-2 mb-3">
          <Input value={searchQuery} onInput={setSearchQuery} />
        </div>

        <div className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const html = sanitize(item.raw.replaceAll(/\r?\n/g, "<br />"), {
              ALLOWED_TAGS: ["c", "b", "i", "u", "span", "ruby", "rt", "br"],
              ADD_TAGS: ["v", "lang"],
              ALLOWED_ATTR: ["title", "lang"],
            });

            const isActive = activeKey === item.key;

            return (
              <div key={item.key} data-que-id={item.key}>
                <Link
                  onClick={() => handleSeek(item.start)}
                  clickable
                  className="items-start"
                  active={isActive}
                >
                  <span className="mr-3 flex-none w-[4.5rem] h-[1.75rem] flex items-center justify-center px-0 leading-tight rounded-md bg-video-context-light bg-opacity-20 text-video-context-type-main font-normal whitespace-nowrap overflow-hidden text-sm">
                    {formatSeconds(item.start, showHours)}
                  </span>
                  <span
                    className={
                      isActive
                        ? "flex-1 text-white font-semibold text-sm"
                        : "flex-1 text-video-context-type-main text-sm"
                    }
                  >
                    <span
                      dangerouslySetInnerHTML={{ __html: html }} // eslint-disable-line react/no-danger
                      dir="ltr"
                    />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </Menu.Section>
    </>
  );
}
