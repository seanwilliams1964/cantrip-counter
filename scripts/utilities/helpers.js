import { MODULE_ID, GLOBAL_SETTING } from "../utilities/constants.js";
import { debugLogError, debugLog } from "./debug.js";  
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

/**
 * Returns the effective spell level for a Warlock's pact slots.
 * Prioritizes override > stored level > derived from class levels.
 */
export function getPactSlotLevel(actor, maxLevel = 9) {
  const spellData = actor.system.spells || {};
  const pact = spellData.pact;
  if (!pact) return 1;

  if (Number.isInteger(pact.override) && pact.override >= 1) {
    return Math.min(maxLevel, pact.override);
  }
  if (Number.isInteger(pact.level) && pact.level >= 1) {
    return Math.min(maxLevel, pact.level);
  }

  // Fallback: derive from Warlock class level
  const warlockClass = actor.items.find(item => 
    item.type === "class" && 
    (item.system?.identifier === "warlock" || 
     item.name.toLowerCase().includes("warlock"))
  );

  const warlockLevel = warlockClass?.system?.levels ?? 1;
  return Math.min(maxLevel, Math.ceil(warlockLevel / 2) || 1);
}

export function getActorSetting(actor, key, worldSettingKey = null) {

  debugLog(`getActorSetting → key: ${key}, actor:`, actor);

  /* -------------------------------------------- */
  /* Validate Actor                               */
  /* -------------------------------------------- */

  if (!actor || typeof actor.getFlag !== "function") {
    debugLogError("getActorSetting: invalid actor provided.");

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
    return maybeNormalize(actorValue);
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

  return maybeNormalize(worldValue);
}

function maybeNormalize(value) {
  return (typeof value === "string") ? normalizeHex(value) : value;
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

export async function getActorSpellcastingChanges(actor, changes) {
  const flatChanges = foundry.utils.flattenObject(changes);

  debugLog("getActorSpellcastingChanges: flatChanges →", flatChanges, "for actor:", actor.name);

  const spellcastingAbility = actor.system.attributes.spellcasting;

  debugLog("getActorSpellcastingChanges: spellcastingAbility →", spellcastingAbility, "for actor:", actor.name);
 
  debugLog("getActorSpellcastingChanges: checking for changes in", Object.keys(flatChanges), "for actor:", actor.name);

  const abilityChanged = Object.keys(flatChanges).some(key =>
    key === `system.abilities.${spellcastingAbility}.value`
  );

  debugLog("getActorSpellcastingChanges: abilityChanged →", abilityChanged, "for actor:", actor.name);

  return abilityChanged;
}