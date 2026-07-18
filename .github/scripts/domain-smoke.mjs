import assert from "node:assert/strict";

import {
  getMaxCantripUses
} from "../../scripts/logic/cantrips.js";
import {
  restoreSpellSlotFromCantrips
} from "../../scripts/logic/conversion-service.js";
import {
  getConversionOptions
} from "../../scripts/logic/conversions.js";
import {
  getSpellcastingClassLevels
} from "../../scripts/logic/eligibility.js";

const settings = new Map([
  ["cantrip-counter.addSpellcastingClassLevels", true],
  ["cantrip-counter.bonusCantrips", 0],
  ["cantrip-counter.costPerLevel", 3],
  ["cantrip-counter.debugMode", false],
  ["cantrip-counter.enableConversion", true],
  ["cantrip-counter.maxConversionLevel", 9],
  ["cantrip-counter.maxConversionsPerLongRest", 3]
]);

globalThis.game = {
  settings: {
    get: (moduleId, key) => settings.get(`${moduleId}.${key}`)
  }
};

const updates = [];
const actor = {
  type: "character",
  name: "Architecture Test",
  items: [
    {
      type: "class",
      name: "Wizard",
      system: {
        identifier: "wizard",
        levels: 5,
        spellcasting: { progression: "full" }
      }
    },
    {
      type: "class",
      name: "Fighter",
      system: {
        identifier: "fighter",
        levels: 3,
        spellcasting: { progression: "none" }
      }
    },
    {
      type: "subclass",
      name: "Eldritch Knight",
      system: {
        classIdentifier: "fighter",
        spellcasting: { progression: "third" }
      }
    }
  ],
  system: {
    attributes: { spellcasting: "int" },
    abilities: { int: { value: 16 } },
    resources: {
      secondary: { value: 30, max: 30 },
      tertiary: { value: 3, max: 3 }
    },
    spells: {
      spell1: { value: 1, max: 2 },
      spell2: { value: 0, max: 1 },
      pact: { value: 0, max: 1, level: 2 }
    }
  },
  getFlag: () => undefined,
  update: async changes => updates.push(changes)
};

assert.equal(getSpellcastingClassLevels(actor), 8);
assert.equal(getMaxCantripUses(actor), 24);

const options = getConversionOptions(actor);
assert(options.some(option =>
  option.type === "spell" && option.level === 2
));
assert(options.some(option => option.type === "pact"));

const result = await restoreSpellSlotFromCantrips(actor, {
  type: "spell",
  level: 2
});

assert.equal(result.ok, true);
assert.equal(result.cost, 6);
assert.equal(updates.length, 1);
assert.equal(updates[0]["system.resources.secondary.value"], 24);
assert.equal(updates[0]["system.resources.tertiary.value"], 2);

console.log("Cantrip Counter domain smoke tests passed.");
