import { openConversionDialog } from "../ui/dialogs.js";
import { GLOBAL_SETTING, MODULE_ID } from "../utilities/constants.js";
import { debugLog, debugLogError } from "./debug.js";

export function getSpellcastingAbilityScore(actor) {
  const abilityKey = getCantripCounterAbilityKey(actor);
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

  debugLog(`getActorSetting → key: ${key}, actor:`, actor.name);

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

  const spellcastingAbility = getCantripCounterAbilityKey(actor);
  if (!spellcastingAbility) return false;

  debugLog("getActorSpellcastingChanges: spellcastingAbility →", spellcastingAbility, "for actor:", actor.name);

  debugLog("getActorSpellcastingChanges: checking for changes in", Object.keys(flatChanges), "for actor:", actor.name);

  const abilityChanged = Object.keys(flatChanges).some(key =>
    key === `system.abilities.${spellcastingAbility}.value`
  );

  debugLog("getActorSpellcastingChanges: abilityChanged →", abilityChanged, "for actor:", actor.name);

  return abilityChanged;
}

export function hasCantripCounterEligibility(actor) {
  if (!actor || actor.type !== "character") return false;

  if (actor.system?.attributes?.spellcasting) return true;

  return actor.items?.some(item => isSpellcastingFeat(item)) ?? false;
}

export function getCantripCounterAbilityKey(actor) {
  if (!actor || actor.type !== "character") return null;

  const actorSpellcasting = actor.system?.attributes?.spellcasting;
  if (actorSpellcasting) return actorSpellcasting;

  return getFeatSpellcastingAbilityKey(actor);
}

function getFeatSpellcastingAbilityKey(actor) {
  const feats = actor.items?.filter(item => isSpellcastingFeat(item)) ?? [];

  for (const feat of feats) {
    const advancements = Object.values(feat.toObject().system?.advancement ?? {});

    const spellChoice = advancements.find(adv =>
      adv.type === "ItemChoice" &&
      adv.configuration?.type === "spell" &&
      adv.value?.ability &&
      String(adv.configuration?.restriction?.level) !== "0"
    );

    const abilityKey = spellChoice?.value?.ability;

    if (actor.system?.abilities?.[abilityKey]) {
      return abilityKey;
    }
  }

  return null;
}

function isSpellcastingFeat(item) {
  if (!item || item.type !== "feat") return false;

  const advancements = Object.values(item.toObject().system?.advancement ?? {});

  return advancements.some(adv =>
    adv.type === "ItemChoice" &&
    adv.configuration?.type === "spell" &&
    adv.value?.ability
  );
}