# Codex kickoff prompt — БелаПчела

Historical brief for the first iteration, retained as design context. Its milestone-only instructions describe that original iteration. For current work, start with the [README](../../README.md) and [development guide](../DEVELOPMENT.md).

Implement **Milestone 1 only** from the accompanying `BelaPcela_Product_Spec_v0_5.md`. First inspect the repository and list the actual project structure; if empty, scaffold React + TypeScript + Vite. Use the spec as source of truth; do not silently change product decisions.

The product is a local-first genealogy app named **БелаПчела**, default UI Serbian Cyrillic, styled like an elegant botanical/archival family museum with restrained honeycomb accents. The chosen person node is a **vertical museum portrait card**, NOT a full hexagon. Use reusable tokens and components and preserve accessibility.

In this iteration:
- Create responsive application shell: top brand/status/search area, narrow left navigation, central tree canvas, right person inspector.
- Add a crisp original SVG hexagonal brand seal and reusable `HexBadge` component (accessible functional controls; avoid literal bee clip-art).
- Create `PortraitPersonNode` with 4:5 image crop or tasteful monogram fallback, name and life years; states normal, selected, focused.
- Integrate React Flow graph pan/zoom with ELK or a correctly abstracted layout adapter and custom relationship visual nodes. Build the `GraphProjectionService` abstraction so domain graph is not coupled to rendering.
- Use representative fixture data: two parents and children, a person with two partners, one child with an unknown other parent, one disconnected person.
- Clicking a person selects it and opens inspector, without switching focused person or resetting the viewport. A separate Focus action sets central person. Do not cap connected generations in focused mode.
- Show prototype interactions for opening a person profile and relative-add menu; if an action is not implemented yet, label it clearly rather than pretending to persist.
- Add design token stylesheet and local-friendly Cyrillic-capable fonts with fallbacks; no required network on app start.
- Include meaningful component or smoke tests and a short README with commands to run/test.

Do NOT attempt the full genealogy editor, import/export, all profile fields, and file storage in this first milestone; these belong to subsequent milestones. The project should start, render the demo, and support keyboard-accessible basic interactions.

Finish by listing files changed, the commands/tests run, and next implementation steps.
