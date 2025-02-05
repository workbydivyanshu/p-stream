import { useEffect, useState } from "react";

import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";

// Thanks Nemo, Custom, and Roomba for this API
const BASE_URL = "https://fed-api-production.up.railway.app";

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const [skiptime, setSkiptime] = useState(0);

  useEffect(() => {
    const fetchSkipTime = async () => {
      if (!meta?.tmdbId) return;

      try {
        const isMovie = meta.type === "movie";
        const apiUrl = isMovie
          ? `${BASE_URL}/${meta.tmdbId}`
          : `${BASE_URL}/${meta.tmdbId}/${meta.season?.number}/${meta.episode?.number}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("API request failed");

        const data = await response.json();

        const skipTime = data.introSkipTime || null;

        setSkiptime(skipTime);
      } catch (error) {
        console.error("Error fetching skip time:", error);
        setSkiptime(0);
      }
    };

    fetchSkipTime();
  }, [meta?.tmdbId, meta?.type, meta?.season?.number, meta?.episode?.number]);

  return skiptime;
}
