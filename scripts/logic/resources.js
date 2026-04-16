import { debugLog } from "../utilities/debug.js";
import { getSpellcastingAbilityScore } from "../utilities/helpers.js";
import { RESOURCE_LABEL } from "../utilities/constants.js";
import { getMaxConversionsPerLongRest } from "./conversions.js";

/* ============================================ */
/*  SYNC CANT RIP USES (secondary)             */
/* ============================================ */

export async function syncResource(actor) {
  if (!actor || actor.type !== "character") return;

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (abilityScore === null || abilityScore === undefined) return;

  const resource = actor.system.resources?.secondary;

  const needsInit =
    !resource ||
    resource.label !== RESOURCE_LABEL.cantripUses ||
    typeof resource.max !== "number" ||
    typeof resource.value !== "number";   // ← Added for extra safety

  if (needsInit) {
    await actor.update({
      "system.resources.secondary.label": RESOURCE_LABEL.cantripUses,
      "system.resources.secondary.value": abilityScore,
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.sr": true,
      "system.resources.secondary.lr": true
    }, { cantripCounterSync: true });

    debugLog(`Initialized Cantrip Uses (secondary) for ${actor.name} → ${abilityScore}`);
    return;
  }

  // Max changed (e.g. ability score or bonus setting updated)
  if (resource.max !== abilityScore) {
    const newValue = Math.min(resource.value ?? 0, abilityScore);   // Clamp safely
    await actor.update({
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.value": newValue
    }, { cantripCounterSync: true });

    debugLog(`Resynced Cantrip Uses max for ${actor.name}: ${resource.max} → ${abilityScore}, value clamped to ${newValue}`);
  }
}

/* ============================================ */
/*  SYNC DAILY CONVERSIONS (tertiary)          */
/* ============================================ */

export async function syncConversionResource(actor) {
  if (!actor || actor.type !== "character") return;

  const hasSpellcasting = !!actor.system?.attributes?.spellcasting;
  const desiredMax = getMaxConversionsPerLongRest(actor) ?? 0;

  const currentTertiary = actor.system.resources?.tertiary;
  const isModuleTertiary = currentTertiary?.label === RESOURCE_LABEL.dailyConversions;

  const syncOptions = { cantripCounterSync: true };   // ← Centralized

  if (!hasSpellcasting) {
    // Clean up on non-spellcasters
    if (isModuleTertiary) {
      await actor.update({
        "system.resources.tertiary": { label: "", value: 0, max: 0, sr: false, lr: false }
      }, syncOptions);
      debugLog(`Removed tertiary (Daily Conversions) from non-spellcaster: ${actor.name}`);
    }
    return;
  }

  if (desiredMax <= 0) {
    // Unlimited → remove the resource entirely
    if (isModuleTertiary) {
      await actor.update({
        "system.resources.tertiary": { label: "", value: 0, max: 0, sr: false, lr: false }
      }, syncOptions);
      debugLog(`Removed tertiary (unlimited conversions) for ${actor.name}`);
    }
    return;
  }

  // Ensure correct resource exists with proper max/value
  let needsUpdate = false;
  const updates = {};

  if (!isModuleTertiary) {
    needsUpdate = true;
    updates["system.resources.tertiary"] = {
      label: RESOURCE_LABEL.dailyConversions,
      value: desiredMax,
      max: desiredMax,
      sr: false,
      lr: true
    };
  } else {
    if (currentTertiary.max !== desiredMax) {
      needsUpdate = true;
      const newValue = Math.min(currentTertiary.value ?? desiredMax, desiredMax);
      updates["system.resources.tertiary"] = {
        label: RESOURCE_LABEL.dailyConversions,
        value: newValue,
        max: desiredMax,
        sr: false,
        lr: true
      };
    } else if (currentTertiary.sr !== false || currentTertiary.lr !== true) {
      needsUpdate = true;
      updates["system.resources.tertiary.sr"] = false;
      updates["system.resources.tertiary.lr"] = true;
    }
  }

  if (needsUpdate) {
    await actor.update(updates, syncOptions);   // Note: no spread needed if updates is already an object
    debugLog(`Synced Daily Conversions for ${actor.name} → ${desiredMax}`);
  }
}

/* ============================================ */
/*  REFRESH ALL (for world setting changes)    */
/* ============================================ */

export async function refreshAllCantripMaximums() {
  debugLog("Refreshing cantrip uses (secondary) for all characters");
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    await syncResource(actor);
  }
}

export async function refreshAllConversionMaximums() {
  debugLog("Refreshing Daily Conversions (tertiary) for all characters");
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    await syncConversionResource(actor);
  }
}

export function hasRemainingCantripUses(actor) {
  const resource = actor.system.resources?.secondary;
  return (resource?.value ?? 0) > 0;
}