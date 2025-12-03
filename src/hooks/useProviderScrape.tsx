import { FullScraperEvents, RunOutput, ScrapeMedia } from "@p-stream/providers";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

import { isExtensionActiveCached } from "@/backend/extension/messaging";
import { prepareStream } from "@/backend/extension/streams";
import {
  connectServerSideEvents,
  getCachedMetadata,
  makeProviderUrl,
} from "@/backend/helpers/providerApi";
import { getLoadbalancedProviderApiUrl } from "@/backend/providers/fetchers";
import { getProviders } from "@/backend/providers/providers";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export interface ScrapingItems {
  id: string;
  children: string[];
}

export interface ScrapingSegment {
  name: string;
  id: string;
  embedId?: string;
  status:
    | "failure"
    | "pending"
    | "notfound"
    | "success"
    | "waiting"
    | "skipped";
  reason?: string;
  error?: any;
  percentage: number;
}

type ScraperEvent<Event extends keyof FullScraperEvents> = Parameters<
  NonNullable<FullScraperEvents[Event]>
>[0];

function useBaseScrape() {
  const [sources, setSources] = useState<Record<string, ScrapingSegment>>({});
  const [sourceOrder, setSourceOrder] = useState<ScrapingItems[]>([]);
  const [currentSource, setCurrentSource] = useState<string>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastId = useRef<string | null>(null);

  const initEvent = useCallback((evt: ScraperEvent<"init">) => {
    setSources(
      evt.sourceIds
        .map((v) => {
          const source = getCachedMetadata().find((s) => s.id === v);
          if (!source) throw new Error("invalid source id");
          const out: ScrapingSegment = {
            name: source.name,
            id: source.id,
            status: "waiting",
            percentage: 0,
          };
          return out;
        })
        .reduce<Record<string, ScrapingSegment>>((a, v) => {
          a[v.id] = v;
          return a;
        }, {}),
    );
    setSourceOrder(evt.sourceIds.map((v) => ({ id: v, children: [] })));
  }, []);

  const startEvent = useCallback((id: ScraperEvent<"start">) => {
    const lastIdTmp = lastId.current;
    setSources((s) => {
      if (s[id]) s[id].status = "pending";
      // Only mark as success if it's pending - don't overwrite skipped status
      if (lastIdTmp && s[lastIdTmp] && s[lastIdTmp].status === "pending") {
        s[lastIdTmp].status = "success";
      }
      return { ...s };
    });
    setCurrentSource(id);
    lastId.current = id;
    // Create new AbortController for this source
    abortControllerRef.current = new AbortController();
  }, []);

  const updateEvent = useCallback((evt: ScraperEvent<"update">) => {
    setSources((s) => {
      if (s[evt.id]) {
        s[evt.id].status = evt.status;
        s[evt.id].reason = evt.reason;
        s[evt.id].error = evt.error;
        s[evt.id].percentage = evt.percentage;
      }
      return { ...s };
    });
  }, []);

  const discoverEmbedsEvent = useCallback(
    (evt: ScraperEvent<"discoverEmbeds">) => {
      setSources((s) => {
        evt.embeds.forEach((v) => {
          const source = getCachedMetadata().find(
            (src) => src.id === v.embedScraperId,
          );
          if (!source) throw new Error("invalid source id");
          const out: ScrapingSegment = {
            embedId: v.embedScraperId,
            name: source.name,
            id: v.id,
            status: "waiting",
            percentage: 0,
          };
          s[v.id] = out;
        });
        return { ...s };
      });
      setSourceOrder((s) => {
        const source = s.find((v) => v.id === evt.sourceId);
        if (!source) throw new Error("invalid source id");
        source.children = evt.embeds.map((v) => v.id);
        return [...s];
      });
    },
    [],
  );

  const startScrape = useCallback(() => {
    lastId.current = null;
  }, []);

  const getResult = useCallback((output: RunOutput | null) => {
    if (output && lastId.current) {
      setSources((s) => {
        if (!lastId.current) return s;
        if (s[lastId.current]) s[lastId.current].status = "success";
        return { ...s };
      });
    }
    return output;
  }, []);

  const skipCurrentSource = useCallback(() => {
    if (currentSource) {
      // Get the parent source ID (remove embed suffix like "-0", "-1", etc.)
      const parentSourceId = currentSource.split("-")[0];

      // Abort the current operation FIRST - abort all pending requests immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Mark the parent source and all its embeds as skipped AFTER aborting
      // This ensures the abort happens immediately and can interrupt ongoing operations
      setSources((s) => {
        Object.keys(s).forEach((key) => {
          // Check if this is the parent source or one of its embeds
          if (key === parentSourceId || key.startsWith(`${parentSourceId}-`)) {
            if (s[key]) {
              // Mark as skipped regardless of current status (even if it succeeded)
              s[key].status = "skipped";
              s[key].reason = "Skipped by user";
              s[key].percentage = 100;
            }
          }
        });
        return { ...s };
      });
    }
  }, [currentSource]);

  return {
    initEvent,
    startEvent,
    updateEvent,
    discoverEmbedsEvent,
    startScrape,
    getResult,
    sources,
    sourceOrder,
    currentSource,
    skipCurrentSource,
    abortControllerRef,
  };
}

