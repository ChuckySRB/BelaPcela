# BelaPčela

A local-only genealogy app: a family museum in Serbian Cyrillic. **Milestones 1–3 are implemented**, including the requested larger canvas, Петронић demo family, and dark theme. Product decisions follow `BelaPcela_Product_Spec_v0_5.md`; the original kickoff remains the record of the first iteration.

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
- Whole tree and focused connected-network view, with no generational cap. Separate selection, focus, viewport, and working branch-collapse state.
- Click a family junction to inspect the relationship, then choose `Сакриј потомке`. A `+` badge with a hidden-person count expands it; `Прикажи све гране` clears all folds. Collapse affects recorded descendants only, keeps the focused person and their ancestry visible, preserves nested choices and unique counts, and never changes canonical data. Node positions remain stable, so folding can leave space in the map. Collapse state survives profile navigation and graph-mode changes for this page session.
- Semantic zoom: ordinary cards show full detail at 80%+, short names at 45–80%, and monogram markers below 45%. Selected/focused people keep full detail. Node geometry stays constant, with no relayout or remount on zoom. Family junction buttons keep 44px on-screen targets.
- Hover a portrait for a delayed 275ms summary, with 220ms to travel into it. The selected-node eye button opens the same preview by keyboard or click. Escape dismisses it without closing the inspector; touch browsing uses the inspector. Panning/zooming or opening a modal dismisses previews.
- Person and relationship inspectors, searchable person picker (`Ctrl+K` / `⌘K`), and full profile pages (`#/person/:id`).
- Add a person from the picker, edit from the inspector, or choose `Измени профил` for the inline full-page editor. All biographical fields are optional; reveal fields with `Додај податак` and repeatable groups with `Додај одељак`. Save explicitly to commit; cancel discards the draft.
- Profiles include name, nickname, maiden surname, alternative names, primary occupation plus occupation history, biography, birth/death years with approximation, multiple contacts/links, custom named facts and an identity note. Promoting an alternative name or occupation preserves the previous primary value. The preferred-photo selector appears when existing media is available; uploads belong to Milestone 4.
- Reading mode omits empty sections and presents a chronological life/occupation timeline, structured facts, contacts, places and linked family. Search also checks alternative names and maiden surname. Birth/death years stay in shared event records; clearing a year preserves an existing place reference.
- Add a parent, child, partner, or sibling: create a new person or search/link an existing person, choose the relationship details, review, and explicitly confirm. Another parent is always a separate blank-by-default choice. Siblings can be asserted directly without inventing parents; a partner link does not imply marriage.
- Transactional IndexedDB working store through Dexie. Zod validation rejects malformed records, invalid references, duplicate links, self-parentage and ancestry cycles. Contact websites/social links require http/https without embedded credentials; email and occupation ranges are validated. Stable UUIDs, record timestamps, preserved record order, schema version 2, and refusal to overwrite unsupported data versions.
- Save indicators reflect committed transactions. Failed writes retain the form and leave committed data unchanged. Revision checks prevent a stale window from overwriting newer data; reload from within the form to retain your draft and retry. Editors send only changed fields.
- Undo/redo through domain commands (`Ctrl+Z` / `Ctrl+Shift+Z`, or `⌘` on macOS). Text inputs keep native text undo. Up to 50 whole commands are retained in this page session; history resets on page reload or explicit archive refresh. Committed archive data persists across reloads.
- Selecting a person preserves layout, focus and viewport. Scalar edits do not rerun layout; structural changes preserve the selected/focused person's screen anchor and zoom when possible. Profile navigation keeps the graph mounted. Focus is an explicit action (`F`), distinct from selection.
- Birth/death date and place displays derive from shared event/place records; absent details and empty profile sections are omitted.
- Keyboard-operable cards, toolbars and hubs, native modal focus trapping, Escape dismissal, visible focus rings, reduced-motion styling, and mobile inspector bottom sheet.

The invented fixture contains 11 people: parents with two children, a person with two partners, separate children from those relationships, adoptive parentage, a child with one known parent, and an unconnected person. Parentage never implies marriage. A child is never assigned to every partner of a parent.

## Prototype defaults and limits

One active archive, Cyrillic UI, whole-tree view, Nikola as the initial central/selected person, and monograms instead of invented portrait photos. An invented 11-person Петронић fixture is seeded once on first use, never over an existing archive. The inspector starts open on desktop and closed on screens up to 850px; selecting a person opens it. Disconnected people appear on the canvas and in an accessible shortcut list. Tree UI state lasts for this page session, including profile navigation; reload resets the viewpoint while preserving archive data and theme.

**Archive data is local to this browser profile and origin** (host and port). Keep using the same local URL to access it. Clearing site data or deleting the browser profile can erase the archive. ZIP/JSON backup and import are not implemented yet; the UI labels them as coming later. The app never claims that a server backup exists. If IndexedDB is blocked or unreadable, editing is blocked with a retry message instead of silently falling back to an unsaved demo.

Places/events/media workspaces, file uploads, relationship editing/deletion, settings and archive portability remain future work. The search picker provides the current person-directory interaction. Editing is designed primarily for desktop; mobile uses a bottom sheet, responsive dialogs and a stacked profile. Schema version 2 includes a tested additive upgrade from version 1: archive revision advances and existing people, dates, relationships, timestamps and record order are preserved. Future versions must keep adding explicit upgrades and migration tests.

All runtime assets are bundled locally. No backend, account, analytics, remote fonts, geocoding, or family-data upload. A local static server is still needed to load the app; service-worker installation and offline shell caching belong to Milestone 5. This milestone does not promise an installed PWA or cold-start offline hosting.

Incremental/worker-based layout, virtualization and full large-archive performance hardening remain future optimizations. Projection tests include 1,000 connected generations with no depth cutoff. ELK is bundled separately (~1.46 MB minified / ~452 KB gzip); Vite reports its size as a build warning. Layout runs asynchronously with an error/retry state. Direct profile links defer the initial graph fit until returning to the visible tree.

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
  graph/                         projection, branch visibility, ELK, zoom, hover cards
  features/tree/                 workspace, inspectors, profile, picker, notices
  features/people/               inline/modal editor, profile sections, relative flow
  styles/                        design tokens and responsive styles
  tests/                         domain/storage, projection, component/contrast tests
e2e/                             desktop/mobile browsing, editing and reload tests
```

## Next milestones

1. Milestone 4: richer shared events and reusable places, offline place picking, local media Blobs, thumbnails and galleries.
2. Milestone 5: ZIP/JSON backups, import validation and migrations, PWA offline shell, then scale and accessibility hardening.

Technical references: [React Flow NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar), [ELK integration](https://reactflow.dev/examples/layout/elkjs), [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()), [Dexie upgrades](https://dexie.org/docs/Version/Version.upgrade()), [Zod schemas](https://zod.dev/api).
