import { StateCreator } from "zustand";

import { CastingSlice } from "@/stores/player/slices/casting";
import { DisplaySlice } from "@/stores/player/slices/display";
import { InterfaceSlice } from "@/stores/player/slices/interface";
import { MediaFailuresSlice } from "@/stores/player/slices/mediaFailures";
import { PlayingSlice } from "@/stores/player/slices/playing";
import { ProgressSlice } from "@/stores/player/slices/progress";
import { SourceSlice } from "@/stores/player/slices/source";
import { ThumbnailSlice } from "@/stores/player/slices/thumbnails";

export type AllSlices = InterfaceSlice &
  PlayingSlice &
  ProgressSlice &
  SourceSlice &
  DisplaySlice &
  CastingSlice &
  ThumbnailSlice &
  MediaFailuresSlice;
export type MakeSlice<Slice> = StateCreator<
  AllSlices,
  [["zustand/immer", never]],
  [],
  Slice
>;
