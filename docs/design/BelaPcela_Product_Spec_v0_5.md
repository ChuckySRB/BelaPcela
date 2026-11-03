# БелаПчела — Product, UX & Design Specification v0.5

Design reference and original milestone plan. The [README](../../README.md) and [user guide](../USER_GUIDE.sr.md) describe the released application and its supported scope.

> A local-first Serbian-language family genealogy web application designed as a modern family museum. This document is the product/design source of truth for implementation in Codex. The public project name is **БелаПчела** (retain Cyrillic spelling and capitalization, as confirmed on 2026-11-02). Internal code identifiers use English; UI copy defaults to Serbian Cyrillic.

## 0. Confirmed product decisions

- Offline-capable, **local-only** web app. No backend, login, account, cloud synchronization, analytics trackers, or sending personal family data to a server.
- React + TypeScript + Vite; React Flow (`@xyflow/react`) to render and interact with graph; ELK.js for graph layout, with a genealogy-specific graph projection layer in between.
- IndexedDB through Dexie is the canonical **working store** for data and image/file Blobs. Autosave on meaningful edits. A portable, versioned **ZIP backup** with JSON + relative media paths is the canonical archive exchange format. Plain JSON export supported but clearly labelled **data only** unless files are included separately.
- Two graph modes: **Whole tree** and **Focused**. Focused mode is **not limited by number of generations**; it includes the connected family network, subject to explicit user collapse state and rendering optimization, not generational cutoffs.
- Keep `selectedPersonId`, `focusPersonId`, graph `viewport`, and `collapsedBranches` as independent UI state. Selecting does not automatically refocus, recompute layout, or reset zoom.
- Three information layers: portrait node -> brief hover/card or persistent right inspector -> full person page.
- All biographical details optional. In reading mode, omit empty fields and sections. In edit mode, offer `+ Додај податак` to reveal new fields.
- **Portrait card** (vertical museum photo) is the chosen primary node shape. Hexagons are distinctive functional details; **never change full portrait cards into hexagons**.
- Places, life events, relationships, sources, and media are first-class reusable objects. Place is not a free-form string repeated across people.
- Product name: **БелаПчела**; not the older working name “Живи архив”.

## 1. Creative direction: living genealogical museum + honeycomb

The experience evokes a carefully kept family album, old archive paper, understated botanical greens and brass details, but with modern, fast, accessible interactions. Honeycomb is a design language for interconnection and inheritance, **not a bee-cartoon visual theme**. No gratuitous yellow/black stripes, clip-art bees, skeuomorphic wood, excessive parchment noise, or heavy animations.

**Brand meaning**: In Serbian folk usage, "беле пчеле" denotes distant descendants; the term originally comes from beekeeping. The UI can include a concise opt-in introduction to this story, not repeat the name explanation on every page. Avoid asserting a universally fixed number of genealogical generations because regional usages vary.

### Brand tokens (initial, subject to contrast checks)

```css
:root {
  --bp-forest: #244B3A;       /* logo, headings, active navigation */
  --bp-forest-deep: #19392D;
  --bp-sage: #728E77;         /* secondary details */
  --bp-brass: #B59052;        /* accents, focused person, family hubs */
  --bp-brass-light: #E7D9B7;
  --bp-paper: #F7F3EA;        /* app canvas */
  --bp-parchment: #EEE7D8;    /* alternate surfaces */
  --bp-card: #FFFCF5;
  --bp-ink: #273C30;
  --bp-text-muted: #675F52;
  --bp-border: #D4C7AE;
  --bp-danger: #A44242;
  --bp-radius-sm: 6px;
  --bp-radius-md: 10px;
  --bp-radius-lg: 16px;
  --bp-shadow-card: 0 3px 16px rgba(38,49,37,.09);
}
```

Do not use low-contrast brass as small text against paper. Verify WCAG AA contrast for functional labels, focus indicators, and inputs.

### Typography

