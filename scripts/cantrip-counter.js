/**
 * Cantrip Counter - Flag + Resource Based
 * Foundry VTT v13
 * DnD5e 5.2.5
 *
 * - No item required
 * - Uses actor.system.resources.primary
 * - Max = Spellcasting Ability Score
 * - Hard blocks at 0
 * - Decrements using createChatMessage (5.2 compatible)
 * - Resets on Short & Long Rest
 */

const MODULE_ID = "cantrip-counter";
const DEFAULT_MAX_CONVERSION_LEVEL = 9;

/* -------------------------------------------- */
/*  INIT                                       */
/* -------------------------------------------- */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "cantripIcon", {
    name: "Cantrip Counter Icon",
    hint: "Path to a custom icon that will appear on the character sheet.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
    filePicker: "image"
  });

  game.settings.register(MODULE_ID, "bonusCantrips", {
    name: "Bonus Cantrip Uses",
    hint: "Additional cantrip uses added to the spellcasting ability score.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0,
    onChange: () => {
      refreshAllCantripMaximums();
    }
  });

  game.settings.register(MODULE_ID, "enableConversion", {
    name: "Enable Spell Slot Conversion",
    hint: "Allow players to convert cantrips into spell slots.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "costPerLevel", {
    name: "Cantrip Cost Per Spell Level",
    hint: "Number of cantrips required per spell level when restoring a slot.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 3
  });

  game.settings.register(MODULE_ID, "maxConversionLevel", {
    name: "Maximum Convertible Spell Level",
    hint: "Highest spell level that can be restored using cantrip conversion.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 9
  });

  game.settings.register(MODULE_ID, "maxConversionsPerLongRest", {
    name: "Maximum Conversions Per Long Rest",
    hint: "Maximum number of cantrip-to-slot conversions allowed per long rest. Set to 0 for unlimited.",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, "debug", {
    name: "Enable Debug Logging",
    hint: "Logs Cantrip Counter debug messages to the browser console.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

/* -------------------------------------------- */
/*  READY                                       */
/* -------------------------------------------- */
Hooks.once("ready", () => {
  debugLog("=== Cantrip Counter (5.2.5 Compatible) Loaded ===");
});

/* -------------------------------------------- */
/*  SYNC RESOURCE                               */
/* -------------------------------------------- */
async function syncResource(actor) {

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const resource = actor.system.resources?.primary;
  const updates = {};

  if (!resource) {
    updates["system.resources.primary"] = {
      label: "Cantrip Uses",
      value: abilityScore,
      max: abilityScore,
      sr: true,
      lr: true
    };
  } else {
    if (resource.label !== "Cantrip Uses") {
      updates["system.resources.primary.label"] = "Cantrip Uses";
    }

    if (resource.max !== abilityScore) {
      updates["system.resources.primary.max"] = abilityScore;
    }

    if (resource.value == null) {
      updates["system.resources.primary.value"] = abilityScore;
    }
  }

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }
}

/* -------------------------------------------- */
/*  LISTEN FOR THE SPELLCASTING ABILITY UPDATE  */
/* -------------------------------------------- */
Hooks.on("updateActor", async (actor, changes) => {

  if (!actor.hasPlayerOwner) return;
  if (actor.type !== "character") return;

  const abilityKey = actor.system.attributes.spellcasting;
  if (!abilityKey) return;

  // Check nested structure safely
  const abilityChanges = changes?.system?.abilities?.[abilityKey];

  if (!abilityChanges || abilityChanges.value === undefined) return;

  debugLog(`Cantrip Counter: ${actor.name}'s spellcasting ability changed.`);

  await refreshSingleActorMaximum(actor);

});

/* -------------------------------------------- */
/*  BLOCK IF 0 (PRE-CAST CHECK)                 */
/* -------------------------------------------- */
Hooks.on("dnd5e.preUseItem", async (item) => {
  if (!item) return;
  if (item.type !== "spell") return;
  if (item.system.level !== 0) return;

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);

  const remaining = actor.system.resources.primary?.value ?? 0;

  if (remaining <= 0) {
    ui.notifications.warn(`${actor.name} has no cantrip uses remaining!`);
    return false;
  }
});

/* -------------------------------------------- */
/*  DECREMENT AFTER SPELL CARD CREATES          */
/*  (5.2.5 Compatible Method)                   */
/* -------------------------------------------- */
Hooks.on("createChatMessage", async (message) => {
  const flags = message.flags?.dnd5e;
  if (!flags) return;

  // Only trigger on actual spell usage message
  if (flags["messageType"] !== "usage") return;

  const itemRef = flags.item;
  if (!itemRef) return;
  if (itemRef.type !== "spell") return;

  // Resolve real item from UUID (5.2+ required)
  const item = await fromUuid(itemRef.uuid);
  if (!item) return;

  if (item.system.level !== 0) return; // Only cantrips

  const actor = item.actor;
  if (!actor?.hasPlayerOwner) return;

  await syncResource(actor);

  const resource = actor.system.resources.primary;
  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  if (current <= 0) return;

  const newValue = current - 1;

  await actor.update({
    "system.resources.primary.value": newValue
  });

  debugLog(`Cantrip used by ${actor.name}. Remaining: ${newValue}/${max}`);
});

/* -------------------------------------------- */
/*  RENDER ICON ON CHARACTER SHEET (5.2.5)      */
/* -------------------------------------------- */
Hooks.on("renderActorSheetV2", (app, html) => {

  const actor = app.actor;
  if (!actor || actor.type !== "character") return;


  debugLog("Sheet mode:", app.mode);
  debugLog("Editable:", app.isEditable);
  debugLog("Options:", app.options);
 

  /* --------------------------------------------*/
  /*  GM GEAR ICON (DYNAMIC VISIBILITY)          */
  /* --------------------------------------------*/

  if (game.user.isGM) {

    const headerButtons = html.querySelector(".sheet-header-buttons");
    debugLog("Header buttons container:", headerButtons);
    if (!headerButtons) return;

    let gear = headerButtons.querySelector(".cantrip-config-gear");

    debugLog("Gear buttons", gear);

    if (!gear) {
      gear = document.createElement("button");
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

    // Function to update visibility
    function updateGearVisibility() {
      const isEditMode = !!html.querySelector("input.document-name");
      gear.style.display = isEditMode ? "inline-flex" : "none";
    }

    // Initial state
    updateGearVisibility();

    // Listen for edit toggle button
    const editButton = html.querySelector('[data-action="edit"]');
    if (editButton) {
      editButton.addEventListener("click", () => {
        setTimeout(updateGearVisibility, 50);
      });
    }
  }

  /* -------------------------------------------- */
  /*  LOCATE PRIMARY RESOURCE                     */
  /* -------------------------------------------- */
  const primaryResource = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"]'
  );
  if (!primaryResource) return;

  const figure = primaryResource.querySelector("figure");
  if (!figure) return;

  const originalIcon = figure.querySelector("img");
  if (!originalIcon) return;

  /* -------------------------------------------- */
  /*  REPLACE ICON (IF CONFIGURED)                */
  /* -------------------------------------------- */
  const iconPath = game.settings.get(MODULE_ID, "cantripIcon");
  if (iconPath) originalIcon.src = iconPath;

  const icon = originalIcon.cloneNode(true);
  figure.replaceChild(icon, originalIcon);

  /* -------------------------------------------- */
  /*  ICON CLICK HANDLER (ISOLATED)               */
  /* -------------------------------------------- */
  if (isConversionEnabled(actor)) {

    icon.style.cursor = "pointer";
    icon.title = "Convert Cantrips to Spell Slots";

    icon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation(); // Stop bubbling to <li>
      openConversionDialog(actor);
    });

  } else {
    icon.style.cursor = "default";
    icon.title = "Cantrip Uses";
  }

  /* -------------------------------------------- */
  /*  APPLY COLOR + GLOW                          */
  /* -------------------------------------------- */

  const color = updateCantripResourceColor(html, actor);
  updateConversionGlow(html, actor, color);
  updateGearGlow(html, actor, color);
});

