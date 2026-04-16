import { MODULE_ID, DEFAULT_MAX_CONVERSION_LEVEL, ACTOR_FLAG, GLOBAL_SETTING } from "../utilities/constants.js";
import { openConversionDialog, openActorConfigDialog, openActorColorConfig } from "./dialogs.js";
import { getActorSetting } from "../utilities/helpers.js";
import { getRemainingConversions } from "../logic/cantrip-state.js";
import { debugLog } from "../utilities/debug.js";
import { isConversionEnabled, getMaxConversionsPerLongRest, getCostPerLevel } from "../logic/conversions.js";

/* ============================================ */
/*  Apply Cantrip Logic                         */
/* ============================================ */
export async function applyCantripLogic(app, root, resourceElement) {
  const actor = app.actor;
  if (!resourceElement || !actor) {
    debugLog("applyCantripLogic: missing resourceElement or actor");
    return;
  }

  const figure = resourceElement.querySelector("figure");
  if (!figure) {
    debugLog("applyCantripLogic: no <figure> found");
    return;
  }

  let icon = figure.querySelector("img");
  if (!icon) {
    debugLog("applyCantripLogic: no <img> found inside figure");
    return;
  }

  /* ---------- Strict Edit Mode Detection using utility style ---------- */
  // Use querySheet for consistency (though root is already passed)
  const nameInput = root.querySelector('input.document-name, .document-name input, input[name="name"]');
  const editButton = root.querySelector('.sheet-header .fas.fa-edit, .window-header button.edit, .window-header .fa-pencil, .edit-icon');
  const isInEditMode = !!(nameInput || editButton);
  const isEditMode = game.user.isGM && isInEditMode;

  debugLog(`applyCantripLogic for ${actor.name} — isInEditMode: ${isInEditMode}, final isEditMode: ${isEditMode}`);

  const conversionEnabled = isConversionEnabled(actor);

  /* ---------- Custom Icon ---------- */
  const customIconPath = (game.settings.get(MODULE_ID, "cantripIcon") || "").trim();
  const defaultIcon = `modules/${MODULE_ID}/assets/cantrips.png`;
  const newIconSrc = customIconPath || defaultIcon;

  if (icon.src !== newIconSrc) {
    icon.src = newIconSrc;
  }
  figure.style.backgroundImage = `url("${newIconSrc}")`;

  /* ---------- Click Handler (aggressive for V2 sheet) ---------- */
  const handleConversionClick = (event) => {
    if (isEditMode || !conversionEnabled) {
      debugLog(`Click blocked — isEditMode:${isEditMode} conversionEnabled:${conversionEnabled}`);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    debugLog(`Opening conversion dialog for ${actor.name}`);
    openConversionDialog(actor);
  };

  // Clean + re-attach
  icon.removeEventListener("click", handleConversionClick, { capture: true });
  icon.removeEventListener("click", handleConversionClick);
  icon.onclick = null;

  icon.style.cursor = (!isEditMode && conversionEnabled) ? "pointer" : "default";
  icon.title = isEditMode 
    ? "Cantrip Uses (Locked in Edit Mode)" 
    : conversionEnabled 
      ? "Click to convert Cantrips into Spell Slots" 
      : "Cantrip Uses";

  if (!isEditMode && conversionEnabled) {
    icon.addEventListener("click", handleConversionClick, { capture: true });
    debugLog(`Click handler attached to Cantrip icon for ${actor.name}`);
  }

  /* ---------- Value Input Lock (GM only) ---------- */
  const valueInput = resourceElement.querySelector('input[name*="secondary.value"], input.uninput.value');
  if (valueInput) {
    valueInput.disabled = !game.user.isGM;
    valueInput.style.pointerEvents = game.user.isGM ? "" : "none";
    valueInput.style.opacity = game.user.isGM ? "" : "0.7";
  }

  /* ---------- GM Config Icons using consistent querying ---------- */

  // Color Palette — next to resource, only in true edit mode
  resourceElement.querySelectorAll('.cantrip-color-config').forEach(el => el.remove());
  if (isEditMode && game.user.isGM) {
    const colorBtn = document.createElement("button");
    colorBtn.type = "button";
    colorBtn.classList.add("gold-button", "cantrip-color-config");
    colorBtn.innerHTML = `<i class="fas fa-palette"></i>`;
    colorBtn.title = "Configure Cantrip Resource Colors";
    colorBtn.style.marginLeft = "4px";
    colorBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openActorColorConfig(actor);
    });
    resourceElement.appendChild(colorBtn);
  }

  // Gear — in sheet header buttons (use querySheet style for consistency)
  const headerButtons = root.querySelector(".sheet-header-buttons");
  if (headerButtons) {
    headerButtons.querySelectorAll('.cantrip-config-gear').forEach(el => el.remove());

    if (isEditMode && game.user.isGM) {
      const gear = document.createElement("button");
      gear.type = "button";
      gear.classList.add("gold-button", "cantrip-config-gear");
      gear.innerHTML = `<i class="fas fa-cog"></i>`;
      gear.title = "Cantrip Conversion Settings";
      gear.style.marginLeft = "4px";

      gear.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openActorConfigDialog(actor);
      });

      headerButtons.appendChild(gear);
      debugLog(`Added GM gear to sheet-header-buttons for ${actor.name}`);
    }
  }

  /* ---------- Color + Glow ---------- */
  const color = updateCantripResourceColor(root, actor);
  updateConversionGlow(root, actor, color);
  updateGearGlow(root, actor, color);

  debugLog(`applyCantripLogic completed for ${actor.name}`);
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