- Display / person headings: **Literata** or **PT Serif**, with Serbian Cyrillic support. Fallback Georgia/serif.
- Controls / body: **Manrope** (Cyrillic subset) or **PT Sans**, fallback system sans.
- Load/bundle font assets locally for offline use; do not depend on a live Google Fonts request. Keep typography restrained (2 families max).
- Provide Cyrillic as default UI and accept Latin/Cyrillic person names as entered; don't transliterate stored names.

### Usage of hexagons

1. Brand mark: single hexagonal seal combining a minimal branching/lineage motif with fine brass line, not a detailed bee illustration.
2. **Family connection hubs**: small hexagonal junctions in partner/child graph projections. Hexagon is a visual grouping device, not proof of marriage.
3. **Expand/collapse** branch controls: small hexagonal chips with `+` / `−` and count, with generous hit areas.
4. Focused-person indicator: restrained brass hexagonal medallion near title/portrait.
5. Sidebar active icon background, empty states, onboarding motifs, gallery section separators (selectively).
6. Optional canvas dot/hex watermark only at very low opacity, never behind text at distracting density.

**Explicitly avoid:** turning all node cards into hexagons, hexagonal text inputs, hexagonal dialogs, honeycomb background on every panel, or decorative motifs that obscure relationship lines.

### Hexagon primitive

Build a reusable `<HexBadge>` that can display an icon, number, or state. Prefer SVG path/polygon for a crisp accessible outline or CSS `clip-path` for filled decorative shapes. It must expose an accessible label and a conventional rectangular touch target (at least 40-44px) when interactive. Provide variants: forest, brass, muted, outline.

## 2. App information architecture

### Main shell

- Top app bar: `БелаПчела` logotype, current archive name, global search (`Ctrl+K`), autosave status, undo/redo, export/backup, settings.
- Left compact vertical navigation (64-72px): `Стабло`, `Особе`, `Места`, `Догађаји`, `Архив`, `Подешавања`. Highlight active state with hex motif but keep icons conventional/readable.
- Center: infinite pan/zoom family canvas. Thin, optional honeycomb watermark or parchment-tint background. No boxed container around the entire graph.
- Right persistent inspector (360-400px): opens when clicking a person, relationship, place, or event; closes manually. Opening it must preserve graph layout and aim to keep selected node visible.
- Floating canvas controls: zoom in/out, fit visible, reset view, toggle minimap, whole/focused mode.
- Mobile: collapse left nav; a bottom sheet replaces right inspector. Prioritize read/browse and touch accessibility; graph editing is desktop-first.

### Routes / views

- `/tree`: whole/focused graph modes, panels and toolbar.
- `/people`: sortable/searchable directory of people.
- `/person/:id`: full person profile.
- `/places`: saved places list and map.
- `/place/:id`: place details, related events and people.
- `/events`: timeline / event browser.
- `/media`: asset library / photos and documents.
- `/settings`: archive metadata, local storage/backups, import/export, privacy/offline.

With client-side routing, use a strategy that remains reliable on static/offline hosting (e.g. hash routing or appropriate SPA fallback configuration).

## 3. Portrait person node design

**Base size:** approximately 172-184px wide and 190-215px high. Portrait area about 110-122px wide with 4:5 crop; person name wraps up to two lines; dates on a distinct muted line. Vertical card with subtle off-white paper, fine tan border, optional small brass divider, mild shadow. No occupation/location/phone in the base node; don't show placeholder `?–?` when dates are missing. When photo missing show textured monogram with initials, not a gender-assuming generic portrait. Photos must have natural cropping and accessible alternate text.

**States:** normal, hovered, selected (forest green outline), focused (small brass hex marker), keyboard focus, collapsed-branch summary, duplicate visual reference (explicitly marked, same underlying person ID), potentially unverified identity (small indicator and accessible textual explanation).

**Semantic zoom:**
- Near: portrait + full name + life dates, controls on selection.
- Medium: smaller portrait/monogram + short name; hide auxiliary labels.
- Far: avatar/monogram marker and edges, keeping selected/focused visible.
- Zoom thresholds are tunable and should avoid expensive remounting; keep keyboard access and hit targets usable.

**Hover:** 200-350 ms hover card with photo, name, nickname, dates, at most 2 lines from bio, places, occupation if populated; allows mouse travel into popup and can be dismissed. On click open persistent inspector, no auto-refocus. On double-click (desktop) open full profile; also include explicit profile button for accessibility. Touch tap selects, full profile explicit action.

