import {
  ACTOR_FLAG,
  GLOBAL_SETTING,
  MODULE_ID
} from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import {
  getSpellcastingAbilityScore,
  getSpellcastingClassLevels
} from "./eligibility.js";

export function getActorBonusCantrips(actor) {
  if (!actor || typeof actor.getFlag !== "function") return 0;

  const value = Number(
    actor.getFlag(MODULE_ID, ACTOR_FLAG.bonusCantrips) ?? 0
  );

  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function getMaxCantripUses(actor) {
  const abilityScore = getSpellcastingAbilityScore(actor);
  if (abilityScore === null) return null;

  const configuredWorldBonus = Number(
    game.settings.get(MODULE_ID, GLOBAL_SETTING.bonusCantrips) ?? 0
  );
  const worldBonus = Number.isFinite(configuredWorldBonus)
    ? configuredWorldBonus
    : 0;
  const actorBonus = getActorBonusCantrips(actor);
  const includeClassLevels = game.settings.get(
    MODULE_ID,
    GLOBAL_SETTING.addSpellcastingClassLevels
  );
  const classLevelBonus = includeClassLevels
    ? getSpellcastingClassLevels(actor)
    : 0;

  return Math.max(
    0,
    Math.trunc(abilityScore + worldBonus + actorBonus + classLevelBonus)
  );
}

export function getRemainingCantrips(actor) {
  return Number(actor.system.resources?.secondary?.value ?? 0);
}

export function hasRemainingCantripUses(actor) {
  return getRemainingCantrips(actor) > 0;
}

export async function consumeCantrip(actor) {
  const current = getRemainingCantrips(actor);
  if (current <= 0) return false;

  await actor.update(
    { "system.resources.secondary.value": current - 1 },
    { cantripCounterConsumption: true }
  );

  debugLog(`Consumed one Cantrip Use for ${actor.name}: ${current} → ${current - 1}`);
  return true;
}
