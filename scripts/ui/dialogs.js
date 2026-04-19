import { MODULE_ID, ACTOR_FLAG, GLOBAL_SETTING } from "../utilities/constants.js";
import { debugLogError, debugLog } from "../utilities/debug.js";
import { getCostPerLevel, getMaxConversionLevel, hasReachedConversionCap } from "../logic/conversions.js";
import { getActorSetting, getPactSlotLevel } from "../utilities/helpers.js";
import { getRemainingConversions, getMaxConversions, consumeConversion } from "../logic/cantrip-state.js";

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

  constructor(actor, options = {}) {
  super(options);
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

    if (!this.actor) {
      console.error("ActorConfigApp rendered without actor reference.");
      return;
    } 

    const actor = this.actor;
    const overrideEnabled = getActorSetting(actor, ACTOR_FLAG.overrideEnabled, GLOBAL_SETTING.overrideEnabled);
    const costPerLevel = getActorSetting(actor, ACTOR_FLAG.costPerLevel, GLOBAL_SETTING.costPerLevel);
    const maxConversionLevel = getActorSetting(actor, ACTOR_FLAG.maxConversionLevel, GLOBAL_SETTING.maxConversionLevel);
    const maxConversionsPerLongRest = getActorSetting(actor, ACTOR_FLAG.maxConversionsPerLongRest, GLOBAL_SETTING.maxConversionsPerLongRest) ?? "";

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
      await app.actor.unsetFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled);
      await app.actor.unsetFlag(MODULE_ID, ACTOR_FLAG.costPerLevel);
      await app.actor.unsetFlag(MODULE_ID, ACTOR_FLAG.maxConversionLevel);
      await app.actor.unsetFlag(MODULE_ID, ACTOR_FLAG.maxConversionsPerLongRest);
      if (checkbox) checkbox.checked = false;
      const numericFields = form.querySelectorAll('input[type="number"]');
      numericFields.forEach(input => {
        input.value = "";
        input.disabled = true;
      });
      app.close();
      return;
    }
    await app.actor.setFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled, true);
    await app.actor.setFlag(MODULE_ID, ACTOR_FLAG.costPerLevel, Number(formData.get("costPerLevel")) || 0);
    await app.actor.setFlag(MODULE_ID, ACTOR_FLAG.maxConversionLevel, Number(formData.get("maxConversionLevel")) || 0);
    await app.actor.setFlag(MODULE_ID, ACTOR_FLAG.maxConversionsPerLongRest, Number(formData.get("maxConversionsPerLongRest")) || 0);
    app.close();
  }

