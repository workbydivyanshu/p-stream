import { useCallback, useEffect, useState } from "react";

import { Icon, Icons } from "@/components/Icon";

interface CategoryButtonsProps {
  categories: any[];
  onCategoryClick: (id: string, name: string) => void;
  categoryType: string;
  isMobile: boolean;
  showAlwaysScroll: boolean;
}

export function CategoryButtons({
  categories,
  onCategoryClick,
  categoryType,
  isMobile,
  showAlwaysScroll,
}: CategoryButtonsProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = document.getElementById(`button-carousel-${categoryType}`);
    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const isAtStart = scrollLeft <= 1;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  }, [categoryType]);

  useEffect(() => {
    const element = document.getElementById(`button-carousel-${categoryType}`);
    if (!element) return;

    updateScrollState();

    element.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categoryType, updateScrollState]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateScrollState();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [categories, categoryType, updateScrollState]);

  const renderScrollButton = (direction: "left" | "right") => {
    const shouldShow = direction === "left" ? canScrollLeft : canScrollRight;

    if (!shouldShow && !showAlwaysScroll && !isMobile) return null;

    return (
      <div>
        <button
          type="button"
          className="flex items-center rounded-full px-4 text-white py-3"
          onClick={() => {
            const element = document.getElementById(
              `button-carousel-${categoryType}`,
            );
            if (element) {
              element.scrollBy({
                left: direction === "left" ? -200 : 200,
                behavior: "smooth",
              });
            }
          }}
        >
          <Icon
            icon={
              direction === "left" ? Icons.CHEVRON_LEFT : Icons.CHEVRON_RIGHT
            }
            className="text-2xl rtl:-scale-x-100"
          />
        </button>
      </div>
    );
  };

  return (
    <div className="flex overflow-x-auto">
      {(showAlwaysScroll || isMobile || canScrollLeft) &&
        renderScrollButton("left")}

      <div
        id={`button-carousel-${categoryType}`}
        className="flex lg:px-4 mb-4 overflow-x-auto scroll-smooth"
      >
        <div className="flex space-x-2 py-1">
          {categories.map((category) => (
            <button
              key={category.id || category.name}
              type="button"
              className="whitespace-nowrap flex items-center space-x-2 rounded-full px-4 text-white py-2 bg-pill-background bg-opacity-50 hover:bg-pill-backgroundHover transition-[background,transform] duration-100 hover:scale-105"
              onClick={() => onCategoryClick(category.id, category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {(showAlwaysScroll || isMobile || canScrollRight) &&
        renderScrollButton("right")}
    </div>
  );
}