export function useScrape() {
  const {
    sources,
    sourceOrder,
    currentSource,
    updateEvent,
    discoverEmbedsEvent,
    initEvent,
    getResult,
    startEvent,
    startScrape,
    skipCurrentSource,
    abortControllerRef,
  } = useBaseScrape();

  const preferredSourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const disabledSources = usePreferencesStore((s) => s.disabledSources);
  const preferredEmbedOrder = usePreferencesStore((s) => s.embedOrder);
  const enableEmbedOrder = usePreferencesStore((s) => s.enableEmbedOrder);
  const disabledEmbeds = usePreferencesStore((s) => s.disabledEmbeds);

  const startScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId?: string) => {
      const providerInstance = getProviders();
      const allSources = providerInstance.listSources();

      const playerState = usePlayerStore.getState();
      const failedSources = playerState.failedSources;
      const failedEmbeds = playerState.failedEmbeds;

      // Start with all available sources (filtered by disabled and failed ones)
      let baseSourceOrder = allSources
        .filter(
          (source) =>
            !disabledSources.includes(source.id) &&
            !failedSources.includes(source.id),
        )
        .map((source) => source.id);

      // Apply custom source ordering if enabled
      if (enableSourceOrder && preferredSourceOrder.length > 0) {
        const orderedSources: string[] = [];
        const remainingSources = [...baseSourceOrder];

        // Add sources in preferred order
        for (const sourceId of preferredSourceOrder) {
          const sourceIndex = remainingSources.indexOf(sourceId);
          if (sourceIndex !== -1) {
            orderedSources.push(sourceId);
            remainingSources.splice(sourceIndex, 1);
          }
        }

        // Add remaining sources
        baseSourceOrder = [...orderedSources, ...remainingSources];
      }

      // If we have a last successful source and the feature is enabled, prioritize it
      if (enableLastSuccessfulSource && lastSuccessfulSource) {
        const lastSourceIndex = baseSourceOrder.indexOf(lastSuccessfulSource);
        if (lastSourceIndex !== -1) {
          baseSourceOrder = [
            lastSuccessfulSource,
            ...baseSourceOrder.filter((id) => id !== lastSuccessfulSource),
          ];
        }
      }

      // If starting from a specific source ID, filter the order to start AFTER that source
      let filteredSourceOrder = baseSourceOrder;
      if (startFromSourceId) {
        const startIndex = filteredSourceOrder.indexOf(startFromSourceId);
        if (startIndex !== -1) {
          filteredSourceOrder = filteredSourceOrder.slice(startIndex + 1);
        }
      }

      // Collect all failed embed IDs across all sources
      const allFailedEmbedIds = Object.values(failedEmbeds).flat();

      // Filter out disabled and failed embeds from the embed order
      const filteredEmbedOrder = enableEmbedOrder
        ? preferredEmbedOrder.filter(
            (id) =>
              !disabledEmbeds.includes(id) && !allFailedEmbedIds.includes(id),
          )
        : undefined;

      const providerApiUrl = getLoadbalancedProviderApiUrl();

      if (providerApiUrl && !isExtensionActiveCached()) {
        startScrape();
        const baseUrlMaker = makeProviderUrl(providerApiUrl);
        const conn = await connectServerSideEvents<RunOutput | "">(
          baseUrlMaker.scrapeAll(
            media,
            filteredSourceOrder,
            filteredEmbedOrder,
          ),
          ["completed", "noOutput"],
        );
        conn.on("init", initEvent);
        conn.on("start", startEvent);
        conn.on("update", updateEvent);
        conn.on("discoverEmbeds", discoverEmbedsEvent);
        const sseOutput = await conn.promise();
        if (sseOutput && isExtensionActiveCached())
          await prepareStream(sseOutput.stream);

        return getResult(sseOutput === "" ? null : sseOutput);
      }

      startScrape();
      const providers = getProviders();

      // Create initial abort controller if it doesn't exist
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }

      // Create a wrapper that always gets the current abort controller
      const getCurrentAbortController = () => abortControllerRef.current;

      const output = await providers.runAll({
        media,
        sourceOrder: filteredSourceOrder,
        embedOrder: filteredEmbedOrder,
        abortController: {
          get signal() {
            const controller = getCurrentAbortController();
            return controller ? controller.signal : undefined;
          },
        } as AbortController,
        events: {
          init: initEvent,
          start: startEvent,
          update: updateEvent,
          discoverEmbeds: discoverEmbedsEvent,
        },
      });
      if (output && isExtensionActiveCached())
        await prepareStream(output.stream);
      return getResult(output);
    },
    [
      initEvent,
      startEvent,
      updateEvent,
      discoverEmbedsEvent,
      getResult,
      startScrape,
      preferredSourceOrder,
      enableSourceOrder,
      lastSuccessfulSource,
      enableLastSuccessfulSource,
      disabledSources,
      preferredEmbedOrder,
      enableEmbedOrder,
      disabledEmbeds,
      abortControllerRef,
    ],
  );

  const resumeScraping = useCallback(
    async (media: ScrapeMedia, startFromSourceId: string) => {
      return startScraping(media, startFromSourceId);
    },
    [startScraping],
  );

  return {
    startScraping,
    resumeScraping,
    sourceOrder,
    sources,
    currentSource,
    skipCurrentSource,
  };
}

