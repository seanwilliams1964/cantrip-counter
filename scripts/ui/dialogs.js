import { MODULE_ID } from "../core/settings.js";
import { debugLog } from "../utilities/debug.js";
import { getConversionsUsed, incrementConversionsUsed } from "../logic/cantrip-state.js";
import { getCostPerLevel, getMaxConversionLevel, getMaxConversionsPerLongRest, hasReachedConversionCap } from "../logic/conversions.js";

const { ApplicationV2 } = foundry.applications.api;

/* -------------------------------------------- */
/* GM ACTOR CONFIG */
/* -------------------------------------------- */
class ActorConfigApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "cantrip-actor-config",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Cantrip Conversion Settings",
      icon: "fas fa-cog",
      resizable: true
    },
    position: {
      width: 420,
      height: "auto"
    },
    actions: {
      toggleOverride: ActorConfigApp.#onToggleOverride,
      submit: ActorConfigApp.#onSubmit
    }
  };

  constructor(actor) {
    super();
    this.actor = actor;
  }

/**
   * Render the inner HTML content for this application.
   * @param {ApplicationRenderContext} context - Rendering context data
   * @param {ApplicationRenderOptions} options - Render options
   * @returns {Promise<string|HTMLElement>} The rendered HTML or element
   * @protected
   */
  async _renderHTML(context, options) {
    const actor = this.actor;
    const overrideEnabled = actor.getFlag(MODULE_ID, "overrideEnabled") ?? false;
    const costPerLevel = actor.getFlag(MODULE_ID, "costPerLevel") ?? "";
    const maxConversionLevel = actor.getFlag(MODULE_ID, "maxConversionLevel") ?? "";
    const maxConversionsPerLongRest = actor.getFlag(MODULE_ID, "maxConversionsPerLongRest") ?? "";

    // Return raw HTML string (simplest approach)
    return `
      <form style="width:100%; padding:12px; box-sizing:border-box;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
          <input type="checkbox" name="overrideEnabled" data-action="toggleOverride" ${overrideEnabled ? "checked" : ""}/>
          <label style="flex:1;">Enable Conversion Override</label>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <label style="flex:1;">Cost Per Level</label>
          <input type="number" name="costPerLevel" value="${costPerLevel}"
                 style="width:80px;" ${overrideEnabled ? "" : "disabled"} />
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <label style="flex:1;">Max Conversion Level</label>
          <input type="number" name="maxConversionLevel" value="${maxConversionLevel}"
                 style="width:80px;" ${overrideEnabled ? "" : "disabled"} />
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <label style="flex:1;">Max Conversions Per Long Rest</label>
          <input type="number" name="maxConversionsPerLongRest" value="${maxConversionsPerLongRest}"
                 style="width:80px;" ${overrideEnabled ? "" : "disabled"} />
        </div>
        <div style="display:flex; justify-content:center;">
          <button type="submit" data-action="submit" style="flex:0 0 30%; margin-top:5px;">Save</button>
        </div>
      </form>
    `;
  }

  /**
   * Replace the application's content with the newly rendered result.
   * @param {string|HTMLElement} result - The result from _renderHTML
   * @param {HTMLElement} content - The content element to update
   * @param {ApplicationRenderOptions} options - Render options
   * @protected
   */
  _replaceHTML(result, content, options) {
    // For string HTML → create fragment and replace children
    if (typeof result === "string") {
      const template = document.createElement("template");
      template.innerHTML = result.trim();
      content.replaceChildren(...template.content.childNodes);
    } else {
      // If you ever return an HTMLElement directly
      content.replaceChildren(result);
    }
  }

  static async #onToggleOverride(event, target) {
    const app = this;
    const form = target.closest("form");
    const numericFields = form.querySelectorAll('input[type="number"]');
    const isEnabled = target.checked;
    numericFields.forEach(input => {
      input.disabled = !isEnabled;
      if (!isEnabled) input.value = "";
    });
    debugLog("Override toggled via action", { checked: isEnabled });
  }

  static async #onSubmit(event, target) {
    event.preventDefault();
    const app = this;
    const form = target.closest("form");
    const formData = new FormData(form);
    const checkbox = form.querySelector('input[name="overrideEnabled"]');
    const enabled = checkbox?.checked ?? false;
    debugLog("Form submitted via action", { enabled });
    if (!enabled) {
      const confirmed = await Dialog.confirm({
        title: "Disable Override?",
        content: `<p>This will remove all custom conversion settings for this actor. Continue?</p>`
      });
      if (!confirmed) return;
      await app.actor.unsetFlag(MODULE_ID, "overrideEnabled");
      await app.actor.unsetFlag(MODULE_ID, "costPerLevel");
      await app.actor.unsetFlag(MODULE_ID, "maxConversionLevel");
      await app.actor.unsetFlag(MODULE_ID, "maxConversionsPerLongRest");
      if (checkbox) checkbox.checked = false;
      const numericFields = form.querySelectorAll('input[type="number"]');
      numericFields.forEach(input => {
        input.value = "";
        input.disabled = true;
      });
      app.close();
      return;
    }
    await app.actor.setFlag(MODULE_ID, "overrideEnabled", true);
    await app.actor.setFlag(MODULE_ID, "costPerLevel", Number(formData.get("costPerLevel")) || 0);
    await app.actor.setFlag(MODULE_ID, "maxConversionLevel", Number(formData.get("maxConversionLevel")) || 0);
    await app.actor.setFlag(MODULE_ID, "maxConversionsPerLongRest", Number(formData.get("maxConversionsPerLongRest")) || 0);
    app.close();
  }

