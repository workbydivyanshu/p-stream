import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icons } from "@/components/Icon";
import { IconPill } from "@/components/layout/IconPill";
import { useModal } from "@/components/overlays/Modal";
import { Paragraph } from "@/components/text/Paragraph";
import { Title } from "@/components/text/Title";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { ErrorContainer, ErrorLayout } from "@/pages/layouts/ErrorLayout";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { ErrorCardInModal } from "../errors/ErrorCard";

export interface PlaybackErrorPartProps {
  onResume?: (startFromSourceId: string) => void;
  currentSourceId?: string | null;
}

export function PlaybackErrorPart(props: PlaybackErrorPartProps) {
  const { t } = useTranslation();
  const playbackError = usePlayerStore((s) => s.interface.error);
  const currentSourceId = usePlayerStore((s) => s.sourceId);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const modal = useModal("error");
  const settingsRouter = useOverlayRouter("settings");
  const hasOpenedSettings = useRef(false);
  const hasAutoResumed = useRef(false);
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const enableAutoResumeOnPlaybackError = usePreferencesStore(
    (s) => s.enableAutoResumeOnPlaybackError,
  );

  // Mark the failed source and handle UI when a playback error occurs
  useEffect(() => {
    if (playbackError && currentSourceId) {
      // Mark this source as failed
      addFailedSource(currentSourceId);

      if (!hasOpenedSettings.current && !enableAutoResumeOnPlaybackError) {
        hasOpenedSettings.current = true;
        // Reset the last successful source when a playback error occurs
        setLastSuccessfulSource(null);
        settingsRouter.open();
        settingsRouter.navigate("/source");
      }
    }
  }, [
    playbackError,
    currentSourceId,
    addFailedSource,
    settingsRouter,
    setLastSuccessfulSource,
    enableAutoResumeOnPlaybackError,
  ]);

  // Automatically resume scraping from the next source if enabled
  useEffect(() => {
    if (
      playbackError &&
      !hasAutoResumed.current &&
      enableAutoResumeOnPlaybackError &&
      props.currentSourceId &&
      props.onResume
    ) {
      hasAutoResumed.current = true;
      // Immediately call resume without delay since we don't need the overlay
      props.onResume!(props.currentSourceId!);
    }
  }, [
    playbackError,
    enableAutoResumeOnPlaybackError,
    props.currentSourceId,
    props.onResume,
  ]);

  const handleOpenSourcePicker = () => {
    settingsRouter.open();
    settingsRouter.navigate("/source");
  };

  return (
    <ErrorLayout>
      <ErrorContainer>
        <IconPill icon={Icons.WAND}>{t("player.playbackError.badge")}</IconPill>
        <Title>{t("player.playbackError.title")}</Title>
        <Paragraph>
          {enableAutoResumeOnPlaybackError
            ? t("player.playbackError.autoResumeText")
            : t("player.playbackError.text")}
        </Paragraph>
        <div className="flex gap-3">
          {props.currentSourceId &&
            props.onResume &&
            !enableAutoResumeOnPlaybackError && (
              <Button
                onClick={() => props.onResume!(props.currentSourceId!)}
                theme="purple"
                padding="md:px-12 p-2.5"
                className="mt-6"
              >
                {t("player.playbackError.resumeButton")}
              </Button>
            )}
          <Button
            onClick={handleOpenSourcePicker}
            theme="purple"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.menus.sources.title")}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => modal.show()}
            theme="danger"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("errors.showError")}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            href="/"
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.playbackError.homeButton")}
          </Button>
          <Button
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
          >
            {t("errors.reloadPage")}
          </Button>
        </div>
      </ErrorContainer>
      {/* Error */}
      <ErrorCardInModal
        onClose={() => modal.hide()}
        error={playbackError}
        id={modal.id}
      />
    </ErrorLayout>
  );
}
