import { debugLog } from "./debug.js";

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
