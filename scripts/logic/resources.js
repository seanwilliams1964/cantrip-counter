import { debugLog } from "../utilities/debug.js";
import { getSpellcastingAbilityScore } from "../utilities/helpers.js";
import { 
  getConversionsUsed, 
  resetConversionsUsed, 
  refreshSingleActorMaximum, 
  refreshAllCantripMaximums 
} from "./cantrip-state.js";

/* -------------------------------------------- */
/*  SYNC RESOURCE                               */
/* -------------------------------------------- */

export async function syncResource(actor) {
  if (!actor || actor.type !== "character") return;

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const resource = actor.system.resources?.secondary;

  const needsInit =
    !resource ||
    resource.label !== "Cantrip Uses" ||
    typeof resource.max !== "number";

  if (needsInit) {
    await actor.update({
      "system.resources.secondary.label": "Cantrip Uses",
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

Hooks.on("updateActor", async (actor, updateData, options, userId) => {

  if (actor.type !== "character") return;

  // Only proceed if abilities were part of the update payload
  const abilitiesUpdate = foundry.utils.getProperty(updateData, "system.abilities");
  if (!abilitiesUpdate) return;

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const resource = actor.system.resources?.secondary;
  if (!resource || resource.label !== "Cantrip Uses") return;

  const currentMax = resource.max ?? 0;
  const currentValue = resource.value ?? 0;

  // If max already matches calculated ability, do nothing
  if (currentMax === abilityScore) return;

  const newValue = Math.min(currentValue, abilityScore);

  await actor.update({
    "system.resources.secondary.max": abilityScore,
    "system.resources.secondary.value": newValue
  });

  debugLog(
    `Resynced ${actor.name}: max ${currentMax} → ${abilityScore}, value ${currentValue} → ${newValue}`
  );
});

/* -------------------------------------------- */
/*  REST COMPLETED                              */
/* -------------------------------------------- */

Hooks.on("dnd5e.restCompleted", async (actor, result) => {

  if (!actor || actor.type !== "character") return;

  debugLog("dnd5e.restCompleted begin Promise");

  await new Promise(resolve => setTimeout(resolve, 0));

  debugLog("dnd5e.restCompleted exit Promise");

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  await syncResource(actor);

  const resource = actor.system.resources?.secondary;
  if (!resource || resource.label !== "Cantrip Uses") return;

  const currentValue = resource.value ?? 0;
  const currentMax = resource.max ?? abilityScore;

  /* -------------------------------------------- */
  /*  RESET CONVERSIONS (ALWAYS ON LONG REST)    */
  /* -------------------------------------------- */

  if (result?.longRest && getConversionsUsed(actor) > 0) {
    await resetConversionsUsed(actor);
    debugLog(`Reset conversionsUsed for ${actor.name}`);
  }

  /* -------------------------------------------- */
  /*  RESTORE CANTRIPS IF NEEDED                  */
  /* -------------------------------------------- */

  if (currentValue >= currentMax) return;

  const restoredCount = currentMax - currentValue;

  debugLog(
    "Current:", currentValue,
    "Max:", currentMax,
    "Restoring:", restoredCount
  );

  await actor.update({
    "system.resources.secondary.value": currentMax
  });

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <p>
        <strong>Restored ${restoredCount} Cantrip Uses for ${actor.name}</strong>
        <br>Cantrip count is now ${currentMax}.
      </p>
    `,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
});

/* -------------------------------------------- */
/*  BONUS CANTRIP SETTING CHANGE LISTENER       */
/* -------------------------------------------- */
Hooks.on("updateSetting", async (setting) => {

  if (setting.key !== `${MODULE_ID}.bonusCantrips`) return;

  await refreshAllCantripMaximums();
});