export function useListCenter(
  containerRef: RefObject<HTMLDivElement | null>,
  listRef: RefObject<HTMLDivElement | null>,
  sourceOrder: ScrapingItems[],
  currentSource: string | undefined,
) {
  const [renderedOnce, setRenderedOnce] = useState(false);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    if (!listRef.current) return;

    const elements = [
      ...listRef.current.querySelectorAll("div[data-source-id]"),
    ] as HTMLDivElement[];

    const currentIndex = elements.findIndex(
      (e) => e.getAttribute("data-source-id") === currentSource,
    );

    const currentElement = elements[currentIndex];

    if (!currentElement) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const listWidth = listRef.current.getBoundingClientRect().width;

    const containerHeight = containerRef.current.getBoundingClientRect().height;

    const listTop = listRef.current.getBoundingClientRect().top;

    const currentTop = currentElement.getBoundingClientRect().top;
    const currentHeight = currentElement.getBoundingClientRect().height;

    const topDifference = currentTop - listTop;

    const listNewLeft = containerWidth / 2 - listWidth / 2;
    const listNewTop = containerHeight / 2 - topDifference - currentHeight / 2;

    listRef.current.style.transform = `translateY(${listNewTop}px) translateX(${listNewLeft}px)`;
    setTimeout(() => {
      setRenderedOnce(true);
    }, 150);
  }, [currentSource, containerRef, listRef, setRenderedOnce]);

  const updatePositionRef = useRef(updatePosition);

  useEffect(() => {
    updatePosition();
    updatePositionRef.current = updatePosition;
  }, [updatePosition, sourceOrder]);

  useEffect(() => {
    function resize() {
      updatePositionRef.current();
    }
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return renderedOnce;
}
