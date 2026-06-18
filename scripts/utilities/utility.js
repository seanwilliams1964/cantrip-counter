import { debugLog } from "../utilities/debug.js";

export function getSheetRoot(app) {
  if (!app?.id) return null;
  return document.getElementById(app.id);
}

export function nextFrame() {
  return new Promise(requestAnimationFrame);
}

export async function getRenderedSheetRoot(app) {
  if (!app?.id) return null;

  await new Promise(requestAnimationFrame);

  let root = document.getElementById(app.id);
  if (!root) return null;

  // Longer wait for V2 sheet favorites (DDB imports make this flaky)
  for (let i = 0; i < 25; i++) {   // ~500ms max
    const secondary = root.querySelector('li.resource[data-favorite-id="resources.secondary"]') ||
      root.querySelector('li.resource');
    if (secondary) {
      debugLog(`Favorites resource detected after ${i * 20}ms wait`);
      return root;
    }
    await new Promise(r => setTimeout(r, 20));
  }

  debugLog("Warning: Secondary resource still not visible in DOM");
  return root;
}

export async function querySheet(app, selector) {
  const root = await getRenderedSheetRoot(app);
  if (!root) return null;
  return root.querySelector(selector);
}

export async function querySheetAll(app, selector) {
  const root = await getRenderedSheetRoot(app);
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector));
}

export function getSecondaryResourceRowFromRoot(root) {
  return getResourceRowFromRoot(root, "secondary", "Cantrip Uses");
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

  const input = root.querySelector(`input[name="system.resources.${key}.value"]`);
  if (input) {
    return input.closest(
      'li.resource, [data-favorite-id], .list-entry.favorite, .resource, .favorite, div'
    );
  }

  if (label) {
    const tidyMatch = Array.from(root.querySelectorAll(".list-entry.favorite")).find(el =>
      el.textContent?.trim().includes(label)
    );
    if (tidyMatch) return tidyMatch;
  }

  return null;
}

export function getResourceValueInput(resourceRow, key) {
  if (!resourceRow) return null;

  return resourceRow.querySelector(`input[name="system.resources.${key}.value"]`)
    ?? resourceRow.querySelector('input.uninput.value')
    ?? resourceRow.querySelector('input[type="number"]');
}

export function getResourceIconElement(resourceRow) {
  if (!resourceRow) return null;

  return resourceRow.querySelector("figure img")
    ?? resourceRow.querySelector("img")
    ?? resourceRow.querySelector(".item-image")
    ?? resourceRow.querySelector(".favorite-image")
    ?? resourceRow.querySelector("figure");
}