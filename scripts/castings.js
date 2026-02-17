import { syncResource } from "./resources.js";
import { debugLog } from "./debug.js";

/* -------------------------------------------- */
/*  BLOCK IF ZERO                               */
/* -------------------------------------------- */

Hooks.on("dnd5e.preUseItem", async (item) => {

  if (!item) return;
  if (item.type !== "spell") return;
  if (item.system.level !== 0) return;

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);

  const resource = actor.system.resources.primary;
  const remaining = resource.value ?? 0;

  if (remaining <= 0) {
    ui.notifications.warn(`${actor.name} has no cantrip uses remaining!`);
    return false;
  }
});

/* -------------------------------------------- */
/*  CHAT MESSAGE DECREMENT                      */
/* -------------------------------------------- */

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

  const resource = actor.system.resources.primary;
  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  if (current <= 0) return;

  const newValue = Math.max(0, current - 1);

  await actor.update({
    "system.resources.primary.value": newValue
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
