import { debugLog } from "./debug.js";

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
