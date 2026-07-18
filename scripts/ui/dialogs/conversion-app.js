import { restoreSpellSlotFromCantrips } from "../../logic/conversion-service.js";
import {
  getConversionOptions,
  getMaxConversions,
  getRemainingConversions,
  hasReachedConversionCap,
  isConversionEnabled
} from "../../logic/conversions.js";
import { getRemainingCantrips } from "../../logic/cantrips.js";
import { debugLog } from "../../utilities/debug.js";
import { HtmlApplicationV2 } from "./base-app.js";

class ConversionApp extends HtmlApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "cantrip-conversion",
    tag: "div",
    classes: ["dialog"],
    window: {
      frame: true,
      title: "Convert Cantrips to Spell Slots",
      resizable: true
    },
    position: { width: 420, height: "auto" },
    actions: { restore: ConversionApp.#onRestore }
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  async _renderHTML() {
    const actor = this.actor;
    if (!actor) return "";

    const conversionEnabled = isConversionEnabled(actor);
    const limitReached = hasReachedConversionCap(actor);
    const options = conversionEnabled && !limitReached
      ? getConversionOptions(actor)
      : [];

    return foundry.applications.handlebars.renderTemplate(
      "modules/cantrip-counter/templates/conversion.html",
      {
        conversionEnabled,
        limitReached,
        remainingCantrips: getRemainingCantrips(actor),
        remainingConversions: getRemainingConversions(actor),
        maxConversions: getMaxConversions(actor),
        options,
        hasOptions: options.length > 0
      }
    );
  }

  static async #onRestore(event, target) {
    const app = this;
    const result = await restoreSpellSlotFromCantrips(app.actor, {
      type: target.dataset.type,
      level: target.dataset.level
    });

    if (!result.ok) {
      ui.notifications.warn(result.message);
      app.render(true);
      return;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: app.actor }),
      content: `
        <p>
          <strong>${app.actor.name}</strong> converts cantrips into a
          <strong>${result.restoredLabel}</strong>.
          <br>Cost: ${result.cost} Cantrip Uses
          <br>Formula: ${result.formula}
          <br>Remaining Cantrips: ${result.remainingCantrips}/${result.maxCantrips}
          <br>Remaining Conversions: ${result.remainingConversions}/${result.maxConversions}
        </p>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    });

    debugLog(`Completed spell-slot conversion for ${app.actor.name}.`);
    app.render(true);
  }
}

export function openConversionDialog(actor) {
  new ConversionApp(actor).render(true);
}
