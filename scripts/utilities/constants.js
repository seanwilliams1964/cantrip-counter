export const MODULE_ID = "cantrip-counter";
export const DEFAULT_MAX_CONVERSION_LEVEL = 9;
export const DEFAULT_MAX_CONVERSIONS_PER_LONG_REST = 3;
export const CURRENT_SCHEMA_VERSION = 4;

/* -------------------------------------------- */
/* Global (World) Settings Enum                 */
/* -------------------------------------------- */

export const GLOBAL_SETTING = Object.freeze({

  addSpellcastingClassLevels: "addSpellcastingClassLevels",
  bonusCantrips: "bonusCantrips",
  cantripIcon: "cantripIcon",
  costPerLevel: "costPerLevel",
  debugMode: "debugMode",
  enableConversion: "enableConversion",
  glowHigh: "glowHigh",
  glowLow: "glowLow",
  glowMedium: "glowMedium",
  maxConversionLevel: "maxConversionLevel",
  maxConversionsPerLongRest: "maxConversionsPerLongRest",
  preventCantripScaling: "preventCantripScaling",
  schemaVersion: "schemaVersion",
  thresholdLow: "thresholdLow",
  thresholdMedium: "thresholdMedium"
});

/* -------------------------------------------- */
/* Actor Flags                                  */
/* -------------------------------------------- */

export const ACTOR_FLAG = Object.freeze({
  bonusCantrips: "bonusCantrips",
  conversionsUsed: "conversionsUsed",
  costPerLevel: "costPerLevel",
  glowHigh: "glowHigh",
  glowLow: "glowLow",
  glowMedium: "glowMedium",
  maxConversionLevel: "maxConversionLevel",
  maxConversionsPerLongRest: "maxConversionsPerLongRest",
  overrideEnabled: "overrideEnabled",
  thresholdLow: "thresholdLow",
  thresholdMedium: "thresholdMedium",
});

/* -------------------------------------------- */
/* Resource Labels                              */
/* -------------------------------------------- */

export const RESOURCE_LABEL = Object.freeze({
  cantripUses: "Cantrip Uses",
  dailyConversions: "Daily Conversions"
});
