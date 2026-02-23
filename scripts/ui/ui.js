import { 
  MODULE_ID, 
  DEFAULT_MAX_CONVERSION_LEVEL, 
  ACTOR_FLAG, 
  GLOBAL_SETTING 
} from "../utilities/constants.js";
import { 
  openConversionDialog, 
  openActorConfigDialog, 
  openActorColorConfig 
} from "./dialogs.js";
import { debugLog } from "../utilities/debug.js";
import { getRenderedSheetRoot, querySheetAll  } from "../utilities/utility.js";
import { getActorSetting } from "../utilities/helpers.js";
import { getRemainingConversions } from "../logic/cantrip-state.js";
import {
  isConversionEnabled,
  getMaxConversionsPerLongRest,
  getCostPerLevel,
} from "../logic/conversions.js";

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

  const primaryResource = root.querySelector('li.resource[data-favorite-id="resources.secondary"]');
  if (!primaryResource) return;

  debugLog(`Primary resource: ${primaryResource}`);  

  applyCantripLogic(app, root, primaryResource);

  // Only hide if this is your tracked resource
  const tertiaryLabel = actor.system?.resources?.tertiary?.label;
  if (tertiaryLabel !== "Daily Conversions") return;

  debugLog(`Tertiary label: ${tertiaryLabel}`); 

  const tertiaryResource = root.querySelector('li.resource[data-favorite-id="resources.tertiary"]');
  if (!tertiaryResource) return;

  debugLog(`Tertiary resource: ${tertiaryResource}`); 

  tertiaryResource.style.display = "none"; 

});

Hooks.on("cantripCounterRefreshUI", () => {
  for (const app of Object.values(ui.windows)) {
    if (app?.object?.type === "character") {
      app.render(false);
    }
  }
});

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

function updateCantripResourceColor(html, actor) {

  debugLog("updateCantripResourceColor called for actor:", actor?.name);

  const resource = actor?.system?.resources?.secondary;
  if (!resource) {
    debugLog("No primary resource found.");
    return null;
  }

  const value = resource.value ?? 0;
  const max = resource.max ?? 1;
  const percent = max > 0 ? (value / max) * 100 : 0;

  debugLog("Resource values:", { value, max, percent });

  const valueInput = html.querySelector(
    'li.resource[data-favorite-id="resources.secondary"] input.uninput.value'
  );

  if (!valueInput) {
    debugLog("Primary resource input not found in sheet HTML.");
    return null;
  }

  // 🔹 Pull colors (actor override first)
  const glowLow = getActorSetting(actor, ACTOR_FLAG.glowLow, GLOBAL_SETTING.glowLow);
  const glowMedium = getActorSetting(actor, ACTOR_FLAG.glowMedium, GLOBAL_SETTING.glowMedium);
  const glowHigh = getActorSetting(actor, ACTOR_FLAG.glowHigh, GLOBAL_SETTING.glowHigh);

  // 🔹 Pull thresholds (actor override first)
  let thresholdLow = Number(getActorSetting(actor, ACTOR_FLAG.thresholdLow, GLOBAL_SETTING.thresholdLow));
  let thresholdMedium = Number(getActorSetting(actor, ACTOR_FLAG.thresholdMedium, GLOBAL_SETTING.thresholdMedium));

  debugLog("Retrieved actor color settings:", {
    glowLow,
    glowMedium,
    glowHigh
  });

  debugLog("Retrieved actor thresholds:", {
    thresholdLow,
    thresholdMedium
  });

  // 🔹 Safety guard: enforce logical ordering
  if (
    !Number.isFinite(thresholdLow) ||
    !Number.isFinite(thresholdMedium) ||
    thresholdLow >= thresholdMedium
  ) {
    debugLog("Threshold validation failed. Reverting to safe defaults (25/50).");
    thresholdLow = 25;
    thresholdMedium = 50;
  }

  let color;

  if (percent <= thresholdLow) {
    color = glowLow;
    debugLog("Percent <= thresholdLow. Using glowLow:", color);
  }
  else if (percent <= thresholdMedium) {
    color = glowMedium;
    debugLog("Percent <= thresholdMedium. Using glowMedium:", color);
  }
  else {
    color = glowHigh;
    debugLog("Percent above medium threshold. Using glowHigh:", color);
  }

  valueInput.style.setProperty("color", color, "important");

  debugLog("Applied color to resource input:", color);

  return color;
}

 function updateConversionGlow(html, actor, glowColor) {

  const conversionEnabled = isConversionEnabled(actor);
  if (!conversionEnabled) return;

  const resourceRow = html.querySelector(
    'li.resource[data-favorite-id="resources.secondary"]'
  );
  if (!resourceRow) return;

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const conversionsRemaining = getRemainingConversions(actor);

  if (maxConversions > 0 && conversionsRemaining <= 0) {
    resourceRow.style.boxShadow = "";
    return;
  }

  const remaining = actor.system.resources.secondary?.value ?? 0;
  const spellData = actor.system.spells;
  const costPerLevel = getCostPerLevel(actor);

  let maxLevel = getActorSetting(actor, ACTOR_FLAG.maxConversionLevel, GLOBAL_SETTING.maxConversionLevel);

  if (!Number.isInteger(maxLevel) || maxLevel <= 0)
    maxLevel = DEFAULT_MAX_CONVERSION_LEVEL;

  let canConvert = false;

  /* ---- Normal Spell Slots ---- */
  for (let level = 1; level <= maxLevel; level++) {

    const slot = spellData[`spell${level}`];
    if (!slot) continue;

    const cost = level * costPerLevel;

    if (slot.value < slot.max && remaining >= cost) {
      canConvert = true;
      break;
    }
  }

  /* ---- Pact Slot Support ---- */
  if (!canConvert) {
    const pact = spellData.pact;

    if (pact && pact.max > 0) {

      const pactLevel = Number.isInteger(pact.level) && pact.level > 0
        ? pact.level
        : actor.system.details?.spellLevel ?? 1;

      if (pactLevel <= maxLevel) {

        const pactCost = pactLevel * costPerLevel;

        if (pact.value < pact.max && remaining >= pactCost) {
          canConvert = true; // for glow
        }
      }
    }

  }

  /* ---- Apply Glow ---- */
  if (canConvert && glowColor) {

    // Convert HEX (#rrggbb) to RGB values
    const r = parseInt(glowColor.slice(1, 3), 16);
    const g = parseInt(glowColor.slice(3, 5), 16);
    const b = parseInt(glowColor.slice(5, 7), 16);

    resourceRow.style.boxShadow =
      `0 0 8px 2px rgba(${r}, ${g}, ${b}, 0.8)`;

    resourceRow.style.transition = "box-shadow 0.3s ease";

  } else {
    resourceRow.style.boxShadow = "";
  }
}

 function updateGearGlow(html, actor, glowColor) {

  const gear = html.querySelector(".cantrip-config-gear");
  if (!gear) return;

  // No glow if conversion disabled
  if (!isConversionEnabled(actor)) {
    gear.style.boxShadow = "";
    return;
  }

  const resource = actor.system.resources?.secondary;
  if (!resource) return;

  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  const costPerLevel = getCostPerLevel(actor);
  const minCost = costPerLevel; // Level 1 slot minimum cost

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const conversionsRemaining = getRemainingConversions(actor);

  const conversionBlocked =
    current < minCost ||
    (maxConversions > 0 && conversionsRemaining <= 0);

  if (conversionBlocked) {
    gear.style.boxShadow = "";
    return;
  }

  gear.style.boxShadow = `0 0 6px 2px ${glowColor}`;
}