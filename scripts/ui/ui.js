import { getRemainingConversions } from "../logic/cantrip-state.js";
import { getCostPerLevel, getMaxConversionsPerLongRest, isConversionEnabled } from "../logic/conversions.js";
import { ACTOR_FLAG, DEFAULT_MAX_CONVERSION_LEVEL, GLOBAL_SETTING, MODULE_ID, RESOURCE_LABEL } from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { getActorSetting, getPactSlotLevel } from "../utilities/helpers.js";
import { getResourceValueInput, getSecondaryResourceRowFromRoot } from "../utilities/utility.js";
import { openActorColorConfig, openActorConfigDialog, openConversionDialog } from "./dialogs.js";

/* ============================================ */
/*  Apply Cantrip Logic                         */
/* ============================================ */
export async function applyCantripLogic(app, root, resourceElement) {
  const actor = app.actor;
  if (!resourceElement || !actor) {
    debugLog("applyCantripLogic: missing resourceElement or actor");
    return;
  }

  const figure =
    resourceElement.querySelector("figure") ||
    resourceElement.querySelector(".cantrip-counter-icon-wrapper");

  const icon =
    resourceElement.querySelector("img") ||
    resourceElement.querySelector("i.cantrip-counter-icon") ||
    figure;

  if (!figure && !icon) {
    debugLog("applyCantripLogic: no compatible icon element found");
    return;
  }

  /* ---------- Edit Mode Detection ---------- */

  const nameInput = root.querySelector(
    'input.document-name, .document-name input, input[name="name"]'
  );

  const editButton = root.querySelector(
    '.sheet-header .fas.fa-edit, .window-header button.edit, .window-header .fa-pencil, .edit-icon'
  );

  const isTidySheet =
    app.constructor.name?.includes("Tidy") ||
    root.classList.contains("tidy5e-sheet");

  const tidyEditActive =
    root.classList.contains("sheet-mode-edit") ||
    root.classList.contains("mode-edit") ||
    root.querySelector('[data-tidy-sheet-part="sheet-lock-toggle"] [aria-checked="true"]');

  const isInEditMode = isTidySheet
    ? !!tidyEditActive
    : !!(nameInput || editButton);

  const isEditMode = game.user.isGM && isInEditMode;

  debugLog("Tidy edit state:", {
    sheetModeEdit: root.classList.contains("sheet-mode-edit"),
    sheetModePlay: root.classList.contains("sheet-mode-play"),
    lockToggle: !!root.querySelector('[data-tidy-sheet-part="sheet-lock-toggle"] [aria-checked="true"]'),
    isInEditMode,
    isEditMode
  });

  debugLog(`applyCantripLogic for ${actor.name} — isInEditMode: ${isInEditMode}, final isEditMode: ${isEditMode}`);

  const conversionEnabled = isConversionEnabled(actor);

  /* ---------- Custom Icon ---------- */
  const customIconPath = (game.settings.get(MODULE_ID, "cantripIcon") || "").trim();
  const defaultIcon = `modules/${MODULE_ID}/assets/cantrips.png`;
  const newIconSrc = customIconPath || defaultIcon;

  const currentIconSrc = icon.getAttribute("src") || "";

  if (currentIconSrc !== newIconSrc) {
    icon.setAttribute("src", newIconSrc);
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
  const valueInput = getResourceValueInput(resourceElement, "secondary");
  if (valueInput) {
    valueInput.disabled = !game.user.isGM;
    valueInput.style.pointerEvents = game.user.isGM ? "" : "none";
    valueInput.style.opacity = game.user.isGM ? "" : "0.7";
  }

  /* ---------- GM Config Icons ---------- */

  resourceElement.querySelectorAll(".cantrip-color-config").forEach(el => el.remove());
  root.querySelectorAll(".cantrip-config-gear").forEach(el => el.remove());

  if (isEditMode && game.user.isGM) {
    // Color Palette button — attach directly to the Cantrip resource row
    const colorBtn = document.createElement("button");
    colorBtn.type = "button";

    if (tidyEditActive) {
      colorBtn.classList.add("button", "button-icon-only", "button-gold", "cantrip-color-config");
    } else {
      colorBtn.classList.add("gold-button", "cantrip-color-config");
    }

    colorBtn.innerHTML = `<i class="fas fa-palette"></i>`;
    colorBtn.title = "Configure Cantrip Resource Colors";
    colorBtn.style.marginLeft = "4px";

    colorBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openActorColorConfig(actor);
    });

    const colorButtonTarget =
      resourceElement.querySelector(".primary.uses") ||
      resourceElement.querySelector(".info") ||
      resourceElement.querySelector(".name-stacked") ||
      resourceElement;

    colorButtonTarget.appendChild(colorBtn);

    // Gear button — stock sheet header first, Tidy fallbacks after
    const headerButtons =
      root.querySelector('[data-tidy-sheet-part="sheet-header-actions-container"]') ||
      root.querySelector(".sheet-header-actions") ||

      // Legacy Tidy: visible toolbar above the sheet body
      root.querySelector('[data-tidy-sheet-part="utility-toolbar"]') ||
      root.querySelector(".utility-toolbar") ||

      // Default / fallback locations
      root.querySelector(".sheet-header-buttons") ||
      root.querySelector("[data-tidy-sheet-part='sheet-header']") ||
      root.querySelector(".tidy-sheet-header") ||
      root.querySelector(".window-header .header-buttons") ||
      root.querySelector(".window-header");

    const gear = document.createElement("button");
    gear.type = "button";

    if (tidyEditActive) {
      gear.classList.add("button", "button-icon-only", "button-gold", "cantrip-config-gear");
    }
    else {
      gear.classList.add("gold-button", "cantrip-config-gear");
    }

    gear.innerHTML = `<i class="fas fa-hat-wizard"></i>`;
    gear.title = "Cantrip Counter Settings";
    gear.style.marginLeft = "4px";

    gear.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openActorConfigDialog(actor);
    });

    if (headerButtons) {
      headerButtons.appendChild(gear);
      debugLog(`Added GM gear to sheet/header buttons for ${actor.name}`);
    } else {
      resourceElement.appendChild(gear);
      debugLog(`Added GM gear to cantrip resource row fallback for ${actor.name}`);
    }
  }

  /* ---------- Color + Glow ---------- */
  const color = updateCantripResourceColor(root, actor);
  updateConversionGlow(root, actor, color);
  updateGearGlow(root, actor, color);

  debugLog(`applyCantripLogic completed for ${actor.name}`);
}

