import { MODULE_ID } from "./settings.js";

export function debugLog(...args) {
  if (!game.settings.get(MODULE_ID, "debug")) return;
  console.log("%c[Cantrip Counter]", "color:#9b59b6;font-weight:bold;", ...args);
}