// Optional: Use _onRender (or _onFirstRender) instead of _onRender for initial forcing
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Force initial checkbox + disabled state (safety net)
    const overrideEnabled = this.actor.getFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled) ?? false;
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

 constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /**
   * Generate the content HTML for this application
   * @protected
   */

  async _renderHTML(context, options) {

    debugLog("ConversionApp renderHTML CALLED"); // this will confirm execution

    if (!this.actor) {
      debugLogError("ConversionApp: actor is undefined.");
      return "";
    }

    const actor = this.actor;
    const remaining = getRemainingConversions(actor);
    const max = getMaxConversions(actor);

    debugLog(`Remaining conversions: ${remaining} Max conversions: ${max}`);

    if (hasReachedConversionCap(actor)) {
      return `
        <p><strong>Conversion Limit Reached</strong></p>
        <p>You have ${remaining}/${max} conversions remaining this long rest.</p>
      `;
    }

    const remainingCantrips = actor.system.resources.secondary?.value ?? 0;
    const spellData = actor.system.spells || {};
    const maxLevel = getMaxConversionLevel(actor);
    const costPerLevel = getCostPerLevel(actor);

    debugLog(`Actor has ${remainingCantrips} cantrips remaining. Max conversion level: ${maxLevel}, Cost per level: ${costPerLevel}`);

    const optionsList = [];

   const isWarlock = this.#isWarlock(actor);

    // Warlocks → pact slots only
    if (isWarlock) {
      const pactOption = this._buildPactSlotOption({
        actor,
        spellData,
        remainingCantrips,
        maxLevel,
        costPerLevel
      });

      if (pactOption) optionsList.push(pactOption);
    } 
    // Non-warlocks → normal spell slots only
    else {

      const allFull = this.#areAllSpellSlotsFull(spellData, maxLevel);

      if (allFull) {
        return `
          <p><strong>Available Cantrips:</strong> ${remainingCantrips}</p>
          <hr>
          <p style="color: var(--color-text-light-5);">
            All spell slots are already full.
          </p>
        `;
      }

      optionsList.push(
        ...this._buildSpellSlotOptions({
          actor,
          spellData,
          remainingCantrips,
          maxLevel,
          costPerLevel
        })
      );
    }

    const validOptions = optionsList;

    let html = `
      <p><strong>Available Cantrips:</strong> ${remainingCantrips}</p>
      <hr>
    `;

    if (validOptions.length === 0) {
      html += `
        <p style="color: var(--color-text-light-5);">
          No spell slots can currently be restored.
        </p>
      `;
      return html;
    }

    for (const opt of validOptions) {
      html += opt.html;
    }

    return html;
  }

  _buildSpellSlotOptions({ actor, spellData, remainingCantrips, maxLevel, costPerLevel }) {
    const options = [];

    for (let level = 1; level <= maxLevel; level++) {
      const slot = spellData[`spell${level}`];
      if (!slot) continue;

      const isFull = slot.value >= slot.max;

      // 🔴 Skip FULL slots entirely
      if (isFull) continue;

      const cost = level * costPerLevel;
      const notEnoughCantrips = remainingCantrips < cost;
      const enabled = !notEnoughCantrips;

      let label = `Level ${level}`;

      // Only show reason when it's the blocking factor
      if (notEnoughCantrips) {
        label += ` — Not enough cantrips (need ${cost})`;
      }

      options.push({
        enabled,
        html: this.#renderOptionHTML({
          type: "spell",
          level,
          label,
          value: slot.value,
          max: slot.max,
          cost,
          enabled
        })
      });
    }

    return options;
  }

  _buildPactSlotOption({ actor, spellData, remainingCantrips, maxLevel, costPerLevel }) {
    const pact = spellData.pact;
    if (!pact || pact.max <= 0) return null;

    // 🔹 Determine pact level
    let pactLevel = 1;

    if (Number.isInteger(pact.override) && pact.override >= 1) {
      pactLevel = pact.override;
    } 
    else if (Number.isInteger(pact.level) && pact.level >= 1) {
      pactLevel = pact.level;
    } 
    else {
      const warlockClass = actor.items.find(item =>
        item.type === "class" &&
        (item.system?.identifier === "warlock" ||
        item.name.toLowerCase().includes("warlock"))
      );

      const warlockLevel = warlockClass?.system?.levels ?? 1;
      pactLevel = Math.min(maxLevel, Math.ceil(warlockLevel / 2) || 1);
    }

    // Respect max conversion level
    if (pactLevel > maxLevel) return null;

    const isFull = pact.value >= pact.max;

    // 🔴 Skip FULL pact slots entirely
    if (isFull) return null;

    const cost = pactLevel * costPerLevel;
    const notEnoughCantrips = remainingCantrips < cost;
    const enabled = !notEnoughCantrips;

    let label = `Pact Slot (Level ${pactLevel})`;

    if (notEnoughCantrips) {
      label += ` — Not enough cantrips (need ${cost})`;
    }

    return {
      enabled,
      html: this.#renderOptionHTML({
        type: "pact",
        level: pactLevel,
        label,
        value: pact.value,
        max: pact.max,
        cost,
        enabled
      })
    };
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

    const currentCantrips = actor.system.resources.secondary.value;

    if (type === "spell") {
      cost = level * costPerLevel;
      const slot = actor.system.spells[`spell${level}`];
      updates[`system.spells.spell${level}.value`] = slot.value + 1;
    } else if (type === "pact") {
      
      const pact = actor.system.spells.pact;
      
      let pactLevel = 1;
      if (Number.isInteger(pact.override) && pact.override >= 1) {
        pactLevel = pact.override;
      } else if (Number.isInteger(pact.level) && pact.level >= 1) {
        pactLevel = pact.level;
      }

      // fallback not needed here since we already validated in render
      cost = pactLevel * costPerLevel;
      updates["system.spells.pact.value"] = pact.value + 1;
    }

    updates["system.resources.secondary.value"] = currentCantrips - cost;

    await actor.update(updates);
    await consumeConversion(actor);

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
          Remaining: ${remaining}/${actor.system.resources.secondary.max}
        </p>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });

    // Re-render to show updated state (remaining cantrips, disabled buttons, etc.)
    app.render(true);
  }

  #evaluateOption({ value, max, remainingCantrips, cost, labelBase }) {
    const isFull = value >= max;
    const notEnoughCantrips = remainingCantrips < cost;

    let enabled = true;
    let label = labelBase;
    let reason = "";

    if (isFull) {
      enabled = false;
      reason = "Slots are already full";
    } else if (notEnoughCantrips) {
      enabled = false;
      reason = `Not enough cantrips (need ${cost})`;
    }

    if (!enabled) {
      label = `${labelBase} — ${reason}`;
    }

    return { enabled, label, reason };
  }

  #isWarlock(actor) {
    return actor.items.some(item =>
      item.type === "class" &&
      (item.system?.identifier === "warlock" ||
      item.name.toLowerCase().includes("warlock"))
    );
  }

  #areAllSpellSlotsFull(spellData, maxLevel) {
    for (let level = 1; level <= maxLevel; level++) {
      const slot = spellData[`spell${level}`];
      if (!slot) continue;
      if (slot.value < slot.max) return false;
    }
    return true;
  }

  #renderOptionHTML({ type, level, label, value, max, cost, enabled }) {
    return `
      <div style="margin-bottom:8px;">
        <strong>${label}</strong>       
        ${
          enabled
            ? `<br>
            Slots: ${value}/${max}
            <br>
              <button 
                data-action="restore" 
                data-type="${type}" 
                ${level ? `data-level="${level}"` : ""}
              >
                Restore 1 ${type === "pact" ? "Pact Slot" : `Level ${level} Slot`} (Cost ${cost})
              </button>`
            : ""
        }
      </div>
    `;
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

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /* -------------------------------------------- */
  /* RENDER CONTENT                               */
  /* -------------------------------------------- */

  async _renderHTML(context, options) {

    if (!this.actor) {
      debugLogError("ActorColorConfigApp: actor is undefined.");
      return;
    }

  const actor = this.actor;

  const templateData = {
    glowLow: actor.getFlag(MODULE_ID, ACTOR_FLAG.glowLow) ?? "#ff0000",
    glowMedium: actor.getFlag(MODULE_ID, ACTOR_FLAG.glowMedium) ?? "#ffff00",
    glowHigh: actor.getFlag(MODULE_ID, ACTOR_FLAG.glowHigh) ?? "#00ff00",
    thresholdLow: actor.getFlag(MODULE_ID, ACTOR_FLAG.thresholdLow) ?? 25,
    thresholdMedium: actor.getFlag(MODULE_ID, ACTOR_FLAG.thresholdMedium) ?? 50
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

    if (!this.actor) {
      debugLogError("ResetConfirmationApp: actor is undefined.");
      return;
    }

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

    await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.thresholdLow);
    await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.thresholdMedium);
    await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.glowLow);
    await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.glowMedium);
    await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.glowHigh);

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