import { useCallback, useEffect, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Flare } from "@/components/utils/Flare";

interface CarouselNavButtonsProps {
  categorySlug: string;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
}

interface NavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  visible: boolean;
}

function NavButton({ direction, onClick, visible }: NavButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`absolute ${direction === "left" ? "left-12" : "right-12"} top-1/2 transform -translate-y-3/4 z-10`}
      onClick={onClick}
    >
      <Flare.Base className="group -m-[0.705em] rounded-full bg-search-hoverBackground transition-transform duration-300 focus:relative focus:z-10 hover:bg-mediaCard-hoverBackground tabbable hover:scale-110">
        <Flare.Light
          flareSize={90}
          cssColorVar="--colors-mediaCard-hoverAccent"
          backgroundClass="bg-mediaCard-hoverBackground duration-100"
          className="rounded-full group-hover:opacity-100 z-20"
        />
        <Flare.Child className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full active:scale-110 transition-[transform,background-color] duration-200 z-30">
          <Icon
            icon={
              direction === "left" ? Icons.CHEVRON_LEFT : Icons.CHEVRON_RIGHT
            }
          />
        </Flare.Child>
      </Flare.Base>
    </button>
  );
}

export function CarouselNavButtons({
  categorySlug,
  carouselRefs,
}: CarouselNavButtonsProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const carousel = carouselRefs.current[categorySlug];
    if (!carousel) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = carousel;
    const isAtStart = scrollLeft <= 1;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  }, [categorySlug, carouselRefs]);

  useEffect(() => {
    const carousel = carouselRefs.current[categorySlug];
    if (!carousel) return;

    updateScrollState();

    carousel.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      carousel.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categorySlug, carouselRefs, updateScrollState]);

  const handleScroll = (direction: "left" | "right") => {
    const carousel = carouselRefs.current[categorySlug];
    if (!carousel) return;

    const movieElements = carousel.getElementsByTagName("a");
    if (movieElements.length === 0) return;

    // Wait for next frame to ensure measurements are available
    requestAnimationFrame(() => {
      const movieWidth = movieElements[0].getBoundingClientRect().width;

      const carouselWidth = carousel.getBoundingClientRect().width;

      if (movieWidth === 0 || carouselWidth === 0) {
        return;
      }

      const visibleMovies = Math.floor(carouselWidth / movieWidth);
      const scrollAmount = movieWidth * (visibleMovies > 5 ? 4 : 2);

      const newScrollPosition =
        carousel.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);

      carousel.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    });
  };

  return (
    <>
      <NavButton
        direction="left"
        onClick={() => handleScroll("left")}
        visible={canScrollLeft}
      />
      <NavButton
        direction="right"
        onClick={() => handleScroll("right")}
        visible={canScrollRight}
      />
    </>
  );
}