/* -------------------------------------------- */
/*  REST CANTRIP RESET                          */
/* -------------------------------------------- */
Hooks.on("dnd5e.restCompleted", async (actor) => {

  if (!actor) return;
  if (actor.type !== "character") return;

  await syncResource(actor);

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const bonus = game.settings.get(MODULE_ID, "bonusCantrips") ?? 0;
  const newMax = abilityScore + bonus;

  await actor.update({
    "system.resources.primary.max": newMax,
    "system.resources.primary.value": newMax
  });

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <p>
        <strong>${actor.name}</strong>'s Cantrip Uses have been fully restored.
        <br>
        Total Available: ${newMax}
      </p>
    `,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  if (actor.sheet?.rendered) {
    actor.sheet.render(true);
  }
});

/* -------------------------------------------- */
/*  LONG REST SPECIAL CONVERSION RESET          */
/* -------------------------------------------- */
Hooks.on("dnd5e.longRest", async (actor) => {

  if (!actor) return;
  if (actor.type !== "character") return;

  await syncResource(actor);

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const bonus = game.settings.get(MODULE_ID, "bonusCantrips") ?? 0;
  const newMax = abilityScore + bonus;

  await actor.update({
    "system.resources.primary.max": newMax,
    "system.resources.primary.value": newMax
  });

  await resetConversionsUsed(actor);

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <p>
        <strong>${actor.name}</strong>'s Cantrip Uses restored.
        <br>
        Total Available: ${newMax}
      </p>
    `,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });

  if (actor.sheet?.rendered) actor.sheet.render(true);
});

