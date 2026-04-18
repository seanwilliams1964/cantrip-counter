import { GLOBAL_SETTING, MODULE_ID } from "../utilities/constants.js";

Hooks.once("init", () => {

  game.settings.register(MODULE_ID, GLOBAL_SETTING.schemaVersion, {
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.debugMode, {
    name: "Enable Debug Logging",
    hint: "Logs Cantrip Counter debug messages to the browser console.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.cantripIcon, {
    name: "Cantrip Counter Icon",
    hint: "Path to a custom icon that will appear on the character sheet.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
    filePicker: "image"
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.bonusCantrips, {
    name: "Bonus Cantrip Uses",
    hint: "Additional cantrip uses added to the spellcasting ability score.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.preventCantripScaling, {
    name: "Prevent Cantrip Scaling",
    hint: "If enabled, cantrips will not scale with character level and will always deal damage as if cast by a 1st-level character.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.enableConversion, {
    name: "Enable Spell Slot Conversion",
    hint: "Allow players to convert cantrips into spell slots.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.costPerLevel, {
    name: "Cantrip Cost Per Spell Level",
    hint: "Number of cantrips required per spell level when restoring a slot.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 3
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.maxConversionLevel, {
    name: "Maximum Convertible Spell Level",
    hint: "Highest spell level that can be restored using cantrip conversion.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 9
  });

  game.settings.register(MODULE_ID, GLOBAL_SETTING.maxConversionsPerLongRest, {
    name: "Maximum Conversions Per Long Rest",
    hint: "Maximum number of conversions allowed per long rest.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0
  });

  // Low Threshold Color
  game.settings.register(MODULE_ID, GLOBAL_SETTING.glowLow, {
    name: "Low Resource Color",
    hint: "Color used when cantrip uses are at or below 25%.",
    scope: "world",
    config: true,
    restricted: true,
    type: new game.colorPicker.ColorPickerField(),
    default: "#ff0000",
    onChange: () => Hooks.callAll("cantripCounterRefreshUI")
  });

  // Medium Threshold Color
   game.settings.register(MODULE_ID, GLOBAL_SETTING.glowMedium, {
    name: "Medium Resource Color",
    hint: "Color used when cantrip uses are between 25% and 50%.",
    scope: "world",
    config: true,
    restricted: true,
    type: new game.colorPicker.ColorPickerField(),
    default: "#ffff00",
    onChange: () => Hooks.callAll("cantripCounterRefreshUI")
  });

  // High Threshold Color
  game.settings.register(MODULE_ID, GLOBAL_SETTING.glowHigh, {
    name: "High Resource Color",
    hint: "Color used when cantrip uses are above 50%.",
    scope: "world",
    config: true,
    restricted: true,
    type: new game.colorPicker.ColorPickerField(),
    default: "#00ff00",
    onChange: () => Hooks.callAll("cantripCounterRefreshUI")
  });

  // Low Threshold Percentage
  game.settings.register(MODULE_ID, GLOBAL_SETTING.thresholdLow, {
    name: "Low Threshold (%)",
    hint: "Percentage at or below which the resource is considered Low.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 25,
    range: {
      min: 0,
      max: 100,
      step: 1
    },
    onChange: (value) => {
      const medium = game.settings.get(MODULE_ID, GLOBAL_SETTING.thresholdMedium);
      if (value >= medium) {
        ui.notifications.warn("Low threshold must be less than Medium threshold.");
      }
      Hooks.callAll("cantripCounterRefreshUI");
    }
  });

  // Medium Threshold Percentage
  game.settings.register(MODULE_ID, GLOBAL_SETTING.thresholdMedium, {
    name: "Medium Threshold (%)",
    hint: "Percentage at or below which the resource is considered Medium.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 50,
    range: {
      min: 0,
      max: 100,
      step: 1
    },
    onChange: (value) => {
      const low = game.settings.get(MODULE_ID, GLOBAL_SETTING.thresholdLow);
      if (value <= low) {
        ui.notifications.warn("Medium threshold must be greater than Low threshold.");
      }
      Hooks.callAll("cantripCounterRefreshUI");
    }
  });

  game.settings.register(MODULE_ID, "defensiveCleanup_v1", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

});
