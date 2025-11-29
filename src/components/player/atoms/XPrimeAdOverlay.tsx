import { useEffect, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Flare } from "@/components/utils/Flare";
import { Transition } from "@/components/utils/Transition";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export function XPrimeAdOverlay() {
  const { sourceId, status } = usePlayerStore((s) => ({
    sourceId: s.sourceId,
    status: s.status,
  }));
  const disableXPrimeAds = usePreferencesStore((s) => s.disableXPrimeAds);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show overlay when all conditions are met
    const scriptExists = !!document.querySelector(
      'script[data-cfasync="false"][src*="jg.prisagedibbuk.com"]',
    );
    const shouldShow =
      sourceId === "xprimetv" &&
      status === "playing" &&
      !disableXPrimeAds &&
      scriptExists;
    if (shouldShow && !show) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
    if (!shouldShow && show) {
      setShow(false);
    }
  }, [sourceId, status, disableXPrimeAds]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) {
    return null;
  }

  return (
    <Transition
      animation="slide-down"
      show
      className="absolute inset-x-0 top-4 flex justify-center pointer-events-none"
    >
      <Flare.Base className="hover:flare-enabled pointer-events-auto bg-video-context-background pl-4 pr-6 py-3 group w-96 h-full rounded-lg transition-colors text-video-context-type-main">
        <Flare.Light
          enabled
          flareSize={200}
          cssColorVar="--colors-video-context-light"
          backgroundClass="bg-video-context-background duration-100"
          className="rounded-lg"
        />
        <Flare.Child className="grid grid-cols-[auto,1fr] gap-3 pointer-events-auto relative transition-transform">
          <Icon className="text-xl" icon={Icons.CIRCLE_EXCLAMATION} />
          <div className="w-full flex items-center">
            <span className="text-sm text-center">
              XPrime uses ads, but they can be disabled from settings!
            </span>
          </div>
        </Flare.Child>
      </Flare.Base>
    </Transition>
  );
}
