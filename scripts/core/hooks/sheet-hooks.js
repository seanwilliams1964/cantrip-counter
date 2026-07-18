import { hasCantripCounterEligibility } from "../../logic/eligibility.js";
import {
  syncConversionResource,
  syncResource
} from "../../logic/resources.js";
import { applyCantripSheetControls } from "../../ui/sheet-integration.js";
import {
  getRenderedSheetRoot,
  getResourceRowFromRoot
} from "../../ui/sheet-dom.js";
import {
  injectTidyCantripResource,
  refreshTidyCantripResource
} from "../../ui/tidy-sheet.js";
import { RESOURCE_LABEL } from "../../utilities/constants.js";
import { debugLog } from "../../utilities/debug.js";

Hooks.on("renderActorSheet5eCharacter", lockCantripResourceLabel);
Hooks.on("renderActorSheet5eCharacter", handleCantripSheetRender);
Hooks.on("renderActorSheet5eCharacter2", handleCantripSheetRender);
Hooks.on("renderActorSheetV2", handleCantripSheetRender);

Hooks.on("cantripCounterRefreshUI", () => {
  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    for (const application of Object.values(actor.apps ?? {})) {
      if (typeof application.render === "function") {
        application.render(false);
      }
    }
  }
});

function lockCantripResourceLabel(app, html) {
  const input = html.find?.(
    'input[name="system.resources.secondary.label"]'
  );
  if (input?.val?.() === RESOURCE_LABEL.cantripUses) {
    input.prop("disabled", true);
  }
}

async function handleCantripSheetRender(app) {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  await syncResource(actor);
  await syncConversionResource(actor);

  if (
    actor.system.resources?.secondary?.label
    !== RESOURCE_LABEL.cantripUses
  ) {
    return;
  }

  const root = await getRenderedSheetRoot(app);
  if (!root) return;

  let secondary = getResourceRowFromRoot(
    root,
    "secondary",
    RESOURCE_LABEL.cantripUses
  );

  if (!secondary) {
    const tidyContainer =
      root.querySelector(
        '.tidy-tab.favorites .favorites.list,'
        + ' [data-tidy-sheet-part="tab-content"] .favorites.list'
      )
      ?? root.querySelector("[data-tidy-favorites]");

    if (tidyContainer) {
      delete root.dataset.cantripCounterRetryCount;
      secondary = injectTidyCantripResource(app, root, tidyContainer);
    } else if (
      app.constructor.name?.includes("Tidy")
      || root.classList.contains("tidy5e-sheet")
    ) {
      scheduleTidyRetry(app, root);
      return;
    }
  }

  const tertiary = getResourceRowFromRoot(
    root,
    "tertiary",
    RESOURCE_LABEL.dailyConversions
  );

  if (!hasCantripCounterEligibility(actor)) {
    if (secondary) secondary.style.display = "none";
    if (tertiary) tertiary.style.display = "none";
    return;
  }

  if (secondary) {
    secondary.style.display = "";
    refreshTidyCantripResource(actor, secondary);
    applyCantripSheetControls(app, root, secondary);
  }

  if (
    tertiary
    && actor.system.resources?.tertiary?.label
      === RESOURCE_LABEL.dailyConversions
  ) {
    tertiary.style.display = "none";
  }
}

function scheduleTidyRetry(app, root) {
  const retryCount = Number(root.dataset.cantripCounterRetryCount ?? 0);
  if (retryCount >= 10) {
    debugLog(`Tidy resource container not found for ${app.actor.name}.`);
    return;
  }

  root.dataset.cantripCounterRetryCount = String(retryCount + 1);
  setTimeout(() => {
    if (document.getElementById(app.id)) handleCantripSheetRender(app);
  }, 100);
}
