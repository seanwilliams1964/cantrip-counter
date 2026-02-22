/**
 * Cantrip Counter - Flag + Resource Based
 * Foundry VTT v13
 * DnD5e 5.2.5
 *
 * - No item required
 * - Uses actor.system.resources.secondary
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

const CURRENT_SCHEMA_VERSION = 2;

Hooks.once("ready", async () => {

  /* -------------------------------------------- */
  /* Dependency Check                             */
  /* -------------------------------------------- */

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
            callback: () => new ModuleManagement().render(true)
          },
          close: { label: "Close" }
        },
        default: "close"
      }).render(true);
    }
  }

  /* -------------------------------------------- */
  /* Migration (GM Only)                          */
  /* -------------------------------------------- */

  if (game.user.isGM) {

    const storedVersion = game.settings.get(MODULE_ID, "schemaVersion") ?? 0;

    if (storedVersion < CURRENT_SCHEMA_VERSION) {

      debugLog("Running migration to schema v2...");

      for (const actor of game.actors) {
        if (actor.type !== "character") continue;

        const primary = actor.system.resources?.primary;

        if (primary?.label === "Cantrip Uses") {

          await actor.update({
            "system.resources.secondary.label": "Cantrip Uses",
            "system.resources.secondary.value": primary.value ?? 0,
            "system.resources.secondary.max": primary.max ?? 0,
            "system.resources.secondary.sr": true,
            "system.resources.secondary.lr": true,
            "system.resources.primary.label": "",
            "system.resources.primary.value": 0,
            "system.resources.primary.max": 0,
            "system.resources.primary.sr": false,
            "system.resources.primary.lr": false
          });

          debugLog(`Migrated actor ${actor.name}`);
        }
      }

      await game.settings.set(MODULE_ID, "schemaVersion", CURRENT_SCHEMA_VERSION);

      debugLog("Migration complete.");
    }
  }

  debugLog("=== Cantrip Counter Loaded ===");
});

