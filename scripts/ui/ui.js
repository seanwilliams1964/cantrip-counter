import { 
  MODULE_ID, 
  DEFAULT_MAX_CONVERSION_LEVEL, 
  ACTOR_FLAG, 
  GLOBAL_SETTING,
  RESOURCE_LABEL
} from "../utilities/constants.js";

import { 
  openConversionDialog, 
  openActorConfigDialog, 
  openActorColorConfig 
} from "./dialogs.js";

import { debugLog } from "../utilities/debug.js";
import { getRenderedSheetRoot } from "../utilities/utility.js";
import { getActorSetting } from "../utilities/helpers.js";
import { getRemainingConversions } from "../logic/cantrip-state.js";

import {
  isConversionEnabled,
  getMaxConversionsPerLongRest,
  getCostPerLevel,
} from "../logic/conversions.js";

import { syncResource } from "../logic/resources.js";

/* ============================================ */
/*  Sheet Render Hook                           */
/* ============================================ */

Hooks.on("renderActorSheetV2", async (app) => {

  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  await syncResource(actor);
  
  const root = await getRenderedSheetRoot(app);
  if (!root) return;

  const hasSpellcasting = !!actor.system?.attributes?.spellcasting;

  debugLog(`Actor: ${actor.name}`);
  

  const secondaryResource = root.querySelector(
    'li.resource[data-favorite-id="resources.secondary"]'
  );

  const tertiaryResource = root.querySelector(
    'li.resource[data-favorite-id="resources.tertiary"]'
  );

  debugLog(`Has Spellcasting: ${hasSpellcasting}`);
  debugLog(`Secondary Resource: ${secondaryResource}`);
  debugLog(`Tertiary Resource: ${tertiaryResource}`);

  /* -------------------------------------------- */
  /*  NON-SPELLCASTERS → HIDE BOTH               */
  /* -------------------------------------------- */

  if (!hasSpellcasting) {

    if (secondaryResource) {
      secondaryResource.style.display = "none";
      debugLog("Hid secondary resource (non-spellcaster)");
    }

    if (tertiaryResource) {
      tertiaryResource.style.display = "none";
      debugLog("Hid tertiary resource (non-spellcaster)");
    }

    return;
  }

  /* -------------------------------------------- */
  /*  SPELLCASTERS                               */
  /* -------------------------------------------- */

  if (secondaryResource) {
    secondaryResource.style.display = "";
    applyCantripLogic(app, root, secondaryResource);
  }

  // Hide tertiary ONLY if it is the module's tracked resource
  if (tertiaryResource) {

    const tertiaryLabel =
      (actor.system?.resources?.tertiary?.label || "").trim();

    if (tertiaryLabel === RESOURCE_LABEL.dailyConversions) {
      tertiaryResource.style.display = "none";
      debugLog("Hid module tertiary resource");
    }
  }
});

/* ============================================ */
/*  Force Sheet Refresh                         */
/* ============================================ */

Hooks.on("cantripCounterRefreshUI", () => {
  for (const app of Object.values(ui.windows)) {
    if (app?.object?.type === "character") {
      app.render(false);
    }
  }
});

/* ============================================ */
/*  Apply Cantrip Logic                         */
/* ============================================ */

