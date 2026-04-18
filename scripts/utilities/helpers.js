import { MODULE_ID, GLOBAL_SETTING } from "../utilities/constants.js";
import { debugLog } from "./debug.js";  
import { openConversionDialog } from "../ui/dialogs.js";

export function getSpellcastingAbilityScore(actor) {

  const abilityKey = actor.system.attributes.spellcasting;
  if (!abilityKey) return null;

  const ability = actor.system.abilities[abilityKey];
  if (!ability) return null;

  const baseScore = ability.value ?? 0;
  const bonus = game.settings.get(MODULE_ID, GLOBAL_SETTING.bonusCantrips) ?? 0;

  return baseScore + bonus;
}

export function getActorSetting(actor, key, worldSettingKey = null) {

  debugLog(`getActorSetting → key: ${key}, actor:`, actor);

  /* -------------------------------------------- */
  /* Validate Actor                               */
  /* -------------------------------------------- */

  if (!actor || typeof actor.getFlag !== "function") {
    console.error("getActorSetting: invalid actor provided.");

    // If no valid actor and no world fallback, return null
    if (!worldSettingKey) return null;

    return game.settings.get(MODULE_ID, worldSettingKey);
  }

  /* -------------------------------------------- */
  /* Check Actor Flag                             */
  /* -------------------------------------------- */

  const actorValue = actor.getFlag(MODULE_ID, key);

  if (actorValue !== undefined && actorValue !== null) {
    debugLog("Actor override found:", actorValue);
    return normalizeHex(actorValue);
  }

  /* -------------------------------------------- */
  /* No Actor Override — Check World Fallback     */
  /* -------------------------------------------- */

  if (!worldSettingKey) {
    debugLog("No world fallback provided; returning null.");
    return null;
  }

  const worldValue = game.settings.get(MODULE_ID, worldSettingKey);

  debugLog(
    `No actor override. Using world setting: ${worldSettingKey} →`,
    worldValue
  );

  return normalizeHex(worldValue);
}

function normalizeHex(value) {

  if (
    typeof value === "string" &&
    value.startsWith("#") &&
    value.length === 9
  ) {
    debugLog("Normalizing 8-digit HEX to 6-digit:", value);
    return value.slice(0, 7);
  }

  return value;
}

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