/* -------------------------------------------- */
/*  HELPER FUNCTIONS                            */
/* -------------------------------------------- */

/*  RENDER ACTOR CONVERSON CONFIG DIALOG HELPER  */
function openActorConfigDialog(actor) {

  const currentFlags = actor.flags?.[MODULE_ID] ?? {};
  const hasOverride = currentFlags.conversionEnabled === true;

  const dialog = new Dialog({
    title: "Cantrip Conversion Configuration",
    content: `
      <form>
        <div class="form-group">
          <label>
            <input type="checkbox" name="conversionEnabled"
              ${hasOverride ? "checked" : ""}>
            Use Custom Conversion Rules
          </label>
        </div>

        <div class="form-group">
          <label>Cost Per Level</label>
          <input type="number" name="costPerLevel"
            value="${currentFlags.costPerLevel ?? ""}"
            ${hasOverride ? "" : "disabled"}>
        </div>

        <div class="form-group">
          <label>Max Conversion Level</label>
          <input type="number" name="maxConversionLevel"
            value="${currentFlags.maxConversionLevel ?? ""}"
            ${hasOverride ? "" : "disabled"}>
        </div>

        <div class="form-group">
          <label>Max Conversions Per Long Rest</label>
          <input type="number" name="maxConversionsPerLongRest"
            value="${currentFlags.maxConversionsPerLongRest ?? ""}"
            ${hasOverride ? "" : "disabled"}>
        </div>
      </form>
    `,
    buttons: {

      save: {
        label: "Save",
        callback: async (html) => {

          const form = html[0].querySelector("form");
          const enabled = form.conversionEnabled.checked;

          if (!enabled) {
            ui.notifications.warn("You must enable custom conversion rules before changing settings.");
            return false;
          }

          // Save override flags
          await actor.setFlag(MODULE_ID, "conversionEnabled", true);

          if (form.costPerLevel.value) {
            await actor.setFlag(MODULE_ID, "costPerLevel", Number(form.costPerLevel.value));
          } else {
            await actor.unsetFlag(MODULE_ID, "costPerLevel");
          }

          if (form.maxConversionLevel.value) {
            await actor.setFlag(MODULE_ID, "maxConversionLevel", Number(form.maxConversionLevel.value));
          } else {
            await actor.unsetFlag(MODULE_ID, "maxConversionLevel");
          }

          if (form.maxConversionsPerLongRest.value) {
            await actor.setFlag(MODULE_ID, "maxConversionsPerLongRest", Number(form.maxConversionsPerLongRest.value));
          } else {
            await actor.unsetFlag(MODULE_ID, "maxConversionsPerLongRest");
          }

          if (actor.sheet?.rendered) actor.sheet.render(true);
        }
      }

    },
    render: (html) => {

      const form = html[0].querySelector("form");
      const checkbox = form.conversionEnabled;
      const fields = [
        form.costPerLevel,
        form.maxConversionLevel,
        form.maxConversionsPerLongRest
      ];

      function toggleFields(enabled) {
        fields.forEach(f => f.disabled = !enabled);
      }

      toggleFields(checkbox.checked);

      checkbox.addEventListener("change", async () => {

        if (!checkbox.checked && hasOverride) {

          new Dialog({
            title: "Disable Custom Conversion?",
            content: `
              <p>This will remove all custom conversion settings for this character.</p>
              <p>Are you sure?</p>
            `,
            buttons: {
              confirm: {
                label: "Yes, Remove Overrides",
                callback: async () => {

                  await actor.unsetFlag(MODULE_ID, "conversionEnabled");
                  await actor.unsetFlag(MODULE_ID, "costPerLevel");
                  await actor.unsetFlag(MODULE_ID, "maxConversionLevel");
                  await actor.unsetFlag(MODULE_ID, "maxConversionsPerLongRest");

                  // Clear fields
                  form.costPerLevel.value = "";
                  form.maxConversionLevel.value = "";
                  form.maxConversionsPerLongRest.value = "";

                  toggleFields(false);

                  ui.notifications.info("Custom conversion rules removed.");

                  if (actor.sheet?.rendered) 
                    actor.sheet.render(true);
                }
              },
              cancel: {
                label: "Cancel",
                callback: () => {
                  checkbox.checked = true;
                }
              }
            },
            default: "cancel"
          }).render(true);

        } else {
          toggleFields(checkbox.checked);
        }

      });
    }
  });

  dialog.render(true);
}

