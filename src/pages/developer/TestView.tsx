import { useCallback, useState } from "react";

import { Button } from "@/components/buttons/Button";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import {
  CaptionListItem,
  PlayerMeta,
  playerStatus,
} from "@/stores/player/slices/source";
import { SourceSliceSource } from "@/stores/player/utils/qualities";

const subtitlesTestMeta: PlayerMeta = {
  type: "movie",
  title: "Subtitles Test",
  releaseYear: 2024,
  tmdbId: "0",
};

const subtitlesTestSource: SourceSliceSource = {
  type: "hls",
  url: "http://localhost:8000/media/master.m3u8",
};

const subtitlesTestSubs: CaptionListItem[] = [
  {
    id: "English",
    language: "en",
    url: "http://localhost:8000/subs/en.srt",
    needsProxy: false,
  },
  {
    id: "Romanian",
    language: "ro",
    url: "http://localhost:8000/subs/ro.srt",
    needsProxy: false,
  },
];

// mostly empty view, add whatever you need
export default function TestView() {
  const player = usePlayer();
  const [showPlayer, setShowPlayer] = useState(false);
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("I crashed");
  }

  const subtitlesTest = useCallback(async () => {
    setShowPlayer(true);
    player.reset();
    await new Promise((r) => {
      setTimeout(r, 100);
    });
    player.setShouldStartFromBeginning(true);
    player.setMeta(subtitlesTestMeta);
    player.playMedia(subtitlesTestSource, subtitlesTestSubs, null);
  }, [player]);

  return showPlayer ? (
    <PlayerPart backUrl="/dev/">
      {player && (player as any).status === playerStatus.PLAYBACK_ERROR ? (
        <PlaybackErrorPart />
      ) : null}
    </PlayerPart>
  ) : (
    <>
      <Button onClick={() => setShouldCrash(true)}>Crash me!</Button>
      <Button onClick={() => subtitlesTest()}>Subtitles test</Button>
    </>
  );
}
