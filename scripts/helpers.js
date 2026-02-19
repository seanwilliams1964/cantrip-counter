// helpers.js (no changes needed, no UI/API dependencies)
import { MODULE_ID, DEFAULT_MAX_CONVERSION_LEVEL } from "./settings.js";
import { debugLog } from "./debug.js";

/* -------------------------------------------- */
/*  SPELLCASTING ABILITY                        */
/* -------------------------------------------- */

export function getSpellcastingAbilityScore(actor) {

  const abilityKey = actor.system.attributes.spellcasting;
  if (!abilityKey) return null;

  const ability = actor.system.abilities[abilityKey];
  if (!ability) return null;

  const baseScore = ability.value ?? 0;
  const bonus = game.settings.get(MODULE_ID, "bonusCantrips") ?? 0;

  return baseScore + bonus;
}

/* -------------------------------------------- */
/*  ACTOR FLAG HELPERS                          */
/* -------------------------------------------- */

export function getActorSetting(actor, key, worldSettingKey) {

  debugLog(`getActorSetting called with key ${key} and actor:`, actor);

 if (!actor || typeof actor.getFlag !== "function") {
    debugLog("Actor is undefined");
    return game.settings.get(MODULE_ID, worldSettingKey);
  }

  const actorValue = actor.getFlag(MODULE_ID, key);

  if (actorValue !== undefined && actorValue !== null) {
    debugLog("Actor value found:", actorValue);
    return actorValue;
  }

  debugLog("Actor value undefined or null. Returning world setting:");
  return game.settings.get(MODULE_ID, worldSettingKey);
}

export function isConversionEnabled(actor) {
 return getActorSetting(actor, "overrideEnabled", "enableConversion")
}

export function getCostPerLevel(actor) {
  return getActorSetting(actor, "costPerLevel", "costPerLevel");
}

export function getMaxConversionLevel(actor) {
  return getActorSetting(actor, "maxConversionLevel", "maxConversionLevel");
}

export function getMaxConversionsPerLongRest(actor) {
  return getActorSetting(actor, "maxConversionsPerLongRest", "maxConversionsPerLongRest");
}

export function getConversionsUsed(actor) {
  return actor.getFlag(MODULE_ID, "conversionsUsed");
}

export async function incrementConversionsUsed(actor) {

  const used = getConversionsUsed(actor);
  await actor.setFlag(MODULE_ID, "conversionsUsed", used + 1);
}

export async function resetConversionsUsed(actor) {
  await actor.setFlag(MODULE_ID, "conversionsUsed", 0);
}

export function hasReachedConversionCap(actor) {

  const max = getMaxConversionsPerLongRest(actor);
  if (!max || max <= 0) return false;

  const used = getConversionsUsed(actor);
  return used >= max;
}

export function updateCantripResourceColor(html, actor) {
  const resource = actor.system.resources.primary;
  if (!resource) return null;

  const value = resource.value ?? 0;
  const max = resource.max ?? 1;

  const percent = max > 0 ? (value / max) * 100 : 0;

  const valueInput = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"] input.uninput.value'
  );

  if (!valueInput) return null;

  // 🔹 Pull colors
  const glowLow = game.settings.get("cantrip-counter", "glowLow");
  const glowMedium = game.settings.get("cantrip-counter", "glowMedium");
  const glowHigh = game.settings.get("cantrip-counter", "glowHigh");

  // 🔹 Pull thresholds
  let thresholdLow = game.settings.get("cantrip-counter", "thresholdLow");
  let thresholdMedium = game.settings.get("cantrip-counter", "thresholdMedium");

  // 🔹 Safety guard: enforce logical ordering
  if (thresholdLow >= thresholdMedium) {
    thresholdLow = 25;
    thresholdMedium = 50;
  }

  let color;

  if (percent <= thresholdLow) {
    color = glowLow;
  }
  else if (percent <= thresholdMedium) {
    color = glowMedium;
  }
  else {
    color = glowHigh;
  }

  valueInput.style.setProperty("color", color, "important");

  return color;
}

export function updateConversionGlow(html, actor, glowColor) {

  const conversionEnabled = isConversionEnabled(actor);
  if (!conversionEnabled) return;

  const resourceRow = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"]'
  );
  if (!resourceRow) return;

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const used = getConversionsUsed(actor);

  if (maxConversions > 0 && used >= maxConversions) {
    resourceRow.style.boxShadow = "";
    return;
  }

  const remaining = actor.system.resources.primary?.value ?? 0;
  const spellData = actor.system.spells;
  const costPerLevel = getCostPerLevel(actor);

  let maxLevel = game.settings.get(MODULE_ID, "maxConversionLevel");

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

export function updateGearGlow(html, actor, glowColor) {

  const gear = html.querySelector(".cantrip-config-gear");
  if (!gear) return;

  // No glow if conversion disabled
  if (!isConversionEnabled(actor)) {
    gear.style.boxShadow = "";
    return;
  }

  const resource = actor.system.resources?.primary;
  if (!resource) return;

  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  const costPerLevel = getCostPerLevel(actor);
  const minCost = costPerLevel; // Level 1 slot minimum cost

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const used = getConversionsUsed(actor);

  const conversionBlocked =
    current < minCost ||
    (maxConversions > 0 && used >= maxConversions);

  if (conversionBlocked) {
    gear.style.boxShadow = "";
    return;
  }

  gear.style.boxShadow = `0 0 6px 2px ${glowColor}`;
}

/*  RESTORE CONVERSION IF NEEDED                */

export function cleanUpAndRestoreConversion(liveIcon, actor) {

  const restoredIcon = liveIcon.cloneNode(true);
  liveIcon.replaceWith(restoredIcon);

  restoredIcon.style.cursor = "pointer";
  restoredIcon.title = "Convert Cantrips to Spell Slots";

  restoredIcon.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openConversionDialog(actor);
  });
}