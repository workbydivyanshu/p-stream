import { ScrapeMedia } from "@p-stream/providers";
import React from "react";
import { useTranslation } from "react-i18next";

import {
  EmbedSelectionView,
  SourceSelectionView,
} from "@/components/player/atoms/settings/SourceSelectingView";
import { Menu } from "@/components/player/internals/ContextMenu";

// Main source selection view
export function SourceSelectPart(_props: { media: ScrapeMedia }) {
  const { t } = useTranslation();
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    null,
  );
  const routerId = "manualSourceSelect";

  if (selectedSourceId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full max-w-md h-[50vh] flex flex-col">
          <Menu.CardWithScrollable>
            <EmbedSelectionView
              sourceId={selectedSourceId}
              id={routerId}
              onBack={() => setSelectedSourceId(null)}
            />
          </Menu.CardWithScrollable>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-md h-[50vh] flex flex-col">
        <Menu.CardWithScrollable>
          <Menu.Title>{t("player.menus.sources.title")}</Menu.Title>
          <SourceSelectionView id={routerId} onChoose={setSelectedSourceId} />
        </Menu.CardWithScrollable>
      </div>
    </div>
  );
}
