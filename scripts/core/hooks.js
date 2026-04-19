import { hasRemainingCantripUses, syncResource, syncConversionResource } from "../logic/resources.js";
import { getSpellcastingAbilityScore } from "../utilities/helpers.js";
import { getRenderedSheetRoot } from "../utilities/utility.js";
import { applyCantripLogic, requestActorSheetRefresh } from "../ui/ui.js";  
import { GLOBAL_SETTING, MODULE_ID, RESOURCE_LABEL } from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { getActorSpellcastingChanges, getActorSetting } from "../utilities/helpers.js";
import { consumeCantrip, consumeConversion } from "../logic/cantrip-state.js";

// =============================================
// 1. Update Actor Hook (unchanged — this is fine)
// =============================================
Hooks.on("updateActor", async (actor, changes, options) => {
  if (!actor || actor.type !== "character") return;

  const isOurUpdate = options?.cantripCounterSync === true;

  debugLog("updateActor fired for", actor.name, "with changes:", changes);

  /* 1. Force sync on ANY external update */
  if (!isOurUpdate) {
    await syncResource(actor);
    await syncConversionResource(actor);
  }

  /* 2. Resource Clamping Refresh */
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

  /* 3. Favorites Protection */
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
    }
  }

  /* 4. Prevent loops on our own updates */
  if (isOurUpdate) {
    debugLog("Exiting updateActor (our own sync update)");
    return;
  }

  /* 5. Spellcasting Ability Change */
  const abilityChanged = getActorSpellcastingChanges(actor, changes);

  if (abilityChanged) {
    const abilityScore = getSpellcastingAbilityScore(actor); // assuming this exists
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

// =============================================
// 2. Modern Consumption Hook (ONLY ONE)
// =============================================
Hooks.on("dnd5e.preUseActivity", async (activity, usageConfig, messageConfig) => {
  debugLog("Fired dnd5e.preUseActivity with activity:", activity.type);

  const item = activity?.item;
  if (!item || item.type !== "spell" || item.system.level !== 0) return;

  const actor = activity.actor;
  if (!actor) return;

  /* ---- Allow Exceptions ---- */
  if (item.system.source?.type === "scroll") return;
  if (item.system.preparation?.mode === "atwill") return;
  if (item.system.uses?.max > 0) return;

  /* ---- Sync and check remaining uses ---- */
  await syncResource(actor);

  if (!hasRemainingCantripUses(actor)) {
    debugLog("No remaining cantrips for actor:", actor.name);
    ui.notifications.warn(`${actor.name} has no remaining cantrip uses.`);
    return false;
  }

  // Consume using your dedicated function
  const consumed = await consumeCantrip(actor);

  if (consumed) {
    debugLog(`Consumed 1 cantrip use for ${item.name}`);

    // Tell the core system consumption occurred (prevents weird UI/timing issues)
    usageConfig.consumeResource = true;
    usageConfig.resource = {
      type: "secondary",
      value: 1
    };
  } else {
    return false;
  }
});

// =============================================
// 3. Remove These Two Old Hooks Completely
// =============================================
// DELETE the entire dnd5e.preUseItem hook
// DELETE the entire createChatMessage hook

// Keep these (they are harmless / useful):
Hooks.on("renderActorSheet5eCharacter", (app, html) => {
  const secondaryInput = html.find('input[name="system.resources.secondary.label"]');
  if (secondaryInput.val() === "Cantrip Uses") {
    secondaryInput.prop("disabled", true);
  }
});

Hooks.on("dnd5e.restCompleted", async (actor, data) => {
  if (actor.type !== "character") return;
  if (!actor.system?.attributes?.spellcasting) return;

  await syncResource(actor);
  await syncConversionResource(actor);
});

Hooks.on("cantripCounterRefreshUI", () => {
  for (const app of Object.values(ui.windows)) {
    if (app?.object?.type === "character") {
      app.render(false);
    }
  }
});

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

Hooks.on("updateSetting", async (setting) => {
  if (setting.key === `${MODULE_ID}.bonusCantrips`) {
    await refreshAllCantripMaximums();
  }
  if (setting.key === `${MODULE_ID}.maxConversionsPerLongRest`) {
    await refreshAllConversionMaximums();
  }
});

Hooks.on("dnd5e.preRollDamage", (config, dialogConfig, messageConfig) => {

  debugLog("Fired dnd5e.preRollDamage with config:", config);

  const activity = config.subject; // The Activity being rolled
  if (!activity?.item) return;

  const item = activity.item;
  if (item.type !== "spell" || item.system.level !== 0) return; // Only level 0 spells (cantrips)

  const actor = item.actor;
  if (actor?.system.resources?.secondary?.value <= 0) return;

  const preventScaling = getActorSetting(actor, GLOBAL_SETTING.preventCantripScaling, GLOBAL_SETTING.preventCantripScaling);
  debugLog("Checked actor preventScaling:", preventScaling);
  if (!preventScaling) return;   // ← Early exit if setting is disabled

  debugLog(`Processing preRollDamage for cantrip "${item.name}" by ${actor.name}`);

  let modified = false;

  if (activity.damage?.parts?.length) {
    activity.damage.parts.forEach((part, index) => {
      if (part.scaling?.mode === "whole" && part.scaling.number > 1) {
        console.log(`[CantripLimiter] Resetting scaling on part ${index} of ${item.name}: ${part.scaling.number} → 1`);
        part.scaling.number = 1;
        modified = true;
      }
    });
  }

  if (config.rolls?.length) {
    config.rolls.forEach((rollConfig, rollIndex) => {
      if (!rollConfig.parts?.length) return;

      const newParts = [];

      // Reconstruct each damage part using the (now reset) base values from the activity
      activity.damage?.parts?.forEach((part) => {
        if (!part) return;

        const numDice = part.number ?? 1;
        const die = part.denomination ?? "10"; // fallback (most cantrips use d10/d8)
        const bonus = part.bonus ? ` + ${part.bonus}` : "";

        // Preserve damage types if present in options
        const type = rollConfig.options?.types?.[0] || "";

        debugLog(`Reconstructing damage part for ${item.name}: ${numDice}d${die}${bonus} (type: ${type})`);

        newParts.push(`${numDice}d${die}${bonus}`.trim());
      });

      if (newParts.length > 0 && JSON.stringify(newParts) !== JSON.stringify(rollConfig.parts)) {
        debugLog(`Forcing parts for ${item.name}:`, rollConfig.parts, "→", newParts);
        rollConfig.parts = newParts;
        modified = true;
      }

      if (rollConfig.data) {
        if (rollConfig.data.scaling) rollConfig.data.scaling = { increase: 0 };
        if (rollConfig.data["scaling.increase"] !== undefined) rollConfig.data["scaling.increase"] = 0;
      }
    });
  }

  if (modified) {
    debugLog(`Cantrip scaling fully prevented for ${item.name} — forced to 1st-level base damage.`);
  }
});
