import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Genre,
  Movie,
  categories,
  tvCategories,
} from "@/pages/discover/common";
import { conf } from "@/setup/config";

import "./discover.css";
import { CategoryButtons } from "./components/CategoryButtons";
import { LazyMediaCarousel } from "./components/LazyMediaCarousel";
import { LazyTabContent } from "./components/LazyTabContent";
import { MediaCarousel } from "./components/MediaCarousel";
import { RandomMovieButton } from "./components/RandomMovieButton";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { useTMDBData } from "./hooks/useTMDBData";

const MOVIE_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "2" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Paramount Plus", id: "531" },
  { name: "Disney Plus", id: "337" },
  { name: "Shudder", id: "99" },
];

const TV_PROVIDERS = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "350" },
  { name: "Paramount Plus", id: "531" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Disney Plus", id: "337" },
  { name: "fubuTV", id: "257" },
];

// Editor Picks lists
const EDITOR_PICKS_MOVIES = [
  { id: 9342, type: "movie" }, // The Mask of Zorro
  { id: 293, type: "movie" }, // A River Runs Through It
  { id: 370172, type: "movie" }, // No Time To Die
  { id: 661374, type: "movie" }, // The Glass Onion
  { id: 207, type: "movie" }, // Dead Poets Society
  { id: 378785, type: "movie" }, // The Best of the Blues Brothers
  { id: 335984, type: "movie" }, // Blade Runner 2049
  { id: 13353, type: "movie" }, // It's the Great Pumpkin, Charlie Brown
  { id: 27205, type: "movie" }, // Inception
  { id: 106646, type: "movie" }, // The Wolf of Wall Street
  { id: 334533, type: "movie" }, // Captain Fantastic
  { id: 693134, type: "movie" }, // Dune: Part Two
  { id: 765245, type: "movie" }, // Swan Song
  { id: 264660, type: "movie" }, // Ex Machina
  { id: 92591, type: "movie" }, // Bernie
  { id: 976893, type: "movie" }, // Perfect Days
  { id: 13187, type: "movie" }, // A Charlie Brown Christmas
  { id: 11527, type: "movie" }, // Excalibur
  { id: 120, type: "movie" }, // LOTR: The Fellowship of the Ring
  { id: 157336, type: "movie" }, // Interstellar
  { id: 762, type: "movie" }, // Monty Python and the Holy Grail
  { id: 666243, type: "movie" }, // The Witcher: Nightmare of the Wolf
  { id: 545611, type: "movie" }, // Everything Everywhere All at Once
  { id: 329, type: "movie" }, // Jurrassic Park
  { id: 330459, type: "movie" }, // Rogue One: A Star Wars Story
  { id: 279, type: "movie" }, // Amadeus
  { id: 823219, type: "movie" }, // Flow
  { id: 22, type: "movie" }, // Pirates of the Caribbean: The Curse of the Black Pearl
  { id: 18971, type: "movie" }, // Rosencrantz and Guildenstern Are Dead
  { id: 26388, type: "movie" }, // Buried
  { id: 152601, type: "movie" }, // Her
];

const EDITOR_PICKS_TV_SHOWS = [
  { id: 456, type: "show" }, // The Simpsons
  { id: 73021, type: "show" }, // Disenchantment
  { id: 1434, type: "show" }, // Family Guy
  { id: 1695, type: "show" }, // Monk
  { id: 1408, type: "show" }, // House
  { id: 93740, type: "show" }, // Foundation
  { id: 60625, type: "show" }, // Rick and Morty
  { id: 1396, type: "show" }, // Breaking Bad
  { id: 44217, type: "show" }, // Vikings
  { id: 90228, type: "show" }, // Dune Prophecy
  { id: 13916, type: "show" }, // Death Note
  { id: 71912, type: "show" }, // The Witcher
  { id: 61222, type: "show" }, // Bojack Horseman
  { id: 93405, type: "show" }, // Squid Game
  { id: 87108, type: "show" }, // Chernobyl
  { id: 105248, type: "show" }, // Cyberpunk: Edgerunners
];

