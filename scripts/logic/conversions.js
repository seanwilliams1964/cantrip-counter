import { getActorSetting } from "../utilities/helpers.js";
import { getConversionsUsed } from "./cantrip-state.js";

export function getCostPerLevel(actor) {
  return getActorSetting(actor, "costPerLevel", "costPerLevel");
}

export function getMaxConversionLevel(actor) {
  return getActorSetting(actor, "maxConversionLevel", "maxConversionLevel");
}

export function getMaxConversionsPerLongRest(actor) {
  return getActorSetting(actor, "maxConversionsPerLongRest", "maxConversionsPerLongRest");
}

export function hasReachedConversionCap(actor) {

  const max = getMaxConversionsPerLongRest(actor);
  if (!max || max <= 0) return false;

  const used = getConversionsUsed(actor);
  return used >= max;
}

export function isConversionEnabled(actor) {
 return getActorSetting(actor, "overrideEnabled", "enableConversion")
}
