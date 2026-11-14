# WildTrap scene publishing contract

The payload of `maps/current.json` and `maps/versions/*.json` is the **original editor scene JSON**; do not strip or reinterpret fields.

Required fields: `size`, `resolution`, `heights` (must have `resolution*resolution` entries), `nodes` array. Optional current fields: `cuts3d`, `holes`, `objectGroups`, `biomeMaterials`, `biomeGenerator`, `settings`, `zones`, `editorCamera`.

- `maps/current.json` is a snapshot of the active published version (for **new** games only).
- `maps/manifest.json` provides activeVersion, activePath, and a chronological release history.
- `maps/versions/<id>.json` stores immutable version payloads. Never overwrite previous published versions.
- Sessions store their map version and load a frozen version path rather than `current.json` after matchmaking.
- Models/assets referenced by a scene must be available to the game. This JSON does not embed all GLB binary assets; use the WildTrap assets or a published assets bundle.
- Publishing uses GitHub Git Database API in one commit, from the originating editor's explicit Publish panel. It requires a short-lived fine-grained token with Contents write permission for this repository; never check credentials into this repository.
