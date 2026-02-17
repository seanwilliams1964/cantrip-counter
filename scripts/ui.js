// ui.js (no changes needed, already compatible with V2 API via renderActorSheetV2 hook)
import { MODULE_ID } from "./settings.js";
import { isConversionEnabled, updateCantripResourceColor, updateConversionGlow, updateGearGlow } from "./helpers.js";
import { openConversionDialog, openActorConfigDialog } from "./dialogs.js";

/* -------------------------------------------- */
/*  RENDER SHEET                                */
/* -------------------------------------------- */

Hooks.on("renderActorSheetV2", (app, html) => {

  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  const primaryResource = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"]'
  );
  if (!primaryResource) return;

  const figure = primaryResource.querySelector("figure");
  if (!figure) return;

  const originalIcon = figure.querySelector("img");
  if (!originalIcon) return;

  const customIcon = game.settings.get(MODULE_ID, "cantripIcon");
  const defaultIcon = `modules/${MODULE_ID}/assets/cantrips.png`;

  originalIcon.src = customIcon && customIcon.trim() !== ""
    ? customIcon
    : defaultIcon;

  const icon = originalIcon.cloneNode(true);
  figure.replaceChild(icon, originalIcon);

  if (isConversionEnabled(actor)) {

    icon.style.cursor = "pointer";
    icon.title = "Convert Cantrips to Spell Slots";

    icon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openConversionDialog(actor);
    });

  } else {

    icon.style.cursor = "default";
    icon.title = "Cantrip Uses";
  }

  /* ---------- GM GEAR (EDIT MODE) ---------- */

  const isEditMode = !!html.querySelector("input.document-name");

  if (game.user.isGM && isEditMode) {

    const headerButtons = html.querySelector(".sheet-header-buttons");

    if (headerButtons && !headerButtons.querySelector(".cantrip-config-gear")) {

      const gear = document.createElement("button");
      gear.type = "button";
      gear.classList.add("gold-button", "cantrip-config-gear");
      gear.innerHTML = `<i class="fas fa-cog"></i>`;
      gear.title = "Cantrip Conversion Settings";
      gear.style.marginLeft = "4px";

      gear.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openActorConfigDialog(actor);
      });

      headerButtons.appendChild(gear);
    }
  }

  // Apply color and glow after everything is rendered
  const color = updateCantripResourceColor(html, actor);
  updateConversionGlow(html, actor, color);
  updateGearGlow(html, actor, color);
});