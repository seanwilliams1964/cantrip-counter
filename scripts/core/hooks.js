import { hasRemainingCantripUses, syncResource, syncConversionResource } from "../logic/resources.js";
import { getRenderedSheetRoot } from "../utilities/utility.js";
import { applyCantripLogic } from "../ui/ui.js";  
import { RESOURCE_LABEL } from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";


Hooks.on("updateActor", async (actor, changes, options) => {
  if (!actor || actor.type !== "character") return;

  const isOurUpdate = options?.cantripCounterSync === true;

  debugLog("updateActor fired for", actor.name, "with changes:", changes);

  /* ============================================ */
  /* 1. Force sync on ANY external update         */
  /*    (This is the DDB import fix)              */
  /* ============================================ */
  if (!isOurUpdate) {
    await syncResource(actor);
    await syncConversionResource(actor);
  }

  /* ============================================ */
  /* 2. Resource Clamping Refresh                 */
  /* ============================================ */
  const newValue = foundry.utils.getProperty(changes, "system.resources.secondary.value");
  if (newValue !== undefined) {
    const max = actor.system.resources.secondary?.max ?? 0;
    if (actor.system.resources.secondary.value === max) {
      debugLog("Forcing sheet re-render to sync clamped cantrip value.");
      for (const app of Object.values(actor.apps)) {
        if (typeof app.render === "function") app.render(false);
      }
    }
  }

  /* ============================================ */
  /* 3. Favorites Protection — Secondary Resource */
  /* ============================================ */
  if (foundry.utils.hasProperty(changes, "system.favorites")) {
    const favorites = actor.system.favorites ?? [];
    const hasSecondary = favorites.some(f =>
      f?.type === "resources" && f?.id === "secondary"
    );

    const secondary = actor.system.resources?.secondary;
    const isCantripResource = secondary?.label === RESOURCE_LABEL.cantripUses;
    const hasSpellcasting = !!actor.system?.attributes?.spellcasting;

    if (!hasSecondary && isCantripResource && hasSpellcasting && !options?.cantripCounterRestore) {
      debugLog(`Secondary resource (Cantrip Uses) missing from favorites — restoring for ${actor.name}`);

      const updatedFavorites = [
        ...favorites.filter(f => !(f?.type === "resources" && f?.id === "secondary")),
        { type: "resources", id: "secondary" }
      ];

      await actor.update(
        { "system.favorites": updatedFavorites },
        { cantripCounterRestore: true }
      );
      // Continue processing (do not early return)
    }
  }

  /* ============================================ */
  /* 4. Prevent loops on our own updates          */
  /* ============================================ */
  if (isOurUpdate) {
    debugLog("Exiting updateActor (our own sync update)");
    return;
  }

  /* ============================================ */
  /* 5. Spellcasting Ability Change               */
  /* ============================================ */
  const abilitiesUpdate = foundry.utils.getProperty(changes, "system.abilities");
  if (abilitiesUpdate) {
    const abilityScore = getSpellcastingAbilityScore(actor);
    if (abilityScore === null || abilityScore === undefined) return;

    const resource = actor.system.resources?.secondary;
    if (!resource || resource.label !== RESOURCE_LABEL.cantripUses) return;

    const currentMax = resource.max ?? 0;
    const currentValue = resource.value ?? 0;

    if (currentMax === abilityScore) return;

    const newClampedValue = Math.min(currentValue, abilityScore);

    await actor.update({
      "system.resources.secondary.max": abilityScore,
      "system.resources.secondary.value": newClampedValue
    }, { cantripCounterSync: true });

    debugLog(`Resynced ${actor.name}: max ${currentMax} → ${abilityScore}, value ${currentValue} → ${newClampedValue}`);
  }

  debugLog("Exiting consolidated updateActor hook for", actor.name);
});

