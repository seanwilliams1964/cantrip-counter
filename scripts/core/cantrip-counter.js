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

// Core
import "./settings.js";
import "./hooks.js";

// Logic
import "../logic/cantrip-state.js";
import "../logic/conversions.js";
import "../logic/resources.js";

// UI
import "../ui/dialogs.js";
import "../ui/ui.js";

// Utilities
import "../utilities/debug.js";
import "../utilities/helpers.js";
import "../utilities/utility.js";

import { debugLog } from "../utilities/debug.js";

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
