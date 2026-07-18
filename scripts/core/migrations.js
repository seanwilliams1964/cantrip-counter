import { getMaxConversionsPerLongRest } from "../logic/conversions.js";
import { hasCantripCounterEligibility } from "../logic/eligibility.js";
import {
  ACTOR_FLAG,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_MAX_CONVERSIONS_PER_LONG_REST,
  GLOBAL_SETTING,
  MODULE_ID,
  RESOURCE_LABEL
} from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";

export async function runMigrations() {
  const storedVersion =
    game.settings.get(MODULE_ID, GLOBAL_SETTING.schemaVersion) ?? 0;

  if (storedVersion < CURRENT_SCHEMA_VERSION) {
    await runSchemaMigration(storedVersion);
  }

  await runDefensiveCleanup();
}

async function runSchemaMigration(previousVersion) {
  debugLog(
    `Running schema migration ${previousVersion} → ${CURRENT_SCHEMA_VERSION}.`
  );

  const configuredLimit = Number(
    game.settings.get(
      MODULE_ID,
      GLOBAL_SETTING.maxConversionsPerLongRest
    )
  );
  if (!Number.isFinite(configuredLimit) || configuredLimit <= 0) {
    await game.settings.set(
      MODULE_ID,
      GLOBAL_SETTING.maxConversionsPerLongRest,
      DEFAULT_MAX_CONVERSIONS_PER_LONG_REST
    );
  }

  for (const actor of game.actors) {
    if (
      actor.type !== "character"
      || !hasCantripCounterEligibility(actor)
    ) {
      continue;
    }

    await migratePrimaryResource(actor);
    await migrateActorConversionLimit(actor);
    await migrateConversionFlag(actor);
    await ensureConversionResource(actor);
  }

  await game.settings.set(
    MODULE_ID,
    GLOBAL_SETTING.schemaVersion,
    CURRENT_SCHEMA_VERSION
  );
}

async function migrateActorConversionLimit(actor) {
  const value = actor.getFlag(
    MODULE_ID,
    ACTOR_FLAG.maxConversionsPerLongRest
  );
  if (value === undefined || value === null || Number(value) > 0) return;

  await actor.setFlag(
    MODULE_ID,
    ACTOR_FLAG.maxConversionsPerLongRest,
    DEFAULT_MAX_CONVERSIONS_PER_LONG_REST
  );
}

async function migratePrimaryResource(actor) {
  const primary = actor.system.resources?.primary;
  if (primary?.label !== RESOURCE_LABEL.cantripUses) return;

  await actor.update(
    {
      "system.resources.secondary.label": RESOURCE_LABEL.cantripUses,
      "system.resources.secondary.value": primary.value ?? 0,
      "system.resources.secondary.max": primary.max ?? 0,
      "system.resources.secondary.sr": true,
      "system.resources.secondary.lr": true,
      "system.resources.primary.label": "",
      "system.resources.primary.value": 0,
      "system.resources.primary.max": 0,
      "system.resources.primary.sr": false,
      "system.resources.primary.lr": false
    },
    { cantripCounterSync: true }
  );
}

async function migrateConversionFlag(actor) {
  const used = actor.getFlag(MODULE_ID, ACTOR_FLAG.conversionsUsed);
  if (used === undefined || used === null) return;

  const max = getMaxConversionsPerLongRest(actor);
  const remaining = Math.max(0, max - Number(used ?? 0));

  await actor.update(
    {
      "system.resources.tertiary.label": RESOURCE_LABEL.dailyConversions,
      "system.resources.tertiary.value": remaining,
      "system.resources.tertiary.max": max,
      "system.resources.tertiary.sr": false,
      "system.resources.tertiary.lr": true
    },
    { cantripCounterSync: true }
  );
  await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.conversionsUsed);
}

async function ensureConversionResource(actor) {
  const tertiary = actor.system.resources?.tertiary;
  if (tertiary?.label === RESOURCE_LABEL.dailyConversions) return;

  const max = getMaxConversionsPerLongRest(actor);
  await actor.update(
    {
      "system.resources.tertiary.label": RESOURCE_LABEL.dailyConversions,
      "system.resources.tertiary.value": max,
      "system.resources.tertiary.max": max,
      "system.resources.tertiary.sr": false,
      "system.resources.tertiary.lr": true
    },
    { cantripCounterSync: true }
  );
}

async function runDefensiveCleanup() {
  const migrationKey = "defensiveCleanup_v1";
  if (game.settings.get(MODULE_ID, migrationKey)) return;

  for (const actor of game.actors) {
    if (
      actor.type !== "character"
      || hasCantripCounterEligibility(actor)
    ) {
      continue;
    }

    const updates = {};
    if (
      actor.system.resources?.secondary?.label
      === RESOURCE_LABEL.cantripUses
    ) {
      updates["system.resources.secondary"] = emptyResource();
    }
    if (
      actor.system.resources?.tertiary?.label
      === RESOURCE_LABEL.dailyConversions
    ) {
      updates["system.resources.tertiary"] = emptyResource();
    }
    if (Object.keys(updates).length > 0) await actor.update(updates);
  }

  await game.settings.set(MODULE_ID, migrationKey, true);
}

function emptyResource() {
  return { label: "", value: 0, max: 0, sr: false, lr: false };
}
