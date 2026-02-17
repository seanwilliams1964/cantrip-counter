import { debugLog } from "./debug.js";

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
 * Wait for sheet to fully render and return its root.
 * This is the safest entry point for DOM manipulation.
 */
export async function getRenderedSheetRoot(app) {
  await nextFrame();
  return getSheetRoot(app);
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