// Optional: Use _onRender (or _onFirstRender) instead of _onRender for initial forcing
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Force initial checkbox + disabled state (safety net)
    const overrideEnabled = this.actor.getFlag(MODULE_ID, "overrideEnabled") ?? false;
    const checkbox = this.element.querySelector('input[name="overrideEnabled"]');
    if (checkbox) {
      checkbox.checked = overrideEnabled;
      const numericFields = this.element.querySelectorAll('input[type="number"]');
      numericFields.forEach(input => {
        input.disabled = !overrideEnabled;
        if (!overrideEnabled) input.value = "";
      });
    }
    debugLog("Initial state forced in _onRender");
  }
}

export function openActorConfigDialog(actor) {
  new ActorConfigApp(actor).render(true);
}

/* -------------------------------------------- */
/* CONVERSION DIALOG */
/* -------------------------------------------- */
class ConversionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "cantrip-conversion",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Convert Cantrips to Spell Slots",
      resizable: true
    },
    position: {
      width: 420,
      height: "auto"
    },
    actions: {
      restore: ConversionApp.#onRestore
    }
  };

  constructor(actor) {
    super();
    this.actor = actor;
  }

  /**
   * Generate the content HTML for this application
   * @protected
   */
  async _renderHTML(context, options) {
    if (hasReachedConversionCap(this.actor)) {
      return `
        <p><strong>Conversion Limit Reached</strong></p>
        <p>You have used ${getConversionsUsed(this.actor)}/${getMaxConversionsPerLongRest(this.actor)} conversions this long rest.</p>
      `;
    }

    const remainingCantrips = this.actor.system.resources.primary?.value ?? 0;
    const spellData = this.actor.system.spells;
    const maxLevel = getMaxConversionLevel(this.actor);
    const costPerLevel = getCostPerLevel(this.actor);

    let html = `
      <p><strong>Available Cantrips:</strong> ${remainingCantrips}</p>
      <hr>
    `;

    let validOptionExists = false;

    for (let level = 1; level <= maxLevel; level++) {
      const slot = spellData[`spell${level}`];
      if (!slot) continue;

      const cost = level * costPerLevel;

      if (slot.value < slot.max && remainingCantrips >= cost) {
        validOptionExists = true;

        html += `
          <div style="margin-bottom:8px;">
            <strong>Level ${level}</strong><br>
            Slots: ${slot.value}/${slot.max}
            <br>
            <button data-action="restore" data-type="spell" data-level="${level}">
              Restore 1 Slot (Cost ${cost})
            </button>
          </div>
        `;
      }
    }

    // Pact Slot Handling
    const pact = spellData.pact;
    if (pact && pact.max > 0) {
      const pactLevel = Number.isInteger(pact.level) && pact.level > 0
        ? pact.level
        : this.actor.system.details?.spellLevel ?? 1;

      if (pactLevel <= maxLevel) {
        const pactCost = pactLevel * costPerLevel;

        if (pact.value < pact.max && remainingCantrips >= pactCost) {
          validOptionExists = true;

          html += `
            <div style="margin-bottom:8px;">
              <strong>Pact Slot (Level ${pactLevel})</strong><br>
              Slots: ${pact.value}/${pact.max}
              <br>
              <button data-action="restore" data-type="pact">
                Restore 1 Pact Slot (Cost ${pactCost})
              </button>
            </div>
          `;
        }
      }
    }

    if (!validOptionExists) {
      html += `
        <p style="color: var(--color-text-light-5);">
          No spell slots can currently be restored.
        </p>
      `;
    }

    return html;
  }

  /**
   * Insert/replace the rendered content into the application DOM
   * @protected
   */
  _replaceHTML(result, content, options) {
    if (typeof result === "string") {
      const template = document.createElement("template");
      template.innerHTML = result.trim();
      content.replaceChildren(...template.content.childNodes);
    } else {
      content.replaceChildren(result);
    }
  }

  /**
   * Re-render the dialog after a restore action (since state changes)
   * This is called automatically after #onRestore because we call app.render(true)
   * @protected
   */
  _onRender(context, options) {
    super._onRender?.(context, options);
    debugLog("ConversionApp rendered / re-rendered");
  }

  static async #onRestore(event, target) {
    const app = this;
    const actor = app.actor;

    if (hasReachedConversionCap(actor)) {
      ui.notifications.warn("Conversion Limit Reached");
      return;
    }

    const type = target.dataset.type;
    const level = parseInt(target.dataset.level);
    const costPerLevel = getCostPerLevel(actor);

    let cost;
    let updates = {};

    const currentCantrips = actor.system.resources.primary.value;

    if (type === "spell") {
      cost = level * costPerLevel;
      const slot = actor.system.spells[`spell${level}`];
      updates[`system.spells.spell${level}.value`] = slot.value + 1;
    } else if (type === "pact") {
      const pact = actor.system.spells.pact;
      const pactLevel = pact.level;
      cost = pactLevel * costPerLevel;
      updates["system.spells.pact.value"] = pact.value + 1;
    }

    updates["system.resources.primary.value"] = currentCantrips - cost;

    await actor.update(updates);
    await incrementConversionsUsed(actor);

    // Chat message
    const remaining = currentCantrips - cost;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <p>
          <strong>${actor.name}</strong> converts cantrips into a
          <strong>${type === "pact" ? "Pact Slot" : `Level ${level} Slot`}</strong>.
          <br>
          Cost: ${cost} cantrips
          <br>
          Remaining: ${remaining}/${actor.system.resources.primary.max}
        </p>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });

    // Re-render to show updated state (remaining cantrips, disabled buttons, etc.)
    app.render(true);
  }
}

export function openConversionDialog(actor) {
  new ConversionApp(actor).render(true);
}

/* -------------------------------------------- */
/* ACTOR COLOR CONFIG DIALOG */
/* -------------------------------------------- */
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

/* -------------------------------------------- */
/* RESET CONFIRMATION DIALOG */
/* -------------------------------------------- */
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