import { mdiDeleteOutline, mdiDotsHorizontal, mdiFilterVariant, mdiPencil, mdiTune } from "@mdi/js";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { Button } from "@/ui/components/button/Button";
import { useDisplayOptionsAction } from "@/ui/components/display_options/useDisplayOptionsAction.hook";
import { Pagination } from "@/ui/components/pagination/Pagination";
import { Toolbar } from "@/ui/components/toolbar/Toolbar";
import { ToolbarGroup } from "@/ui/components/toolbar/ToolbarGroup";
import { Typography } from "@/ui/components/typography/Typography";
import { type IViewPickerView, ViewPicker } from "@/ui/components/view_picker/ViewPicker";
import { PageContent } from "@/views/components/Page/PageContent";
import { PageScroll } from "@/views/components/Page/PageScroll";

import { Search } from "../../../gamemode_management/components/search/Search";
import { currentGame } from "../../../gamemode_management/selectors";
import { gameHeroImageURL } from "../../../nexus_integration/util/gameImageURLs";
import { ModCard } from "./mod_card/ModCard";
import { ModDetails } from "./mod_details/ModDetails";
import { STATIC_MODS } from "./staticMods";

/** The results count the bar shows, for the pagination to page through. */
const STATIC_RESULTS = 121867;

/**
 * The active game's mods, a static wireframe (LAZ-1346): its parts with no component yet
 * are placeholders that say what they will be. Its own scroll region sits under the bar of
 * views, search and filters, so the bar stays put; like `PageHeader` it leaves `pr-scrollbar`
 * for the scroll region's gutter. The game's hero art stays at the top behind the scrolling
 * mods, fading into the surface by its bottom edge, with `ModDetails` sticking beside them.
 */
export const BrowseMods = () => {
  const { t } = useTranslation();
  const game = useSelector(currentGame);
  const heroUrl = !!game && gameHeroImageURL(game);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("trending");
  const [page, setPage] = useState(1);
  const [activeMod, setActiveMod] = useState(STATIC_MODS[0].name);
  const active = STATIC_MODS.find((mod) => mod.name === activeMod) ?? STATIC_MODS[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  const views: IViewPickerView[] = [
    { id: "trending", label: t("Trending") },
    { id: "popular", label: t("Most popular") },
    { id: "new", label: t("New") },
    {
      id: "custom",
      label: t("My custom view"),
      actions: [
        [
          { label: t("Rename view"), iconPath: mdiPencil, onClick: () => undefined },
          { label: t("Edit view options"), iconPath: mdiTune, onClick: () => undefined },
          { label: t("Delete view"), iconPath: mdiDeleteOutline, onClick: () => undefined },
        ],
      ],
    },
  ];

  const displayOptions = useDisplayOptionsAction({
    label: t("View options"),
    canReset: false,
    children: <div className="p-3">{t("View options will go here")}</div>,
    onReset: () => undefined,
  });

  const filter = {
    id: "filter",
    label: t("Filter"),
    iconPath: mdiFilterVariant,
    onClick: () => undefined,
  };

  return (
    <>
      <div className="border-b border-stroke-weak pr-scrollbar">
        <PageContent isFullWidth className="flex items-center justify-between gap-x-3 px-6 py-2">
          <ViewPicker
            className="min-w-0 flex-1"
            label={t("Views")}
            selectedView={view}
            views={views}
            onAddView={() => undefined}
            onSelectView={setView}
          />

          <div className="flex shrink-0 items-center gap-x-3">
            <Typography appearance="moderate" brand="neutral-translucent" typographyType="body-sm">
              {t("121,867 results")}
            </Typography>

            <Search placeholder={t("Search mods...")} value={search} onChange={setSearch} />

            <Toolbar>
              <ToolbarGroup actions={[filter, displayOptions]} />
            </Toolbar>

            <Button
              appearance="weak"
              aria-label={t("More")}
              brand="neutral"
              leftIconPath={mdiDotsHorizontal}
            />
          </div>
        </PageContent>
      </div>

      <div className="relative isolate flex min-h-0 flex-1 flex-col">
        {!!heroUrl && (
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="relative">
              <img alt="" className="w-full" src={heroUrl} />

              <div className="absolute inset-0 bg-radial-[100%_124%_at_100%_0%] from-surface-low/15 to-surface-low to-80%" />
            </div>
          </div>
        )}

        <PageScroll isFullWidth className="grid grid-cols-2 gap-6 p-6" ref={scrollRef}>
          <div className="flex flex-col gap-y-6">
            {STATIC_MODS.map((mod) => (
              <ModCard
                isActive={mod.name === activeMod}
                key={mod.name}
                mod={mod}
                onSelect={() => setActiveMod(mod.name)}
              />
            ))}

            <Pagination
              currentPage={page}
              recordsPerPage={STATIC_MODS.length}
              scrollRef={scrollRef}
              totalRecords={STATIC_RESULTS}
              onPaginationUpdate={setPage}
            />
          </div>

          <ModDetails mod={active} />
        </PageScroll>
      </div>
    </>
  );
};
