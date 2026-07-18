import { getActorSetting } from "../../logic/actor-settings.js";
import {
  ACTOR_FLAG,
  GLOBAL_SETTING,
  MODULE_ID
} from "../../utilities/constants.js";
import { debugLog } from "../../utilities/debug.js";
import { HtmlApplicationV2 } from "./base-app.js";

class ActorColorConfigApp extends HtmlApplicationV2 {
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
    position: { width: 420, height: "auto" },
    actions: {
      submit: ActorColorConfigApp.#onSubmit,
      resetDefaults: ActorColorConfigApp.#onResetDefaults
    }
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  async _renderHTML() {
    if (!this.actor || !game.user.isGM) return "";

    return foundry.applications.handlebars.renderTemplate(
      "modules/cantrip-counter/templates/actor-color-config.html",
      {
        glowLow: getActorSetting(
          this.actor,
          ACTOR_FLAG.glowLow,
          GLOBAL_SETTING.glowLow
        ),
        glowMedium: getActorSetting(
          this.actor,
          ACTOR_FLAG.glowMedium,
          GLOBAL_SETTING.glowMedium
        ),
        glowHigh: getActorSetting(
          this.actor,
          ACTOR_FLAG.glowHigh,
          GLOBAL_SETTING.glowHigh
        ),
        thresholdLow: getActorSetting(
          this.actor,
          ACTOR_FLAG.thresholdLow,
          GLOBAL_SETTING.thresholdLow
        ),
        thresholdMedium: getActorSetting(
          this.actor,
          ACTOR_FLAG.thresholdMedium,
          GLOBAL_SETTING.thresholdMedium
        )
      }
    );
  }

  static async #onSubmit(event, target) {
    event.preventDefault();
    if (!game.user.isGM) return;

    const app = this;
    const form = target.closest("form");
    const formData = new FormData(form);
    const thresholdLow = Number(
      form.querySelector('range-picker[name="thresholdLow"]')?.value
    );
    const thresholdMedium = Number(
      form.querySelector('range-picker[name="thresholdMedium"]')?.value
    );

    if (
      !Number.isFinite(thresholdLow)
      || !Number.isFinite(thresholdMedium)
      || thresholdLow >= thresholdMedium
    ) {
      ui.notifications.warn("Low threshold must be less than Medium threshold.");
      return;
    }

    await app.actor.setFlag(
      MODULE_ID,
      ACTOR_FLAG.glowLow,
      normalizeHex(formData.get("glowLow"))
    );
    await app.actor.setFlag(
      MODULE_ID,
      ACTOR_FLAG.glowMedium,
      normalizeHex(formData.get("glowMedium"))
    );
    await app.actor.setFlag(
      MODULE_ID,
      ACTOR_FLAG.glowHigh,
      normalizeHex(formData.get("glowHigh"))
    );
    await app.actor.setFlag(
      MODULE_ID,
      ACTOR_FLAG.thresholdLow,
      thresholdLow
    );
    await app.actor.setFlag(
      MODULE_ID,
      ACTOR_FLAG.thresholdMedium,
      thresholdMedium
    );

    Hooks.callAll("cantripCounterRefreshUI");
    debugLog(`Saved resource colors for ${app.actor.name}.`);
    app.close();
  }

  static #onResetDefaults() {
    new ResetColorConfirmationApp(this.actor, this).render(true);
  }
}

class ResetColorConfirmationApp extends HtmlApplicationV2 {
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
    position: { width: 360, height: "auto" },
    actions: {
      confirm: ResetColorConfirmationApp.#onConfirm,
      cancel: ResetColorConfirmationApp.#onCancel
    }
  };

  constructor(actor, parentApp) {
    super();
    this.actor = actor;
    this.parentApp = parentApp;
  }

  async _renderHTML() {
    return foundry.applications.handlebars.renderTemplate(
      "modules/cantrip-counter/templates/reset-color-confirmation.html",
      {}
    );
  }

  static async #onConfirm() {
    if (!game.user.isGM) return;

    for (const flag of [
      ACTOR_FLAG.thresholdLow,
      ACTOR_FLAG.thresholdMedium,
      ACTOR_FLAG.glowLow,
      ACTOR_FLAG.glowMedium,
      ACTOR_FLAG.glowHigh
    ]) {
      await this.actor.unsetFlag(MODULE_ID, flag);
    }

    Hooks.callAll("cantripCounterRefreshUI");
    this.close();
    this.parentApp.render(true);
  }

  static #onCancel() {
    this.close();
  }
}

export function openActorColorConfig(actor) {
  if (!game.user.isGM) {
    ui.notifications.warn("Only a GM can configure Cantrip Counter colors.");
    return;
  }

  new ActorColorConfigApp(actor).render(true);
}

function normalizeHex(value) {
  if (typeof value !== "string") return value;
  return value.startsWith("#") && value.length === 9
    ? value.slice(0, 7)
    : value;
}
