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

  const resource = actor.system.resources?.primary;
  const updates = {};

  if (!resource) {
    updates["system.resources.primary"] = {
      label: "Cantrip Uses",
      value: abilityScore,
      max: abilityScore,
      sr: true,
      lr: true
    };
  } else {

    if (resource.label !== "Cantrip Uses")
      updates["system.resources.primary.label"] = "Cantrip Uses";

    if (resource.max !== abilityScore)
      updates["system.resources.primary.max"] = abilityScore;

    if (resource.value == null)
      updates["system.resources.primary.value"] = abilityScore;
  }

  if (Object.keys(updates).length > 0)
    await actor.update(updates);
}

/* -------------------------------------------- */
/*  ABILITY SCORE CHANGE                        */
/* -------------------------------------------- */

Hooks.on("updateActor", async (actor, changes) => {

  if (!actor.hasPlayerOwner) return;
  if (actor.type !== "character") return;

  const abilityKey = actor.system.attributes.spellcasting;
  if (!abilityKey) return;

  const abilityChanges = changes?.system?.abilities?.[abilityKey];
  if (!abilityChanges || abilityChanges.value === undefined) return;

  debugLog(`${actor.name}'s spellcasting ability changed.`);
  await refreshSingleActorMaximum(actor);

});

/* -------------------------------------------- */
/*  REST COMPLETED                              */
/* -------------------------------------------- */

Hooks.on("dnd5e.shortRest", async (actor) => {

  if (!actor || actor.type !== "character") return;

  await syncResource(actor);

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  await actor.update({
    "system.resources.primary.max": abilityScore,
    "system.resources.primary.value": abilityScore
  });

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <p>
        <strong>${actor.name}</strong>'s Cantrip Uses
        have been restored.
        <br>Total Available: ${abilityScore}
      </p>
    `,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  if (actor.sheet?.rendered) actor.sheet.render(true);
});

/* -------------------------------------------- */
/*  LONG REST                                   */
/* -------------------------------------------- */

Hooks.on("dnd5e.longRest", async (actor) => {

  if (!actor || actor.type !== "character") return;

  await syncResource(actor);

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  await actor.update({
    "system.resources.primary.max": abilityScore,
    "system.resources.primary.value": abilityScore
  });

  /* ---------- Conversion Reset Check ---------- */

  let conversionsReset = false;

  if (getConversionsUsed(actor) > 0) {
    await resetConversionsUsed(actor);
    conversionsReset = true;
  }

  /* ---------- Chat Message ---------- */

  let content = `
    <p>
      <strong>${actor.name}</strong>'s Cantrip Uses
      have been fully restored.
      <br>Total Available: ${abilityScore}
  `;

  if (conversionsReset) {
    content += `
      <br>Conversions have been reset for the new long rest.
    `;
  }

  content += `</p>`;

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  if (actor.sheet?.rendered) actor.sheet.render(true);
});

/* -------------------------------------------- */
/*  BONUS CANTRIP SETTING CHANGE LISTENER       */
/* -------------------------------------------- */
Hooks.on("updateSetting", async (setting) => {

  if (setting.key !== `${MODULE_ID}.bonusCantrips`) return;

  await refreshAllCantripMaximums();
});