export async function requestActorSheetRefresh(actor) {

  debugLog("Fired requestActorSheetRefresh for actor:", actor);

  setTimeout(() => {
    const apps = Object.values(actor.apps);

    debugLog("Actor apps:", apps);

    for (const app of apps) {
      if (typeof app.render === "function") {
        app.render(true);
      }
    }

  }, 0);
}

export function injectTidyCantripResource(app, root, container) {
  const actor = app.actor;
  const resource = actor.system.resources.secondary;

  let existing = root.querySelector('[data-cantrip-counter-tidy-resource="secondary"]');
  if (existing) existing.remove();

  const value = Number(resource.value ?? 0);
  const max = Number(resource.max ?? 0);

  const entry = document.createElement("div");
  entry.className = "list-entry favorite resource cantrip-counter-tidy-resource";
  entry.dataset.cantripCounterTidyResource = "secondary";
  entry.dataset.favoriteType = "resource";
  entry.dataset.resource = "secondary";
  entry.dataset.cantripCounter = "true";

  entry.innerHTML = `
    <figure>
      <img class="gold-icon"
           alt="${RESOURCE_LABEL.cantripUses}"
           src="modules/cantrip-counter/assets/cantrips.png"
           title="Click to convert Cantrips into Spell Slots"
           style="cursor: pointer;">
    </figure>

    <div class="name-stacked" role="button" data-action="useFavorite">
      <span class="title">${RESOURCE_LABEL.cantripUses}</span>
      <span class="subtitle">SR • LR</span>
    </div>

    <div class="info">
      <div class="primary uses">
        <input type="text"
               class="uninput value"
               value="${value}"
               data-dtype="Number"
               name="system.resources.secondary.value"
               inputmode="numeric"
               pattern="[+=\\-]?\\d*">
        <span class="separator">/</span>
        <span class="max">${max}</span>
      </div>
      <div class="secondary"></div>
    </div>
  `;

  const spellbookSection = container.querySelector("section.spellbook-list-section");

  if (spellbookSection) {
    container.insertBefore(entry, spellbookSection);
  } else {
    container.prepend(entry);
  }

  return entry;
}

