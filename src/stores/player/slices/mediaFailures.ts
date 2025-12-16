import { MakeSlice } from "@/stores/player/slices/types";

export interface MediaFailureKey {
  type: "movie" | "show";
  tmdbId: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface MediaFailuresSlice {
  mediaFailures: Record<
    string,
    {
      failedSources: string[];
      failedEmbeds: Record<string, string[]>;
    }
  >;
  getMediaFailureKey(meta: MediaFailureKey): string;
  getMediaFailures(meta: MediaFailureKey): {
    failedSources: string[];
    failedEmbeds: Record<string, string[]>;
  };
  addMediaFailedSource(meta: MediaFailureKey, sourceId: string): void;
  addMediaFailedEmbed(
    meta: MediaFailureKey,
    sourceId: string,
    embedId: string,
  ): void;
  clearMediaFailures(meta: MediaFailureKey): void;
  clearAllMediaFailures(): void;
  reset(): void;
}

function createMediaFailureKey(meta: MediaFailureKey): string {
  const baseKey = `${meta.type}-${meta.tmdbId}`;
  if (
    meta.type === "show" &&
    meta.seasonNumber !== undefined &&
    meta.episodeNumber !== undefined
  ) {
    return `${baseKey}-s${meta.seasonNumber}e${meta.episodeNumber}`;
  }
  return baseKey;
}

export const createMediaFailuresSlice: MakeSlice<MediaFailuresSlice> = (
  set,
  get,
) => ({
  mediaFailures: {},

  getMediaFailureKey(meta) {
    return createMediaFailureKey(meta);
  },

  getMediaFailures(meta) {
    const key = createMediaFailureKey(meta);
    return get().mediaFailures[key] || { failedSources: [], failedEmbeds: {} };
  },

  addMediaFailedSource(meta, sourceId) {
    const key = createMediaFailureKey(meta);
    set((s) => {
      if (!s.mediaFailures[key]) {
        s.mediaFailures[key] = { failedSources: [], failedEmbeds: {} };
      }
      if (!s.mediaFailures[key].failedSources.includes(sourceId)) {
        s.mediaFailures[key].failedSources = [
          ...s.mediaFailures[key].failedSources,
          sourceId,
        ];
      }
    });
  },

  addMediaFailedEmbed(meta, sourceId, embedId) {
    const key = createMediaFailureKey(meta);
    set((s) => {
      if (!s.mediaFailures[key]) {
        s.mediaFailures[key] = { failedSources: [], failedEmbeds: {} };
      }
      if (!s.mediaFailures[key].failedEmbeds[sourceId]) {
        s.mediaFailures[key].failedEmbeds[sourceId] = [];
      }
      if (!s.mediaFailures[key].failedEmbeds[sourceId].includes(embedId)) {
        s.mediaFailures[key].failedEmbeds[sourceId] = [
          ...s.mediaFailures[key].failedEmbeds[sourceId],
          embedId,
        ];
      }
    });
  },

  clearMediaFailures(meta) {
    const key = createMediaFailureKey(meta);
    set((s) => {
      delete s.mediaFailures[key];
    });
  },

  clearAllMediaFailures() {
    set((s) => {
      s.mediaFailures = {};
    });
  },

  reset() {
    set((s) => {
      s.mediaFailures = {};
    });
  },
});
