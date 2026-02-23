import { MODULE_ID, GLOBAL_SETTING } from "../utilities/constants.js";;

export function debugLog(...args) {
  if (!game.settings.get(MODULE_ID, GLOBAL_SETTING.debugMode)) return;
  console.log("%c[Cantrip Counter]", "color:#9b59b6;font-weight:bold;", ...args);
}
