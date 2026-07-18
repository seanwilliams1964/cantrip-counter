import {
  refreshAllCantripMaximums,
  refreshAllConversionMaximums
} from "../../logic/resources.js";
import {
  GLOBAL_SETTING,
  MODULE_ID
} from "../../utilities/constants.js";

Hooks.on("updateSetting", async (setting, changes, options, userId) => {
  if (!game.user.isGM) return;
  if (userId && userId !== game.user.id) return;

  if ([
    `${MODULE_ID}.${GLOBAL_SETTING.bonusCantrips}`,
    `${MODULE_ID}.${GLOBAL_SETTING.addSpellcastingClassLevels}`
  ].includes(setting.key)) {
    await refreshAllCantripMaximums();
  }

  if (
    setting.key
    === `${MODULE_ID}.${GLOBAL_SETTING.maxConversionsPerLongRest}`
  ) {
    await refreshAllConversionMaximums();
  }
});
