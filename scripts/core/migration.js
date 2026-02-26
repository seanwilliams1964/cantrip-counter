import { MODULE_ID, RESOURCE_LABEL } from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";

/**
 * Defensive Migration
 *
 * Ensures that only spellcasting characters retain
 * module-managed resources (secondary + tertiary).
 *
 * This migration:
 *  - Removes module-owned secondary resource from non-spellcasters
 *  - Removes module-owned tertiary resource from non-spellcasters
 *  - Leaves all other resources untouched
 *  - Runs only once per world
 */
export async function runDefensiveMigration() {

  const MIGRATION_KEY = "defensiveCleanup_v1";

  const alreadyRan = game.settings.get(MODULE_ID, MIGRATION_KEY);
  if (alreadyRan) {
    debugLog("Defensive cleanup already completed. Skipping.");
    return;
  }

  debugLog("Running defensive resource cleanup migration...");

  const actors = game.actors.filter(a => a.type === "character");

  for (const actor of actors) {

    const hasSpellcasting =
      !!actor.system?.attributes?.spellcasting;

    // We only clean non-spellcasters
    if (hasSpellcasting) continue;

    const updates = {};

    /* -------------------------------------------- */
    /* Clean Secondary (Cantrip Uses)               */
    /* -------------------------------------------- */

    const secondary = actor.system?.resources?.secondary;

    if (secondary?.label === RESOURCE_LABEL.cantripUses) {

      debugLog(
        `Removing module secondary from non-spellcaster: ${actor.name}`
      );

      updates["system.resources.secondary"] = {
        label: "",
        value: 0,
        max: 0,
        sr: false,
        lr: false
      };
    }

    /* -------------------------------------------- */
    /* Clean Tertiary (Daily Conversions)           */
    /* -------------------------------------------- */

    const tertiary = actor.system?.resources?.tertiary;

    if (tertiary?.label === RESOURCE_LABEL.dailyConversions) {

      debugLog(
        `Removing module tertiary from non-spellcaster: ${actor.name}`
      );

      updates["system.resources.tertiary"] = {
        label: "",
        value: 0,
        max: 0,
        sr: false,
        lr: false
      };
    }

    /* -------------------------------------------- */
    /* Apply Updates If Needed                      */
    /* -------------------------------------------- */

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
    }
  }

  await game.settings.set(MODULE_ID, MIGRATION_KEY, true);

  debugLog("Defensive resource cleanup complete.");
}