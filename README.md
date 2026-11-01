# BelaPčela

A local-only genealogy app: a family museum in Serbian Cyrillic. **Milestones 1–4 are implemented**, including the requested larger canvas, Петронић demo family, and dark theme. Product decisions follow `BelaPcela_Product_Spec_v0_5.md`; the original kickoff remains the record of the first iteration.

## Run

Use Node.js 22.12+ (verified with Node 24) and npm. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test          # domain rules, IndexedDB/Blob integrity, migrations, layout, components
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
- Profiles include name, nickname, maiden surname, alternative names, primary occupation plus occupation history, biography, birth/death years with approximation, multiple contacts/links, custom named facts and an identity note. Promoting an alternative name or occupation preserves the previous primary value. Choose an uploaded photograph independently as a portrait; originals and alternative photos remain in the archive.
- Reading mode omits empty sections and presents a chronological life/occupation timeline, structured facts, contacts, places and linked family. Search also checks alternative names and maiden surname. Birth/death years stay in shared event records; clearing a year preserves an existing place reference.
- Add a parent, child, partner, or sibling: create a new person or search/link an existing person, choose the relationship details, review, and explicitly confirm. Another parent is always a separate blank-by-default choice. Siblings can be asserted directly without inventing parents; a partner link does not imply marriage.
- Transactional IndexedDB working store through Dexie. Zod validation rejects malformed records, invalid references, duplicate links, self-parentage and ancestry cycles. Contact websites/social links require http/https without embedded credentials; email and occupation ranges are validated. Stable UUIDs, record timestamps, preserved record order, schema version 3, and refusal to overwrite unsupported data versions.
- Save indicators reflect committed transactions. Failed writes retain the form and leave committed data unchanged. Revision checks prevent a stale window from overwriting newer data; reload from within the form to retain your draft and retry. Editors send only changed fields.
- Undo/redo through domain commands (`Ctrl+Z` / `Ctrl+Shift+Z`, or `⌘` on macOS). Text inputs keep native text undo. Up to 50 whole commands are retained in this page session; history resets on page reload or explicit archive refresh. Committed archive data persists across reloads.
- Selecting a person preserves layout, focus and viewport. Scalar edits do not rerun layout; structural changes preserve the selected/focused person's screen anchor and zoom when possible. Profile navigation keeps the graph mounted. Focus is an explicit action (`F`), distinct from selection.
- Birth/death date and place displays derive from shared event/place records; absent details and empty profile sections are omitted.
- Keyboard-operable cards, toolbars and hubs, native modal focus trapping, Escape dismissal, visible focus rings, reduced-motion styling, and mobile inspector bottom sheet.

The invented fixture contains 11 people: parents with two children, a person with two partners, separate children from those relationships, adoptive parentage, a child with one known parent, and an unconnected person. Parentage never implies marriage. A child is never assigned to every partner of a parent.

## Events, places and files

- **Догађаји** opens the searchable event browser. Create or edit a birth, death, wedding, residence, migration, work, burial or other event. Each record has participants with roles, an optional title/description, one reusable place and a date or period. A shared event appears on every participant's profile without duplicating the record or inferring family relationships.
- Date precision follows the supplied year/month/day; approximation and start/end periods are supported. Invalid calendar dates, reversed periods and duplicate birth/death subjects are rejected. Only the subject's birth/death supplies their life years. The profile's quick year editor preserves existing month/day/range data and validates the result; clearing a year keeps the event ID and its other information/links.
- **Места** opens the reusable place atlas. Add names, historical/alternative names, an address, type, parent place, notes and optional latitude/longitude. The offline coordinate grid supports pointer and arrow-key selection, with numeric fields for correction. It deliberately has no street-map/tile background or online geocoder and makes no external requests. Saved-place search checks historical names. A new place can also be created inside an event and committed in the same transaction.
- Event/place detail pages link to participants, related events, places and galleries. Navigating away from the tree and back preserves its current selection, focus, collapse state and viewport.
- **Архив** opens the media library. Import JPEG, PNG, WebP, GIF, PDF, TXT, MP3, OGG, WAV, MP4 or WebM. Limits: 25 MB/file, 20 files and 100 MB per batch; decoded images must be at most 40 megapixels. Content signatures are checked against MIME types, images must decode successfully, and unsupported active formats such as HTML/SVG are rejected. Browser codec support determines audio/video playback.
- Original bytes and generated image thumbnails live in the separate IndexedDB `mediaFiles` table; plain archive snapshots contain metadata and stable links only. Image thumbnails are at most 320px on the longest side. File and metadata writes commit together, including rollback on failure. Undo removes the metadata/link command but retains original bytes for redo; garbage collection is deferred.
- Link a file to multiple people/events/places during upload or with `Измени опис и везе`. Captions, tags, search/type filters, profile/event/place galleries and portrait selection all reuse that one stored file. Thumbnails load as they approach the viewport; temporary object URLs are revoked when no longer needed. Full originals load only in the file view and remain downloadable unchanged. Text previews show up to the first 100,000 bytes; PDFs have an original-download action rather than an embedded viewer. Existing source records/links are retained, with a dedicated source editor still deferred.
- `Затражи трајније чување` requests browser storage persistence where supported. This does not replace backups or prevent the user from clearing site data.

