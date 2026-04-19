# Changelog

## [2.3.0] - 2026-04-16 – Turn Off Cantrip Scaling
- New setting in the global settings to turn off scaling
- All cantrips cast as L1 when it is enabled
- Cleanup of how resources are tracked.
- Fixed issues with creating new PC and having resources set
- Minor fix for when the PC spellcasting attribute changes 

## [2.2.3] - 2026-04-16 – D&D Beyond Import Resilience & V2 Sheet Polish

### Fixed
- Critical D&D Beyond importer compatibility: module now reliably restores Cantrip Uses resource, favorites entry, and UI after full actor overwrite.
- Sheet render timing and DOM detection improved for dnd5e V2 (`renderActorSheetV2` hook + better waiting).
- Strict edit-mode detection so GM gear and color palette only appear when actually editing.
- Reliable click handler for Cantrip Uses icon (conversion dialog opens correctly).
- Consistent use of utility helpers and aggressive event cleanup.

### Improved
- Better debug logging during sheet render and applyCantripLogic.

## [2.0.0] - 2026-02-22 – Conversion System Refactor & Internal Resource Handling

### Added

* Reliable decrementing of Daily Conversions when a spell slot conversion occurs.
* Utility-based sheet lifecycle helpers for safe post-render DOM interaction.
* Defensive selector handling to support multiple sheet structures.
* Improved conversion cap enforcement logic.

### Changed

* Refactored conversion workflow to properly invoke consumption logic.
* Replaced jQuery-based sheet manipulation with utility-driven DOM querying.
* Daily Conversions now tracked internally while hidden from the character sheet UI.
* Standardized usage of `GLOBAL_SETTING` and `ACTOR_FLAG` across logic layers.
* Improved sheet render handling to prevent race conditions with late-injected content.

### Fixed

* Resolved issue where Daily Conversions (tertiary resource) did not decrement.
* Corrected conversion cap logic when remaining conversions reached zero.
* Removed unused imports and orphaned exports.
* Eliminated unused flag constants.
* Addressed potential resource synchronization inconsistencies.

### Removed

* Unused `FLAG_CONVERSIONS` constant.
* Redundant resource display logic.
* jQuery dependency for sheet DOM manipulation.

[1.4.0] - 2026-02-22 – Github Action for release
✨ Added
YML file to handle the creation if a ZIP file for the release.

[1.3.0] - 2026-02-22 – Resource Refactor & Stability Improvements
✨ Added
Automatic migration from primary to secondary resource slot for Cantrip Uses.
Schema versioning system to ensure migrations run only once per world.
Automatic max resync when a character’s spellcasting ability score changes.
Long rest conversion reset fix — conversionsUsed now properly resets even when cantrip uses are already at maximum.
Improved rest messaging showing the exact number of Cantrip Uses restored.

🔧 Changed
Cantrip Uses now stored exclusively in system.resources.secondary.
Removed preUpdateActor interception logic to eliminate race conditions and unintended update blocking.
Hardened syncResource() to self-heal improperly initialized actors.
Improved rest workflow ordering to prevent stale max calculations.

🐛 Fixed
Conversions not resetting on long rest when cantrip count was already full.
Resource/UI desync issues caused by dual primary/secondary usage.
Edge cases involving D&D Beyond imports and newly created actors.
Potential race conditions during rest resolution.

[1.2.0] - 2026-02-19
🚀 Added
Structured module architecture into clearly defined folders:
core/ – initialization, hooks, and settings
logic/ – game state, resource handling, and conversion logic
ui/ – dialogs and sheet interface integrations
utilities/ – shared helpers, debugging, and DOM utilities
Centralized cantrip state management into logic/cantrip-state.js
Dedicated conversion logic handling in logic/conversions.js
Improved resource synchronization system in logic/resources.js
Reusable debug logging utility via utilities/debug.js

🔄 Changed
Reorganized file structure to isolate responsibilities by domain:
Removed cross-domain method mixing
Separated UI logic from business logic
Separated resource mutation from state computation
Standardized ES module imports across all files
Corrected import paths to eliminate invalid or circular references
Consolidated conversion tracking into a single source of truth
Normalized naming conventions for helper and utility functions
Updated sheet root handling to use consistent utility abstraction
Improved Foundry VTT v13 ES module compliance
Refactored logic to better align with DND5e v5.2.5 system structure

🧹 Removed
Unused and redundant import statements
Improper cross-folder function references
Implicit global dependencies between logic and UI layers

