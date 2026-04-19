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
  if (!root) return null;

  const valueInput = root.querySelector(
    'input[name="system.resources.secondary.value"], input.uninput.value'
  );

  if (!valueInput) return null;

  return valueInput.closest(
    'li, .resource, .flexrow, .fav-item, [data-favorite-id]'
  );
}