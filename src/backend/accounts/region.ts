import { ofetch } from "ofetch";

import { getAuthHeaders } from "@/backend/accounts/auth";
import { AccountWithToken } from "@/stores/auth";

export type Region =
  | "us-east"
  | "us-west"
  | "south"
  | "asia"
  | "europe"
  | "unknown";

export interface RegionResponse {
  region: Region;
  lastChecked: number;
  userPicked: boolean;
}

export async function updateRegion(
  url: string,
  account: AccountWithToken,
  region: Region,
  userPicked: boolean = false,
) {
  return ofetch<RegionResponse>(`/users/${account.userId}/region`, {
    method: "PUT",
    headers: getAuthHeaders(account.token),
    baseURL: url,
    body: {
      region,
      userPicked,
      lastChecked: Math.floor(Date.now() / 1000),
    },
  });
}

export async function getRegion(url: string, account: AccountWithToken) {
  return ofetch<RegionResponse>(`/users/${account.userId}/region`, {
    method: "GET",
    headers: getAuthHeaders(account.token),
    baseURL: url,
  });
}
