import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ThemeProvider } from "@/stores/theme";

import {
  getCollectionDetails,
  getMediaBackdrop,
  getMediaPoster,
  mediaItemToId,
} from "@/backend/metadata/tmdb";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icon, Icons } from "@/components/Icon";
import { MediaCard } from "@/components/media/MediaCard";
import { DetailsModal } from "@/components/overlays/detailsModal";
import { MediaItem } from "@/utils/mediaTypes";

interface CollectionMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average?: number;
  backdrop_path?: string | null;
}

interface CollectionData {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: CollectionMovie[];
}

interface CollectionOverlayProps {
  collectionId: number;
  collectionName: string;
  onClose: () => void;
  onMovieClick: (movieId: number) => void;
}

export function CollectionOverlay({
  collectionId,
  collectionName,
  onClose,
  onMovieClick,
}: CollectionOverlayProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [sortOrder, setSortOrder] = useState<"release" | "rating">("release");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCollectionDetails(collectionId);
        setCollection(data);
      } catch (err) {
        console.error("Failed to fetch collection:", err);
        setError(t("media.errors.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId, t]);

  const sortedMovies = collection?.parts
    ? [...collection.parts].sort((a, b) => {
        if (sortOrder === "release") {
          const dateA = new Date(a.release_date || "").getTime();
          const dateB = new Date(b.release_date || "").getTime();
          return dateA - dateB;
        }

        return (b.vote_average || 0) - (a.vote_average || 0);
      })
    : [];

  const movieToMediaItem = (movie: CollectionMovie): MediaItem => {
    const year = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : undefined;

    return {
      id: movie.id.toString(),
      title: movie.title,
      poster: getMediaPoster(movie.poster_path) || "/placeholder.png",
      type: "movie",
      year,
      release_date: movie.release_date
        ? new Date(movie.release_date)
        : undefined,
    };
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleMovieClick = useCallback(
    (media: MediaItem) => {
      if (onMovieClick) {
        onMovieClick(Number(media.id));
      } else {
        setSelectedMovie(media);
        handleClose();

        setTimeout(() => {
          const mediaId = mediaItemToId(media);
          navigate(`/media/${encodeURIComponent(mediaId)}`);
        }, 250);
      }
    },
    [handleClose, navigate, onMovieClick],
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  return createPortal(
    <ThemeProvider>
      <div
        ref={overlayRef}
        className={classNames(
          "fixed inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8",
          "transition-all duration-300",
          isClosing ? "opacity-0" : "opacity-100",
        )}
        style={{ zIndex: 9999 }}
      >
        {/* Blur detail modal while collection overlay is open */}
        <div
          className={classNames(
            "absolute inset-0 bg-black/70 backdrop-blur-xl",
            "transition-opacity duration-300",
            isClosing ? "opacity-0" : "opacity-100",
          )}
          onClick={handleClose}
          aria-label="Close overlay"
        />

        <div
          className={classNames(
            "relative w-full max-w-7xl max-h-[90vh] z-10 pointer-events-auto",
            "transition-all duration-300 ease-out",
            isClosing
              ? "scale-95 opacity-0"
              : "scale-100 opacity-100 animate-[modalShow_0.3s_ease-out]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-full">
            <div className="rounded-2xl overflow-hidden bg-modal-background backdrop-blur-md border border-type-divider/10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="relative flex-shrink-0 px-6 py-5 sm:px-8 sm:py-6 border-b border-type-divider/20 bg-gradient-to-b from-black/40 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-type-emphasis mb-2 drop-shadow-lg">
                      {collectionName}
                    </h2>
                    <div className="flex items-center gap-4 flex-wrap">
                      {collection && (
                        <p className="text-sm text-type-secondary">
                          <span className="text-type-emphasis font-semibold">
                            {collection.parts.length}
                          </span>{" "}
                          {t(
                            `media.types.movie${
                              collection.parts.length !== 1 ? "s" : ""
                            }`,
                          )}
                        </p>
                      )}

                      {/* Sort controls */}
                      {!loading && !error && sortedMovies.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-type-dimmed">
                            {t("media.sortBy")}:
                          </span>
                          <button
                            type="button"
                            onClick={() => setSortOrder("release")}
                            className={classNames(
                              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                              sortOrder === "release"
                                ? "bg-pill-activeBackground text-type-emphasis"
                                : "bg-pill-background hover:bg-pill-backgroundHover text-type-secondary",
                            )}
                          >
                            {t("media.releaseDate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder("rating")}
                            className={classNames(
                              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                              sortOrder === "rating"
                                ? "bg-pill-activeBackground text-type-emphasis"
                                : "bg-pill-background hover:bg-pill-backgroundHover text-type-secondary",
                            )}
                          >
                            {t("media.rating")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <IconPatch
                    icon={Icons.X}
                    clickable
                    onClick={handleClose}
                    className="text-type-secondary hover:text-type-emphasis transition-colors"
                  />
                </div>

                {/* Collection Overview */}
                {collection?.overview && (
                  <p className="text-sm text-type-secondary mt-4 line-clamp-3 max-w-4xl leading-relaxed">
                    {collection.overview}
                  </p>
                )}
              </div>

              <div
                className={classNames(
                  "flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-type-divider/30",
                  "[&:hover]:scrollbar-thumb-type-divider/50",
                )}
              >
                {loading && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-themePreview-primary/20 rounded-full" />
                      <div className="absolute inset-0 w-16 h-16 border-4 border-themePreview-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-6 text-type-secondary animate-pulse">
                      {t("media.loading")}
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="p-4 rounded-full bg-semantic-red-c100/10 mb-4">
                      <Icon
                        icon={Icons.CIRCLE_EXCLAMATION}
                        className="text-semantic-red-c100 text-4xl"
                      />
                    </div>
                    <p className="text-type-danger text-lg font-semibold mb-2">
                      {t("media.errors.errorLoading")}
                    </p>
                    <p className="text-type-secondary text-sm">{error}</p>
                  </div>
                )}

                {!loading && !error && sortedMovies.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="p-4 rounded-full bg-type-divider/10 mb-4">
                      <Icon
                        icon={Icons.FILM}
                        className="text-type-dimmed text-4xl"
                      />
                    </div>
                    <p className="text-type-secondary">
                      {t("media.noMoviesInCollection")}
                    </p>
                  </div>
                )}

                {!loading && !error && sortedMovies.length > 0 && (
                  <div className="grid grid-cols-2 gap-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 collection-grid">
                    {sortedMovies.map((movie) => {
                      const mediaItem = movieToMediaItem(movie);

                      return (
                        <MediaCard
                          key={movie.id}
                          media={mediaItem}
                          onShowDetails={handleMovieClick}
                          linkable
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedMovie && (
        <DetailsModal
          id="collection-details"
          data={{
            id: Number(selectedMovie.id),
            type: "movie",
          }}
        />
      )}

      <style>{`

  .collection-grid .group.rounded-xl.bg-background-main {
    position: relative;
    overflow: hidden;
    background-color: var(--colors-modal-background) !important;
    border-radius: 12px;
    border: none !important;
  }

  
  .collection-grid .group.rounded-xl.bg-background-main > .flare-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid var(--colors-flare, #A359EC);
    box-shadow: 0 0 18px 3px var(--colors-flare, #A359EC);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  
  .collection-grid .group.rounded-xl.bg-background-main:hover > .flare-border {
    opacity: 1;
  }

  
  .collection-grid .group > div.rounded-xl.bg-background-main {
    background: transparent !important;
  }

  
  .collection-grid .bookmark-button {
    opacity: 0 !important;
    transition: opacity 0.2s ease;
  }

  .collection-grid .group:hover .bookmark-button {
    opacity: 1 !important;
  }

  @media (max-width: 1024px) {
    .collection-grid .group:hover .bookmark-button {
      opacity: 0 !important;
    }
  }
      `}</style>
    </ThemeProvider>,
    document.body,
  );
}
