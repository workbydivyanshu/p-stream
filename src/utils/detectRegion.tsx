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
  userPicked: boolean;
  setRegion: (region: Region, userPicked?: boolean) => void;
}

export const useRegionStore = create<RegionStore>()(
  persist(
    (set) => ({
      region: null,
      lastChecked: null,
      userPicked: false,
      setRegion: (region, userPicked = false) =>
        set({ region, lastChecked: Math.floor(Date.now() / 1000), userPicked }),
    }),
    {
      name: "__MW::region",
      version: 2,
    },
  ),
);

function determineRegion(data: {
  latitude: number;
  longitude: number;
  country_code: string;
}): Region {
  const { latitude, longitude, country_code: country } = data;

  // US regions
  if (country === "US") {
    // For Alaska and Hawaii, default to US West
    if (latitude > 50 || latitude < 20) {
      return "us-west";
    }

    // For continental US, use longitude boundary
    return longitude < -110 ? "us-west" : "us-east";
  }

  // South America
  if (
    country === "AR" ||
    country === "BO" ||
    country === "BR" ||
    country === "CL" ||
    country === "CO" ||
    country === "EC" ||
    country === "GY" ||
    country === "PE" ||
    country === "PY" ||
    country === "SR" ||
    country === "UY" ||
    country === "VE"
  ) {
    return "south-america";
  }

  // Asia
  if (
    longitude > 60 &&
    (country === "CN" ||
      country === "JP" ||
      country === "KR" ||
      country === "IN" ||
      country === "ID" ||
      country === "TH" ||
      country === "VN" ||
      country === "PH" ||
      country === "MY" ||
      country === "SG" ||
      country === "TW" ||
      country === "HK")
  ) {
    return "asia";
  }

  // Europe
  if (
    longitude > -10 &&
    (country === "GB" ||
      country === "FR" ||
      country === "DE" ||
      country === "IT" ||
      country === "ES" ||
      country === "NL" ||
      country === "BE" ||
      country === "CH" ||
      country === "AT" ||
      country === "SE" ||
      country === "NO" ||
      country === "DK" ||
      country === "FI" ||
      country === "PL" ||
      country === "CZ" ||
      country === "SK" ||
      country === "HU" ||
      country === "RO" ||
      country === "BG" ||
      country === "GR" ||
      country === "PT" ||
      country === "IE" ||
      country === "IS")
  ) {
    return "europe";
  }

  // Default to US East for other regions
  return "us-east";
}

export async function detectRegion(): Promise<Region> {
  const store = useRegionStore.getState();

  // If user picked a region, always return that
  if (store.userPicked && store.region) {
    return store.region;
  }

  // If we have a recent detection, return that
  if (
    store.region &&
    store.lastChecked &&
    Math.floor(Date.now() / 1000) - store.lastChecked < 86400 // 1 day in seconds
  ) {
    return store.region;
  }

  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    const detectedRegion = determineRegion(data);
    if (!store.userPicked) {
      store.setRegion(detectedRegion); // Only update if not user picked
    }
    return detectedRegion;
  } catch (error) {
    console.warn("Failed to detect region:", error);
    return store.region || "unknown";
  }
}
