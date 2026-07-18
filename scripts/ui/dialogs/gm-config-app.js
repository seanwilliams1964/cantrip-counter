import {
  ACTOR_FLAG,
  GLOBAL_SETTING,
  MODULE_ID
} from "../../utilities/constants.js";
import { debugLog } from "../../utilities/debug.js";
import { getActorSetting } from "../../logic/actor-settings.js";
import { getActorBonusCantrips } from "../../logic/cantrips.js";
import {
  syncConversionResource,
  syncResource
} from "../../logic/resources.js";
import { HtmlApplicationV2 } from "./base-app.js";

class ActorConfigApp extends HtmlApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "cantrip-actor-config",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Custom Cantrip Counter Settings",
      icon: "fas fa-hat-wizard",
      resizable: true
    },
    position: { width: 420, height: "auto" },
    actions: {
      toggleOverride: ActorConfigApp.#onToggleOverride,
      submit: ActorConfigApp.#onSubmit
    }
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  async _renderHTML() {
    if (!this.actor || !game.user.isGM) return "";

    const actor = this.actor;
    return foundry.applications.handlebars.renderTemplate(
      "modules/cantrip-counter/templates/gm-config.html",
      {
        bonusCantrips: getActorBonusCantrips(actor),
        overrideEnabled:
          actor.getFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled) === true,
        costPerLevel: getActorSetting(
          actor,
          ACTOR_FLAG.costPerLevel,
          GLOBAL_SETTING.costPerLevel
        ),
        maxConversionLevel: getActorSetting(
          actor,
          ACTOR_FLAG.maxConversionLevel,
          GLOBAL_SETTING.maxConversionLevel
        ),
        maxConversionsPerLongRest: getActorSetting(
          actor,
          ACTOR_FLAG.maxConversionsPerLongRest,
          GLOBAL_SETTING.maxConversionsPerLongRest
        )
      }
    );
  }

  static #onToggleOverride(event, target) {
    if (!game.user.isGM) return;

    const fields = target
      .closest("form")
      ?.querySelectorAll("[data-conversion-override-field]") ?? [];

    fields.forEach(input => {
      input.disabled = !target.checked;
    });
  }

  static async #onSubmit(event, target) {
    event.preventDefault();
    if (!game.user.isGM) {
      ui.notifications.warn("Only a GM can configure Cantrip Counter actor settings.");
      return;
    }

    const app = this;
    const actor = app.actor;
    const form = target.closest("form");
    const formData = new FormData(form);
    const overrideEnabled =
      form.querySelector('input[name="overrideEnabled"]')?.checked ?? false;
    const overrideWasEnabled =
      actor.getFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled) === true;
    const bonusCantrips = nonNegativeInteger(
      formData.get("bonusCantrips")
    );

    if (!overrideEnabled && overrideWasEnabled) {
      const confirmed = await Dialog.confirm({
        title: "Disable Override?",
        content: "<p>This will remove all custom conversion settings for this actor. Continue?</p>"
      });
      if (!confirmed) return;
    }

    await actor.setFlag(MODULE_ID, ACTOR_FLAG.bonusCantrips, bonusCantrips);

    if (overrideEnabled) {
      await actor.setFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled, true);
      await actor.setFlag(
        MODULE_ID,
        ACTOR_FLAG.costPerLevel,
        positiveInteger(formData.get("costPerLevel"), 3)
      );
      await actor.setFlag(
        MODULE_ID,
        ACTOR_FLAG.maxConversionLevel,
        positiveInteger(formData.get("maxConversionLevel"), 9)
      );
      await actor.setFlag(
        MODULE_ID,
        ACTOR_FLAG.maxConversionsPerLongRest,
        positiveInteger(formData.get("maxConversionsPerLongRest"), 3)
      );
    } else {
      await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.overrideEnabled);
      await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.costPerLevel);
      await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.maxConversionLevel);
      await actor.unsetFlag(MODULE_ID, ACTOR_FLAG.maxConversionsPerLongRest);
    }

    await syncResource(actor);
    await syncConversionResource(actor);
    debugLog(`Saved GM configuration for ${actor.name}.`);
    app.close();
  }
}

export function openActorConfigDialog(actor) {
  if (!game.user.isGM) {
    ui.notifications.warn("Only a GM can configure Cantrip Counter actor settings.");
    return;
  }

  new ActorConfigApp(actor).render(true);
}

function nonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.trunc(number));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}
