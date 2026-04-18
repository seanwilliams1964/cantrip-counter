import { debugLog } from "../utilities/debug.js";

export function getRemainingConversions(actor) {
  return actor.system.resources?.tertiary?.value ?? 0;
}

export function getMaxConversions(actor) {
  return actor.system.resources?.tertiary?.max ?? 0;
}

export function getRemainingCantrips(actor) {
  return actor.system.resources?.secondary?.value ?? 0;
}

export function getMaxCantrips(actor) {
  return actor.system.resources?.secondary?.max ?? 0;
}

export async function consumeConversion(actor) {
  const current = getRemainingConversions(actor);
  if (current <= 0) return false;

  await actor.update({
    "system.resources.tertiary.value": current - 1
  });

  return true;
}

export async function consumeCantrip(actor) {
  const current = getRemainingCantrips(actor);
  if (current <= 0) return false;

  const newValue = current - 1;

  await actor.update({
    "system.resources.secondary.value": newValue
  }, { diff: true });

  debugLog(`consumeCantrip: ${current} → ${newValue}`);
  return true;
}

export function hasReachedConversionCap(actor) {
  const max = getMaxConversions(actor);
  if (max <= 0) return false;           // 0 = unlimited
  return getRemainingConversions(actor) <= 0;
}