**Node toolbar** (`NodeToolbar`): not always shown. On selected/focused node: `+` add relative, center/focus, `…` additional actions. Toolbar remains same on-screen size while zooming. Commands must have descriptive tooltips/aria-labels.

## 4. Relationships and graph behavior

### Model vs projection

Canonical graph is not a hierarchy. Represent person records once, and explicit parent-child relationships, partnerships, and optional kinship assertions. Do not infer that two parents were married, nor infer a child belongs to every partnership of a parent.

Graph projection can create **virtual hubs** for partner/child groups, rendered as little brass hexagons. These are visual nodes and are **never saved as persons**. More than one spouse/partner is supported. In complex cases multiple visual references for one Person may appear only if necessary for readability and are clearly marked as the same Person; all open a single profile.

Biological, adoptive and other parentage types must be distinguishable by line style **and** labels/inspector content, never color alone. If a sibling is known but parents are not, save a direct asserted relation rather than invent parents. Unconnected persons must remain valid records.

### Whole graph

Show all records/components within the chosen archive, including disconnected people as a separate accessible region or list. Preserve a stable global layout; long-term goal is to minimize needless movement after edits.

### Focused graph

When person P is focused, show all connected generations with **no depth cap**. Selection is separate from focus. Layout may change for a new focus, but no genealogical fact or unrelated node is discarded. User-collapsed branches remain collapsed; a collapsed branch badge shows hidden count. Large graphs use level of detail, virtualization, incremental rendering as appropriate. Avoid a hard-coded maximum of 2 or 3 generations.

### Graph interactions

- Drag canvas to pan, wheel/pinch to zoom, keyboard navigation where feasible.
- Click person -> select + persistent inspector, preserving viewport as much as possible.
- `F` when not typing -> focus selected person; `Ctrl+K` search; `Esc` dismiss; `Ctrl+Z`/`Ctrl+Shift+Z` undo/redo.
- Branch expand/collapse affects presentation only, not canonical data.
- Click a relationship edge or hub -> relationship inspector with type, participants, dates, linked events/media. A hub is not synonymous with marriage.
- Select/add relationship -> recompute affected layout, attempting to keep viewport anchor stable.
- Existing parent-child, partnership and direct kinship records can be edited or deleted from profiles and family inspectors. Edit shows a before/after review; deletion identifies one record and requires explicit acknowledgement. Keep people, other relationships, events and files; support transactional undo/redo and reject stale confirmations after another window changes the record. Never treat deleting a visual junction as deleting a whole family.
- `Fit all` encompasses rendered relevant graph, not the entire off-screen archive if in a filtered view.
- Avoid free dragging person nodes in regular view. Manual layout mode is deferred.
- Keep graph position/zoom/collapsed state when navigating to a profile and back.

### Flow of adding a relative

Select card -> `+` -> relationship type (`Родитељ`, `Дете`, `Партнер`, `Брат/сестра`, or custom/other) -> create new person OR search and link existing person -> minimal optional details -> confirm. For a child, allow other known parent selection but **never assume** current spouse is the other parent. Prevent self-ancestry cycles; warn about ambiguous/doubtful relationships; do not make unrequested guesses.

## 5. Profile design: a page in a family chronicle

### Layer 1: card

Vertical portrait node with name and dates only.

### Layer 2: hover / inspector

Quick summary, only populated data. Inspector includes photo, name(s), nickname, dates, occupation if any, birth/place if any, short biography, relations preview; actions `Отвори профил`, `Фокусирај`, `Додај сродника`, `Измени`.

### Layer 3: full profile

