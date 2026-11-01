# BelaPčela

A local-only genealogy app: a family museum in Serbian Cyrillic. **Milestones 1 and 2 are implemented**, including the requested larger canvas, Петронић demo family, and dark theme. Product decisions follow `BelaPcela_Product_Spec_v0_5.md`; the original kickoff remains the record of the first iteration.

## Run

Use Node.js 22.12+ (verified with Node 24) and npm. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test          # domain rules, IndexedDB transactions/history, layout, components, contrast
npm run build    # strict TypeScript check + production bundle in dist/
npm run preview  # serve the production bundle locally
npm run test:e2e # installed Microsoft Edge; desktop and mobile Chromium emulation
```

The browser tests use installed Edge so no browser download is needed on this Windows project. A real iOS device is not covered. On another OS, select an available browser channel in `playwright.config.ts` (or install Chromium with `npx playwright install chromium` and remove `channel`). The test-server command uses Node directly and works across platforms.

## What works

- Compact responsive shell with the canvas directly below the tree controls, original SVG seal, reusable accessible `HexBadge`, and bundled PT Serif / PT Sans fonts.
- Light and dark botanical themes. The first visit follows the system preference; the sun/moon control saves an explicit choice in localStorage before the next page paint.
- React Flow pan/zoom, fit, reset, minimap, vertical portrait cards with 4:5 monogram fallback, selected and focused states, and a constant-size selected-node toolbar.
- Real ELK layout behind a `LayoutService` adapter; `GraphProjectionService` keeps visual hubs separate from canonical people and relationships.
- Whole tree and focused connected-network view, with no generational cap. Separate selection, focus, viewport, and reserved collapse state.
- Person and relationship inspectors, searchable person picker (`Ctrl+K` / `⌘K`), and full profile pages (`#/person/:id`).
- Add a person from the picker, or edit a selected person from the inspector/profile. All biographical fields are optional; reveal additional fields with `Додај податак`. Basic editing covers name, nickname, occupation, biography and birth/death years. Dates stay in shared event records, and clearing a year preserves an existing place reference.
- Add a parent, child, partner, or sibling: create a new person or search/link an existing person, choose the relationship details, review, and explicitly confirm. Another parent is always a separate blank-by-default choice. Siblings can be asserted directly without inventing parents; a partner link does not imply marriage.
- Transactional IndexedDB working store through Dexie. Zod validation rejects malformed records, invalid references, duplicate links, self-parentage and ancestry cycles. Stable UUIDs, record timestamps, preserved record order, schema version 1, and refusal to overwrite unsupported data versions.
- Save indicators reflect committed transactions. Failed writes retain the form and leave committed data unchanged. Revision checks prevent a stale window from overwriting newer data; reload from within the form to retain your draft and retry. Editors send only changed fields.
- Undo/redo through domain commands (`Ctrl+Z` / `Ctrl+Shift+Z`, or `⌘` on macOS). Text inputs keep native text undo. Up to 50 whole commands are retained in this page session; history resets on page reload or explicit archive refresh. Committed archive data persists across reloads.
- Selecting a person preserves layout, focus and viewport. Scalar edits do not rerun layout; structural changes preserve the selected/focused person's screen anchor and zoom when possible. Profile navigation keeps the graph mounted. Focus is an explicit action (`F`), distinct from selection.
- All populated facts are derived from shared event/place records; absent details and empty profile sections are omitted.
- Keyboard-operable cards, toolbars and hubs, native modal focus trapping, Escape dismissal, visible focus rings, reduced-motion styling, and mobile inspector bottom sheet.

The invented fixture contains 11 people: parents with two children, a person with two partners, separate children from those relationships, adoptive parentage, a child with one known parent, and an unconnected person. Parentage never implies marriage. A child is never assigned to every partner of a parent.

## Prototype defaults and limits

One active archive, Cyrillic UI, whole-tree view, Nikola as the initial central/selected person, and monograms instead of invented portrait photos. An invented 11-person Петронић fixture is seeded once on first use, never over an existing archive. The inspector starts open on desktop and closed on screens up to 850px; selecting a person opens it. Disconnected people appear on the canvas and in an accessible shortcut list. Tree UI state lasts for this page session, including profile navigation; reload resets the viewpoint while preserving archive data and theme.

**Archive data is local to this browser profile and origin** (host and port). Keep using the same local URL to access it. Clearing site data or deleting the browser profile can erase the archive. ZIP/JSON backup and import are not implemented yet; the UI labels them as coming later. The app never claims that a server backup exists. If IndexedDB is blocked or unreadable, editing is blocked with a retry message instead of silently falling back to an unsaved demo.

Places/events/media workspaces, file uploads, richer profile fields, relationship editing/deletion, settings and archive portability remain future milestones. The search picker provides the current person-directory interaction. Basic editing is designed for desktop; mobile uses a bottom sheet and responsive dialogs. The initial persistence schema is version 1; future versions must add Dexie upgrades and corresponding migration tests.

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
  app/                           shell, routing, archive lifecycle, theme, UI state
  components/                    BrandMark, HexBadge, Portrait, Modal
  domain/                        model, Zod validation, derived facts, fixture
  storage/                       versioned Dexie schema and transactional repository
  services/                      pure commands and bounded session undo/redo
  graph/                         projection, ELK adapter, nodes, edges, actions
  features/tree/                 workspace, inspectors, profile, picker, notices
  features/people/               person editor and relative create/link/review flow
  styles/                        design tokens and responsive styles
  tests/                         domain/storage, projection, component/contrast tests
e2e/                             desktop/mobile browsing, editing and reload tests
```

## Next milestones

1. Milestone 3: richer profile editing, delayed hover cards, branch collapse and semantic zoom; preserve the existing selection/focus/viewport invariants.
2. Milestones 4–5: normalized events/places/media workflows, Blob handling, ZIP/JSON backup/import validation, then PWA offline shell and scale/accessibility hardening.

Technical references: [React Flow NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar), [ELK integration](https://reactflow.dev/examples/layout/elkjs), [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()), [Dexie upgrades](https://dexie.org/docs/Version/Version.upgrade()), [Zod schemas](https://zod.dev/api).
