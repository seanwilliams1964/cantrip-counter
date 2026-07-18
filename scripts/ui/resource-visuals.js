import { getActorSetting } from "../logic/actor-settings.js";
import {
  getConversionOptions,
  hasReachedConversionCap,
  isConversionEnabled
} from "../logic/conversions.js";
import {
  ACTOR_FLAG,
  GLOBAL_SETTING
} from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { getResourceRowFromRoot } from "./sheet-dom.js";

export function updateCantripVisuals(root, actor) {
  const color = updateCantripResourceColor(root, actor);
  updateConversionGlow(root, actor, color);
  updateGearGlow(root, actor, color);
}

function updateCantripResourceColor(root, actor) {
  const resource = actor.system.resources?.secondary;
  if (!resource) return null;

  const value = Number(resource.value ?? 0);
  const max = Number(resource.max ?? 0);
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const valueInput = root.querySelector(
    'li.resource[data-favorite-id="resources.secondary"] input.uninput.value,'
    + ' [data-cantrip-counter-tidy-resource="secondary"] input.uninput.value,'
    + ' [data-resource="secondary"] input[name="system.resources.secondary.value"],'
    + ' input[name="system.resources.secondary.value"]'
  );

  if (!valueInput) return null;

  valueInput.value = value;
  valueInput.setAttribute("value", String(value));
  valueInput.closest(
    'li.resource, [data-cantrip-counter-tidy-resource="secondary"], [data-resource="secondary"], .resource'
  )?.querySelector(".max")?.replaceChildren(String(max));

  const lowColor = getActorSetting(
    actor,
    ACTOR_FLAG.glowLow,
    GLOBAL_SETTING.glowLow
  );
  const mediumColor = getActorSetting(
    actor,
    ACTOR_FLAG.glowMedium,
    GLOBAL_SETTING.glowMedium
  );
  const highColor = getActorSetting(
    actor,
    ACTOR_FLAG.glowHigh,
    GLOBAL_SETTING.glowHigh
  );
  let lowThreshold = Number(getActorSetting(
    actor,
    ACTOR_FLAG.thresholdLow,
    GLOBAL_SETTING.thresholdLow
  ));
  let mediumThreshold = Number(getActorSetting(
    actor,
    ACTOR_FLAG.thresholdMedium,
    GLOBAL_SETTING.thresholdMedium
  ));

  if (
    !Number.isFinite(lowThreshold)
    || !Number.isFinite(mediumThreshold)
    || lowThreshold >= mediumThreshold
  ) {
    lowThreshold = 25;
    mediumThreshold = 50;
  }

  const color = percentage <= lowThreshold
    ? lowColor
    : percentage <= mediumThreshold
      ? mediumColor
      : highColor;

  valueInput.style.setProperty("color", color, "important");
  return color;
}

function updateConversionGlow(root, actor, color) {
  const resourceRow = getResourceRowFromRoot(
    root,
    "secondary",
    "Cantrip Uses"
  );
  if (!resourceRow) return;

  resourceRow.dataset.cantripCounter = "true";
  const canConvert = conversionIsAvailable(actor);
  resourceRow.style.boxShadow = canConvert && color
    ? glowFromColor(color, 8)
    : "";
}

function updateGearGlow(root, actor, color) {
  const gear = root.querySelector(".cantrip-config-gear");
  if (!gear) return;

  gear.style.boxShadow = conversionIsAvailable(actor) && color
    ? glowFromColor(color, 6)
    : "";
}

function conversionIsAvailable(actor) {
  if (!isConversionEnabled(actor) || hasReachedConversionCap(actor)) {
    return false;
  }

  return getConversionOptions(actor).some(option => option.affordable);
}

function glowFromColor(color, radius) {
  const colorText = String(color ?? "");
  if (!colorText) return "";

  const hex = colorText.startsWith("#") ? colorText : `#${colorText}`;
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  if ([red, green, blue].every(Number.isFinite)) {
    return `0 0 ${radius}px 2px rgba(${red}, ${green}, ${blue}, 0.8)`;
  }

  debugLog(`Could not parse glow color ${colorText}; using it directly.`);
  return `0 0 ${radius}px 2px ${colorText}`;
}
