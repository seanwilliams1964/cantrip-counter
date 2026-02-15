# Cantrip Counter

A Foundry VTT module for DnD5e (5.2.5+) that transforms cantrips into a dynamic resource system with optional spell slot conversion mechanics.

Designed for Foundry VTT v13 and the DnD5e V2 sheet.

---

## Overview

Cantrip Counter converts cantrips into a limited, ability-based resource.  
Characters gain a number of cantrip uses equal to their spellcasting ability score.

Optionally, cantrips can be converted into spell slots using a configurable cost formula.

The module supports:
- Full casters
- Half casters
- Warlocks (Pact Magic)
- Multiclass characters
- Per-character configuration overrides

This module is fully reactive and integrates cleanly with the DnD5e V2 character sheet.

---

# Core Cantrip System

## Dynamic Cantrip Resource

- Automatically creates a **Cantrip Uses** resource.
- Maximum equals the character’s spellcasting ability score.
- Optional world-level bonus modifier.
- Automatically updates when:
  - Spellcasting ability changes
  - World bonus setting changes
  - Long rest occurs
- Cannot be removed from Favorites.

---

## Automatic Cantrip Tracking

- Detects level 0 spell casts.
- Decrements Cantrip Uses.
- Blocks casting at 0 remaining.
- Posts chat message confirming usage.
- Works from both sheet and hotbar.
- Does not require Midi-QOL.

---

## Visual Feedback

Resource color changes dynamically:

| Remaining | Color |
|------------|--------|
| > 50% | 🟢 Green |
| ≤ 50% | 🟡 Yellow |
| ≤ 25% | 🔴 Red |

Glow appears around the resource when conversion is available.  
Glow color matches the resource color.

---

# Spell Slot Conversion (Optional)

When enabled, players may convert cantrips into spell slots.

---

## Conversion Formula
Cost = costPerLevel × Spell Level


Example:
- costPerLevel = 3
- Level 2 spell
- Cost = 6 cantrips

Fully configurable.

---

## Supported Spell Types

- Standard spell slots (spell1–spell9)
- Warlock Pact Magic
- Multiclass spellcasters

Pact slot level is used automatically for cost calculation.

---

## Smart Conversion Dialog

The conversion dialog:

- Only shows slots that are not full.
- Only shows options the character can afford.
- Hides slots above max conversion level.
- Updates live after each conversion.
- Posts conversion results to chat.
- Disables entirely when cap reached.

---

# Conversion Cap System

You can limit conversions per long rest.

- World setting controls default cap.
- 0 = unlimited conversions.
- Tracks per actor via flags.
- Resets automatically on long rest.
- Enforced at:
  - UI level
  - Glow level
  - Logic level

No bypass possible.

---

# World Settings

| Setting | Description |
|----------|-------------|
| Enable Conversion | Toggle conversion system |
| Cost Per Level | Multiplier for slot cost |
| Max Conversion Level | Highest slot eligible |
| Max Conversions Per Long Rest | Conversion cap |
| Bonus Cantrips | Additional cantrips added to max |
| Custom Icon | Replace resource icon |

---

# Per-Character Overrides (GM Only)

Each actor may override world settings.

Accessible via a small ⚙ gear icon in the character sheet header.

The gear icon:
- Appears only for GM
- Appears only in Edit Mode
- Is subtle and non-intrusive

---

## Override Options

- Enable/disable custom conversion rules
- Custom cost per level
- Custom max conversion level
- Custom max conversions per long rest

---

## Override Behavior

- Fields disabled until override enabled.
- Confirmation dialog when disabling override.
- Reset to Defaults button with confirmation.
- Overrides stored in: flags.cantrip-counter
- World settings automatically used when no override present.

---

# Rest Integration

On Long Rest:

- Cantrip Uses reset to maximum.
- Conversion usage counter resets.
- Chat message posted.
- Sheet automatically re-renders.

Short Rest does not reset conversion cap.

---

# Reactivity System

The module automatically responds to:

- Spellcasting ability changes
- World bonus setting changes
- Rest events
- Conversion usage
- Slot usage
- Override changes

No reload required.

---

# Technical Architecture

- Uses actor flags for per-character state.
- Does not modify DnD5e system schema.
- No template overrides.
- No Favorites manipulation.
- Defensive getter pattern prevents render errors.
- Compatible with Foundry v13 and DnD5e 5.2.5+.

---

# Requirements

- Foundry VTT v13
- DnD5e System 5.2.5+

---

# Installation

1. Place module folder in: Data/modules/cantrip-counter
2. Restart Foundry.
3. Enable module in your world.

---

# Known Compatibility Notes

- Designed for DnD5e V2 default sheet.
- Does not require automation modules.
- Does not interfere with spell slot mechanics.
- Fully supports Warlocks (Pact Magic).

---

# Future Expansion Ideas

- Per-actor spellcasting ability selection
- Proficiency-based scaling options
- Active Effect integration
- Mystic Arcanum support
- Conversion history logging
- Override indicator badge on sheet

---

# Summary

Cantrip Counter transforms cantrips into a tactical resource with scalable conversion mechanics while maintaining full compatibility with the DnD5e system.

It provides:

- Mechanical balance control
- Per-character flexibility
- Clean UI integration
- Strong enforcement logic
- Reactive sheet behavior

---

Enjoy your enhanced spellcasting system.



