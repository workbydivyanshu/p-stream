import classNames from "classnames";
import { useCallback, useEffect, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Transition } from "@/components/utils/Transition";
import { usePlayerStore } from "@/stores/player/store";

function shouldShowSkipButton(
  currentTime: number,
  skipTime?: number | null,
): "always" | "hover" | "none" {
  if (typeof skipTime !== "number") return "none";

  // Show button from beginning until the skip point
  if (currentTime >= 0 && currentTime < skipTime) {
    return "always";
  }

  return "none";
}

function Button(props: {
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        "font-bold rounded h-10 w-40 scale-95 hover:scale-100 transition-all duration-200",
        props.className,
      )}
      type="button"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function SkipIntroButton(props: {
  controlsShowing: boolean;
  skipTime?: number | null;
}) {
  const time = usePlayerStore((s) => s.progress.time);
  const status = usePlayerStore((s) => s.status);
  const display = usePlayerStore((s) => s.display);
  const [isReduced, setIsReduced] = useState(false);

  // Update opacity based on video time
  useEffect(() => {
    setIsReduced(time >= 10);
  }, [time]);

  const showingState = shouldShowSkipButton(time, props.skipTime);

  let show = false;
  if (showingState === "always") show = true;
  else if (showingState === "hover" && props.controlsShowing) show = true;
  if (status !== "playing") show = false;

  const animation = showingState === "hover" ? "slide-up" : "fade";
  let bottom = "bottom-[calc(6rem+env(safe-area-inset-bottom))]";
  if (showingState === "always") {
    bottom = props.controlsShowing
      ? bottom
      : "bottom-[calc(3rem+env(safe-area-inset-bottom))]";
  }

  const handleSkip = useCallback(() => {
    if (typeof props.skipTime === "number" && display) {
      display.setTime(props.skipTime);
    }
  }, [props.skipTime, display]);

  return (
    <Transition
      animation={animation}
      show={show}
      className="absolute right-[calc(3rem+env(safe-area-inset-right))] bottom-0"
    >
      <div
        className={classNames([
          "absolute bottom-0 right-0 transition-all duration-500 flex items-center space-x-3",
          bottom,
          isReduced ? "opacity-30 hover:opacity-100" : "opacity-100",
        ])}
      >
        <Button
          onClick={handleSkip}
          className="bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText flex justify-center items-center"
        >
          <Icon className="text-xl mr-1" icon={Icons.SKIP_EPISODE} />
          Skip Intro
        </Button>
      </div>
    </Transition>
  );
}
