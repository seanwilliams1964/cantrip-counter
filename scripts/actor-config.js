import { MODULE_ID } from "./settings.js";
import { debugLog } from "./debug.js";
const { ApplicationV2 } = foundry.applications.api;

class ActorColorConfigApp extends ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id: "cantrip-color-config",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Cantrip Resource Color Settings",
      icon: "fas fa-palette",
      resizable: false
    },
    position: {
      width: 420,
      height: "auto"
    },
    actions: {
      submit: ActorColorConfigApp.#onSubmit,
      resetDefaults: ActorColorConfigApp.#onResetDefaults
    }
  };

  constructor(actor) {
    super();
    this.actor = actor;
  }

  /* -------------------------------------------- */
  /* RENDER CONTENT                               */
  /* -------------------------------------------- */

  async _renderHTML(context, options) {

  const actor = this.actor;

  const templateData = {
    glowLow: actor.getFlag(MODULE_ID, "glowLow") ?? "#ff0000",
    glowMedium: actor.getFlag(MODULE_ID, "glowMedium") ?? "#ffff00",
    glowHigh: actor.getFlag(MODULE_ID, "glowHigh") ?? "#00ff00",
    thresholdLow: actor.getFlag(MODULE_ID, "thresholdLow") ?? 25,
    thresholdMedium: actor.getFlag(MODULE_ID, "thresholdMedium") ?? 50
  };

  return await foundry.applications.handlebars.renderTemplate(
    "modules/cantrip-counter/templates/actor-config.html",
    templateData
  );
}

  _replaceHTML(result, content, options) {
    if (typeof result === "string") {
      const template = document.createElement("template");
      template.innerHTML = result.trim();
      content.replaceChildren(...template.content.childNodes);
    } else {
      content.replaceChildren(result);
    }
  }

  /* -------------------------------------------- */
  /* SUBMIT HANDLER                               */
  /* -------------------------------------------- */
  static async #onSubmit(event, target) {

    event.preventDefault();

    const app = this;
    const actor = app.actor;
    const form = target.closest("form");
  
    debugLog("Submitting color config form");

    /* Handle Standard Inputs (Color Pickers)   */
    const formData = new FormData(form);

    debugLog("Form entries:", [...formData.entries()]);

    for (const [key, value] of formData.entries()) {

      // Skip threshold keys (handled separately via range-picker)
      if (key === "thresholdLow" || key === "thresholdMedium") continue;

      let sanitized = value;

      // Normalize 8-digit HEX to 6-digit
      if (typeof sanitized === "string" &&
          sanitized.startsWith("#") &&
          sanitized.length === 9) {
        sanitized = sanitized.slice(0, 7);
      }

      debugLog(`Setting actor flag ${key}`, sanitized);

      await actor.setFlag(MODULE_ID, key, sanitized);
    }

    /* Handle Range-Picker Threshold Values     */
    const lowPicker = form.querySelector('range-picker[name="thresholdLow"]');
    const mediumPicker = form.querySelector('range-picker[name="thresholdMedium"]');
    const thresholdLow = Number(lowPicker?.value ?? 0);
    const thresholdMedium = Number(mediumPicker?.value ?? 0);

    debugLog("Setting actor flag thresholdLow", thresholdLow);
    debugLog("Setting actor flag thresholdMedium", thresholdMedium);

    await actor.setFlag(MODULE_ID, "thresholdLow", thresholdLow);
    await actor.setFlag(MODULE_ID, "thresholdMedium", thresholdMedium);

    Hooks.call("cantripCounterRefreshUI");

    app.close();
  }


  static async #onResetDefaults(event, target) {
    const app = this;

    debugLog("Reset requested — opening confirmation dialog");

    new ResetConfirmationApp(app.actor, app).render(true);
  }
}

export function openActorColorConfig(actor) {
  new ActorColorConfigApp(actor).render(true);
}


class ResetConfirmationApp extends ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id: "cantrip-reset-confirmation",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Reset to Defaults?",
      icon: "fas fa-exclamation-triangle",
      resizable: false
    },
    position: {
      width: 360,
      height: "auto"
    },
    actions: {
      confirm: ResetConfirmationApp.#onConfirm,
      cancel: ResetConfirmationApp.#onCancel
    }
  };

  constructor(actor, parentApp) {
    super();
    this.actor = actor;
    this.parentApp = parentApp;
  }

  async _renderHTML(context, options) {
    return `
      <div style="padding:16px; text-align:center;">
        <p>
          This will remove all custom color and threshold settings for this actor.
        </p>
        <p><strong>Are you sure you want to continue?</strong></p>

        <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
          <button data-action="confirm" style="flex:0 0 40%;">
            Confirm
          </button>
          <button data-action="cancel" style="flex:0 0 40%;">
            Cancel
          </button>
        </div>
      </div>
    `;
  }

  _replaceHTML(result, content, options) {
    const template = document.createElement("template");
    template.innerHTML = result.trim();
    content.replaceChildren(...template.content.childNodes);
  }

  static async #onConfirm(event, target) {
    const app = this;

    const actor = app.actor;

    debugLog("Reset confirmed — clearing actor flags");

    await actor.unsetFlag(MODULE_ID, "thresholdLow");
    await actor.unsetFlag(MODULE_ID, "thresholdMedium");
    await actor.unsetFlag(MODULE_ID, "glowLow");
    await actor.unsetFlag(MODULE_ID, "glowMedium");
    await actor.unsetFlag(MODULE_ID, "glowHigh");

    Hooks.call("cantripCounterRefreshUI");

    // Close confirmation dialog
    app.close();

    // Re-render parent dialog with defaults
    app.parentApp.render(true);
  }

  static async #onCancel(event, target) {
    const app = this;
    debugLog("Reset canceled");
    app.close();
  }
}