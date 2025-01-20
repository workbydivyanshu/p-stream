import classNames from "classnames";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Stepper } from "@/components/layout/Stepper";
import { BiggerCenterContainer } from "@/components/layout/ThinContainer";
import { VerticalLine } from "@/components/layout/VerticalLine";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { Heading1, Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import {
  useNavigateOnboarding,
  useRedirectBack,
} from "@/pages/onboarding/onboardingHooks";
import { Card, CardContent, Link } from "@/pages/onboarding/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { getProxyUrls } from "@/utils/proxyUrls";

function HorizontalLine(props: { className?: string }) {
  return (
    <div className={classNames("w-full grid justify-center", props.className)}>
      <div className="h-px w-10 bg-onboarding-divider" />
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigateOnboarding();
  const skipModal = useModal("skip");
  const { completeAndRedirect } = useRedirectBack();
  const { t } = useTranslation();
  const noProxies = getProxyUrls().length === 0;

  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/Edg/.test(navigator.userAgent);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.onboarding" />
      <Modal id={skipModal.id}>
        <ModalCard>
          <Heading1 className="!mt-0 !mb-4 !text-2xl">
            {t("onboarding.defaultConfirm.title")}
          </Heading1>
          <Paragraph className="!mt-1 !mb-12">
            {t("onboarding.defaultConfirm.description")}
          </Paragraph>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
            <Button theme="secondary" onClick={skipModal.hide}>
              {t("onboarding.defaultConfirm.cancel")}
            </Button>
            <Button theme="purple" onClick={() => completeAndRedirect()}>
              {t("onboarding.defaultConfirm.confirm")}
            </Button>
          </div>
        </ModalCard>
      </Modal>
      <BiggerCenterContainer>
        <Stepper steps={2} current={1} className="mb-12" />
        <Heading2 className="!mt-0 !text-3xl">
          {t("onboarding.start.title")}
        </Heading2>
        <Paragraph className="max-w-[360px]">
          {t("onboarding.start.explainer")}
        </Paragraph>

        <div className="w-full flex flex-col md:flex-row gap-3 pb-6">
          <Card
            onClick={() => navigate("/onboarding/extension")}
            className="md:w-1/3 md:h-full"
          >
            <CardContent
              colorClass="!text-onboarding-best"
              title={t("onboarding.start.options.extension.title")}
              subtitle={t("onboarding.start.options.extension.quality")}
              description={t("onboarding.start.options.extension.description")}
            >
              <Link>{t("onboarding.start.options.extension.action")}</Link>
            </CardContent>
          </Card>
          <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
            <VerticalLine className="items-end" />
            <span className="text-xs uppercase font-bold">
              {t("onboarding.start.options.or")}
            </span>
            <VerticalLine />
          </div>
          <Card
            onClick={() => navigate("/onboarding/proxy")}
            className="md:w-1/3"
          >
            <CardContent
              colorClass="!text-onboarding-good"
              title={t("onboarding.start.options.proxy.title")}
              subtitle={t("onboarding.start.options.proxy.quality")}
              description={t("onboarding.start.options.proxy.description")}
            >
              <Link>{t("onboarding.start.options.proxy.action")}</Link>
            </CardContent>
          </Card>
          {noProxies ? null : (
            <>
              <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
                <VerticalLine className="items-end" />
                <span className="text-xs uppercase font-bold">
                  {t("onboarding.start.options.or")}
                </span>
                <VerticalLine />
              </div>
              <Card
                onClick={
                  isSafari
                    ? () => completeAndRedirect() // Skip modal on Safari
                    : skipModal.show // Show modal on other browsers
                }
                className="md:w-1/3"
              >
                <CardContent
                  colorClass="!text-onboarding-bad"
                  title={t("onboarding.defaultConfirm.confirm")}
                  subtitle=""
                  description={t("onboarding.defaultConfirm.description")}
                >
                  <Trans i18nKey="onboarding.start.options.default.text" />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </BiggerCenterContainer>
    </MinimalPageLayout>
  );
}
