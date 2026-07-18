import {
  consumeCantrip,
  hasRemainingCantripUses
} from "../../logic/cantrips.js";
import { hasCantripCounterEligibility } from "../../logic/eligibility.js";
import { syncResource } from "../../logic/resources.js";
import {
  GLOBAL_SETTING,
  MODULE_ID
} from "../../utilities/constants.js";
import { debugLog } from "../../utilities/debug.js";

Hooks.on("dnd5e.preUseActivity", async activity => {
  const item = activity?.item;
  const actor = activity?.actor;

  if (
    !item
    || item.type !== "spell"
    || Number(item.system.level) !== 0
    || !hasCantripCounterEligibility(actor)
  ) {
    return;
  }

  if (item.system.source?.type === "scroll") return;
  if (item.system.preparation?.mode === "atwill") return;
  if (Number(item.system.uses?.max ?? 0) > 0) return;

  await syncResource(actor);
  if (!hasRemainingCantripUses(actor)) {
    ui.notifications.warn(`${actor.name} has no remaining cantrip uses.`);
    return false;
  }

  if (!await consumeCantrip(actor)) return false;
  debugLog(`Consumed a Cantrip Use for ${item.name}.`);
});

Hooks.on("dnd5e.preRollDamage", config => {
  const activity = config.subject;
  const item = activity?.item;
  const actor = item?.actor;

  if (
    !item
    || item.type !== "spell"
    || Number(item.system.level) !== 0
    || !hasCantripCounterEligibility(actor)
    || !game.settings.get(
      MODULE_ID,
      GLOBAL_SETTING.preventCantripScaling
    )
  ) {
    return;
  }

  let modified = false;
  for (const part of activity.damage?.parts ?? []) {
    if (part.scaling?.mode === "whole" && part.scaling.number > 1) {
      part.scaling.number = 1;
      modified = true;
    }
  }

  for (const rollConfig of config.rolls ?? []) {
    const parts = (activity.damage?.parts ?? []).map(part => {
      const number = part.number ?? 1;
      const denomination = part.denomination ?? "10";
      const bonus = part.bonus ? ` + ${part.bonus}` : "";
      return `${number}d${denomination}${bonus}`.trim();
    });

    if (parts.length > 0) {
      rollConfig.parts = parts;
      modified = true;
    }

    if (rollConfig.data?.scaling) {
      rollConfig.data.scaling = { increase: 0 };
    }
    if (rollConfig.data?.["scaling.increase"] !== undefined) {
      rollConfig.data["scaling.increase"] = 0;
    }
  }

  if (modified) {
    debugLog(`Prevented damage scaling for ${item.name}.`);
  }
});
