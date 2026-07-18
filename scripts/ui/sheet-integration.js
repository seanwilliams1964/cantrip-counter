import { isConversionEnabled } from "../logic/conversions.js";
import { MODULE_ID } from "../utilities/constants.js";
import { debugLog } from "../utilities/debug.js";
import { openActorColorConfig } from "./dialogs/color-config-app.js";
import { openConversionDialog } from "./dialogs/conversion-app.js";
import { openActorConfigDialog } from "./dialogs/gm-config-app.js";
import { updateCantripVisuals } from "./resource-visuals.js";
import { getResourceValueInput } from "./sheet-dom.js";

export function applyCantripSheetControls(app, root, resourceElement) {
  const actor = app.actor;
  if (!actor || !resourceElement) return;

  const figure =
    resourceElement.querySelector("figure")
    ?? resourceElement.querySelector(".cantrip-counter-icon-wrapper");
  const icon =
    resourceElement.querySelector("img")
    ?? resourceElement.querySelector("i.cantrip-counter-icon")
    ?? figure;

  if (!icon) return;

  const isEditMode = game.user.isGM && detectEditMode(app, root);
  const conversionEnabled = isConversionEnabled(actor);
  const iconPath = (
    game.settings.get(MODULE_ID, "cantripIcon") || ""
  ).trim() || `modules/${MODULE_ID}/assets/cantrips.png`;

  if (icon.hasAttribute?.("src")) icon.setAttribute("src", iconPath);
  if (figure) figure.style.backgroundImage = `url("${iconPath}")`;

  if (icon.cantripCounterClickHandler) {
    icon.removeEventListener(
      "click",
      icon.cantripCounterClickHandler,
      { capture: true }
    );
    delete icon.cantripCounterClickHandler;
  }

  icon.style.cursor = !isEditMode && conversionEnabled
    ? "pointer"
    : "default";
  icon.title = isEditMode
    ? "Cantrip Uses (Locked in Edit Mode)"
    : conversionEnabled
      ? "Click to convert Cantrips into Spell Slots"
      : "Cantrip Uses";

  if (!isEditMode && conversionEnabled) {
    const handler = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openConversionDialog(actor);
    };
    icon.cantripCounterClickHandler = handler;
    icon.addEventListener("click", handler, { capture: true });
  }

  const valueInput = getResourceValueInput(resourceElement, "secondary");
  if (valueInput) {
    valueInput.disabled = !game.user.isGM;
    valueInput.style.pointerEvents = game.user.isGM ? "" : "none";
    valueInput.style.opacity = game.user.isGM ? "" : "0.7";
  }

  removeConfigurationButtons(root, resourceElement);
  if (isEditMode) addConfigurationButtons(root, resourceElement, actor);
  updateCantripVisuals(root, actor);
}

function detectEditMode(app, root) {
  const isTidy =
    app.constructor.name?.includes("Tidy")
    || root.classList.contains("tidy5e-sheet");

  if (isTidy) {
    return root.classList.contains("sheet-mode-edit")
      || root.classList.contains("mode-edit")
      || Boolean(root.querySelector(
        '[data-tidy-sheet-part="sheet-lock-toggle"] [aria-checked="true"]'
      ));
  }

  return Boolean(root.querySelector(
    'input.document-name, .document-name input, input[name="name"],'
    + ' .sheet-header .fas.fa-edit, .window-header button.edit,'
    + ' .window-header .fa-pencil, .edit-icon'
  ));
}

function removeConfigurationButtons(root, resourceElement) {
  resourceElement
    .querySelectorAll(".cantrip-color-config")
    .forEach(element => element.remove());
  root
    .querySelectorAll(".cantrip-config-gear")
    .forEach(element => element.remove());
}

function addConfigurationButtons(root, resourceElement, actor) {
  const tidyEditMode =
    root.classList.contains("sheet-mode-edit")
    || root.classList.contains("mode-edit");
  const palette = createConfigButton({
    classes: tidyEditMode
      ? ["button", "button-icon-only", "button-gold"]
      : ["gold-button"],
    moduleClass: "cantrip-color-config",
    icon: "fas fa-palette",
    title: "Configure Cantrip Resource Colors",
    onClick: () => openActorColorConfig(actor)
  });
  const paletteTarget =
    resourceElement.querySelector(".primary.uses")
    ?? resourceElement.querySelector(".info")
    ?? resourceElement.querySelector(".name-stacked")
    ?? resourceElement;
  paletteTarget.appendChild(palette);

  const gear = createConfigButton({
    classes: tidyEditMode
      ? ["button", "button-icon-only", "button-gold"]
      : ["gold-button"],
    moduleClass: "cantrip-config-gear",
    icon: "fas fa-hat-wizard",
    title: "Cantrip Counter Settings",
    onClick: () => openActorConfigDialog(actor)
  });
  const header =
    root.querySelector('[data-tidy-sheet-part="sheet-header-actions-container"]')
    ?? root.querySelector(".sheet-header-actions")
    ?? root.querySelector('[data-tidy-sheet-part="utility-toolbar"]')
    ?? root.querySelector(".utility-toolbar")
    ?? root.querySelector(".sheet-header-buttons")
    ?? root.querySelector("[data-tidy-sheet-part='sheet-header']")
    ?? root.querySelector(".tidy-sheet-header")
    ?? root.querySelector(".window-header .header-buttons")
    ?? root.querySelector(".window-header");

  (header ?? resourceElement).appendChild(gear);
  debugLog(`Added Cantrip Counter configuration controls for ${actor.name}.`);
}

function createConfigButton({
  classes,
  moduleClass,
  icon,
  title,
  onClick
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add(...classes, moduleClass);
  button.innerHTML = `<i class="${icon}"></i>`;
  button.title = title;
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    onClick();
  });
  return button;
}
