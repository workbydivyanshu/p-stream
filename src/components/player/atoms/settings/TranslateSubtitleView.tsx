import { useTranslation } from "react-i18next";

import { FlagIcon } from "@/components/FlagIcon";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { getPrettyLanguageNameFromLocale } from "@/utils/language";

import { CaptionOption } from "./CaptionsView";

// https://developers.google.com/workspace/admin/directory/v1/languages
const availableLanguages: string[] = [
  "am",
  "ar",
  "eu",
  "bn",
  "en-GB",
  "pt-BR",
  "bg",
  "ca",
  "chr",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fil",
  "fi",
  "fr",
  "de",
  "el",
  "gu",
  "iw",
  "hi",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "kn",
  "ko",
  "lv",
  "lt",
  "ms",
  "ml",
  "mr",
  "no",
  "pl",
  "pt-PT",
  "ro",
  "ru",
  "sr",
  "zh-CN",
  "sk",
  "sl",
  "es",
  "sw",
  "sv",
  "ta",
  "te",
  "th",
  "zh-TW",
  "tr",
  "ur",
  "uk",
  "vi",
  "cy",
];

export interface LanguageSubtitlesViewProps {
  id: string;
  caption: CaptionListItem;
  overlayBackLink?: boolean;
}

export function TranslateSubtitleView({
  id,
  caption,
  overlayBackLink,
}: LanguageSubtitlesViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);

  function renderTargetLang(langCode: string) {
    const friendlyName = getPrettyLanguageNameFromLocale(langCode);

    return (
      <CaptionOption countryCode={langCode} flag>
        {friendlyName}
      </CaptionOption>
    );
  }

  return (
    <>
      <Menu.BackLink
        onClick={() =>
          router.navigate(
            overlayBackLink
              ? "/captionsOverlay/languagesOverlay"
              : "/captions/languages",
          )
        }
      >
        <span className="flex items-center">
          <FlagIcon langCode={caption.language} />
          <span className="ml-3">
            {t("player.menus.subtitles.translate.title", {
              replace: {
                language:
                  getPrettyLanguageNameFromLocale(caption.language) ??
                  caption.language,
              },
            })}
          </span>
        </span>
      </Menu.BackLink>

      <div className="!pt-1 mt-2 pb-3">
        {availableLanguages.map(renderTargetLang)}
      </div>
    </>
  );
}
