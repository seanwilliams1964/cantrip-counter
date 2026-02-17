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
});