/*  RENDER THE CONVERSION DIALOG HELPER  */
function openConversionDialog(actor) {

  const buildContent = () => {

    if (hasReachedConversionCap(actor)) {
      return `
        <p><strong>Conversion Limit Reached</strong></p>
        <p>You have used ${getConversionsUsed(actor)}/${game.settings.get(MODULE_ID, "maxConversionsPerLongRest")} conversions this long rest.</p>
      `;
    }

    const remainingCantrips = actor.system.resources.primary?.value ?? 0;
    const spellData = actor.system.spells;
    const maxLevel = getMaxConversionLevel();
    const costPerLevel = getCostPerLevel(actor)

    let html = `
      <p><strong>Available Cantrips:</strong> ${remainingCantrips}</p>
      <hr>
    `;

    let validOptionExists = false;

    for (let level = 1; level <= maxLevel; level++) {

      const slot = spellData[`spell${level}`];
      if (!slot) continue;

      const cost = level * costPerLevel;

      if (slot.value < slot.max && remainingCantrips >= cost) {
        validOptionExists = true;

        html += `
      <div style="margin-bottom:8px;">
        <strong>Level ${level}</strong><br>
        Slots: ${slot.value}/${slot.max}
        <br>
        <button data-type="spell" data-level="${level}">
          Restore 1 Slot (Cost ${cost})
        </button>
      </div>
    `;
      }
    }

    /* ---------- Pact Slot Handling ---------- */
    const pact = spellData.pact;

    if (pact && pact.max > 0) {

      const pactLevel = Number.isInteger(pact.level) && pact.level > 0
        ? pact.level
        : actor.system.details?.spellLevel ?? 1;

      if (pactLevel <= maxLevel) {

        const pactCost = pactLevel * costPerLevel;

        if (pact.value < pact.max && remainingCantrips >= pactCost) {

          validOptionExists = true;

          html += `
        <div style="margin-bottom:8px;">
          <strong>Pact Slot (Level ${pactLevel})</strong><br>
          Slots: ${pact.value}/${pact.max}
          <br>
          <button data-type="pact">
            Restore 1 Pact Slot (Cost ${pactCost})
          </button>
        </div>
      `;
        }
      }
    }
    if (!validOptionExists) {
      html += `
        <p style="color: var(--color-text-light-5);">
          No spell slots can currently be restored.
        </p>
      `;
    }

    return html;
  };

  const dialog = new Dialog({
    title: "Convert Cantrips to Spell Slots",
    content: buildContent(),
    buttons: {},
    render: (html) => {

      html.on("click", "button", async (event) => {

        // Check to ensure the user has not exceeded their conversion count, if set
        if (hasReachedConversionCap(actor)) {
          return `
            <p><strong>Conversion Limit Reached</strong></p>
            <p>You have used ${getConversionsUsed(actor)}/${game.settings.get(MODULE_ID, "maxConversionsPerLongRest")} conversions this long rest.</p>
          `;
        }

        const type = event.currentTarget.dataset.type;
        const level = parseInt(event.currentTarget.dataset.level);
        const costPerLevel = getCostPerLevel(actor);

        let cost;
        let updates = {};

        const currentCantrips = actor.system.resources.primary.value;

        if (type === "spell") {

          cost = level * costPerLevel;
          const slot = actor.system.spells[`spell${level}`];

          updates[`system.spells.spell${level}.value`] = slot.value + 1;

        } else if (type === "pact") {

          const pact = actor.system.spells.pact;
          const pactLevel = pact.level;

          cost = pactLevel * costPerLevel;

          updates["system.spells.pact.value"] = pact.value + 1;
        }

        updates["system.resources.primary.value"] = currentCantrips - cost;

        await actor.update(updates);
        await incrementConversionsUsed(actor);

        /* ----- Chat Message ----- */
        const remaining = currentCantrips - cost;

        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `
          <p>
            <strong>${actor.name}</strong> converts cantrips into a
            <strong>${type === "pact" ? "Pact Slot" : `Level ${level} Slot`}</strong>.
            <br>
            Cost: ${cost} cantrips
            <br>
            Remaining: ${remaining}/${actor.system.resources.primary.max}
          </p>
        `,
          type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });

        dialog.data.content = buildContent();
        dialog.render(false);

      });
    }
  });

  dialog.render(true);
}

