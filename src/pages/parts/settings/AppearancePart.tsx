import classNames from "classnames";
import { useTranslation } from "react-i18next";

import { Toggle } from "@/components/buttons/Toggle";
import { Icon, Icons } from "@/components/Icon";
import { Heading1 } from "@/components/utils/Text";

const availableThemes = [
  {
    id: "default",
    selector: "theme-default",
    key: "settings.appearance.themes.default",
  },
  {
    id: "classic",
    selector: "theme-classic",
    key: "settings.appearance.themes.classic",
  },
  {
    id: "blue",
    selector: "theme-blue",
    key: "settings.appearance.themes.blue",
  },
  {
    id: "teal",
    selector: "theme-teal",
    key: "settings.appearance.themes.teal",
  },
  {
    id: "red",
    selector: "theme-red",
    key: "settings.appearance.themes.red",
  },
  {
    id: "gray",
    selector: "theme-gray",
    key: "settings.appearance.themes.gray",
  },
  {
    id: "green",
    selector: "theme-green",
    key: "settings.appearance.themes.green",
  },
  {
    id: "mocha",
    selector: "theme-mocha",
    key: "settings.appearance.themes.mocha",
  },
  {
    id: "pink",
    selector: "theme-pink",
    key: "settings.appearance.themes.pink",
  },
];

function ThemePreview(props: {
  selector?: string;
  active?: boolean;
  inUse?: boolean;
  name: string;
  onClick?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={classNames(props.selector, "cursor-pointer group tabbable")}
      onClick={props.onClick}
    >
      {/* Little card thing */}
      <div
        tabIndex={0}
        onKeyUp={(e) => e.key === "Enter" && e.currentTarget.click()}
        className={classNames(
          "tabbable scroll-mt-32 w-full h-32 relative rounded-lg border bg-gradient-to-br from-themePreview-primary/20 to-themePreview-secondary/10 bg-clip-content transition-colors duration-150",
          props.active
            ? "border-themePreview-primary"
            : "border-transparent group-hover:border-white/20",
        )}
      >
        {/* Dots */}
        <div className="absolute top-2 left-2">
          <div className="h-5 w-5 bg-themePreview-primary rounded-full" />
          <div className="h-5 w-5 bg-themePreview-secondary rounded-full -mt-2" />
        </div>
        {/* Active check */}
        <Icon
          icon={Icons.CHECKMARK}
          className={classNames(
            "absolute top-3 right-3 text-xs text-white transition-opacity duration-150",
            props.active ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Mini movie-web. So Kawaiiiii! */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-4/5 rounded-t-lg -mb-px bg-background-main overflow-hidden">
          <div className="relative w-full h-full">
            {/* Background color */}
            <div className="bg-themePreview-primary/50 w-[130%] h-10 absolute left-1/2 -top-5 blur-xl transform -translate-x-1/2 rounded-[100%]" />
            {/* Navbar */}
            <div className="p-2 flex justify-between items-center">
              <div className="flex space-x-1">
                <div className="bg-themePreview-ghost bg-opacity-10 w-4 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
              </div>
              <div className="bg-themePreview-ghost bg-opacity-10 w-2 h-2 rounded-full" />
            </div>
            {/* Hero */}
            <div className="mt-1 flex items-center flex-col gap-1">
              {/* Title and subtitle */}
              <div className="bg-themePreview-ghost bg-opacity-20 w-8 h-0.5 rounded-full" />
              <div className="bg-themePreview-ghost bg-opacity-20 w-6 h-0.5 rounded-full" />
              {/* Search bar */}
              <div className="bg-themePreview-ghost bg-opacity-10 w-16 h-2 mt-1 rounded-full" />
            </div>
            {/* Media grid */}
            <div className="mt-5 px-3">
              {/* Title */}
              <div className="flex gap-1 items-center">
                <div className="bg-themePreview-ghost bg-opacity-20 w-2 h-2 rounded-full" />
                <div className="bg-themePreview-ghost bg-opacity-20 w-8 h-0.5 rounded-full" />
              </div>
              {/* Blocks */}
              <div className="flex w-full gap-1 mt-1">
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
                <div className="bg-themePreview-ghost bg-opacity-10 w-full h-20 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <span className="font-medium text-white">{props.name}</span>
        <span
          className={classNames(
            "inline-block px-3 py-1 leading-tight text-sm transition-opacity duration-150 rounded-full bg-pill-activeBackground text-white/85",
            props.inUse ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {t("settings.appearance.activeTheme")}
        </span>
      </div>
    </div>
  );
}

export function AppearancePart(props: {
  active: string;
  inUse: string;
  setTheme: (theme: string) => void;

  enableDiscover: boolean;
  setEnableDiscover: (v: boolean) => void;

  enablePopDetails: boolean;
  setEnablePopDetails: (v: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      <Heading1 border>{t("settings.appearance.title")}</Heading1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* First Column - Preferences */}
        <div className="space-y-8">
          <div>
            <p className="text-white font-bold mb-3">
              {t("settings.appearance.options.discover")}
            </p>
            <p className="max-w-[25rem] font-medium">
              {t("settings.appearance.options.discoverDescription")}
            </p>
            <div
              onClick={() => props.setEnableDiscover(!props.enableDiscover)}
              className="bg-dropdown-background hover:bg-dropdown-hoverBackground select-none my-4 cursor-pointer space-x-3 flex items-center max-w-[25rem] py-3 px-4 rounded-lg"
            >
              <Toggle enabled={props.enableDiscover} />
              <p className="flex-1 text-white font-bold">
                {t("settings.appearance.options.discoverLabel")}
              </p>
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-3">
              {t("settings.appearance.options.hover")}
            </p>
            <p className="max-w-[25rem] font-medium">
              {t("settings.appearance.options.hoverDescription")}
            </p>
            <div
              onClick={() => props.setEnablePopDetails(!props.enablePopDetails)}
              className="opacity-50 md:opacity-100 bg-dropdown-background hover:bg-dropdown-hoverBackground select-none my-4 cursor-pointer space-x-3 flex items-center max-w-[25rem] py-3 px-4 rounded-lg"
            >
              <Toggle enabled={props.enablePopDetails} />
              <p className="flex-1 text-white font-bold">
                {t("settings.appearance.options.hoverLabel")}
              </p>
            </div>
          </div>
        </div>

        {/* Second Column - Themes */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 max-w-[600px]">
            {availableThemes.map((v) => (
              <ThemePreview
                selector={v.selector}
                active={props.active === v.id}
                inUse={props.inUse === v.id}
                name={t(v.key)}
                key={v.id}
                onClick={() => props.setTheme(v.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
