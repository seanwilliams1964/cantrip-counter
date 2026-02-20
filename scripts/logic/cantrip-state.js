import { MODULE_ID } from "../core/settings.js";
import { debugLog } from "../utilities/debug.js";
import { getActorSetting, getSpellcastingAbilityScore } from "../utilities/helpers.js";

export function getConversionsUsed(actor) {
  return getActorSetting(actor, "conversionsUsed", "conversionsUsed");
}

export async function incrementConversionsUsed(actor) {

  const used = getConversionsUsed(actor);
  await actor.setFlag(MODULE_ID, "conversionsUsed", used + 1);
}

export async function resetConversionsUsed(actor) {
  await actor.setFlag(MODULE_ID, "conversionsUsed", 0);
}

export function getRemainingCantrips(actor) {

  if (!actor) return 0;

  const resource = actor.system?.resources?.primary;

  if (!resource) return 0;

  debugLog("Fired getRemainingCantrips for actor:", actor.name, " with resource:", resource);
  
  return Number(resource.value ?? 0);
}

export function hasRemainingCantrips(actor) {
  return getRemainingCantrips(actor) > 0;
}

export async function refreshSingleActorMaximum(actor) {

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const resource = actor.system.resources.primary;
  if (!resource) return;

  const updates = {
    "system.resources.primary.max": abilityScore
  };

  if (resource.value > abilityScore)
    updates["system.resources.primary.value"] = abilityScore;

  await actor.update(updates);
}

export async function refreshAllCantripMaximums() {

  for (const actor of game.actors) {
    if (!actor.hasPlayerOwner) continue;
    if (actor.type !== "character") continue;
    await refreshSingleActorMaximum(actor);
  }
}