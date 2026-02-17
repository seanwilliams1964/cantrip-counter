# Changelog

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
