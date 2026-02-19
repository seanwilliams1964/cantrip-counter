import { MODULE_ID } from "./settings.js";
import { isConversionEnabled, updateCantripResourceColor, updateConversionGlow, updateGearGlow } from "./helpers.js";
import { openConversionDialog, openActorConfigDialog } from "./dialogs.js";
import { debugLog } from "./debug.js";
import { getRenderedSheetRoot } from "./utility.js";
import { openActorColorConfig } from "./actor-config.js";

/* -------------------------------------------- */
/*  RENDER ACTOR SHEET                          */
/* -------------------------------------------- */

Hooks.on("renderActorSheetV2", async (app) => {

  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  /* -------------------------------------------- */
  /*  Resolve Fully Rendered Sheet Root           */
  /* -------------------------------------------- */

  const root = await getRenderedSheetRoot(app);
  if (!root) return;

  debugLog(`Root: ${root}`);
  debugLog(`App Id: ${app.id}`);

  /* -------------------------------------------- */
  /*  Locate Primary Resource                     */
  /* -------------------------------------------- */

  const primaryResource = root.querySelector('li.resource[data-favorite-id="resources.primary"]');
  if (!primaryResource) return;

  debugLog(`Primary resource: ${primaryResource}`);  

  applyCantripLogic(app, root, primaryResource);
});

/* -------------------------------------------- */
/*  UI REFRESH                                  */
/* -------------------------------------------- */

Hooks.on("cantripCounterRefreshUI", () => {
  for (const app of Object.values(ui.windows)) {
    if (app?.object?.type === "character") {
      app.render(false);
    }
  }
});

/* -------------------------------------------- */
/*  APPLY CANTRIP LOGIC                         */
/* -------------------------------------------- */

function applyCantripLogic(app, root, primaryResource) {

  const actor = app.actor;

  /* ---------- Locate Icon ---------- */

  const figure = primaryResource.querySelector("figure");
  debugLog(`Figure: ${figure}`);
  if (!figure) return;

  const existingIcon = figure.querySelector("img");
  debugLog(`Existing Icon: ${existingIcon}`);
  if (!existingIcon) return;

  /* ---------- Mode + State ---------- */

  const isEditMode = !!root.querySelector("input.document-name");
  const conversionEnabled = isConversionEnabled(actor);

  debugLog(`Is Edit Mode: ${isEditMode}`);
  debugLog(`Is Conversion Enabled: ${conversionEnabled}`);

  /* ---------- Restrict Manual Editing For Non-GM ---------- */

  const valueInput = primaryResource.querySelector(
    'input.uninput.value'
  );

  if (valueInput) {

    if (!game.user.isGM) {

      debugLog("Disabling manual cantrip editing for non-GM");

      valueInput.disabled = true;
      valueInput.style.pointerEvents = "none";
      valueInput.style.opacity = "0.7";
      valueInput.title = "Only the GM may manually adjust cantrip uses.";

    } else {

      // Restore normal behavior for GM
      valueInput.disabled = false;
      valueInput.style.pointerEvents = "";
      valueInput.style.opacity = "";
      valueInput.title = "";
    }
  }

  /* ---------- Replace Icon ---------- */

  const customIcon = game.settings.get(MODULE_ID, "cantripIcon");
  const defaultIcon = `modules/${MODULE_ID}/assets/cantrips.png`;

  debugLog(`Custom Icon: ${customIcon}`);
  debugLog(`Default Icon: ${defaultIcon}`);

  const icon = existingIcon.cloneNode(true);
  icon.src =
    customIcon && customIcon.trim() !== ""
      ? customIcon
      : defaultIcon;

  figure.replaceChild(icon, existingIcon);

  /* ---------- Icon Interaction ---------- */

  if (isEditMode) {

    icon.style.cursor = "default";
    icon.title = "Cantrip Uses (Locked in Edit Mode)";

  } else {

    if (conversionEnabled) {

      debugLog("Conversion Enabled");

      icon.style.cursor = "pointer";
      icon.title = "Convert Cantrips to Spell Slots";

      icon.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openConversionDialog(actor);
      });

    } else {

      icon.style.cursor = "default";
      icon.title = "Cantrip Uses";
    }
  }

  /* ---------- Delete Favorite Handling ---------- */

  const deleteButton = primaryResource.querySelector(
    'button[data-action="deleteFavorite"]'
  );

  debugLog(`Delete Button: ${deleteButton}`);

  if (deleteButton) {

    if (isEditMode) {

      debugLog("Disabling deleteFavorite button (edit mode)");

      deleteButton.disabled = true;
      deleteButton.style.pointerEvents = "none";
      deleteButton.style.opacity = "0.4";

    } else {

      debugLog("Restoring deleteFavorite button (normal mode)");

      deleteButton.disabled = false;
      deleteButton.style.pointerEvents = "";
      deleteButton.style.opacity = "";
    }
  }

  /* ---------- GM Config Gear ---------- */

  if (game.user.isGM && isEditMode) {

    const headerButtons = root.querySelector(".sheet-header-buttons");

    if (headerButtons && !headerButtons.querySelector(".cantrip-config-gear")) {

      const gear = document.createElement("button");
      gear.type = "button";
      gear.classList.add("gold-button", "cantrip-config-gear");
      gear.innerHTML = `<i class="fas fa-cog"></i>`;
      gear.title = "Cantrip Conversion Settings";
      gear.style.marginLeft = "4px";

      gear.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openActorConfigDialog(actor);
      });

      headerButtons.appendChild(gear);
    }
  }

  /* ---------- Player Color Config Icon ---------- */

  // Remove existing icon if present (prevents duplication)
  const existingColorIcon = primaryResource.querySelector(".cantrip-color-config");
  if (existingColorIcon) {
    existingColorIcon.remove();
  }

  if (isEditMode) {

    const colorIcon = document.createElement("button");
    colorIcon.type = "button";
    colorIcon.classList.add("gold-button", "cantrip-color-config");
    colorIcon.innerHTML = `<i class="fas fa-palette"></i>`;
    colorIcon.title = "Configure Cantrip Resource Colors";
    colorIcon.style.marginLeft = "4px";

    colorIcon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openActorColorConfig(actor);
    });

    primaryResource.appendChild(colorIcon);

    debugLog("Injected player color configuration icon.");
  }

  /* ---------- Apply Color + Glow ---------- */

  const color = updateCantripResourceColor(root, actor);

  updateConversionGlow(root, actor, color);
  updateGearGlow(root, actor, color);
}
