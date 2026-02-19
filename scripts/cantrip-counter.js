/**
 * Cantrip Counter - Flag + Resource Based
 * Foundry VTT v13
 * DnD5e 5.2.5
 *
 * - No item required
 * - Uses actor.system.resources.primary
 * - Max = Spellcasting Ability Score
 * - Hard blocks at 0
 * - Decrements using createChatMessage (5.2 compatible)
 * - Resets on Short & Long Rest
 */

import "./castings.js";
import "./debug.js";
import "./dialogs.js";
import "./favorites.js";
import "./helpers.js";
import "./resources.js";
import "./settings.js";
import "./ui.js";

import { debugLog } from "./debug.js";

Hooks.once("ready", () => {

  const requiredModuleId = "color-picker";
  const requiredModule = game.modules.get(requiredModuleId);

  if (!requiredModule || !requiredModule.active) {

    if (game.user.isGM) {

      new Dialog({
        title: "Cantrip Counter – Missing Dependency",
        content: `
          <p><strong>Cantrip Counter</strong> requires the <strong>Color Picker</strong> module to enable custom color configuration.</p>
          <p>Please install and activate it to use color customization features.</p>
        `,
        buttons: {
          install: {
            label: "Open Module Browser",
            callback: () => {
              new ModuleManagement().render(true);
            }
          },
          close: {
            label: "Close"
          }
        },
        default: "close"
      }).render(true);
    }
  }

  debugLog("=== Cantrip Counter Loaded ===");
});



/* -------------------------------------------- */
/*  TEST HOOKS                                  */
/* -------------------------------------------- */

// Hooks.on("dnd5e.restCompleted", (actor) => {
//   debugLog("restCompleted fired for", actor.name);
// });

// Hooks.on("dnd5e.longRest", (actor) => {
//   debugLog("longRest fired for", actor.name);
// });

// Hooks.on("dnd5e.shortRest", (actor) => {
//   debugLog("shortRest fired for", actor.name);
// });