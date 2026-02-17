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
  debugLog("=== Cantrip Counter (5.2.5 Compatible) Loaded ===");
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