export function DiscoverContent() {
  // State management
  const [selectedCategory, setSelectedCategory] = useState("movies");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tvGenres, setTVGenres] = useState<Genre[]>([]);
  const [randomMovie, setRandomMovie] = useState<Movie | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTimeout, setCountdownTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [selectedProvider, setSelectedProvider] = useState({
    name: "",
    id: "",
  });
  const [providerMovies, setProviderMovies] = useState<Movie[]>([]);
  const [providerTVShows, setProviderTVShows] = useState<any[]>([]);
  const [editorPicksMovies, setEditorPicksMovies] = useState<Movie[]>([]);
  const [editorPicksTVShows, setEditorPicksTVShows] = useState<any[]>([]);

  // Refs
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Hooks
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const { genreMedia: genreMovies } = useTMDBData(genres, categories, "movie");
  // const { genreMedia: genreTVShows } = useTMDBData(
  //   tvGenres,
  //   tvCategories,
  //   "tv",
  // );
  const { t } = useTranslation();

  // Only load data for the active tab
  const isMoviesTab = selectedCategory === "movies";
  const isTVShowsTab = selectedCategory === "tvshows";
  const isEditorPicksTab = selectedCategory === "editorpicks";

  // Fetch TV show genres
  useEffect(() => {
    if (!isTVShowsTab) return;

    const fetchTVGenres = async () => {
      try {
        const data = await get<any>("/genre/tv/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });
        // Fetch only the first 10 TV show genres
        setTVGenres(data.genres.slice(0, 10));
      } catch (error) {
        console.error("Error fetching TV show genres:", error);
      }
    };

    fetchTVGenres();
  }, [isTVShowsTab]);

  // Fetch Movie genres
  useEffect(() => {
    if (!isMoviesTab) return;

    const fetchGenres = async () => {
      try {
        const data = await get<any>("/genre/movie/list", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });

        // Fetch only the first 12 genres
        setGenres(data.genres.slice(0, 12));
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, [isMoviesTab]);

  // Fetch Editor Picks Movies
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksMovies = async () => {
      try {
        const moviePromises = EDITOR_PICKS_MOVIES.map((item) =>
          get<any>(`/movie/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(moviePromises);
        // Shuffle the results to display them randomly
        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setEditorPicksMovies(shuffled);
      } catch (error) {
        console.error("Error fetching editor picks movies:", error);
      }
    };

    fetchEditorPicksMovies();
  }, [isEditorPicksTab]);

  // Fetch Editor Picks TV Shows
  useEffect(() => {
    if (!isEditorPicksTab) return;

    const fetchEditorPicksTVShows = async () => {
      try {
        const tvShowPromises = EDITOR_PICKS_TV_SHOWS.map((item) =>
          get<any>(`/tv/${item.id}`, {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            append_to_response: "videos,images",
          }),
        );

        const results = await Promise.all(tvShowPromises);
        // Shuffle the results to display them randomly
        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setEditorPicksTVShows(shuffled);
      } catch (error) {
        console.error("Error fetching editor picks TV shows:", error);
      }
    };

    fetchEditorPicksTVShows();
  }, [isEditorPicksTab]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : prev));
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [countdown]);

  // Handlers
  const handleCategoryChange = (
    eventOrValue: React.ChangeEvent<HTMLSelectElement> | string,
  ) => {
    const value =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue.target.value;
    setSelectedCategory(value);
  };

  const handleRandomMovieClick = () => {
    const allMovies = Object.values(genreMovies).flat();
    const uniqueTitles = new Set(allMovies.map((movie) => movie.title));
    const uniqueTitlesArray = Array.from(uniqueTitles);
    const randomIndex = Math.floor(Math.random() * uniqueTitlesArray.length);
    const selectedMovie = allMovies.find(
      (movie) => movie.title === uniqueTitlesArray[randomIndex],
    );

    if (selectedMovie) {
      if (countdown !== null && countdown > 0) {
        setCountdown(null);
        if (countdownTimeout) {
          clearTimeout(countdownTimeout);
          setCountdownTimeout(null);
          setRandomMovie(null);
        }
      } else {
        setRandomMovie(selectedMovie as Movie);
        setCountdown(5);
        const timeoutId = setTimeout(() => {
          navigate(`/media/tmdb-movie-${selectedMovie.id}-discover-random`);
        }, 5000);
        setCountdownTimeout(timeoutId);
      }
    }
  };

  const handleProviderClick = async (id: string, name: string) => {
    try {
      setSelectedProvider({ name, id });
      const endpoint =
        selectedCategory === "movies" ? "/discover/movie" : "/discover/tv";
      const setData =
        selectedCategory === "movies" ? setProviderMovies : setProviderTVShows;
      const data = await get<any>(endpoint, {
        api_key: conf().TMDB_READ_API_KEY,
        with_watch_providers: id,
        watch_region: "US",
        language: "en-US",
      });
      setData(data.results);
    } catch (error) {
      console.error("Error fetching provider movies/shows:", error);
    }
  };

  const handleCategoryClick = (id: string, name: string) => {
    // Try both movie and tv versions of the category slug
    const categorySlugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const movieElement = document.getElementById(
      `carousel-${categorySlugBase}-movie`,
    );
    const tvElement = document.getElementById(
      `carousel-${categorySlugBase}-tv`,
    );

    // Scroll to the first element that exists
    const element = movieElement || tvElement;
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Render Editor Picks content
  const renderEditorPicksContent = () => {
    return (
      <>
        <LazyMediaCarousel
          preloadedMedia={editorPicksMovies}
          title="Editor Picks"
          mediaType="movie"
          isMobile={isMobile}
          carouselRefs={carouselRefs}
        />
        <LazyMediaCarousel
          preloadedMedia={editorPicksTVShows}
          title="Editor Picks"
          mediaType="tv"
          isMobile={isMobile}
          carouselRefs={carouselRefs}
        />
      </>
    );
  };

  // Render Movies content with lazy loading
  const renderMoviesContent = () => {
    return (
      <>
        {/* Provider Movies */}
        {providerMovies.length > 0 && (
          <MediaCarousel
            medias={providerMovies}
            category={selectedProvider.name}
            isTVShow={false}
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        )}

        {/* Categories */}
        {categories.map((category) => (
          <LazyMediaCarousel
            key={category.name}
            category={category}
            mediaType="movie"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}

        {/* Genres */}
        {genres.map((genre) => (
          <LazyMediaCarousel
            key={genre.id}
            genre={genre}
            mediaType="movie"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}
      </>
    );
  };

  // Render TV Shows content with lazy loading
  const renderTVShowsContent = () => {
    return (
      <>
        {/* Provider TV Shows */}
        {providerTVShows.length > 0 && (
          <MediaCarousel
            medias={providerTVShows}
            category={selectedProvider.name}
            isTVShow
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        )}

        {/* Categories */}
        {tvCategories.map((category) => (
          <LazyMediaCarousel
            key={category.name}
            category={category}
            mediaType="tv"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}

        {/* Genres */}
        {tvGenres.map((genre) => (
          <LazyMediaCarousel
            key={genre.id}
            genre={genre}
            mediaType="tv"
            isMobile={isMobile}
            carouselRefs={carouselRefs}
          />
        ))}
      </>
    );
  };

  return (
    <div className="pt-6">
      {/* Random Movie Button */}
      <RandomMovieButton
        countdown={countdown}
        onClick={handleRandomMovieClick}
        randomMovieTitle={randomMovie ? randomMovie.title : null}
      />

      {/* Category Tabs */}
      <div className="mt-8 pb-2 w-full max-w-screen-xl mx-auto">
        <div className="relative flex justify-center mb-4">
          <div className="flex space-x-4">
            {["movies", "tvshows", "editorpicks"].map((category) => (
              <button
                key={category}
                type="button"
                className={`text-xl md:text-2xl font-bold p-2 bg-transparent text-center rounded-full cursor-pointer flex items-center transition-transform duration-200 ${
                  selectedCategory === category
                    ? "transform scale-105 text-type-link"
                    : "text-type-secondary"
                }`}
                onClick={() => handleCategoryChange(category)}
              >
                {t(`discover.tabs.${category}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Only show provider and genre buttons for movies and tvshows categories */}
        {selectedCategory !== "editorpicks" && (
          <>
            <div className="flex justify-center overflow-x-auto">
              <CategoryButtons
                categories={
                  selectedCategory === "movies" ? MOVIE_PROVIDERS : TV_PROVIDERS
                }
                onCategoryClick={handleProviderClick}
                categoryType="providers"
                isMobile={isMobile}
                showAlwaysScroll={false}
              />
            </div>
            <div className="flex overflow-x-auto">
              <CategoryButtons
                categories={
                  selectedCategory === "movies"
                    ? [...categories, ...genres]
                    : [...tvCategories, ...tvGenres]
                }
                onCategoryClick={handleCategoryClick}
                categoryType="movies"
                isMobile={isMobile}
                showAlwaysScroll
              />
            </div>
          </>
        )}
      </div>

      {/* Content Section with Lazy Loading Tabs */}
      <div className="w-full md:w-[90%] max-w-[2400px] mx-auto">
        {/* Movies Tab */}
        <LazyTabContent isActive={isMoviesTab}>
          {renderMoviesContent()}
        </LazyTabContent>

        {/* TV Shows Tab */}
        <LazyTabContent isActive={isTVShowsTab}>
          {renderTVShowsContent()}
        </LazyTabContent>

        {/* Editor Picks Tab */}
        <LazyTabContent isActive={isEditorPicksTab}>
          {renderEditorPicksContent()}
        </LazyTabContent>
      </div>

      <ScrollToTopButton />
    </div>
  );
}

export default DiscoverContent;
