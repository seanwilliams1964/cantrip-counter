import { debugLog } from "../utilities/debug.js";

/* -------------------------------------------- */
/*  SHEET LIFECYCLE UTILITIES                   */
/* -------------------------------------------- */

/**
 * Resolve the live sheet root element.
 * Uses the application ID to safely anchor to the
 * real <form> element in the DOM.
 */
export function getSheetRoot(app) {
  if (!app?.id) return null;
  return document.getElementById(app.id);
}

/**
 * Wait until the next animation frame.
 * Ensures that late-rendered content (e.g. favorites)
 * has been injected into the sheet.
 */
export function nextFrame() {
  return new Promise(requestAnimationFrame);
}

/**
 * Wait for sheet to fully render AND for favorites resources to be injected.
 * This is critical for V2 sheet + DDB imports.
 */
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

/**
 * Query inside a sheet safely after full render.
 */
export async function querySheet(app, selector) {
  const root = await getRenderedSheetRoot(app);
  if (!root) return null;
  return root.querySelector(selector);
}

/**
 * Query multiple elements safely inside a sheet.
 */
export async function querySheetAll(app, selector) {
  const root = await getRenderedSheetRoot(app);
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector));
}
