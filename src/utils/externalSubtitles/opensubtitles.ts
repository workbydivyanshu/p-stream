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

export async function scrapeOpenSubtitlesCaptions(
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const url = `https://rest.opensubtitles.org/search/${
      season && episode ? `episode-${episode}/` : ""
    }imdbid-${imdbId.slice(2)}${season && episode ? `/season-${season}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "X-User-Agent": "VLSub 0.10.2",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenSubtitles API returned ${response.status}`);
    }

    const data = await response.json();
    const openSubtitlesCaptions: CaptionListItem[] = [];

    for (const caption of data) {
      const downloadUrl = caption.SubDownloadLink.replace(".gz", "").replace(
        "download/",
        "download/subencoding-utf8/",
      );
      const language = labelToLanguageCode(caption.LanguageName);

      if (!downloadUrl || !language) continue;

      openSubtitlesCaptions.push({
        id: downloadUrl,
        language,
        url: downloadUrl,
        type: caption.SubFormat || "srt",
        needsProxy: false,
        opensubtitles: true,
        source: "opensubs", // shortened becuase used on CaptionView for badge
      });
    }

    return openSubtitlesCaptions;
  } catch (error) {
    console.error("Error fetching OpenSubtitles:", error);
    return [];
  }
}
