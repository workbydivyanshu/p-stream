import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Region =
  | "us-east"
  | "us-west"
  | "south"
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
      version: 3,
    },
  ),
);

// Coordinates for each proxy server region
const regionCoordinates = [
  { region: "us-east" as Region, lat: 39.9612, lon: -82.9988 }, // Ohio, US
  { region: "us-west" as Region, lat: 37.7749, lon: -122.4194 }, // California, US
  { region: "south" as Region, lat: -23.5505, lon: -46.6333 }, // São Paulo, BR
  { region: "asia" as Region, lat: 1.3521, lon: 103.8198 }, // Singapore
  { region: "europe" as Region, lat: 51.5074, lon: -0.1278 }, // London, UK
];

// Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function determineRegion(data: {
  latitude: number;
  longitude: number;
  country_code: string;
}): Region {
  const { latitude, longitude } = data;

  let closestRegion: Region = "unknown";
  let minDistance = Infinity;

  for (const { region, lat, lon } of regionCoordinates) {
    const distance = calculateDistance(latitude, longitude, lat, lon);
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = region;
    }
  }

  return closestRegion;
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

    if (
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number"
    ) {
      return "unknown";
    }

    const detectedRegion = determineRegion(data);
    if (!store.userPicked) {
      store.setRegion(detectedRegion);
    }
    return detectedRegion;
  } catch (error) {
    console.warn("Failed to detect region:", error);
    return store.region || "unknown";
  }
}