/*  CONVERSION GLOW HELPER  */
function updateConversionGlow(html, actor, glowColor) {

  const conversionEnabled = isConversionEnabled(actor);
  if (!conversionEnabled) return;

  const resourceRow = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"]'
  );
  if (!resourceRow) return;

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const used = getConversionsUsed(actor);

  if (maxConversions > 0 && used >= maxConversions) {
    resourceRow.style.boxShadow = "";
    return;
  }

  const remaining = actor.system.resources.primary?.value ?? 0;
  const spellData = actor.system.spells;
  const costPerLevel = getCostPerLevel(actor);

  let maxLevel = game.settings.get(MODULE_ID, "maxConversionLevel");

  if (!Number.isInteger(maxLevel) || maxLevel <= 0)
    maxLevel = DEFAULT_MAX_CONVERSION_LEVEL;

  let canConvert = false;

  /* ---- Normal Spell Slots ---- */
  for (let level = 1; level <= maxLevel; level++) {

    const slot = spellData[`spell${level}`];
    if (!slot) continue;

    const cost = level * costPerLevel;

    if (slot.value < slot.max && remaining >= cost) {
      canConvert = true;
      break;
    }
  }

  /* ---- Pact Slot Support ---- */
  if (!canConvert) {
    const pact = spellData.pact;

    if (pact && pact.max > 0) {

      const pactLevel = Number.isInteger(pact.level) && pact.level > 0
        ? pact.level
        : actor.system.details?.spellLevel ?? 1;

      if (pactLevel <= maxLevel) {

        const pactCost = pactLevel * costPerLevel;

        if (pact.value < pact.max && remaining >= pactCost) {
          canConvert = true; // for glow
        }
      }
    }

  }

  /* ---- Apply Glow ---- */
  if (canConvert && glowColor) {

    // Convert HEX (#rrggbb) to RGB values
    const r = parseInt(glowColor.slice(1, 3), 16);
    const g = parseInt(glowColor.slice(3, 5), 16);
    const b = parseInt(glowColor.slice(5, 7), 16);

    resourceRow.style.boxShadow =
      `0 0 8px 2px rgba(${r}, ${g}, ${b}, 0.8)`;

    resourceRow.style.transition = "box-shadow 0.3s ease";

  } else {
    resourceRow.style.boxShadow = "";
  }
}

