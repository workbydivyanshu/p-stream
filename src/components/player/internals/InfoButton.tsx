import { Icons } from "@/components/Icon";
import { usePlayerStore } from "@/stores/player/store";

import { VideoPlayerButton } from "./Button";

export function InfoButton() {
  const meta = usePlayerStore((s) => s.meta);

  return (
    <VideoPlayerButton
      icon={Icons.CIRCLE_QUESTION}
      iconSizeClass="text-base"
      className="p-2 !-mr-1"
      onClick={() => {
        if (!meta?.tmdbId) return;
        const id = meta.tmdbId;
        let url;
        if (meta.type === "movie") {
          url = `https://www.themoviedb.org/movie/${id}`;
        } else {
          url = `https://www.themoviedb.org/tv/${id}`;
        }
        window.open(url, "_blank");
      }}
    />
  );
}