Hooks.on("dnd5e.preUseActivity", async (activity, config, options) => {
  debugLog("Fired dnd5e.preUseActivity with activity:", activity.type);

  const item = activity?.item; 
  const actor = activity?.actor;

  if (!item || !actor || actor.type !== "character") return;
  if (item.type !== "spell" || item.system.level !== 0) return;

  /* ---- Allow Exceptions ---- */
  if (item.system.source?.type === "scroll") return;
  if (item.system.preparation?.mode === "atwill") return;
  if (item.system.uses?.max > 0) return;

  /* ---- Force sync before check (critical for DDB imports) ---- */
  await syncResource(actor);

  if (!hasRemainingCantripUses(actor)) {
    debugLog("No remaining cantrips for actor:", actor.name);
    ui.notifications.warn(`${actor.name} has no remaining cantrip uses.`);
    return false; // Cancels the activity
  }
});

Hooks.on("dnd5e.preUseItem", async (item) => {

  if (!item) return;
  if (item.type !== "spell") return;
  if (item.system.level !== 0) return;

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);
  await syncConversionResource(actor);

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
  await syncConversionResource(actor);

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
  await syncConversionResource(actor);
});

/* ============================================ */
/*  Force Sheet Refresh                         */
/* ============================================ */

Hooks.on("cantripCounterRefreshUI", () => {
  for (const app of Object.values(ui.windows)) {
    if (app?.object?.type === "character") {
      app.render(false);
    }
  }
});

/* ============================================ */
/*  Sheet Render Hook (Legacy + V2)            */
/* ============================================ */

Hooks.on("renderActorSheet5eCharacter", handleCantripSheetRender);
Hooks.on("renderActorSheet5eCharacter2", handleCantripSheetRender);
Hooks.on("renderActorSheetV2", handleCantripSheetRender);

async function handleCantripSheetRender(app) {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  debugLog(`handleCantripSheetRender fired for ${actor.name} (app id: ${app.id}, class: ${app.constructor.name})`);

  // Force data sync first
  await syncResource(actor);
  await syncConversionResource(actor);

  const root = await getRenderedSheetRoot(app);
  if (!root) {
    debugLog(`No root element found for ${actor.name}`);
    return;
  }

  const hasSpellcasting = !!actor.system?.attributes?.spellcasting;

  // Broader selector as fallback (V2 sheet sometimes uses different structure)
  let secondaryResource = root.querySelector('li.resource[data-favorite-id="resources.secondary"]');
  if (!secondaryResource) {
    secondaryResource = root.querySelector('li.resource[data-resource="secondary"]') || 
                        Array.from(root.querySelectorAll('li.resource')).find(li => 
                          li.textContent.includes("Cantrip Uses") || 
                          li.querySelector('input[name*="secondary"]')
                        );
  }

  const tertiaryResource = root.querySelector('li.resource[data-favorite-id="resources.tertiary"]');

  if (!hasSpellcasting) {
    if (secondaryResource) secondaryResource.style.display = "none";
    if (tertiaryResource) tertiaryResource.style.display = "none";
    return;
  }

  if (secondaryResource) {
    secondaryResource.style.display = "";
    applyCantripLogic(app, root, secondaryResource);
    debugLog(`✅ Applied cantrip logic to secondary resource for ${actor.name}`);
  } else {
    debugLog(`❌ Secondary resource element NOT found in DOM for ${actor.name}. Current HTML snippet:`, 
      root.querySelector('.favorites') ? root.querySelector('.favorites').outerHTML.substring(0, 300) : "No .favorites section");
  }

  // Always hide our tertiary if present
  if (tertiaryResource) {
    const tertiaryLabel = (actor.system?.resources?.tertiary?.label || "").trim();
    if (tertiaryLabel === RESOURCE_LABEL.dailyConversions) {
      tertiaryResource.style.display = "none";
      debugLog(`Hid tertiary (Daily Conversions) for ${actor.name}`);
    }
  }
}
/* ============================================ */
/*  ABILITY SCORE + SETTING HOOKS               */
/* ============================================ */


Hooks.on("updateSetting", async (setting) => {
  if (setting.key === `${MODULE_ID}.bonusCantrips`) {
    await refreshAllCantripMaximums();
  }
  if (setting.key === `${MODULE_ID}.maxConversionsPerLongRest`) {
    await refreshAllConversionMaximums();
  }
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
