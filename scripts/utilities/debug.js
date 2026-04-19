import { MODULE_ID, GLOBAL_SETTING } from "../utilities/constants.js";;

function isDebugEnabled() {
  return game.settings.get(MODULE_ID, GLOBAL_SETTING.debugMode);
}

export function debugLog(...args) {
   if (!isDebugEnabled()) return;
  console.log("%c[Cantrip Counter]", "color:#9b59b6;font-weight:bold;", ...args);
}

export function debugLogError(...args) {
 if (!isDebugEnabled()) return;
  console.error("%c[Cantrip Counter ERROR]", "color:#e74c3c;font-weight:bold;", ...args);
}