- Header: larger photo, name, nicknames, life dates and primary selected occupation, back-to-tree action and edit.
- Main column (~68%): biography, chronological life events, family memories, galleries, documents, evidence/source notes.
- Right column (~32%): structured facts, linked family, linked places, contacts/social links and quick actions.
- Hide empty sections in read view; offer `+ Додај податак` in edit view. No giant form full of blank fields.
- Shared `Event` is the source of birth/death date/place and chronicle data; no contradictory copies on profile fields.
- Fields: names and aliases including maiden surname, nicknames, occupations over time, multiple types of contact, websites/social, note/biography, customizable facts, tentative dates and uncertainty.
- Choose preferred name, photo and occupation independently of keeping alternatives.
- Related persons, events, places, and media have clickable detail pages. Return to exactly the previous tree viewpoint.

### Editor

Read/edit mode. Inline editing for scalar fields; modal or inspector for linked structured objects. Autosave after explicit commit or blur, not every keystroke. Show `Чување…`, `Сачувано`, or visible failed-save state. Undo/redo operates on domain commands.

## 6. Places, events and media

- `Place` reusable, stable-ID entity; name, alternative historical names, coordinates, optional textual address, type, parent place, description, media.
- Place picker: search saved places first; add a place by entering text, choosing from optional online geocoding, or clicking map; user can correct coordinates manually.
- `Event`: type, participants+roles, dates with precision/approximation/range, place reference, description, sources/media. Examples: birth, death, marriage, residence, migration, job, burial.
- Offline works for saved place names/coordinates. Online map/geocoding are optional; do not silently rely on network for basic place editing. Respect tile provider and geocoding usage policies.
- Media stored as Blobs in IndexedDB, separate metadata with ID and MIME type, original filename, tags, relations to multiple people/events/places, optional thumbnail. Preserve originals, generate optimized thumbnails. Validate file type and size; revoke object URLs when no longer needed.
- Future feature: clickable annotations of people in photographs; design data model so this is possible, but not in phase 1.

## 7. Data model / services

Core entities: `Person`, `ParentChildRelationship`, `Partnership`, `KinshipAssertion`, `Event`, `Place`, `Media`, `Source`. Join entities/links as required. Stable IDs, creation/update timestamps; schema versioning and migration support.

Core modules:

```text
src/
  app/                 # router, providers, shell
  domain/              # plain TS entities, validation, relation rules
  storage/             # Dexie schema, repositories, migrations, Blob operations
  services/            # commands, search, import/export, media
  graph/               # graph projection, ELK layout, nodes/edges
  features/
    tree/
    people/
    places/
    events/
    media/
    settings/
  components/          # shared UI / design system incl. HexBadge, PortraitNode
  styles/              # tokens, global styles, theme utilities
  tests/
```

Keep domain/data logic out of React components. `GraphProjectionService` transforms domain data and UI graph state into visual nodes/edges; `LayoutService` places them; React Flow only renders and handles interactions.

## 8. ZIP / JSON local-first integrity

- Working store: IndexedDB with transactional command operations; BLOB media persisted locally.
- Export: ZIP with `manifest.json` (format version, archive metadata), `family.json` (all normalized data, relationships and references), and `data/photos/`, `data/documents/`, `data/audio/`, `data/videos/` media files. All JSON media paths are **relative POSIX paths**, never local absolute filesystem paths or blob URLs.
- Plain `.json` export is **data-only**. UI must warn that photos/documents are excluded; ZIP is recommended for complete backups.
- Import validates schema and references, prevents ZIP path traversal, limits uncompressed sizes/counts, verifies media list and MIME types, and previews replace/new-archive options. Do not silently merge, overwrite, or drop duplicate data. Initial release: create/replace whole archive, with explicit confirmation.
- User must be told that clearing site data/browser profiles can delete IndexedDB. Provide explicit `Направи резервну копију` action and a visible backup reminder (no background server backup).
- Ask for persistent browser storage where supported; this is not a substitute for backups.
- PWA service worker for offline app shell; optional remote map tiles and search are not guaranteed offline. No telemetry by default.

## 9. Accessibility and performance

