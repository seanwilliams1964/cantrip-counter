import { RESOURCE_LABEL } from "../utilities/constants.js";

export function injectTidyCantripResource(app, root, container) {
  const resource = app.actor.system.resources.secondary;
  root
    .querySelector('[data-cantrip-counter-tidy-resource="secondary"]')
    ?.remove();

  const entry = document.createElement("div");
  entry.className =
    "list-entry favorite resource cantrip-counter-tidy-resource";
  entry.dataset.cantripCounterTidyResource = "secondary";
  entry.dataset.favoriteType = "resource";
  entry.dataset.resource = "secondary";
  entry.dataset.cantripCounter = "true";
  entry.innerHTML = `
    <figure>
      <img class="gold-icon"
           alt="${RESOURCE_LABEL.cantripUses}"
           src="modules/cantrip-counter/assets/cantrips.png"
           title="Click to convert Cantrips into Spell Slots">
    </figure>
    <div class="name-stacked" role="button" data-action="useFavorite">
      <span class="title">${RESOURCE_LABEL.cantripUses}</span>
      <span class="subtitle">SR • LR</span>
    </div>
    <div class="info">
      <div class="primary uses">
        <input type="text"
               class="uninput value"
               value="${Number(resource.value ?? 0)}"
               data-dtype="Number"
               name="system.resources.secondary.value"
               inputmode="numeric"
               pattern="[+=\\-]?\\d*">
        <span class="separator">/</span>
        <span class="max">${Number(resource.max ?? 0)}</span>
      </div>
      <div class="secondary"></div>
    </div>
  `;

  const spellbook = container.querySelector("section.spellbook-list-section");
  if (spellbook) container.insertBefore(entry, spellbook);
  else container.prepend(entry);

  return entry;
}

export function refreshTidyCantripResource(actor, resourceElement) {
  if (!resourceElement?.matches?.(".cantrip-counter-tidy-resource")) return;

  const resource = actor.system.resources.secondary;
  const input = resourceElement.querySelector(
    'input[name="system.resources.secondary.value"]'
  );
  const max = resourceElement.querySelector(".max");

  if (input) {
    input.value = Number(resource.value ?? 0);
    input.setAttribute("value", String(resource.value ?? 0));
  }
  if (max) max.textContent = String(resource.max ?? 0);
}