function updateCantripResourceColor(html, actor) {
  debugLog("Firing updateCantripResourceColor for actor:", actor);

  const resource = actor?.system?.resources?.secondary;
  if (!resource) return null;

  const value = Number(resource.value ?? 0);
  const max = Number(resource.max ?? 1);
  const percent = max > 0 ? (value / max) * 100 : 0;

  const valueInput =
    html.querySelector('li.resource[data-favorite-id="resources.secondary"] input.uninput.value') ||
    html.querySelector('[data-cantrip-counter-tidy-resource="secondary"] input.uninput.value') ||
    html.querySelector('[data-resource="secondary"] input[name="system.resources.secondary.value"]') ||
    html.querySelector('input[name="system.resources.secondary.value"]');

  if (!valueInput) {
    debugLog("updateCantripResourceColor: secondary value input not found");
    return null;
  }

  // Keep injected Tidy row visually synced with actor data
  valueInput.value = value;
  valueInput.setAttribute("value", String(value));

  const row = valueInput.closest(
    'li.resource, [data-cantrip-counter-tidy-resource="secondary"], [data-resource="secondary"], .resource'
  );

  const maxSpan = row?.querySelector(".max");
  if (maxSpan) maxSpan.textContent = String(max);

  const glowLow = getActorSetting(actor, ACTOR_FLAG.glowLow, GLOBAL_SETTING.glowLow);
  const glowMedium = getActorSetting(actor, ACTOR_FLAG.glowMedium, GLOBAL_SETTING.glowMedium);
  const glowHigh = getActorSetting(actor, ACTOR_FLAG.glowHigh, GLOBAL_SETTING.glowHigh);

  let thresholdLow = Number(getActorSetting(actor, ACTOR_FLAG.thresholdLow, GLOBAL_SETTING.thresholdLow));
  let thresholdMedium = Number(getActorSetting(actor, ACTOR_FLAG.thresholdMedium, GLOBAL_SETTING.thresholdMedium));

  if (
    !Number.isFinite(thresholdLow) ||
    !Number.isFinite(thresholdMedium) ||
    thresholdLow >= thresholdMedium
  ) {
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

function updateConversionGlow(html, actor, glowColor) {
  debugLog("Firing updateConversionGlow for actor and DOM", { actor, html });

  const resourceRow =
    html.querySelector('.cantrip-counter-tidy-resource[data-resource="secondary"]') ||
    html.querySelector('[data-cantrip-counter-tidy-resource="secondary"]') ||
    html.querySelector('li.resource[data-favorite-id="resources.secondary"]') ||
    html.querySelector('[data-resource="secondary"]') ||
    getSecondaryResourceRowFromRoot(html);

  if (!resourceRow) {
    debugLog("updateConversionGlow: secondary resource row not found");
    return;
  }

  resourceRow.dataset.cantripCounter = "true";

  if (!isConversionEnabled(actor)) {
    resourceRow.style.boxShadow = "";
    return;
  }

  debugLog(`Conversion is enabled for actor: ${actor.name}`);
  debugLog("Applying conversion glow logic for actor:", actor);

  const remaining = Number(actor.system.resources.secondary?.value ?? 0);
  const spellData = actor.system.spells || {};
  const costPerLevel = getCostPerLevel(actor);

  let maxLevel = getActorSetting(
    actor,
    ACTOR_FLAG.maxConversionLevel,
    GLOBAL_SETTING.maxConversionLevel
  );

  if (!Number.isInteger(maxLevel) || maxLevel <= 0) {
    maxLevel = DEFAULT_MAX_CONVERSION_LEVEL;
  }

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const conversionsRemaining = getRemainingConversions(actor);

  let canConvert = false;

  if (maxConversions > 0 && conversionsRemaining <= 0) {
    debugLog("Conversion glow blocked: daily conversion cap reached");
  } else if (remaining >= costPerLevel) {
    debugLog(`Has sufficient cantrips (${remaining}) for level 1 conversion (cost: ${costPerLevel})`);

    for (let level = 1; level <= maxLevel; level++) {
      const slot = spellData[`spell${level}`];
      if (slot && Number(slot.value ?? 0) < Number(slot.max ?? 0)) {
        canConvert = true;
        debugLog(`Found open regular slot at level ${level} (${slot.value}/${slot.max}) - enabling glow`);
        break;
      }
    }

    if (!canConvert) {
      const pact = spellData.pact;
      if (pact && Number(pact.value ?? 0) < Number(pact.max ?? 0)) {
        const pactLevel = getPactSlotLevel(actor, maxLevel);
        canConvert = true;
        debugLog(`Found open pact slot (Level ${pactLevel}, ${pact.value}/${pact.max}) - enabling glow`);
      }
    }

    if (!canConvert) {
      debugLog(`No open spell slots (regular or pact) found up to level ${maxLevel}`);
    }
  } else {
    debugLog(`Insufficient cantrips for conversion (have ${remaining}, need at least ${costPerLevel})`);
  }

  if (canConvert && glowColor) {
    const color = glowColor.startsWith("#") ? glowColor : `#${glowColor}`;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    if ([r, g, b].every(Number.isFinite)) {
      resourceRow.style.boxShadow = `0 0 8px 2px rgba(${r}, ${g}, ${b}, 0.8)`;
    } else {
      resourceRow.style.boxShadow = `0 0 8px 2px ${glowColor}`;
    }

    debugLog(`Applied conversion glow to resource row for ${actor.name}`);
  } else {
    resourceRow.style.boxShadow = "";
    debugLog(`Cleared conversion glow for resource row (canConvert: ${canConvert})`);
  }
}

function updateGearGlow(html, actor, glowColor) {
  debugLog("Firing updateGearGlow for actor:", actor);

  const gear = html.querySelector(".cantrip-config-gear");
  if (!gear) return;

  if (!isConversionEnabled(actor)) {
    gear.style.boxShadow = "";
    return;
  }

  const resource = actor.system.resources?.secondary;
  if (!resource) return;

  const current = Number(resource.value ?? 0);
  const costPerLevel = getCostPerLevel(actor);
  const minCost = costPerLevel;

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const conversionsRemaining = getRemainingConversions(actor);

  if (current < minCost || (maxConversions > 0 && conversionsRemaining <= 0)) {
    gear.style.boxShadow = "";
    return;
  }

  const spellData = actor.system.spells || {};

  let maxLevel = getActorSetting(
    actor,
    ACTOR_FLAG.maxConversionLevel,
    GLOBAL_SETTING.maxConversionLevel
  );

  if (!Number.isInteger(maxLevel) || maxLevel <= 0) {
    maxLevel = DEFAULT_MAX_CONVERSION_LEVEL;
  }

  let hasOpenSlot = false;

  for (let level = 1; level <= maxLevel; level++) {
    const slot = spellData[`spell${level}`];

    if (slot && Number(slot.value ?? 0) < Number(slot.max ?? 0)) {
      hasOpenSlot = true;
      debugLog(`Gear glow: Found open regular slot at level ${level} (${slot.value}/${slot.max})`);
      break;
    }
  }

  if (!hasOpenSlot) {
    const pact = spellData.pact;

    if (pact && Number(pact.value ?? 0) < Number(pact.max ?? 0)) {
      hasOpenSlot = true;
      debugLog(`Gear glow: Found open pact slot (${pact.value}/${pact.max})`);
    }
  }

  if (!hasOpenSlot) {
    debugLog(`Gear glow blocked: No open spell slots (regular or pact) found up to level ${maxLevel}`);
    gear.style.boxShadow = "";
    return;
  }

  gear.style.boxShadow = `0 0 6px 2px ${glowColor}`;
  debugLog(`Applied glow to cantrip config gear for ${actor.name}`);
}
