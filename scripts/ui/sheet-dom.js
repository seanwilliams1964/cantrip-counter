import { debugLog } from "../utilities/debug.js";

export async function getRenderedSheetRoot(app) {
  if (!app?.id) return null;

  await new Promise(requestAnimationFrame);
  const root = document.getElementById(app.id);
  if (!root) return null;

  for (let attempt = 0; attempt < 25; attempt++) {
    const resource = root.querySelector(
      'li.resource[data-favorite-id="resources.secondary"], li.resource'
    );
    if (resource) {
      debugLog(`Favorites resource detected after ${attempt * 20}ms.`);
      return root;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  debugLog("Secondary resource was not visible after the sheet render wait.");
  return root;
}

export function getResourceRowFromRoot(root, key, label = null) {
  if (!root) return null;

  const selectors = [
    `li.resource[data-favorite-id="resources.${key}"]`,
    `[data-favorite-id="resources.${key}"]`,
    `[data-resource="${key}"]`,
    `[data-resource-id="${key}"]`,
    `.favorites .list-entry.favorite[data-favorite-id="resources.${key}"]`
  ];

  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }

  const input = root.querySelector(
    `input[name="system.resources.${key}.value"]`
  );
  if (input) {
    return input.closest(
      "li.resource, [data-favorite-id], .list-entry.favorite, .resource, .favorite, div"
    );
  }

  if (!label) return null;
  return Array.from(root.querySelectorAll(".list-entry.favorite")).find(
    element => element.textContent?.trim().includes(label)
  ) ?? null;
}

export function getResourceValueInput(resourceRow, key) {
  if (!resourceRow) return null;

  return resourceRow.querySelector(
    `input[name="system.resources.${key}.value"]`
  )
    ?? resourceRow.querySelector("input.uninput.value")
    ?? resourceRow.querySelector('input[type="number"]');
}
