/* eslint-disable no-console */
import { CaptionListItem } from "@/stores/player/slices/source";

// Helper function to convert language names to language codes
function labelToLanguageCode(languageName: string): string {
  const languageMap: Record<string, string> = {
    English: "en",
    Spanish: "es",
    French: "fr",
    German: "de",
    Italian: "it",
    Portuguese: "pt",
    Russian: "ru",
    Japanese: "ja",
    Korean: "ko",
    Chinese: "zh",
    Arabic: "ar",
    Hindi: "hi",
    Turkish: "tr",
    Dutch: "nl",
    Polish: "pl",
    Swedish: "sv",
    Norwegian: "no",
    Danish: "da",
    Finnish: "fi",
    Greek: "el",
    Hebrew: "he",
    Thai: "th",
    Vietnamese: "vi",
    Indonesian: "id",
    Malay: "ms",
    Filipino: "tl",
    Ukrainian: "uk",
    Romanian: "ro",
    Czech: "cs",
    Hungarian: "hu",
    Bulgarian: "bg",
    Croatian: "hr",
    Serbian: "sr",
    Slovak: "sk",
    Slovenian: "sl",
    Estonian: "et",
    Latvian: "lv",
    Lithuanian: "lt",
    Icelandic: "is",
    Maltese: "mt",
    Georgian: "ka",
    Armenian: "hy",
    Azerbaijani: "az",
    Kazakh: "kk",
    Kyrgyz: "ky",
    Uzbek: "uz",
    Tajik: "tg",
    Turkmen: "tk",
    Mongolian: "mn",
    Persian: "fa",
    Urdu: "ur",
    Bengali: "bn",
    Tamil: "ta",
    Telugu: "te",
    Marathi: "mr",
    Gujarati: "gu",
    Kannada: "kn",
    Malayalam: "ml",
    Punjabi: "pa",
    Sinhala: "si",
    Nepali: "ne",
    Burmese: "my",
    Khmer: "km",
    Lao: "lo",
    Tibetan: "bo",
    Uyghur: "ug",
    Kurdish: "ku",
    Pashto: "ps",
    Dari: "prs",
    Sindhi: "sd",
    Kashmiri: "ks",
    Dogri: "doi",
    Konkani: "kok",
    Manipuri: "mni",
    Bodo: "brx",
    Sanskrit: "sa",
    Santhali: "sat",
    Maithili: "mai",
    Bhojpuri: "bho",
    Awadhi: "awa",
    Chhattisgarhi: "hne",
    Magahi: "mag",
    Rajasthani: "raj",
    Malvi: "mup",
    Bundeli: "bns",
    Bagheli: "bfy",
    Pahari: "phr",
    Kumaoni: "kfy",
    Garhwali: "gbm",
    Kangri: "xnr",
  };

  return languageMap[languageName] || languageName.toLowerCase();
}

export async function scrapeVdrkCaptions(
  tmdbId: string | number,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const tmdbIdNum =
      typeof tmdbId === "string" ? parseInt(tmdbId, 10) : tmdbId;

    let url: string;
    if (season && episode) {
      // For TV shows: https://sub.vdrk.site/v1/tv/{tmdb_id}/{season}/{episode}
      url = `https://sub.vdrk.site/v1/tv/${tmdbIdNum}/${season}/${episode}`;
    } else {
      // For movies: https://sub.vdrk.site/v1/movie/{tmdb_id}
      url = `https://sub.vdrk.site/v1/movie/${tmdbIdNum}`;
    }

    console.log("Searching VDRK subtitles with URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`VDRK API returned ${response.status}`);
    }

    const data = await response.json();

    // Check if response is an array
    if (!Array.isArray(data)) {
      console.log("Invalid VDRK response format");
      return [];
    }

    const vdrkCaptions: CaptionListItem[] = [];

    for (const subtitle of data) {
      if (subtitle.file && subtitle.label) {
        // Parse label to extract language and hearing impaired info
        const label = subtitle.label;
        const isHearingImpaired = label.includes(" Hi") || label.includes("Hi");
        const languageName = label
          .replace(/\s*Hi\d*$/, "")
          .replace(/\s*Hi$/, "")
          .replace(/\d+$/, "");
        const language = labelToLanguageCode(languageName);

        if (!language) continue;

        vdrkCaptions.push({
          id: subtitle.file,
          language,
          url: subtitle.file,
          type: "vtt", // VDRK provides VTT files
          needsProxy: false,
          opensubtitles: true,
          display: subtitle.label,
          isHearingImpaired,
          source: "granite",
        });
      }
    }

    console.log(`Found ${vdrkCaptions.length} VDRK subtitles`);
    return vdrkCaptions;
  } catch (error) {
    console.error("Error fetching VDRK subtitles:", error);
    return [];
  }
}
