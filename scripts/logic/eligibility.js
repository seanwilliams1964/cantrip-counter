/**
 * Determine whether an actor should receive Cantrip Counter resources.
 */
export function hasCantripCounterEligibility(actor) {
  if (!actor || actor.type !== "character") return false;
  if (actor.system?.attributes?.spellcasting) return true;
  return actor.items?.some(item => isSpellcastingFeat(item)) ?? false;
}

export function getCantripCounterAbilityKey(actor) {
  if (!actor || actor.type !== "character") return null;

  const actorSpellcasting = actor.system?.attributes?.spellcasting;
  if (actorSpellcasting) return actorSpellcasting;

  return getFeatSpellcastingAbilityKey(actor);
}

export function getSpellcastingAbilityScore(actor) {
  const abilityKey = getCantripCounterAbilityKey(actor);
  if (!abilityKey) return null;

  const abilityScore = Number(actor.system.abilities?.[abilityKey]?.value);
  return Number.isFinite(abilityScore) ? abilityScore : null;
}

export function getSpellcastingClassLevels(actor) {
  if (!actor || actor.type !== "character") return 0;

  const items = Array.from(actor.items ?? []);
  const classes = items.filter(item => item.type === "class");
  const subclasses = items.filter(item => item.type === "subclass");

  return classes.reduce((total, classItem) => {
    const classIdentifier = classItem.system?.identifier;
    const classHasSpellcasting = hasSpellcastingProgression(classItem);
    const subclassHasSpellcasting = Boolean(classIdentifier)
      && subclasses.some(subclass =>
        subclass.system?.classIdentifier === classIdentifier
        && hasSpellcastingProgression(subclass)
      );

    if (!classHasSpellcasting && !subclassHasSpellcasting) return total;

    const levels = Number(classItem.system?.levels ?? 0);
    if (!Number.isFinite(levels)) return total;
    return total + Math.max(0, Math.trunc(levels));
  }, 0);
}

function getFeatSpellcastingAbilityKey(actor) {
  const feats = actor.items?.filter(item => isSpellcastingFeat(item)) ?? [];

  for (const feat of feats) {
    const advancements = Object.values(
      feat.toObject().system?.advancement ?? {}
    );
    const spellChoices = advancements.filter(advancement =>
      advancement.type === "ItemChoice"
      && advancement.configuration?.type === "spell"
      && advancement.value?.ability
    );
    const spellChoice = spellChoices.find(advancement =>
      String(advancement.configuration?.restriction?.level) !== "0"
    ) ?? spellChoices[0];
    const abilityKey = spellChoice?.value?.ability;

    if (actor.system?.abilities?.[abilityKey]) return abilityKey;
  }

  return null;
}

function isSpellcastingFeat(item) {
  if (!item || item.type !== "feat") return false;

  const advancements = Object.values(
    item.toObject().system?.advancement ?? {}
  );

  return advancements.some(advancement =>
    advancement.type === "ItemChoice"
    && advancement.configuration?.type === "spell"
    && advancement.value?.ability
  );
}

function hasSpellcastingProgression(item) {
  const progression = String(
    item?.system?.spellcasting?.progression ?? "none"
  ).trim().toLowerCase();

  return progression !== "" && progression !== "none";
}