/*  SPELL CASTING ABILITY SCORE HELPER  */
function getSpellcastingAbilityScore(actor) {
  const abilityKey = actor.system.attributes.spellcasting;
  if (!abilityKey) return null;

  const ability = actor.system.abilities[abilityKey];
  if (!ability) return null;

  const baseScore = ability.value ?? 0;
  const bonus = game.settings.get(MODULE_ID, "bonusCantrips") ?? 0;

  return baseScore + bonus;
}

/*  CONVERSIONS USED HELPER  */
function getConversionsUsed(actor) {
  return actor.getFlag(MODULE_ID, "conversionsUsed") ?? 0;
}

/*  INCREMENT CONVERSIONS USED HELPER  */
async function incrementConversionsUsed(actor) {
  const current = getConversionsUsed(actor);
  await actor.setFlag(MODULE_ID, "conversionsUsed", current + 1);
}

/*  RESET CONVERSIONS USED HELPER  */
async function resetConversionsUsed(actor) {
  await actor.setFlag(MODULE_ID, "conversionsUsed", 0);
}

/*  COLORIZE CANTRIP COUNTER HELPER  */
function updateCantripResourceColor(html, actor) {

  const resource = actor.system.resources.primary;
  if (!resource) return null;

  const value = resource.value ?? 0;
  const max = resource.max ?? 1;

  const percent = max > 0 ? value / max : 0;

  const valueInput = html.querySelector(
    'li.resource[data-favorite-id="resources.primary"] input.uninput.value'
  );

  if (!valueInput) return null;

  let color;

  if (percent <= 0.25) {
    color = "#d32f2f"; // Red
  }
  else if (percent <= 0.5) {
    color = "#f9a825"; // Yellow
  }
  else {
    color = "#43a047"; // Green
  }

  valueInput.style.setProperty("color", color, "important");

  return color; // 👈 IMPORTANT
}

/*  REFRESH CANTRIP MAXIMUMS  HELPER  */
async function refreshSingleActorMaximum(actor) {

  const abilityScore = getSpellcastingAbilityScore(actor);
  if (!abilityScore) return;

  const resource = actor.system.resources.primary;
  if (!resource) return;

  const updates = {};

  updates["system.resources.primary.max"] = abilityScore;

  if (resource.value > abilityScore) {
    updates["system.resources.primary.value"] = abilityScore;
  }

  await actor.update(updates);
}

/*  RENDER THE CANTRIP MAXIMUMS HELPER  */
async function refreshAllCantripMaximums() {
  debugLog("Cantrip Counter: Refreshing maximums after bonus change.");

  for (const actor of game.actors) {
    if (!actor.hasPlayerOwner) continue;
    if (actor.type !== "character") continue;

    const abilityScore = getSpellcastingAbilityScore(actor);
    if (!abilityScore) continue;

    const resource = actor.system.resources.primary;
    if (!resource) continue;

    const updates = {};

    // Update max
    updates["system.resources.primary.max"] = abilityScore;

    // Clamp current value if it exceeds new max
    if (resource.value > abilityScore) {
      updates["system.resources.primary.value"] = abilityScore;
    }

    await actor.update(updates);
  }
}

