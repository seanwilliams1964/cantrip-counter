# Cantrip Counter

Cantrip Counter is a Foundry Virtual Tabletop module for DnD5e that turns
cantrip casting into a limited, ability-based resource and optionally allows
those uses to be converted into spell slots.

The module is designed for Foundry VTT v13, DnD5e 5.2.5 or later, the DnD5e V2
character sheet, and Tidy Sheet 5e.

## Requirements

- Foundry Virtual Tabletop v13
- DnD5e system 5.2.5 or later
- Color Picker module

The Color Picker module is required for custom resource-color configuration.
Cantrip Counter does not require Midi-QOL or another automation module.

## Cantrip Uses

Eligible characters receive a `Cantrip Uses` resource on their character
sheet.

The maximum number of Cantrip Uses is:

```text
Spellcasting ability score
+ World Bonus Cantrip Uses
+ Actor Bonus Cantrip Uses
+ Spellcasting class levels (when enabled)
```

Cantrip Counter uses the character's full spellcasting ability score, not the
ability modifier. For example, a character with Intelligence 16 receives 16
Cantrip Uses before any world-level or actor-level bonus is applied.

The resource is recalculated when the spellcasting ability score or either
configured bonus changes. When the optional spellcasting-class-level setting is
enabled, it is also recalculated when a class or subclass changes. If the
maximum decreases, the current value is reduced when necessary so that it does
not exceed the new maximum.

Only levels from classes with DnD5e spellcasting progression count. A
spellcasting subclass also makes its linked class levels count. Feats can make
a character eligible for Cantrip Counter, but feat-based spellcasting does not
add character levels. A GM can use the actor's `Additional Cantrip Uses` field
when a feat-based caster needs an individual adjustment.

The module supports:

- Full casters
- Half casters
- Pact Magic spellcasters
- Multiclass characters
- Characters that receive spellcasting through supported feats

## Cantrip casting

Cantrip Counter listens to the DnD5e Activity workflow. When a character casts
an eligible level-0 spell, one Cantrip Use is consumed.

Casting is blocked when no Cantrip Uses remain. This applies to casting from
character sheets, hotbars, chat cards, and other workflows that use DnD5e
activities.

The following do not consume Cantrip Uses:

- Spells cast from scrolls
- Spells configured as at-will
- Spells that use their own item-use resource

## Rest recovery

Cantrip Uses are configured as a short-rest and long-rest resource. Resting
restores the resource through the normal DnD5e resource-recovery system.

The spell-slot conversion allowance resets on a long rest. A short rest does
not reset the conversion allowance.

## Spell-slot conversion

When spell-slot conversion is enabled, click the Cantrip Uses icon to open the
conversion dialog.

The dialog examines the actor's spell slots and:

- Omits slots that are already full
- Shows the current and maximum value for each open slot
- Shows when the actor cannot afford an available slot
- Limits standard options to the configured maximum conversion level
- Updates after each successful conversion
- Posts successful conversion details to chat

### Standard spell slots

The cost of restoring one standard spell slot is:

```text
Spell level × Cost Per Level
```

With the default Cost Per Level of 3:

| Restored slot | Cantrip Uses |
|---|---:|
| Level 1 | 3 |
| Level 2 | 6 |
| Level 3 | 9 |

### Pact Magic

For a Pact Magic slot, the cost is:

```text
Pact slot level + Cost Per Level
```

The module reads the actor's stored Pact slot level and can derive it from the
Warlock class level when necessary.

With a Pact slot level of 2 and the default Cost Per Level of 3, restoring one
Pact slot costs 5 Cantrip Uses.

## Conversion limit

Spell-slot conversion is always subject to a per-long-rest limit. Unlimited
conversion is not supported.

By default, each actor may perform three spell-slot conversions per long rest.
The world setting controls the default limit, and a GM can configure a
different positive limit for an individual actor.

The remaining allowance is tracked internally as a hidden `Daily Conversions`
resource. Each successful conversion consumes one allowance, and the allowance
resets on a long rest.

The conversion limit is separate from the Cantrip Uses cost. A character must
have both:

- At least one conversion remaining for the current long rest
- Enough Cantrip Uses to pay for the selected spell slot

## Cantrip damage scaling

The `Prevent Cantrip Scaling` world setting attempts to keep cantrip damage at
its first-level value by suppressing DnD5e's level-based damage scaling during
damage rolls.

