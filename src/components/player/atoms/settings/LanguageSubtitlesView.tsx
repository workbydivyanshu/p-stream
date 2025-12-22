import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAsyncFn } from "react-use";

import { FlagIcon } from "@/components/FlagIcon";
import { useCaptions } from "@/components/player/hooks/useCaptions";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { getPrettyLanguageNameFromLocale } from "@/utils/language";

import { CaptionOption } from "./CaptionsView";

export interface LanguageSubtitlesViewProps {
  id: string;
  language: string;
}

export function LanguageSubtitlesView({
  id,
  language,
}: LanguageSubtitlesViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const selectedCaptionId = usePlayerStore((s) => s.caption.selected?.id);
  const { selectCaptionById } = useCaptions();
  const [currentlyDownloading, setCurrentlyDownloading] = useState<
    string | null
  >(null);
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

  // Filter captions for this specific language
  const languageCaptions = useMemo(
    () => captions.filter((caption) => caption.language === language),
    [captions, language],
  );

  // Download handler
  const [downloadReq, startDownload] = useAsyncFn(
    async (captionId: string) => {
      setCurrentlyDownloading(captionId);
      return selectCaptionById(captionId);
    },
    [selectCaptionById, setCurrentlyDownloading],
  );

  const languageName = useMemo(() => {
    return (
      getPrettyLanguageNameFromLocale(language) ||
      t("player.menus.subtitles.unknownLanguage")
    );
  }, [language, t]);

  const renderSubtitleOption = (
    v: CaptionListItem & { languageName: string },
  ) => {
    const handleDoubleClick = async () => {
      const copyData = {
        id: v.id,
        url: v.url,
        language: v.language,
        type: v.type,
        hasCorsRestrictions: v.needsProxy,
        opensubtitles: v.opensubtitles,
        display: v.display,
        media: v.media,
        isHearingImpaired: v.isHearingImpaired,
        source: v.source,
        encoding: v.encoding,
        delay: 0, // Will be set from current delay if needed
      };

      try {
        await navigator.clipboard.writeText(JSON.stringify(copyData));
      } catch (err) {
        console.error("Failed to copy subtitle data:", err);
      }
    };

    return (
      <CaptionOption
        key={v.id}
        countryCode={v.language}
        selected={v.id === selectedCaptionId}
        loading={v.id === currentlyDownloading && downloadReq.loading}
        error={
          v.id === currentlyDownloading && downloadReq.error
            ? downloadReq.error.toString()
            : undefined
        }
        onClick={() => startDownload(v.id)}
        onDoubleClick={handleDoubleClick}
        flag
        subtitleUrl={v.url}
        subtitleType={v.type}
        subtitleSource={v.source}
        subtitleEncoding={v.encoding}
        isHearingImpaired={v.isHearingImpaired}
      >
        {v.languageName}
      </CaptionOption>
    );
  };

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/captions")}>
        <span className="flex items-center">
          <FlagIcon langCode={language} />
          <span className="ml-3">{languageName}</span>
        </span>
      </Menu.BackLink>

      <Menu.ScrollToActiveSection className="!pt-1 mt-2 pb-3">
        {/* Language subtitles */}
        {languageCaptions.length > 0 ? (
          languageCaptions.map((caption) => (
            <div key={caption.id}>
              {renderSubtitleOption({
                ...caption,
                languageName,
              })}
            </div>
          ))
        ) : (
          <div className="text-center text-video-context-type-secondary py-2">
            {t("player.menus.subtitles.notFound")}
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingExternalSubtitles && (
          <div className="text-center text-video-context-type-secondary py-4 mt-2">
            {t("player.menus.subtitles.loadingExternal") ||
              "Loading external subtitles..."}
          </div>
        )}
      </Menu.ScrollToActiveSection>
    </>
  );
}
