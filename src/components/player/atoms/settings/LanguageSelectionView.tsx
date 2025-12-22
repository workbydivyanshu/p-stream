import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { FlagIcon } from "@/components/FlagIcon";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";
import { getPrettyLanguageNameFromLocale } from "@/utils/language";

export interface LanguageSelectionViewProps {
  id: string;
  onChoose?: (language: string) => void;
}

export function LanguageSelectionView({
  id,
  onChoose,
}: LanguageSelectionViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);

  // Get all captions
  const captionList = usePlayerStore((s) => s.captionList);
  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const isLoadingExternalSubtitles = usePlayerStore(
    (s) => s.isLoadingExternalSubtitles,
  );

  // Get combined caption list
  const captions = useMemo(
    () =>
      captionList.length !== 0 ? captionList : (getHlsCaptionList?.() ?? []),
    [captionList, getHlsCaptionList],
  );

  // Group captions by language
  const groupedCaptions = useMemo(() => {
    const groups: Record<string, typeof captions> = {};

    captions.forEach((caption) => {
      const lang = caption.language;
      if (!groups[lang]) {
        groups[lang] = [];
      }
      groups[lang].push(caption);
    });

    // Sort languages
    const sortedGroups: Array<{
      language: string;
      captions: typeof captions;
      languageName: string;
    }> = [];
    Object.entries(groups).forEach(([lang, captionsForLang]) => {
      const languageName =
        getPrettyLanguageNameFromLocale(lang) ||
        t("player.menus.subtitles.unknownLanguage");
      sortedGroups.push({
        language: lang,
        captions: captionsForLang,
        languageName,
      });
    });

    return sortedGroups.sort((a, b) =>
      a.languageName.localeCompare(b.languageName),
    );
  }, [captions, t]);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/captions")}>
        {t("player.menus.subtitles.selectLanguage")}
      </Menu.BackLink>
      <Menu.Section className="pb-4">
        {groupedCaptions.length > 0 ? (
          groupedCaptions.map(
            ({ language, languageName, captions: captionsForLang }) => (
              <Menu.ChevronLink
                key={language}
                rightText={captionsForLang.length.toString()}
                onClick={() => {
                  onChoose?.(language);
                  router.navigate("/captions/languages/language");
                }}
              >
                <span className="flex items-center">
                  <FlagIcon langCode={language} />
                  <span className="ml-3">{languageName}</span>
                </span>
              </Menu.ChevronLink>
            ),
          )
        ) : (
          <div className="text-center text-video-context-type-secondary py-2">
            {t("player.menus.subtitles.notFound")}
          </div>
        )}
      </Menu.Section>
      {/* Loading indicator */}
      {isLoadingExternalSubtitles && (
        <div className="text-center text-video-context-type-secondary py-4">
          {t("player.menus.subtitles.loadingExternal") ||
            "Loading external subtitles..."}
        </div>
      )}
    </>
  );
}
