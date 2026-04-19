import { getActorSetting } from "../utilities/helpers.js";
import { ACTOR_FLAG, GLOBAL_SETTING } from "../utilities/constants.js";
import { getRemainingConversions } from "./cantrip-state.js";
import { debugLog } from "../utilities/debug.js";

/* -------------------------------------------- */
/* Conversion Cost Per Spell Level              */
/* -------------------------------------------- */

export function getCostPerLevel(actor) {
  return getActorSetting(
    actor,
    ACTOR_FLAG.costPerLevel,
    GLOBAL_SETTING.costPerLevel
  );
}

/* -------------------------------------------- */
/* Maximum Convertible Spell Level              */
/* -------------------------------------------- */

export function getMaxConversionLevel(actor) {
  return getActorSetting(
    actor,
    ACTOR_FLAG.maxConversionLevel,
    GLOBAL_SETTING.maxConversionLevel
  );
}

/* -------------------------------------------- */
/* Maximum Conversions Per Long Rest            */
/* -------------------------------------------- */

export function getMaxConversionsPerLongRest(actor) {
  return getActorSetting(
    actor,
    ACTOR_FLAG.maxConversionsPerLongRest,
    GLOBAL_SETTING.maxConversionsPerLongRest
  );
}

/* -------------------------------------------- */
/* Conversion Cap Check                         */
/* -------------------------------------------- */

export function hasReachedConversionCap(actor) {
  return getRemainingConversions(actor) <= 0;
}

/* -------------------------------------------- */
/* Conversion Enabled Check                     */
/* -------------------------------------------- */

export function isConversionEnabled(actor) {
  console.log("TRACE: isConversionEnabled called");
  debugLog("Checking if conversion is enabled for actor:", actor);
  
  return getActorSetting(
    actor,
    ACTOR_FLAG.overrideEnabled,
    GLOBAL_SETTING.enableConversion
  );
}