export const MODULE_ID = "cantrip-counter";
export const DEFAULT_MAX_CONVERSION_LEVEL = 9;

Hooks.once("init", () => {

  game.settings.register(MODULE_ID, "debug", {
    name: "Enable Debug Logging",
    hint: "Logs Cantrip Counter debug messages to the browser console.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "cantripIcon", {
    name: "Cantrip Counter Icon",
    hint: "Path to a custom icon that will appear on the character sheet.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
    filePicker: "image"
  });

  game.settings.register(MODULE_ID, "bonusCantrips", {
    name: "Bonus Cantrip Uses",
    hint: "Additional cantrip uses added to the spellcasting ability score.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, "enableConversion", {
    name: "Enable Spell Slot Conversion",
    hint: "Allow players to convert cantrips into spell slots.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "costPerLevel", {
    name: "Cantrip Cost Per Spell Level",
    hint: "Number of cantrips required per spell level when restoring a slot.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 3
  });

  game.settings.register(MODULE_ID, "maxConversionLevel", {
    name: "Maximum Convertible Spell Level",
    hint: "Highest spell level that can be restored using cantrip conversion.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 9
  });

  game.settings.register(MODULE_ID, "maxConversionsPerLongRest", {
    name: "Maximum Conversions Per Long Rest",
    hint: "Maximum number of conversions allowed per long rest.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0
  });

  // Low Threshold Color
  game.settings.register("cantrip-counter", "glowLow", {
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
   game.settings.register("cantrip-counter", "glowMedium", {
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
  game.settings.register("cantrip-counter", "glowHigh", {
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
  game.settings.register("cantrip-counter", "thresholdLow", {
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
      const medium = game.settings.get("cantrip-counter", "thresholdMedium");
      if (value >= medium) {
        ui.notifications.warn("Low threshold must be less than Medium threshold.");
      }
      Hooks.callAll("cantripCounterRefreshUI");
    }
  });

  // Medium Threshold Percentage
  game.settings.register("cantrip-counter", "thresholdMedium", {
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
      const low = game.settings.get("cantrip-counter", "thresholdLow");
      if (value <= low) {
        ui.notifications.warn("Medium threshold must be greater than Low threshold.");
      }
      Hooks.callAll("cantripCounterRefreshUI");
    }
  });
});
