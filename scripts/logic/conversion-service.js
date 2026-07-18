import { getRemainingCantrips } from "./cantrips.js";
import {
  getConversionOptions,
  getMaxConversions,
  getRemainingConversions,
  hasReachedConversionCap,
  isConversionEnabled
} from "./conversions.js";

/**
 * Restore one spell slot and pay both resource costs in a single actor update.
 */
export async function restoreSpellSlotFromCantrips(actor, selection) {
  if (!actor) return failure("No actor was provided.");
  if (!isConversionEnabled(actor)) {
    return failure("Spell-slot conversion is disabled.");
  }
  if (hasReachedConversionCap(actor)) {
    return failure("Conversion Limit Reached");
  }

  const type = selection?.type;
  const level = Number.parseInt(selection?.level, 10);
  const option = getConversionOptions(actor).find(candidate =>
    candidate.type === type
    && (type === "pact" || candidate.level === level)
  );

  if (!option) return failure("The selected spell slot cannot be restored.");
  if (!option.affordable) {
    return failure(`Not enough Cantrip Uses. Need ${option.cost}.`);
  }

  const remainingCantrips = getRemainingCantrips(actor) - option.cost;
  const remainingConversions = getRemainingConversions(actor) - 1;
  const maxCantrips = Number(
    actor.system.resources?.secondary?.max ?? 0
  );
  const maxConversions = getMaxConversions(actor);
  const updates = {
    "system.resources.secondary.value": remainingCantrips,
    "system.resources.tertiary.value": remainingConversions
  };

  if (option.type === "pact") {
    updates["system.spells.pact.value"] = option.value + 1;
  } else {
    updates[`system.spells.spell${option.level}.value`] = option.value + 1;
  }

  await actor.update(updates, { cantripCounterConversion: true });

  const restoredLabel = option.type === "pact"
    ? `Pact Slot (Level ${option.level})`
    : `Level ${option.level} Slot`;
  const formula = option.type === "pact"
    ? `Pact Level (${option.level}) + Cost Per Level`
    : `Spell Level (${option.level}) × Cost Per Level`;

  return {
    ok: true,
    restoredLabel,
    cost: option.cost,
    formula,
    remainingCantrips,
    maxCantrips,
    remainingConversions,
    maxConversions
  };
}

function failure(message) {
  return { ok: false, message };
}
