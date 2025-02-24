import { useEffect, useState } from "react";

import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";

// Thanks Nemo, Custom, and Roomba for this API
const BASE_URL = "https://fed-intro-api.up.railway.app";
const MAX_RETRIES = 3;

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const [skiptime, setSkiptime] = useState(0);

  useEffect(() => {
    const fetchSkipTime = async (retries = 0): Promise<void> => {
      if (!meta?.tmdbId || meta.type === "movie") return;
      if (!conf().ALLOW_FEBBOX_KEY) return;

      try {
        const apiUrl = `${BASE_URL}/${meta.tmdbId}/${meta.season?.number}/${meta.episode?.number}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchSkipTime(retries + 1);
          }
          throw new Error("API request failed");
        }

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
