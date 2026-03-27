import { debugLog } from "../utilities/debug.js";
import { hasRemainingCantrips } from '../logic/cantrip-state.js';
import { syncResource } from "../logic/resources.js";

Hooks.on("updateActor", (actor, changed) => {

  debugLog("Hook on updateActor for actor:", actor.name, " with changed data:", changed);


  if (actor.type !== "character") return;

  const newValue = foundry.utils.getProperty(changed, "system.resources.secondary.value");
  if (newValue === undefined) return;

  debugLog("newValue", newValue);

  const max = actor.system.resources.secondary?.max ?? 0;

  // If value equals max (meaning it was clamped), force sheet refresh
  if (actor.system.resources.secondary.value === max) {

    debugLog("Forcing sheet re-render to sync clamped value.");

    for (const app of Object.values(ui.windows)) {
      if (app?.object?.id === actor.id) {
        app.render(false);
      }
    }
  }

  debugLog("Exiting updateActor hook.");
});

Hooks.on("dnd5e.preUseActivity", (activity, config, options) => {

  debugLog("Fired dnd5e.preUseActivity with activity:", activity.type);

  const item = activity?.item; const actor = activity?.actor;

  if (!item || !actor) return;

  if (actor.type !== "character") return;

  // Only spells
  if (item.type !== "spell") return;

  const spellLevel = item.system.level ?? 0;

  // Only cantrips
  if (spellLevel !== 0) return;

  /* ---- Allow Exceptions ---- */

  // Scroll
  if (item.system.source?.type === "scroll") return;

  // At-will
  if (item.system.preparation?.mode === "atwill") return;

  // Item uses
  if (item.system.uses?.max > 0) return;

  /* ---- Block If Empty ---- */

  if (!hasRemainingCantrips(actor)) {

    debugLog("No remaining cantrips for actor:", actor.name);

    ui.notifications.warn(
      `${actor.name} has no remaining cantrip uses.`
    );

    return false; // Cancels activity
  }
});

Hooks.on("dnd5e.preUseItem", async (item) => {

  if (!item) return;
  if (item.type !== "spell") return;
  if (item.system.level !== 0) return;

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);

  const resource = actor.system.resources.secondary;
  const remaining = resource.value ?? 0;

  if (remaining <= 0) {
    ui.notifications.warn(`${actor.name} has no cantrip uses remaining!`);
    return false;
  }
});

Hooks.on("createChatMessage", async (message) => {

  if (!message?.flags?.dnd5e) return;

  const itemData = message.flags.dnd5e.item;
  const messageType = message.flags.dnd5e.messageType;

  if (!itemData) return;
  if (messageType !== "usage") return;
  if (itemData.type !== "spell") return;

  const item = await fromUuid(itemData.uuid);
  if (!item) return;

  if (item.system.level !== 0) return;

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);

  const resource = actor.system.resources.secondary;
  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  if (current <= 0) return;

  const newValue = Math.max(0, current - 1);

  await actor.update({
    "system.resources.secondary.value": newValue
  });

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <p>
        <strong>${actor.name}</strong> casts 
        <em>${item.name}</em>.
        <br>
        <small>Cantrip Uses Remaining: ${newValue}/${max}</small>
      </p>
    `,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  debugLog(`Cantrip used by ${actor.name}. Remaining: ${newValue}/${max}`);
});

Hooks.on("updateActor", async (actor, changes, options) => {

  if (!actor || actor.type !== "character") return;

  if (!foundry.utils.hasProperty(changes, "system.favorites")) return;

  const favorites = actor.system.favorites ?? [];

  const hasPrimary = favorites.some(f =>
    f?.type === "resources" && f?.id === "primary"
  );

  if (hasPrimary) return;
  if (options?.cantripCounterRestore) return;

  debugLog("Primary resource removed — restoring.");

  const updatedFavorites = [
    ...favorites.filter(f => !(f?.type === "resources" && f?.id === "primary")),
    { type: "resources", id: "primary" }
  ];

  await actor.update(
    { "system.favorites": updatedFavorites },
    { cantripCounterRestore: true }
  );

});

Hooks.on("renderActorSheet5eCharacter", (app, html) => {
  const secondaryInput = html.find(
    'input[name="system.resources.secondary.label"]'
  );
  if (secondaryInput.val() === "Cantrip Uses") {
    secondaryInput.prop("disabled", true);
  }
});

Hooks.on("dnd5e.restCompleted", async (actor, data) => {
  if (actor.type !== "character") return;

  const hasSpellcasting = !!actor.system?.attributes?.spellcasting;
  if (!hasSpellcasting) return;

  await syncResource(actor);
});

function requestActorSheetRefresh(actor) {

  debugLog("Fired requestActorSheetRefresh for actor:", actor);

  setTimeout(() => {
    const apps = Object.values(actor.apps);

    debugLog("Actor apps:", apps);

    for (const app of apps) {
      if (typeof app.render === "function") {
        app.render(true);
      }
    }

  }, 0);
} 