/* -------------------------------------------- */
/* Remaining Daily Conversions                  */
/* -------------------------------------------- */

export function getRemainingConversions(actor) {
  return actor.system.resources?.tertiary?.value ?? 0;
}

export function getMaxConversions(actor) {
  return actor.system.resources?.tertiary?.max ?? 0;
}

export async function consumeConversion(actor) {
  const current = getRemainingConversions(actor);
  if (current <= 0) return false;

  await actor.update({
    "system.resources.tertiary.value": current - 1
  });

  return true;
}

export function hasRemainingCantrips(actor) {
  const current = getRemainingConversions(actor);
  return current > 0;
}