- Keyboard navigation to nodes and menus, hover card also operable by click, visible focus indicators, clear ARIA labels, escape to close, focus management in dialogs.
- Minimum ~44px target for touch controls; minimum readable text (avoid tiny metadata in production), WCAG AA for text and interactive elements; respect `prefers-reduced-motion`.
- Performance testing with 10, 100, 500, 1000+ people; expand/collapse without UI freezing. Large Blob galleries load thumbnails lazily.
- Unit tests: parent-child logic, ancestry cycles, unknown parents, multi-partner child groups, GEDCOM not needed in MVP, date precision, missing optional fields, import/export roundtrip including files.
- E2E UX tests: selecting does not refocus; viewport retained after opening profile and back; create relative/link existing; undo; autosave and browser reload; ZIP export/import; empty fields hidden.

## 10. Core component inventory

```text
AppShell
BrandMark / BrandWordmark
ArchiveTopBar
MainNavigation
GlobalSearchDialog
TreeWorkspace
TreeModeSwitch
GraphCanvas
PortraitPersonNode
FamilyHexHub
CollapseHexBadge
PersonNodeToolbar
RelationshipEdge
TreeFloatingControls
PersonHoverCard
ObjectInspector
PersonInspector
PersonProfilePage
DynamicFactsList / AddFactMenu
PersonRelationsPanel
LifeTimeline
EventEditor
PlacePicker / PlaceMap
MediaGallery / MediaPicker
ArchiveBackupDialog
ImportReviewDialog
AutosaveIndicator
HexBadge (shared motif)
```

## 11. Deliver iteratively (Codex must not attempt everything in one change)

### Milestone 1 — design shell + graph spike

Set up React/TS/Vite, theme tokens and local Cyrillic typography, branded shell, hex badge, museum portrait node, inspector, small fixture dataset. Integrate React Flow pan/zoom, simple relationship edges and ELK projection. Include fixture scenario with multiple partnerships and a child whose other parent is unknown. No fake data persistence in final interactions; a static demo is permitted during this spike if clearly labelled.

### Milestone 2 — canonical model + storage

Dexie IndexedDB, plain TypeScript domain types, Zod validation, command dispatcher, basic undo/redo, create/update/link person, reload persistence.

### Milestone 3 — profiles and graph interaction

Three viewing layers, edit mode, named optional fields, relationships, expanding/collapsing, focused graph with no depth cap, preserving viewport and inspector.

### Milestone 4 — events, places, files

Normalized places/events/links, place picking, media Blob import and thumbnails, gallery; optional external map integration with offline fallback.

### Milestone 5 — archive portability + hardening

ZIP data+media, plain data-only JSON, import preflight and schema migrations, PWA/offline shell, accessibility, keyboard interaction, testing on large datasets.

## 12. Acceptance criteria that must stay true

1. All person details other than IDs are optional; no empty fields or panels in reading mode.
2. Museum portraits are vertical; hexagonal motifs remain usable accents, family hubs, and branch controls, never the entire person card shape.
3. Selecting a person opens their inspector without resetting layout, focus, zoom or collapsed branches.
4. Focused view supports all connected generations, with no hard-coded depth cap.
5. Partner/child groupings model multi-partner families accurately and do not equate co-parenting with marriage.
6. Same person appears in domain data only once regardless of display duplication.
7. Place/media/event objects are reusable and shared without duplicating payloads.
8. Full ZIP backup round-trips both family data and original media files.
9. No app server, sign-up, remote data storage or analytics.
10. UI defaults to Serbian Cyrillic, brand is written **БелаПчела**.

## 13. References for implementers

- React Flow NodeToolbar: https://reactflow.dev/api-reference/components/node-toolbar
- React Flow custom handles: https://reactflow.dev/learn/customization/handles
- React Flow / ELK example: https://reactflow.dev/examples/layout/elkjs
- Ethnolinguistic term "Беле пчеле": https://www.politika.rs/sr/clanak/494886/Od-belog-orla-do-belih-pcela

## 14. Outstanding product questions (do not block milestone 1)

- Need multiple independent archives in one browser from day one, or a single archive with new/open workflow?
- Should JSON export include optional redaction of living people's contact details?
- Is application UI exclusively Serbian Cyrillic, or should Latin and English be toggleable later?
- Should unrelated family branches appear on the same canvas or in a selectable list of connected components?

Use sensible defaults in first prototype: one active archive, connected components accessible, Cyrillic UI, no sharing/public sync. Document the defaults rather than asking repeated clarification questions.
