import { mdiCircleMedium, mdiDownload } from "@mdi/js";
import numeral from "numeral";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Author } from "@/ui/components/author/Author";
import { Button } from "@/ui/components/button/Button";
import { Image } from "@/ui/components/image/Image";
import { Pill } from "@/ui/components/pill/Pill";
import { TabBar } from "@/ui/components/tabs/TabBar";
import { TabButton } from "@/ui/components/tabs/TabButton";
import { TabPanel } from "@/ui/components/tabs/TabPanel";
import { TabProvider } from "@/ui/components/tabs/Tabs.context";
import { Typography } from "@/ui/components/typography/Typography";
import { joinClasses } from "@/ui/utils/joinClasses";
import { useRelativeTime } from "@/util/useRelativeTime";

import { type IStaticMod, MOD_IMAGES } from "../staticMods";

/** Skyrim SE screenshots from Nexus Mods, standing in for the selected mod's gallery. */
const STATIC_GALLERY = [
  "250116957-1745777127.jpg",
  "56492487-1564931448.png",
  "180634026-1782633084.jpg",
  "66238536-1776153857.jpg",
  "66238536-1778202756.jpg",
];

const placeholderClass =
  "flex items-center justify-center rounded-sm border border-dashed border-stroke-moderate p-4 text-center";

interface IModDetailsProps {
  /** The mod picked in the list. */
  mod: IStaticMod;
}

/**
 * The selected mod's details, files, comments and images, a static wireframe (LAZ-1346) showing
 * the mod picked in the list; its gallery, "+10 more" tag and unique downloads are stand-ins.
 * It sticks to the top of the scroll region it's in. Its header of tabs and install stays put
 * while the panels under it scroll on their own when they're taller; the panels' bottom
 * padding masks them, so they fade into whatever is behind as they scroll under. The mask
 * leaves the scrollbar's strip alone, and that strip is always kept: images keep their aspect,
 * so its coming and going would change their height and could keep a scrollbar with nothing
 * to scroll.
 */
export const ModDetails = ({ mod }: IModDetailsProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("details");
  const updated = useRelativeTime(new Date(mod.updatedAt).getTime(), t);
  const created = useRelativeTime(new Date(mod.createdAt).getTime(), t);

  const stats = [
    { label: t("Endorsements"), value: numeral(mod.endorsements).format("0a") },
    { label: t("Unique DLs"), value: "—" },
    { label: t("Total DLs"), value: numeral(mod.downloads).format("0a") },
    { label: t("Updated"), value: updated },
    { label: t("Created"), value: created },
    { label: t("File size"), value: numeral(mod.fileSize * 1024).format("0.0b") },
  ];

  return (
    <div className="sticky top-6 flex max-h-[calc(100cqh-3rem)] min-w-0 flex-col self-start overflow-hidden rounded-sm border border-stroke-weak bg-surface-translucent-low bg-radial-[100%_54.7%_at_0%_0%] from-surface-low/40 from-50% to-surface-low/20 shadow-sm backdrop-blur-[6.25rem]">
      <TabProvider
        tab={tab}
        tabListId="browse-mod-details-tabs"
        tabType="secondary"
        onSetSelectedTab={setTab}
      >
        <div className="flex items-start gap-x-4 px-5 pt-5 pb-3">
          <TabBar className="min-w-0 flex-1">
            <TabButton name={t("Details")} panelId="details" />

            <TabButton name={t("Files")} panelId="files" />

            <TabButton name={t("Comments")} panelId="comments" />

            <TabButton name={t("Images")} panelId="images" />
          </TabBar>

          <Button leftIconPath={mdiDownload} size="sm">
            {t("1-click install")}
          </Button>
        </div>

        <div className="min-h-0 scrollbar-gutter-stable overflow-y-auto pr-3 pb-5 pl-5 [mask:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent),linear-gradient(#000_0_0)_right/var(--scrollbar-size)_100%_no-repeat]">
          <TabPanel id="details">
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-2">
                <Image
                  alt=""
                  className="w-full rounded-sm"
                  fit="cover"
                  imageType="mod"
                  src={`${MOD_IMAGES}/${mod.image}`}
                />

                <div className="flex gap-x-1.5">
                  {STATIC_GALLERY.map((image, index) => (
                    <Image
                      alt=""
                      className={joinClasses(["min-w-0 flex-1 rounded-xs"], {
                        "[&_.nxm-image-frame]:border-neutral-strong": index === 0,
                      })}
                      fit="cover"
                      imageType="mod"
                      key={image}
                      src={`https://staticdelivery.nexusmods.com/images/1704/thumbnails/${image}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Typography
                  appearance="moderate"
                  as="div"
                  brand="neutral-translucent"
                  typographyType="body-sm"
                >
                  <Author name={mod.author} />
                </Typography>

                <span aria-hidden className="h-5.5 w-px bg-stroke-weak" />

                <div className="flex flex-wrap gap-1">
                  {mod.isAdult && (
                    <Pill brand="danger" iconPath={mdiCircleMedium}>
                      {t("Adult")}
                    </Pill>
                  )}

                  <Pill>{mod.category}</Pill>

                  <Pill>{t("+10 more")}</Pill>
                </div>
              </div>

              <div className="flex flex-col gap-y-1">
                <Typography
                  appearance="moderate"
                  as="h3"
                  className="font-medium"
                  typographyType="body-xl"
                >
                  {mod.name}
                </Typography>

                <Typography appearance="subdued">{mod.summary}</Typography>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-stroke-weak pt-4 pb-2">
                {stats.map(({ label, value }) => (
                  <div className="min-w-24 flex-1" key={label}>
                    <Typography appearance="moderate" className="font-medium">
                      {value}
                    </Typography>

                    <Typography
                      appearance="subdued"
                      brand="neutral-translucent"
                      typographyType="body-sm"
                    >
                      {label}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>
          </TabPanel>

          <TabPanel id="files">
            <div className={placeholderClass}>{t("The mod's files will go here")}</div>
          </TabPanel>

          <TabPanel id="comments">
            <div className={placeholderClass}>{t("The mod's comments will go here")}</div>
          </TabPanel>

          <TabPanel id="images">
            <div className={placeholderClass}>{t("The mod's images will go here")}</div>
          </TabPanel>
        </div>
      </TabProvider>
    </div>
  );
};
