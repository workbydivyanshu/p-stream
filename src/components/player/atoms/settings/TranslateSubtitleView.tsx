import { useTranslation } from "react-i18next";

import { FlagIcon } from "@/components/FlagIcon";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";

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
          <span className="ml-3">Translate from {caption.id}</span>
        </span>
      </Menu.BackLink>

      <div className="!pt-1 mt-2 pb-3">
        <div className="text-center text-video-context-type-secondary py-2">
          {t("player.menus.subtitles.notFound")}
        </div>
      </div>
    </>
  );
}
