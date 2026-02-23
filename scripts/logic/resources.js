import { debugLog } from "../utilities/debug.js";
import { getSpellcastingAbilityScore } from "../utilities/helpers.js";
import { MODULE_ID, RESOURCE_LABEL } from "../utilities/constants.js";

/* -------------------------------------------- */
/*  SYNC RESOURCE                               */
/* -------------------------------------------- */

export async function syncResource(actor) {
  if (!actor || actor.type !== "character") return;

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (abilityScore === null || abilityScore === undefined) return;

  const resource = actor.system.resources?.secondary;

  const needsInit =
    !resource ||
    resource.label !== RESOURCE_LABEL.cantripUses ||
    typeof resource.max !== "number";

  if (needsInit) {
    await actor.update({
      "system.resources.secondary.label": RESOURCE_LABEL.cantripUses,
      "system.resources.secondary.value": abilityScore,
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.sr": true,
      "system.resources.secondary.lr": true
    });
    return;
  }

  if (resource.max !== abilityScore) {
    const newValue = Math.min(resource.value ?? 0, abilityScore);

    await actor.update({
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.value": newValue
    });
  }
}
/* -------------------------------------------- */
/*  ABILITY SCORE CHANGE                        */
/* -------------------------------------------- */

Hooks.on("updateActor", async (actor, updateData, options) => {

  if (options?.cantripCounterSync) return;
  if (actor.type !== "character") return;

  const abilitiesUpdate = foundry.utils.getProperty(updateData, "system.abilities");
  if (!abilitiesUpdate) return;

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (abilityScore === null || abilityScore === undefined) return;

  const resource = actor.system.resources?.secondary;
  if (!resource || resource.label !== RESOURCE_LABEL.cantripUses) return;

  const currentMax = resource.max ?? 0;
  const currentValue = resource.value ?? 0;

  if (currentMax === abilityScore) return;

  const newValue = Math.min(currentValue, abilityScore);

  await actor.update(
    {
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.value": newValue
    },
    { cantripCounterSync: true }
  );

  debugLog(
    `Resynced ${actor.name}: max ${currentMax} → ${abilityScore}, value ${currentValue} → ${newValue}`
  );
});

/* -------------------------------------------- */
/*  BONUS CANTRIP SETTING CHANGE LISTENER       */
/* -------------------------------------------- */
Hooks.on("updateSetting", async (setting) => {

  if (setting.key !== `${MODULE_ID}.bonusCantrips`) return;

  await refreshAllCantripMaximums();
});