🛠 Fixed
Missing ES module imports causing runtime reference errors
Incorrect import sources for:
Conversion state helpers
Resource refresh methods
Inconsistent sheet rendering utility naming
Potential module load failures under Foundry VTT v13 strict ESM

🏗 Internal Improvements
Reduced coupling between modules
Improved separation of concerns
Enhanced maintainability and scalability
Prepared foundation for future feature expansion (1.3.x+)

## 1.0.2 - 1.1.0 — Numerous Iterations With Enhancements

## Actor-Specific Cantrip Configuration

### New Features

* Converted cantrip resource colors and thresholds from **global GM settings** to **per-actor configuration**.
* Added a V13-native **ApplicationV2 configuration dialog** for managing:

  * Low / Medium threshold sliders (`range-picker`)
  * Low / Medium / High glow colors
* Added **Reset to Defaults** with confirmation dialog (V13-compliant).
* Normalized color values to prevent unwanted alpha-channel duplication.

### Improvements

* Improved layout and styling of threshold sliders and color pickers.
* Sliders now use Foundry's native `<range-picker>` component.
* Configuration dialog fully aligned with Foundry V13 application framework.

---

## Resource Integrity & Permission Controls

### GM-Only Manual Editing

* Manual editing of available cantrips is now **restricted to GMs**.
* Resource input field is disabled and visually locked for non-GM users.

### Hard Data Enforcement

* Implemented document-level validation using `preUpdateActor`.
* Automatically clamps cantrip value to its maximum if exceeded.
* Prevents unauthorized changes at the document level (UI-independent).

### V13 Sheet Sync

* Added reliable sheet refresh logic using `actor.apps`.
* Removed reliance on deprecated `ui.windows`.

## Cantrip Casting Enforcement (D&D5e v5.x)

### Activity Engine Integration

* Integrated with the D&D5e v5.x Activity workflow using:

  * `dnd5e.preUseActivity`

### New Behavior

* Cantrips cannot be cast when available uses reach **0**.
* Exceptions allowed for:

  * Scrolls
  * At-will spells
  * Item-based spell uses

### Fully Enforced Across:

* Sheet casting
* Hotbar casting
* Chat card casting
* Automated workflows

---

## Architecture & Compatibility Updates

* Migrated dialogs to Foundry **V13 ApplicationV2**.
* Replaced deprecated global `renderTemplate` with:

  * `foundry.applications.handlebars.renderTemplate`
* Centralized resource access via helper functions.
* Removed deprecated D&D5e hooks and updated to Activity system.
* Improved separation between UI enforcement and document-level validation.

---

## Internal Improvements

* Reduced duplicate hook triggers and toast spam.
* Improved logging for debugging and traceability.
* Refactored guard logic into dedicated `guards.js`.

## 1.0.1

Internal refactor and structural improvements.  
No functional changes. Fully backward compatible with 1.0.0.

### Refactor
- Modularized codebase into separated ES module files:

  ```text
  scripts/
    ├── cantrip-counter.js
    ├── castings.js
    ├── debug.js
    ├── dialogs.js
    ├── favorites.js
    ├── helpers.js
    ├── resources.js
    └── settings.js
    ├── ui.js
    
- Improved separation of concerns between UI, mechanics, resources, and configuration.
- Centralized debug logging helper.
- Extracted resource synchronization logic into dedicated module.
- Extracted conversion engine into isolated mechanics module.
- Extracted permanent favorite protection into dedicated integrity module.
- Improved long-term maintainability and future expansion readiness.

## Improvements
- Default icon now loads from assets/cantrips.png if no custom icon is configured.
- Favorite protection hardened at data layer (no DOM interception).
- Cleaned up deprecated API usage (ChatMessage style handling).
- Reduced render hook complexity.
- Improved internal event flow stability.

## 1.0.0

Initial stable release.

### Features
- Dynamic Cantrip resource based on spellcasting ability.
- Optional spell slot conversion system.
- Configurable cost formula.
- Configurable max conversion level.
- Configurable max conversions per long rest.
- Warlock Pact Magic support.
- Per-actor override system.
- GM-only configuration gear in edit mode.
- Dynamic glow matching resource state.
- Conversion and cast chat logging.
- Debug logging toggle.
- Automatic recovery if resource removed from favorites.

### Compatibility
- Foundry VTT v13
- DnD5e 5.2.5+
