# Development

## Toolchain

Use Node.js 24 (`.nvmrc`) and npm with the committed lockfile. Node.js 22.13 or newer within the 22.x line is also supported; the test environment requires the 22.13 minimum. On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked.

```sh
npm ci
npm run check
```

`check` runs Vitest, verifies generated license notices, type-checks the application/tooling and builds `dist/`. It does not start a server. `npm run dev` starts the loopback-only Vite development server when you want to work interactively. `npm run preview` serves an existing build for local inspection; it is not a production hosting service.

No environment variables, API keys, database server or backend process are required. All runtime assets are local. Development mode deliberately does not install the service worker.

## Tests

| Command | Coverage | Starts a test server? |
| --- | --- | --- |
| `npm test` | Domain rules, components, storage/Blob integrity, migrations, transfers, projection and scale | No |
| `npm run build` | Notices, strict TypeScript and production bundle | No |
| `npm run test:static` | Production tree, themes, empty collection, first person, reload, collection switch and About on desktop/mobile | No; build first |
| `npm run test:e2e` | Desktop/mobile browsing, forms, relationships, collection workflows, media, backups and accessibility | Yes, Vite on port 5173 |
| `npm run test:offline` | Production cold-offline workflows and explicit app updates | Yes, preview on port 4173; build first |

Browser suites use installed Microsoft Edge on Windows, and Playwright Chromium on Linux/macOS. For Chromium, install the test browser after `npm ci`:

```sh
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:offline
```

For a browser check without a listening server, build and run `npm run test:static`. Playwright fulfills requests to a synthetic HTTPS origin directly from `dist/`, in a disposable browser context. It writes screenshots under `test-results/static-smoke/`. This smoke check blocks service workers; the dedicated offline suite covers their real lifecycle and cache/update behavior.

On a Linux test runner, `npx playwright install --with-deps chromium` can install required browser system libraries. To select a different installed Chromium channel, set `PLAYWRIGHT_CHANNEL=msedge` or `chrome` using your shell's environment syntax. Mobile cases emulate an iPhone-sized Chromium browser; they do not run Safari.

Tests use invented records in isolated browser profiles/databases. Never point automation at a profile with a real family archive. Screenshots and failure traces go to ignored `test-results/` and `test-results-offline/` folders.

## Continuous checks

[Checks](../.github/workflows/checks.yml) runs unit tests and production builds on Linux with Node 22 and 24 for pull requests and pushes to `master`/`main`. A manual workflow run can additionally enable desktop/mobile and offline browser regression tests. This workflow has read-only repository permission and no deployment or release-publishing steps.

## Structure

```text
src/app/              shell, hash routing, archive hook, theme, UI state, offline status
src/domain/           canonical types, validation, dates, profile and relationship rules
src/storage/          Dexie schema, migrations, repository, atomic Blob persistence
src/services/         command history, media preparation, versioned ZIP/JSON transfers
src/graph/            projection, virtual family hubs, ELK worker, nodes and edges
src/features/         people, tree, relationships, events, places, media and settings
src/components/       shared controls, portraits, native modal, error recovery
src/styles/           light/dark tokens and responsive layout
src/tests/            unit, component, storage, integrity and scale tests
e2e/                  isolated desktop/mobile and production offline browser tests
build/offlineShell.ts production shell precache and explicit-update worker
scripts/              icon generation and dependency notice generation
public/               original seal/icons, manifest and license texts
docs/design/          product/design constraints and historical kickoff
```

React and TypeScript own the application UI, React Flow renders a projected graph, and ELK places it in a worker. Dexie wraps IndexedDB; Zod validates canonical records; fflate handles bounded portable archives. Graph coordinates and family hubs never become canonical genealogy records.

## Data and command rules

- People, relationships, events, places, sources and media metadata use stable IDs. Original Blobs live separately from normalized records. Shared links reference the same record/file.
- Person details remain optional. Date/place facts derive from shared events. Parentage, partnership and direct kinship are independent, explicit facts. Do not infer a marriage, parent or sibling from an unrelated link.
- Mutations use `ArchiveCommand` and `CommandDispatcher`. `ArchiveRepository.commit` validates and persists a whole transaction, with expected collection ID/revision and rollback on any failure. Save indicators follow transaction completion.
- Relationship confirmations also carry a reviewed-record fingerprint. A refreshed changed record must be reviewed again; deletion acknowledgement must reset. Failed forms retain drafts.
- Undo/redo retains at most 50 session commands. Original Blobs may outlive undone metadata for redo. Import, new/switch collection and explicit refresh reset history; committed records persist.
- Selection, focus, branch collapse and viewport are independent UI state. Scalar edits should not rerun layout. Structural edits preserve the selected/focused screen anchor where possible. Profile navigation keeps the graph mounted.

### Compatibility and migrations

Normalized schema **3**, IndexedDB database version **4**, portable archive format **1**. See [archive format](../ARCHIVE_FORMAT.md) for the wire format and strict limits. Keep ASCII database names, cache keys and the `BelaPcela` archive marker stable even though public branding is Cyrillic.

Any future schema change needs an explicit migration and tests preserving optional fields, IDs, timestamps, ordering, references and original bytes. Unknown future schemas must fail without overwriting data. A graph/UI change alone does not justify a schema bump.

### Offline assets

The custom Vite build plugin precaches build output and an explicit public-asset list. Add new public runtime assets to that list; include their contents in the cache hash. Personal data stays in IndexedDB and must never enter service-worker caches. Updates wait for explicit activation after a draft is saved.

## Licenses and assets

`npm run licenses` regenerates [full notices](../public/licenses/THIRD_PARTY_NOTICES.txt) from the installed, locked production dependency tree. It checks installed versions and includes actual license/NOTICE files, source locations and the application's MIT text. Commit regenerated notices after changing dependencies; `prebuild` rejects outdated notices. Fonts also retain their original OFL files. The About dialog links to the bundled notices, including offline.

The brand seal is a repository-native SVG; install icons can be regenerated with `node scripts/generate-icons.mjs` (requires the installed Edge executable used by that Windows helper). The existing PNGs are committed, so normal builds on Linux do not run that script. Documentation screenshots contain only the invented fixture family.

## Known limitations

- ELK's generated distribution exceeds Vite's default chunk warning threshold. Layout runs in a worker; the large library remains a build-size warning.
- Large graphs use visible-element rendering. Safe forests over 250 nodes use ELK's tree strategy; complex multi-parent networks retain layered layout and may take longer. Scale coverage includes 10/100/500/1,200 people and a 1,000-generation traversal, not an unlimited performance guarantee.
- Chromium can report a nonfatal ResizeObserver delivery warning during a large initial fit. Do not globally suppress real UI errors to hide it.
- Transfers are bounded in-memory operations, not a streaming archive system. Browser quotas vary. Undo-related Blob garbage collection is deferred.
- Source editing, deletion of nonrelationship records/collections, GEDCOM, photo annotations and online maps are outside v1. The current person picker searches all people and pages results; a sortable directory is deferred.
- Accessibility checks and Chromium emulation complement but do not replace real Safari/iOS and assistive-technology testing.

For a later self-hosting session, use the [server handoff](SERVER_HANDOFF.md). Build/test scripts do not deploy anything.
