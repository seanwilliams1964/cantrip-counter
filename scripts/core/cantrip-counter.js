/**
 * Cantrip Counter
 * Foundry VTT v13 / DnD5e
 */

import { hasCantripCounterEligibility } from "../logic/eligibility.js";
import {
  syncConversionResource,
  syncResource
} from "../logic/resources.js";
import { debugLog } from "../utilities/debug.js";
import "./hooks/index.js";
import { runMigrations } from "./migrations.js";
import "./settings.js";

Hooks.once("ready", async () => {
  if (!game.user.isGM) {
    debugLog("Cantrip Counter loaded for player.");
    return;
  }

  checkColorPickerDependency();
  await runMigrations();

  for (const actor of game.actors) {
    if (!hasCantripCounterEligibility(actor)) continue;
    await syncResource(actor);
    await syncConversionResource(actor);
  }

  debugLog("Cantrip Counter loaded for GM.");
});

function checkColorPickerDependency() {
  if (game.modules.get("color-picker")?.active) return;

  new Dialog({
    title: "Cantrip Counter – Missing Dependency",
    content: `
      <p>
        <strong>Cantrip Counter</strong> requires the
        <strong>Color Picker</strong> module for custom color configuration.
      </p>
    `,
    buttons: {
      install: {
        label: "Open Module Browser",
        callback: () => new ModuleManagement().render(true)
      },
      close: { label: "Close" }
    },
    default: "close"
  }).render(true);
}
