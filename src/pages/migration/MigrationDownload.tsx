import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { Stepper } from "@/components/layout/Stepper";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { Divider } from "@/components/utils/Divider";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useProgressStore } from "@/stores/progress";

export function MigrationDownloadPage() {
  const { t } = useTranslation();
  const user = useAuthStore();
  const navigate = useNavigate();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const progress = useProgressStore((s) => s.items);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDownload = useCallback(() => {
    try {
      // Create a data object containing user's account data, bookmarks, and progress
      const exportData = {
        account: {
          profile: user.account?.profile,
          deviceName: user.account?.deviceName,
        },
        bookmarks,
        progress,
        exportDate: new Date().toISOString(),
      };

      // Convert to JSON and create a downloadable link
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

      // Create filename with current date
      const exportFileDefaultName = `p-stream-data-${new Date().toISOString().split("T")[0]}.json`;

      // Create a temporary link element and click it to trigger download
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      setStatus("success");
    } catch (error) {
      console.error("Error during data download:", error);
      setStatus("error");
    }
  }, [bookmarks, progress, user.account]);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.migration" />
      <CenterContainer>
        {user.account ? (
          <div>
            <Stepper steps={2} current={2} className="mb-12" />
            <Heading2 className="!text-4xl">
              {t("migration.download.title")}
            </Heading2>
            <div className="space-y-6 max-w-3xl mx-auto">
              <Paragraph className="text-lg max-w-md">
                {t("migration.download.description")}
              </Paragraph>
              <SettingsCard>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-white">
                    {t("migration.download.title")}
                  </p>
                </div>
                <Divider marginClass="my-6 px-8 box-content -mx-8" />
                <div className="text-white mb-4">
                  <p>{t("migration.download.items.description")}</p>
                  <ul className="list-disc ml-6 mt-2">
                    <li>{t("migration.download.items.profile")}</li>
                    <li>
                      {t("migration.download.items.bookmarks")} (
                      {Object.keys(bookmarks).length} items)
                    </li>
                    <li>
                      {t("migration.download.items.progress")} (
                      {Object.keys(progress).length} items)
                    </li>
                  </ul>
                </div>
              </SettingsCard>
            </div>
            <Divider />
            <div className="flex justify-between">
              <Button theme="secondary" onClick={() => navigate("/migration")}>
                {t("migration.back")}
              </Button>
              {status !== "success" && (
                <Button theme="purple" onClick={handleDownload}>
                  {t("migration.download.button.download")}
                </Button>
              )}

              {status === "success" && (
                <div>
                  <Button theme="purple" onClick={() => navigate("/")}>
                    {t("migration.download.button.home")}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-center pt-4">
              {status === "success" && (
                <p className="text-green-600 mt-4">
                  {t("migration.download.status.success")}
                </p>
              )}
              {status === "error" && (
                <p className="text-red-600 mt-4">
                  {t("migration.download.status.error")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center mb-8">
            <Paragraph className="max-w-[320px] text-md">
              {t("migration.loginRequired")}
            </Paragraph>
            <Button
              theme="purple"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              {t("migration.download.button.home")}
            </Button>
          </div>
        )}
      </CenterContainer>
    </MinimalPageLayout>
  );
}
