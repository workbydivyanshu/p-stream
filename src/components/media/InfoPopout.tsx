import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

import { getMediaBackdrop, getMediaDetails } from "@/backend/metadata/tmdb";
import {
  TMDBContentTypes,
  TMDBMovieData,
  TMDBShowData,
} from "@/backend/metadata/types/tmdb";
import { usePreferencesStore } from "@/stores/preferences";
import { MediaItem } from "@/utils/mediaTypes";

interface InfoPopoutProps {
  media: MediaItem;
  visible: boolean;
}

// Add interface for storing additional details
interface AdditionalDetails {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  language?: string;
  episodes?: number;
  seasons?: number;
  voteAverage?: number;
  voteCount?: number;
}

function InfoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative h-40">
        <div
          className="absolute inset-0 bg-mediaCard-hoverBackground"
          style={{
            maskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
          }}
        />
      </div>
      <div className="px-4 pb-4 mt-[-30px]">
        <div className="h-7 w-3/4 bg-white/10 rounded mb-2" /> {/* Title */}
        <div className="space-y-2 mb-4">
          {/* Description */}
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
        </div>
        {/* Additional details */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
        </div>
        {/* Genres */}
        <div className="flex flex-wrap gap-1 mt-4">
          <div className="h-5 w-16 bg-white/10 rounded-full" />
          <div className="h-5 w-20 bg-white/10 rounded-full" />
          <div className="h-5 w-14 bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function InfoPopout({ media, visible }: InfoPopoutProps) {
  const [description, setDescription] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [backdrop, setBackdrop] = useState<string | undefined>();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState<AdditionalDetails>(
    {},
  );
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const enablePopDetails = usePreferencesStore((s) => s.enablePopDetails);

  const fetchData = useCallback(async () => {
    if (!enablePopDetails) return;
    if (dataLoaded) return; // Skip if already loaded

    setIsLoading(true);
    try {
      const type =
        media.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
      const details = await getMediaDetails(media.id, type);
      const backdropUrl = getMediaBackdrop(details.backdrop_path);
      setDescription(details.overview || undefined);
      setBackdrop(backdropUrl);

      if (type === TMDBContentTypes.MOVIE) {
        const movieDetails = details as TMDBMovieData;
        setAdditionalDetails({
          runtime: movieDetails.runtime,
          genres: movieDetails.genres,
          language: movieDetails.original_language,
          voteAverage: movieDetails.vote_average,
          voteCount: movieDetails.vote_count,
        });
      } else {
        const showDetails = details as TMDBShowData;
        setAdditionalDetails({
          episodes: showDetails.number_of_episodes,
          seasons: showDetails.number_of_seasons,
          genres: showDetails.genres,
          language: showDetails.original_language,
          voteAverage: showDetails.vote_average,
          voteCount: showDetails.vote_count,
        });
      }

      setDataLoaded(true);
    } catch (err) {
      console.error("Failed to fetch media details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enablePopDetails, dataLoaded, media.type, media.id]);

  // Start loading data when user hovers
  useEffect(() => {
    if (visible && !dataLoaded && !isLoading && enablePopDetails) {
      fetchData();
    }
  }, [visible, dataLoaded, isLoading, enablePopDetails, fetchData]);

  useEffect(() => {
    // Start timer when user hovers
    if (visible && !shouldShow) {
      hoverTimerRef.current = setTimeout(() => {
        setShouldShow(true);
      }, 200); // 0.2s
    }

    if (!visible && shouldShow) {
      setShouldShow(false);
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [visible, shouldShow]);

  const showPopout = visible && shouldShow;

  const formatRuntime = (minutes?: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatVoteCount = (count?: number) => {
    if (!count) return "0";
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K+`;
    }
    return count.toString();
  };

  return (
    <div
      className={classNames(
        "absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 ml-1 w-[280px] rounded-xl overflow-hidden transition-all duration-300",
        "backdrop-blur-md bg-mediaCard-hoverBackground border border-mediaCard-hoverAccent/40",
        "z-[999]",
        showPopout
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-4 pointer-events-none",
      )}
      onMouseEnter={() => media.onHoverInfoEnter?.()}
      onMouseLeave={() => media.onHoverInfoLeave?.()}
    >
      <div className="p-0">
        {isLoading ? (
          <InfoSkeleton />
        ) : (
          <div className="relative">
            {backdrop && (
              <div className="absolute top-0 left-0 right-0 h-full z-0">
                <img
                  src={backdrop}
                  alt={media.title}
                  className="w-full h-40 object-cover"
                  style={{
                    maskImage:
                      "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
                    WebkitMaskImage:
                      "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
                  }}
                />
              </div>
            )}

            <div className="relative z-10">
              <div className="h-40" /> {/* Spacer for backdrop height */}
              <div className="px-4 pb-4 mt-[-30px]">
                <h3 className="text-lg font-bold text-white mb-2">
                  {media.title}
                </h3>
                {description && (
                  <p className="text-sm text-white/90 mb-4 line-clamp-4">
                    {description}
                  </p>
                )}

                {/* Additional Details Section */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {additionalDetails.runtime && (
                    <div className="flex items-center gap-1 text-white/80">
                      <span className="font-medium">Runtime:</span>{" "}
                      {formatRuntime(additionalDetails.runtime)}
                    </div>
                  )}
                  {additionalDetails.language && (
                    <div className="flex items-center gap-1 text-white/80">
                      <span className="font-medium">Language:</span>{" "}
                      {additionalDetails.language.toUpperCase()}
                    </div>
                  )}
                  {additionalDetails.voteAverage !== undefined &&
                    additionalDetails.voteCount !== undefined &&
                    additionalDetails.voteCount > 0 && (
                      <div className="flex items-center gap-1 text-white/80">
                        <span className="font-medium">Rating:</span>{" "}
                        {additionalDetails.voteAverage.toFixed(1)}/10
                        <span className="text-white/60 text-[10px]">
                          ({formatVoteCount(additionalDetails.voteCount)})
                        </span>
                      </div>
                    )}
                </div>

                {/* Genres */}
                {additionalDetails.genres &&
                  additionalDetails.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {additionalDetails.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
