/**
 * Cantrip Counter - Resource Based
 * Foundry VTT v13
 * DnD5e 5.2.5
 */

// Core
import { 
  MODULE_ID, 
  CURRENT_SCHEMA_VERSION, 
  GLOBAL_SETTING, 
  RESOURCE_LABEL, 
  ACTOR_FLAG 
} from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { getMaxConversionsPerLongRest } from "../logic/conversions.js";
import "./settings.js";
import "./hooks.js";
import "../ui/ui.js";

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

  if (!game.user.isGM) {
    debugLog("=== Cantrip Counter Loaded ===");
    return;
  }

  const storedVersion = game.settings.get(MODULE_ID, GLOBAL_SETTING.schemaVersion) ?? 0;

  if (storedVersion >= CURRENT_SCHEMA_VERSION) {
    debugLog("=== Cantrip Counter Loaded ===");
    return;
  }

  debugLog(`Running migration to schema v${CURRENT_SCHEMA_VERSION}...`);

  for (const actor of game.actors) {
    if (actor.type !== "character") continue;

    /* -------------------------------------------- */
    /* v2 Migration: Primary → Secondary            */
    /* -------------------------------------------- */

    const primary = actor.system.resources?.primary;

    if (primary?.label === RESOURCE_LABEL.cantripUses) {

      await actor.update({
        "system.resources.secondary.label": RESOURCE_LABEL.cantripUses,
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

      debugLog(`Migrated ${actor.name} primary → secondary`);
    }

    /* -------------------------------------------- */
    /* v3 Migration: Flag → Tertiary Resource       */
    /* -------------------------------------------- */

    const used = actor.getFlag(MODULE_ID, ACTOR_FLAG.conversionsUsed);

    if (used !== undefined && used !== null) {

      const max = getMaxConversionsPerLongRest(actor) ?? 0;

      // If unlimited or invalid, just remove flag
      if (!max || max <= 0) {
        await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.conversionsUsed);
        continue;
      }

      const remaining = Math.max(0, max - used);

      await actor.update({
        "system.resources.tertiary.label": RESOURCE_LABEL.dailyConversions,
        "system.resources.tertiary.value": remaining,
        "system.resources.tertiary.max": max,
        "system.resources.tertiary.sr": false,
        "system.resources.tertiary.lr": true
      });

      await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.conversionsUsed);

      debugLog(`Migrated ${actor.name}: ${used} used → ${remaining}/${max} remaining`);
    }

    /* -------------------------------------------- */
    /* Ensure Tertiary Exists For Enabled Actors    */
    /* -------------------------------------------- */

    const tertiary = actor.system.resources?.tertiary;

    if (!tertiary || tertiary.label !== RESOURCE_LABEL.dailyConversions) {

      const max = getMaxConversionsPerLongRest(actor) ?? 0;

      if (max > 0) {
        await actor.update({
          "system.resources.tertiary.label": RESOURCE_LABEL.dailyConversions,
          "system.resources.tertiary.value": max,
          "system.resources.tertiary.max": max,
          "system.resources.tertiary.sr": false,
          "system.resources.tertiary.lr": true
        });

        debugLog(`Initialized tertiary resource for ${actor.name}`);
      }
    }
  }

  await game.settings.set(
    MODULE_ID,
    GLOBAL_SETTING.schemaVersion,
    CURRENT_SCHEMA_VERSION
  );

  debugLog(`Migration to schema v${CURRENT_SCHEMA_VERSION} complete.`);
  debugLog("=== Cantrip Counter Loaded ===");
});