function applyCantripLogic(app, root, primaryResource) {

  const actor = app.actor;

  const figure = primaryResource.querySelector("figure");
  if (!figure) return;

  const existingIcon = figure.querySelector("img");
  if (!existingIcon) return;

  const isEditMode = !!root.querySelector("input.document-name");
  const conversionEnabled = isConversionEnabled(actor);

  /* ---------- Restrict Manual Editing ---------- */

  const valueInput = primaryResource.querySelector(
    'input.uninput.value'
  );

  if (valueInput) {
    if (!game.user.isGM) {
      valueInput.disabled = true;
      valueInput.style.pointerEvents = "none";
      valueInput.style.opacity = "0.7";
      valueInput.title = "Only the GM may manually adjust cantrip uses.";
    } else {
      valueInput.disabled = false;
      valueInput.style.pointerEvents = "";
      valueInput.style.opacity = "";
      valueInput.title = "";
    }
  }

  /* ---------- Replace Icon ---------- */

  const customIcon = game.settings.get(MODULE_ID, "cantripIcon");
  const defaultIcon = `modules/${MODULE_ID}/assets/cantrips.png`;

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

  } else if (conversionEnabled) {

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

  /* ---------- Delete Favorite Handling ---------- */

  const deleteButton = primaryResource.querySelector(
    'button[data-action="deleteFavorite"]'
  );

  if (deleteButton) {
    if (isEditMode) {
      deleteButton.disabled = true;
      deleteButton.style.pointerEvents = "none";
      deleteButton.style.opacity = "0.4";
    } else {
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

  /* ---------- Player Color Config ---------- */

  const existingColorIcon =
    primaryResource.querySelector(".cantrip-color-config");

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
  }

  /* ---------- Color + Glow ---------- */

  const color = updateCantripResourceColor(root, actor);

  updateConversionGlow(root, actor, color);
  updateGearGlow(root, actor, color);
}

/* ============================================ */
/*  Color Logic                                 */
/* ============================================ */

function updateCantripResourceColor(html, actor) {

  const resource = actor?.system?.resources?.secondary;
  if (!resource) return null;

  const value = resource.value ?? 0;
  const max = resource.max ?? 1;
  const percent = max > 0 ? (value / max) * 100 : 0;

  const valueInput = html.querySelector(
    'li.resource[data-favorite-id="resources.secondary"] input.uninput.value'
  );

  if (!valueInput) return null;

  const glowLow = getActorSetting(actor, ACTOR_FLAG.glowLow, GLOBAL_SETTING.glowLow);
  const glowMedium = getActorSetting(actor, ACTOR_FLAG.glowMedium, GLOBAL_SETTING.glowMedium);
  const glowHigh = getActorSetting(actor, ACTOR_FLAG.glowHigh, GLOBAL_SETTING.glowHigh);

  let thresholdLow = Number(getActorSetting(actor, ACTOR_FLAG.thresholdLow, GLOBAL_SETTING.thresholdLow));
  let thresholdMedium = Number(getActorSetting(actor, ACTOR_FLAG.thresholdMedium, GLOBAL_SETTING.thresholdMedium));

  if (!Number.isFinite(thresholdLow) ||
      !Number.isFinite(thresholdMedium) ||
      thresholdLow >= thresholdMedium) {
    thresholdLow = 25;
    thresholdMedium = 50;
  }

  let color;

  if (percent <= thresholdLow) color = glowLow;
  else if (percent <= thresholdMedium) color = glowMedium;
  else color = glowHigh;

  valueInput.style.setProperty("color", color, "important");

  return color;
}

/* ============================================ */
/*  Conversion Glow                             */
/* ============================================ */

function updateConversionGlow(html, actor, glowColor) {

  if (!isConversionEnabled(actor)) return;

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

  for (let level = 1; level <= maxLevel; level++) {

    const slot = spellData?.[`spell${level}`];
    if (!slot) continue;

    const cost = level * costPerLevel;

    if (slot.value < slot.max && remaining >= cost) {
      canConvert = true;
      break;
    }
  }

  if (canConvert && glowColor) {

    const r = parseInt(glowColor.slice(1, 3), 16);
    const g = parseInt(glowColor.slice(3, 5), 16);
    const b = parseInt(glowColor.slice(5, 7), 16);

    resourceRow.style.boxShadow =
      `0 0 8px 2px rgba(${r}, ${g}, ${b}, 0.8)`;

  } else {
    resourceRow.style.boxShadow = "";
  }
}

/* ============================================ */
/*  Gear Glow                                   */
/* ============================================ */

function updateGearGlow(html, actor, glowColor) {

  const gear = html.querySelector(".cantrip-config-gear");
  if (!gear) return;

  if (!isConversionEnabled(actor)) {
    gear.style.boxShadow = "";
    return;
  }

  const resource = actor.system.resources?.secondary;
  if (!resource) return;

  const current = resource.value ?? 0;
  const costPerLevel = getCostPerLevel(actor);
  const minCost = costPerLevel;

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