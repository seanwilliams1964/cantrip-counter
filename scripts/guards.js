import { debugLog } from "./debug.js";
import { hasRemainingCantrips } from "./helpers.js";

Hooks.on("preUpdateActor", (actor, updateData, options, userId) => {

  if (actor.type !== "character") return;

  debugLog("Firing preUpdateActor hook for actor:", actor.name, " with updateData:", updateData);

  const newValue = foundry.utils.getProperty(updateData, "system.resources.primary.value");
  if (newValue === undefined) return;

  const max = actor.system.resources.primary?.max ?? 0;

  /* GM Restriction */

  if (!game.user.isGM) {
    
    // Force sheet refresh since we are blocking change
    requestActorSheetRefresh(actor);

    return false;
  }

  /* Clamp Above Max */
  if (newValue > max) {

    ui.notifications.warn(`Value cannot exceed maximum of ${max}. See gobal settings to add bonus cantrips.`);

    debugLog(`Clamping cantrip value from ${newValue} to ${max}`);

    foundry.utils.setProperty(
      updateData,
      "system.resources.primary.value",
      max
    );

    // Force refresh since final value equals existing value
    requestActorSheetRefresh(actor);
  }
});

Hooks.on("updateActor", (actor, changed) => {

  debugLog("Hook on updateActor for actor:", actor.name, " with changed data:", changed);


  if (actor.type !== "character") return;

  const newValue = foundry.utils.getProperty(changed, "system.resources.primary.value");
  if (newValue === undefined) return;

  debugLog("newValue", newValue);

  const max = actor.system.resources.primary?.max ?? 0;

  // If value equals max (meaning it was clamped), force sheet refresh
  if (actor.system.resources.primary.value === max) {

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
