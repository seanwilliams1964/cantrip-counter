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

export function getActorSetting(actor, key, worldSettingKey) {

  debugLog(`getActorSetting called with key ${key} and actor:`, actor);

 if (!actor || typeof actor.getFlag !== "function") {
    debugLog("Actor is undefined");
    return game.settings.get(MODULE_ID, worldSettingKey);
  }

  let actorValue = actor.getFlag(MODULE_ID, key);

  if (actorValue !== undefined && actorValue !== null) {
    debugLog("Actor value found:", actorValue);
    return actorValue;
  }

  actorValue = game.settings.get(MODULE_ID, worldSettingKey);
  debugLog(`Actor setting not found, returning world setting: ${worldSettingKey} value: ${actorValue}`);

   if (typeof actorValue === "string" && actorValue.startsWith("#") && actorValue.length === 9) {
    debugLog("Normalizing 8-digit HEX to 6-digit:", actorValue);
    actorValue = actorValue.slice(0, 7);
  }

  return actorValue;
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
