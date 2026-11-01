# BelaPčela

A local-only genealogy app prototype: a family museum in Serbian Cyrillic. This implements **Milestone 1 only**, as requested by `BelaPcela_Codex_Kickoff.md`. Product decisions follow `BelaPcela_Product_Spec_v0_5.md`.

## Run

Use Node.js 22.12+ (verified with Node 24) and npm. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test          # domain/projection, real ELK layout, component interactions
npm run build    # strict TypeScript check + production bundle in dist/
npm run preview  # serve the production bundle locally
npm run test:e2e # installed Microsoft Edge; desktop and mobile Chromium emulation
```

The browser tests use installed Edge so no browser download is needed on this Windows project. A real iOS device is not covered. On another OS, select an available browser channel in `playwright.config.ts` (or install Chromium with `npx playwright install chromium` and remove `channel`). The test-server command uses Node directly and works across platforms.

## What works

- Responsive branded shell, original SVG seal, reusable accessible `HexBadge`, local PT Serif / PT Sans fonts with Cyrillic and Latin subsets.
- React Flow pan/zoom, fit, reset, minimap, vertical portrait cards with 4:5 monogram fallback, selected and focused states, and a constant-size selected-node toolbar.
- Real ELK layout behind a `LayoutService` adapter; `GraphProjectionService` keeps visual hubs separate from canonical people and relationships.
- Whole tree and focused connected-network view, with no generational cap. Separate selection, focus, viewport, and reserved collapse state.
- Person and relationship inspectors, searchable person picker (`Ctrl+K` / `⌘K`), full read-only profile preview (`#/person/:id`), and relative-add menu preview.
- Selecting a person preserves layout, focus and viewport. Profile navigation keeps the graph mounted and preserves the view. Focus is an explicit action (`F`), distinct from selection.
- All populated facts are derived from shared event/place records; absent details and empty profile sections are omitted.
- Keyboard-operable cards, toolbars and hubs, native modal focus trapping, Escape dismissal, visible focus rings, reduced-motion styling, and mobile inspector bottom sheet.

The invented fixture contains 11 people: parents with two children, a person with two partners, separate children from those relationships, adoptive parentage, a child with one known parent, and an unconnected person. Parentage never implies marriage. A child is never assigned to every partner of a parent.

## Prototype defaults and limits

One active demonstration archive, Cyrillic UI, whole-tree view, Nikola as the initial central/selected person, monograms instead of invented portrait photos. The inspector starts open on desktop and closed on screens up to 850px; selecting a person opens it. Disconnected people are on the canvas and in an accessible shortcut list. Tree UI state lasts for the current session, including profile navigation; reload resets the demo.

**No data persistence is implemented.** The banner and dialogs explicitly say so. Relative creation, editing, undo/redo, places/events/media workspaces, settings and backup are future features. These controls are disabled or open an explanation; they never imply an edit was saved. The search picker provides the prototype person-directory interaction.

All runtime assets are bundled locally. No backend, account, analytics, remote fonts, geocoding, or family-data upload. A local static server is still needed to load the app; service-worker installation and offline shell caching belong to Milestone 5. This milestone does not promise an installed PWA or cold-start offline hosting.

Branch-collapse controls, semantic zoom, delayed hover cards, incremental layout and large-archive optimization belong to later graph work. `collapsedBranches` is reserved independent UI state and is not yet applied by projection. ELK is currently bundled separately (~1.46 MB minified / ~452 KB gzip); Vite reports its size as a build warning. Layout runs asynchronously with an error/retry state; worker-based layout is a future optimization.

## Structure / added files

The initial repository contained only the two specification Markdown files and `.git`.

```text
index.html, package.json, package-lock.json, .gitignore
tsconfig*.json, vite.config.ts, playwright.config.ts
public/
  seal.svg                       original brand seal / favicon
  licenses/                      local font licenses, copied into dist
src/
  main.tsx                       entry point and local font imports
  app/App.tsx, uiState.ts         shell, hash navigation, independent UI state
  components/                    BrandMark, HexBadge, Portrait, Modal
  domain/                        model, derived person facts/search, fixture
  graph/                         projection, ELK adapter, nodes, edges, actions
  features/tree/                 workspace, inspectors, profile, dialogs
  styles/                        design tokens and responsive styles
  tests/                         projection/layout and component tests
e2e/browsing.spec.ts              desktop/mobile browsing tests
```

## Next milestones

1. Milestone 2: expand canonical types and validation; Dexie repositories and migrations; transactional commands, undo/redo, real create/update/link operations, and reload persistence.
2. Milestone 3: profile editing, delayed hover cards, branch collapse and semantic zoom; preserve the existing selection/focus/viewport invariants.
3. Milestones 4–5: normalized events/places/media workflows, Blob handling, ZIP/JSON backup/import validation, then PWA offline shell and scale/accessibility hardening.

Technical references: [React Flow NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar), [custom handles](https://reactflow.dev/learn/customization/handles), [ELK integration](https://reactflow.dev/examples/layout/elkjs), [Vite guide](https://vite.dev/guide/).