/*  CONVERSION HELPER  */
function hasReachedConversionCap(actor) {
  const maxConversions = getMaxConversionsPerLongRest(actor);
  const used = getConversionsUsed(actor);
  return maxConversions > 0 && used >= maxConversions;
}

/*  SETTINGS VALIDATION HELPER  */
async function ensureActorFlags(actor) {
  const existing = actor.getFlag(MODULE_ID, "initialized");

  if (!existing) {
    await actor.setFlag(MODULE_ID, "initialized", true);
  }
}

/* GEAR ICON GLOW HELPER  */
function updateGearGlow(html, actor, glowColor) {

  const gear = html.querySelector(".cantrip-config-gear");
  if (!gear) return;

  // No glow if conversion disabled
  if (!isConversionEnabled(actor)) {
    gear.style.boxShadow = "";
    return;
  }

  const resource = actor.system.resources?.primary;
  if (!resource) return;

  const current = resource.value ?? 0;
  const max = resource.max ?? 0;

  const costPerLevel = getCostPerLevel(actor);
  const minCost = costPerLevel; // Level 1 slot minimum cost

  const maxConversions = getMaxConversionsPerLongRest(actor);
  const used = getConversionsUsed(actor);

  const conversionBlocked =
    current < minCost ||
    (maxConversions > 0 && used >= maxConversions);

  if (conversionBlocked) {
    gear.style.boxShadow = "";
    return;
  }

  gear.style.boxShadow = `0 0 6px 2px ${glowColor}`;
}

/* -------------------------------------------- */
/*  ACTOR SETTINGS HELPERS */
/* -------------------------------------------- */
function getActorSetting(actor, key, worldSettingKey) {

  debugLog(`getActorSetting called with key ${key} and actor:`, actor);

 if (!actor || typeof actor.getFlag !== "function") {
    debugLog("Actor is undefined");
    return game.settings.get(MODULE_ID, worldSettingKey);
  }

  const actorValue = actor.getFlag(MODULE_ID, key);

  if (actorValue !== undefined && actorValue !== null) {
    debugLog("Actor value found:", actorValue);
    return actorValue;
  }

  debugLog("Actor value undefined or null. Returning world setting:");
  return game.settings.get(MODULE_ID, worldSettingKey);
}

function isConversionEnabled(actor) {
  return getActorSetting(actor, "conversionEnabled", "enableConversion");
}

function getCostPerLevel(actor) {
  return getActorSetting(actor, "costPerLevel", "costPerLevel");
}

function getMaxConversionLevel(actor) {
  let level = getActorSetting(actor, "maxConversionLevel", "maxConversionLevel");

  if (!Number.isInteger(level) || level <= 0) {
    level = DEFAULT_MAX_CONVERSION_LEVEL;
  }

  return level;
}

function getMaxConversionsPerLongRest(actor) {
  return getActorSetting(actor, "maxConversionsPerLongRest", "maxConversionsPerLongRest");
}

function getCantripIcon() {
  return game.settings.get(MODULE_ID, "cantripIcon");
}

function debugLog(...args) {
  if (!game.settings.get(MODULE_ID, "debug")) return;
  console.log(`%c[Cantrip Counter]`, "color: #9b59b6; font-weight: bold;", ...args);
}

/* -------------------------------------------- */

/* -------------------------------------------- */
/*  TEST HOOKS                                  */
/* -------------------------------------------- */

// Hooks.on("dnd5e.restCompleted", (actor) => {
//   debugLog("restCompleted fired for", actor.name);
// });

// Hooks.on("dnd5e.longRest", (actor) => {
//   debugLog("longRest fired for", actor.name);
// });

// Hooks.on("dnd5e.shortRest", (actor) => {
//   debugLog("shortRest fired for", actor.name);
// });