## Prototype defaults and limits

One active archive, Cyrillic UI, whole-tree view, Nikola as the initial central/selected person, and monograms instead of invented portrait photos. An invented 11-person Петронић fixture is seeded once on first use, never over an existing archive. The inspector starts open on desktop and closed on screens up to 850px; selecting a person opens it. Disconnected people appear on the canvas and in an accessible shortcut list. Tree UI state lasts for this page session, including profile navigation; reload resets the viewpoint while preserving archive data and theme.

**Archive data is local to this browser profile and origin** (host and port). Keep using the same local URL to access it. Clearing site data or deleting the browser profile can erase the archive. ZIP/JSON backup and import are not implemented yet; the UI labels them as coming later. The app never claims that a server backup exists. If IndexedDB is blocked or unreadable, editing is blocked with a retry message instead of silently falling back to an unsaved demo.

Relationship editing/deletion, dedicated source editing, settings, online map integration, photo annotations and archive portability remain future work. The search picker provides the current person-directory interaction. Editing is designed primarily for desktop; mobile uses a bottom sheet, responsive dialogs and stacked details. Tested upgrades cover version 1 → 2 → 3: previous people/dates/places/relationships/timestamps/order are preserved; old single-person events become participant-based records with the same IDs. Future versions must keep adding explicit upgrades and migration tests.

All runtime assets are bundled locally. No backend, account, analytics, remote fonts, geocoding, or family-data upload. A local static server is still needed to load the app; service-worker installation and offline shell caching belong to Milestone 5. This milestone does not promise an installed PWA or cold-start offline hosting.

Incremental/worker-based layout, further code splitting, virtualization and full large-archive performance hardening remain future optimizations. Projection tests include 1,000 connected generations with no depth cutoff. Vite reports size warnings for the application bundle and the separate ELK bundle (~1.46 MB minified / ~452 KB gzip). Layout runs asynchronously with an error/retry state. Direct detail links defer the initial graph fit until returning to the visible tree.

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
  storage/                       versioned Dexie schema, transactions, original Blobs
  services/                      commands, undo/redo, MIME validation and thumbnails
  graph/                         projection, branch visibility, ELK, zoom, hover cards
  features/tree/                 workspace, inspectors, profile, picker, notices
  features/people/               inline/modal editor, profile sections, relative flow
  features/events/               shared event browser, details and editor
  features/places/               offline atlas, place editor and coordinate picker
  features/media/                local gallery, upload/editor, viewer, URL lifecycle
  styles/                        design tokens and responsive styles
  tests/                         domain/storage, projection, component/contrast tests
e2e/                             desktop/mobile browsing, editing and reload tests
```

## Next milestones

1. Milestone 5: ZIP/JSON backups, import validation and migrations, PWA offline shell, then scale and accessibility hardening.

Technical references: [React Flow NodeToolbar](https://reactflow.dev/api-reference/components/node-toolbar), [ELK integration](https://reactflow.dev/examples/layout/elkjs), [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()), [Dexie upgrades](https://dexie.org/docs/Version/Version.upgrade()), [storage persistence](https://dexie.org/docs/StorageManager), [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [object URL cleanup](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static).