This setting affects damage scaling only. It does not change the Cantrip Uses
maximum or conversion costs.

## Visual feedback

The Cantrip Uses value changes color based on the percentage remaining.

| Remaining percentage | Default color |
|---|---|
| At or below 25% | Red |
| Above 25% and at or below 50% | Yellow |
| Above 50% | Green |

The resource receives a matching glow when the actor has an open spell slot,
enough Cantrip Uses to begin converting, and at least one conversion remaining.

The colors and percentage thresholds can be configured globally or overridden
for an individual actor.

## Character-sheet integration

Cantrip Counter supports the standard DnD5e V2 character sheet and includes
compatibility handling for Tidy Sheet 5e and Tidy Sheet 5e Classic.

The module:

- Displays Cantrip Uses as a character resource
- Uses a bundled cantrip icon by default
- Supports a world-level custom icon
- Adds a Tidy-compatible resource row when needed
- Keeps the resource visible in Favorites
- Hides the internal Daily Conversions resource
- Prevents non-GM users from manually editing the visible Cantrip Uses value

## GM actor configuration

When a GM opens an eligible character sheet in edit mode, Cantrip Counter adds:

- A wizard-hat button for conversion-rule overrides
- A palette button for resource colors and thresholds

The wizard-hat dialog also provides an `Additional Cantrip Uses` field. This
actor-specific bonus is added to the world bonus and affects only that actor.
It is independent of the actor's conversion-rule override.

### Conversion overrides

A GM can override the world conversion rules for an individual actor:

- Cost Per Level
- Maximum Conversion Level
- Maximum Conversions Per Long Rest

Disabling the override removes the actor's custom conversion settings and
returns the actor to the world defaults.

### Appearance overrides

A GM can configure these values per actor:

- Low threshold
- Medium threshold
- Low color
- Medium color
- High color

The appearance dialog includes a confirmed `Reset to Defaults` action that
removes the actor-specific appearance flags.

## World settings

| Setting | Default | Description |
|---|---:|---|
| Enable Debug Logging | Off | Writes diagnostic messages to the browser console |
| Cantrip Counter Icon | Bundled icon | Selects a custom resource icon |
| Bonus Cantrip Uses | 0 | Adds uses to the spellcasting ability score |
| Add Spellcasting Class Levels | Off | Adds levels from spellcasting classes or subclasses to maximum uses |
| Prevent Cantrip Scaling | Off | Suppresses level-based cantrip damage scaling |
| Enable Spell Slot Conversion | On | Enables the conversion interface |
| Cantrip Cost Per Spell Level | 3 | Controls standard and Pact conversion costs |
| Maximum Convertible Spell Level | 9 | Highest standard spell-slot option |
| Maximum Conversions Per Long Rest | 3 | Default per-actor conversion allowance |
| Low Resource Color | Red | Color used at or below the low threshold |
| Medium Resource Color | Yellow | Color used through the medium threshold |
| High Resource Color | Green | Color used above the medium threshold |
| Low Threshold | 25% | Low-resource boundary |
| Medium Threshold | 50% | Medium-resource boundary |

## Data and migration behavior

Cantrip Counter stores its resources in the actor's standard DnD5e resource
fields:

```text
system.resources.secondary  → Cantrip Uses
system.resources.tertiary   → Daily Conversions
```

Per-actor configuration is stored under:

```text
flags.cantrip-counter
```

The module includes migrations for older resource locations and conversion
flags. It also performs a one-time defensive cleanup of module-owned resources
on characters that are no longer eligible.

## Internal architecture

Cantrip Counter separates Foundry lifecycle integration from game rules and
sheet presentation:

```text
scripts/core   → initialization, settings, hooks, and migrations
scripts/logic  → eligibility, resources, cantrip totals, and conversions
scripts/ui     → dialogs, sheet integration, Tidy support, and visuals
scripts/utilities → constants and debug logging
```

Core modules may coordinate logic and UI. UI modules may consume logic, while
logic and utility modules remain independent of the UI layer.

## Installation

Install Cantrip Counter through Foundry's module browser using its manifest, or
place the module directory in:

```text
Data/modules/cantrip-counter
```

Restart Foundry VTT, enable Cantrip Counter and Color Picker in the world, and
open an eligible character sheet.

## License

Cantrip Counter is released under the MIT License.
