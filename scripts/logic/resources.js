import {
  DEFAULT_MAX_CONVERSIONS_PER_LONG_REST,
  RESOURCE_LABEL
} from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { getMaxCantripUses } from "./cantrips.js";
import { getMaxConversionsPerLongRest } from "./conversions.js";
import { hasCantripCounterEligibility } from "./eligibility.js";

export async function syncResource(actor) {
  if (!actor || actor.type !== "character") return;

  const maxCantripUses = getMaxCantripUses(actor);
  if (maxCantripUses === null || maxCantripUses === undefined) return;

  const resource = actor.system.resources?.secondary;

  const needsInit =
    !resource ||
    resource.label !== RESOURCE_LABEL.cantripUses ||
    typeof resource.max !== "number" ||
    typeof resource.value !== "number";

  if (needsInit) {
    await actor.update({
      "system.resources.secondary.label": RESOURCE_LABEL.cantripUses,
      "system.resources.secondary.value": maxCantripUses,
      "system.resources.secondary.max": maxCantripUses,
      "system.resources.secondary.sr": true,
      "system.resources.secondary.lr": true
    }, { cantripCounterSync: true });

    debugLog(
      `Initialized Cantrip Uses for ${actor.name} → ${maxCantripUses}.`
    );
    return;
  }

  if (resource.max !== maxCantripUses) {
    const newValue = Math.min(resource.value ?? 0, maxCantripUses);
    await actor.update({
      "system.resources.secondary.max": maxCantripUses,
      "system.resources.secondary.value": newValue
    }, { cantripCounterSync: true });

    debugLog(
      `Resynced Cantrip Uses for ${actor.name}:`
      + ` ${resource.max} → ${maxCantripUses}; value ${newValue}.`
    );
  }
}

export async function syncConversionResource(actor) {
  if (!actor || actor.type !== "character") return;

  const hasSpellcasting = hasCantripCounterEligibility(actor);
  const desiredMax = getMaxConversionsPerLongRest(actor)
    ?? DEFAULT_MAX_CONVERSIONS_PER_LONG_REST;

  const currentTertiary = actor.system.resources?.tertiary;
  const isModuleTertiary =
    currentTertiary?.label === RESOURCE_LABEL.dailyConversions;
  const syncOptions = { cantripCounterSync: true };

  if (!hasSpellcasting) {
    if (isModuleTertiary) {
      await actor.update({
        "system.resources.tertiary": {
          label: "",
          value: 0,
          max: 0,
          sr: false,
          lr: false
        }
      }, syncOptions);
      debugLog(`Removed Daily Conversions from ${actor.name}.`);
    }
    return;
  }

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
    await actor.update(updates, syncOptions);
    debugLog(`Synced Daily Conversions for ${actor.name} → ${desiredMax}`);
  }
}

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
