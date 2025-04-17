import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Region =
  | "us-east"
  | "us-west"
  | "south-america"
  | "asia"
  | "europe"
  | "unknown";

interface RegionStore {
  region: Region | null;
  lastChecked: number | null;
  setRegion: (region: Region) => void;
}

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export const useRegionStore = create<RegionStore>()(
  persist(
    (set) => ({
      region: null,
      lastChecked: null,
      setRegion: (region) => set({ region, lastChecked: Date.now() }),
    }),
    {
      name: "__MW::region",
    },
  ),
);

function determineRegion(data: {
  latitude: number;
  longitude: number;
  country_code: string;
}): Region {
  const { latitude, longitude, country_code: country } = data;

  if (country === "US") return longitude < -100 ? "us-west" : "us-east";
  if (latitude < 0) return "south-america";
  if (longitude > 60) return "asia";
  if (longitude > -10) return "europe";
  return "us-east";
}

export async function detectRegion(): Promise<Region> {
  const store = useRegionStore.getState();

  if (
    store.region &&
    store.lastChecked &&
    Date.now() - store.lastChecked < TEN_DAYS_MS
  ) {
    return store.region;
  }

  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    const detectedRegion = determineRegion(data);
    store.setRegion(detectedRegion); // Persist the detected region
    return detectedRegion;
  } catch (error) {
    console.warn("Failed to detect region:", error);
    return store.region || "unknown";
  }
}
