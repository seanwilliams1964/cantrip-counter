import { MODULE_ID } from "../utilities/constants.js";
import { debugLog, debugLogError } from "../utilities/debug.js";

/**
 * Resolve an actor flag with an optional world-setting fallback.
 */
export function getActorSetting(actor, actorFlag, worldSetting = null) {
  if (!actor || typeof actor.getFlag !== "function") {
    debugLogError("getActorSetting: invalid actor provided.");
    return worldSetting ? game.settings.get(MODULE_ID, worldSetting) : null;
  }

  const actorValue = actor.getFlag(MODULE_ID, actorFlag);
  if (actorValue !== undefined && actorValue !== null) {
    debugLog(`Using actor setting ${actorFlag} for ${actor.name}.`);
    return normalizeSettingValue(actorValue);
  }

  if (!worldSetting) return null;
  return normalizeSettingValue(game.settings.get(MODULE_ID, worldSetting));
}

/**
 * Resolve a conversion setting. Actor conversion values are active only while
 * the actor's conversion override is enabled.
 */
export function getActorConversionSetting(
  actor,
  actorFlag,
  worldSetting,
  overrideFlag
) {
  const overrideEnabled =
    actor?.getFlag?.(MODULE_ID, overrideFlag) === true;

  if (overrideEnabled) {
    const actorValue = actor.getFlag(MODULE_ID, actorFlag);
    if (actorValue !== undefined && actorValue !== null) {
      return normalizeSettingValue(actorValue);
    }
  }

  return normalizeSettingValue(game.settings.get(MODULE_ID, worldSetting));
}

function normalizeSettingValue(value) {
  if (
    typeof value === "string"
    && value.startsWith("#")
    && value.length === 9
  ) {
    return value.slice(0, 7);
  }

  return value;
}
