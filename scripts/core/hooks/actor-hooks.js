import { hasCantripCounterEligibility } from "../../logic/eligibility.js";
import {
  syncConversionResource,
  syncResource
} from "../../logic/resources.js";
import { RESOURCE_LABEL } from "../../utilities/constants.js";
import { debugLog } from "../../utilities/debug.js";

Hooks.on("updateActor", async (actor, changes, options) => {
  if (!actor || actor.type !== "character") return;

  const isModuleUpdate = options?.cantripCounterSync === true
    || options?.cantripCounterConsumption === true
    || options?.cantripCounterConversion === true
    || options?.cantripCounterRestore === true;

  if (!isModuleUpdate) {
    await syncResource(actor);
    await syncConversionResource(actor);
  }

  if (trackedResourceChanged(changes)) {
    renderActorApplications(actor);
  }

  if (
    foundry.utils.hasProperty(changes, "system.favorites")
    && !options?.cantripCounterRestore
  ) {
    await restoreCantripFavorite(actor);
  }
});

Hooks.on("dnd5e.restCompleted", async actor => {
  if (!hasCantripCounterEligibility(actor)) return;
  await syncResource(actor);
  await syncConversionResource(actor);
});

Hooks.on("createItem", async (item, options, userId) => {
  await syncForClassItemChange(item, userId);
});
Hooks.on("updateItem", async (item, changes, options, userId) => {
  await syncForClassItemChange(item, userId);
});
Hooks.on("deleteItem", async (item, options, userId) => {
  await syncForClassItemChange(item, userId);
});

async function syncForClassItemChange(item, userId) {
  if (userId && userId !== game.user.id) return;
  if (!item || !["class", "subclass"].includes(item.type)) return;

  const actor = item.parent;
  if (!actor || actor.type !== "character") return;
  await syncResource(actor);
}

async function restoreCantripFavorite(actor) {
  const resource = actor.system.resources?.secondary;
  if (
    resource?.label !== RESOURCE_LABEL.cantripUses
    || !hasCantripCounterEligibility(actor)
  ) {
    return;
  }

  const favorites = actor.system.favorites ?? [];
  const hasFavorite = favorites.some(favorite =>
    favorite?.type === "resources" && favorite?.id === "secondary"
  );
  if (hasFavorite) return;

  await actor.update(
    {
      "system.favorites": [
        ...favorites.filter(favorite =>
          !(favorite?.type === "resources" && favorite?.id === "secondary")
        ),
        { type: "resources", id: "secondary" }
      ]
    },
    { cantripCounterRestore: true }
  );
  debugLog(`Restored Cantrip Uses favorite for ${actor.name}.`);
}

function trackedResourceChanged(changes) {
  return [
    "system.resources.secondary.value",
    "system.resources.secondary.max",
    "system.resources.tertiary.value",
    "system.resources.tertiary.max"
  ].some(path => foundry.utils.hasProperty(changes, path));
}

function renderActorApplications(actor) {
  for (const application of Object.values(actor.apps ?? {})) {
    if (typeof application.render === "function") application.render(false);
  }
}
