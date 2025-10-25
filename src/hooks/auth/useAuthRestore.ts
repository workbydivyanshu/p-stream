import { useRef } from "react";
import { useAsync, useInterval } from "react-use";

import { useAuth } from "@/hooks/auth/useAuth";
import { useAuthStore } from "@/stores/auth";

const AUTH_CHECK_INTERVAL = 12 * 60 * 60 * 1000;

export function useAuthRestore() {
  const { account } = useAuthStore();
  const { restore } = useAuth();
  const setSettingsLoading = useAuthStore((s) => s.setSettingsLoading);
  const hasRestored = useRef(false);

  useInterval(() => {
    if (account) restore(account);
  }, AUTH_CHECK_INTERVAL);

  const result = useAsync(async () => {
    if (hasRestored.current || !account) return;
    setSettingsLoading(true);
    try {
      await restore(account);
    } finally {
      setSettingsLoading(false);
      hasRestored.current = true;
    }
  }, []); // no deps because we don't want to it ever rerun after the first time

  return result;
}
