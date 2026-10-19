/**
 * Browse Nexus Extension
 * Provides browsing functionality for Nexus Mods collections and mods
 */

import { mdiViewGridOutline } from "@mdi/js";

import type { IExtensionContext } from "../../types/IExtensionContext";
import { activeGameId } from "../../util/selectors";
import BrowsePage from "./views/browse_page/BrowsePage";

function init(context: IExtensionContext): boolean {
  context.registerMainPage("search", "Browse", BrowsePage, {
    priority: 0,
    hotkey: "B",
    group: "per-game",
    visible: () => activeGameId(context.api.store.getState()) !== undefined,
    props: () => ({
      api: context.api,
    }),
    mdi: mdiViewGridOutline,
    newLayout: true,
  });

  return true;
}

export default init;
