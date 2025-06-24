import { useEffect } from "react";

import { usePreferencesStore } from "@/stores/preferences";

export function useLowPerformanceMode() {
  const setEnableLowPerformanceMode = usePreferencesStore(
    (s) => s.setEnableLowPerformanceMode,
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("low-performance")) {
      setEnableLowPerformanceMode(true);
    }
  }, [setEnableLowPerformanceMode]);
}
