import {
  ACTOR_FLAG,
  DEFAULT_MAX_CONVERSION_LEVEL,
  DEFAULT_MAX_CONVERSIONS_PER_LONG_REST,
  GLOBAL_SETTING,
  MODULE_ID
} from "../utilities/constants.js";
import { getActorConversionSetting } from "./actor-settings.js";
import { getRemainingCantrips } from "./cantrips.js";

export function getCostPerLevel(actor) {
  return positiveInteger(
    getActorConversionSetting(
      actor,
      ACTOR_FLAG.costPerLevel,
      GLOBAL_SETTING.costPerLevel,
      ACTOR_FLAG.overrideEnabled
    ),
    3
  );
}

export function getMaxConversionLevel(actor) {
  return positiveInteger(
    getActorConversionSetting(
      actor,
      ACTOR_FLAG.maxConversionLevel,
      GLOBAL_SETTING.maxConversionLevel,
      ACTOR_FLAG.overrideEnabled
    ),
    DEFAULT_MAX_CONVERSION_LEVEL
  );
}

export function getMaxConversionsPerLongRest(actor) {
  return positiveInteger(
    getActorConversionSetting(
      actor,
      ACTOR_FLAG.maxConversionsPerLongRest,
      GLOBAL_SETTING.maxConversionsPerLongRest,
      ACTOR_FLAG.overrideEnabled
    ),
    DEFAULT_MAX_CONVERSIONS_PER_LONG_REST
  );
}

export function isConversionEnabled() {
  return Boolean(
    game.settings.get(MODULE_ID, GLOBAL_SETTING.enableConversion)
  );
}

export function getRemainingConversions(actor) {
  return Number(actor.system.resources?.tertiary?.value ?? 0);
}

export function getMaxConversions(actor) {
  return Number(actor.system.resources?.tertiary?.max ?? 0);
}

export function hasReachedConversionCap(actor) {
  return getRemainingConversions(actor) <= 0;
}

function getPactSlotLevel(actor) {
  const pact = actor.system.spells?.pact;
  if (!pact) return 1;

  if (Number.isInteger(pact.override) && pact.override >= 1) {
    return pact.override;
  }

  if (Number.isInteger(pact.level) && pact.level >= 1) {
    return pact.level;
  }

  const warlockClass = Array.from(actor.items ?? []).find(item =>
    item.type === "class"
    && (
      item.system?.identifier === "warlock"
      || item.name?.toLowerCase().includes("warlock")
    )
  );
  const warlockLevel = Number(warlockClass?.system?.levels ?? 1);
  return Math.min(
    5,
    Math.max(1, Math.ceil(warlockLevel / 2))
  );
}

function getPactConversionCost(pactLevel, costPerLevel) {
  return pactLevel + costPerLevel;
}

/**
 * Return every open slot that is eligible for conversion. Unaffordable slots
 * remain in the result so the dialog can explain their cost.
 */
export function getConversionOptions(actor) {
  const spellData = actor.system.spells ?? {};
  const remainingCantrips = getRemainingCantrips(actor);
  const maxLevel = getMaxConversionLevel(actor);
  const costPerLevel = getCostPerLevel(actor);
  const options = [];

  for (let level = 1; level <= maxLevel; level++) {
    const slot = spellData[`spell${level}`];
    const value = Number(slot?.value ?? 0);
    const max = Number(slot?.max ?? 0);
    if (max <= 0 || value >= max) continue;

    const cost = level * costPerLevel;
    const affordable = remainingCantrips >= cost;
    options.push({
      type: "spell",
      level,
      label: affordable
        ? `Level ${level}`
        : `Level ${level} — Not enough cantrips (need ${cost})`,
      value,
      max,
      cost,
      affordable,
      buttonLabel: `Restore 1 Level ${level} Slot (Cost ${cost})`
    });
  }

  const pact = spellData.pact;
  const pactValue = Number(pact?.value ?? 0);
  const pactMax = Number(pact?.max ?? 0);

  if (pactMax > 0 && pactValue < pactMax) {
    const pactLevel = getPactSlotLevel(actor);
    if (pactLevel <= maxLevel) {
      const cost = getPactConversionCost(pactLevel, costPerLevel);
      const affordable = remainingCantrips >= cost;
      options.push({
        type: "pact",
        level: pactLevel,
        label: affordable
          ? `Pact Slot (Level ${pactLevel})`
          : `Pact Slot (Level ${pactLevel}) — Not enough cantrips (need ${cost})`,
        value: pactValue,
        max: pactMax,
        cost,
        affordable,
        buttonLabel: `Restore 1 Pact Slot (Cost ${cost})`
      });
    }
  }

  return options;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}
