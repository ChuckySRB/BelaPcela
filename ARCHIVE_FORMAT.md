# БелаПчела portable archive, format 1

The portable format version is independent of the normalized data schema (currently 3) and IndexedDB database version (currently 4). Unknown versions are rejected. All documents use UTF-8. Every export is local; it requires no account or server.

The public application name is **БелаПчела**. The stable `BelaPcela` format marker identifies compatible existing backups; exported download filenames use the public Cyrillic name.

## Full ZIP

```text
manifest.json
family.json
data/photos/media-000001.png
data/documents/media-000002.txt
data/audio/...
data/videos/...
```

`manifest.json` has exactly `format: "BelaPcela"`, `formatVersion: 1`, `dataSchemaVersion: 3`, `exportedAt` (ISO UTC), `kind: "full"`, `archive` (the collection ID and name), and `files`. Each file entry contains `mediaId`, `path`, `mimeType`, `size` (bytes), and lowercase hexadecimal `sha256`. `family.json` has `dataSchemaVersion` and `archive`, containing every normalized collection and metadata record. Media metadata has no `src`, absolute filesystem path or Blob URL. Original filename stays in the media record, while generated ASCII ZIP paths avoid unsafe user-supplied filenames. File list entries map paths to stable media IDs.

One media record can link multiple people/events/places/sources; its original is included once. Preferred portraits reference that same ID. Only referenced original Blobs are exported; thumbnails and undo-orphaned Blobs are excluded. Thumbnails regenerate during preflight. A missing original fails full export with an explanation; the data-only option remains available. CRCs/checksums detect damage or mismatched files, not the identity of the archive's author.

## Data-only JSON

The standalone envelope contains `format`, `formatVersion`, `dataSchemaVersion`, `exportedAt`, `kind: "data-only"` and `archive`. All normalized records remain, including media metadata and links; all payloads and legacy `src` values are excluded. It cannot restore original files. Import review explicitly warns about this, and metadata with missing originals remains visible. A full ZIP is the complete backup format. Raw unversioned objects, GEDCOM and arbitrary third-party ZIPs are unsupported.

## Preflight and persistence

1. Bound input size before reading it. Check ZIP central/local headers, unique permitted paths, compression method, encryption/multidisk/ZIP64/symlink restrictions and declared limits before inflation.
2. Inflate in chunks, count actual output and validate CRCs. Reject truncated, overlapping or unsafe entries. Decode and strictly validate JSON envelopes; preserve IDs, timestamps, order, Unicode names and optional fields.
3. Migrate known schema 1/2 single-person events to schema 3 participant-based events, keeping event IDs. Validate the entire domain, including references, relationships, cycles, dates, portraits and shared media links. Unknown future schemas fail closed.
4. Require exactly one listed original for every full-ZIP media record. Check list uniqueness, file lengths, SHA-256, metadata MIME, content signatures and image decode/pixel limits. Generate local thumbnails. No unlisted entries are accepted. Relative paths are confined to the documented folders; no archive entry is written to the host filesystem.
5. Show counts and warnings. Default to a new collection; replacement requires explicit acknowledgement and confirmation. No silent merging. Review makes no persistent changes.
6. Confirm against the current collection ID and revision. Write metadata, all collections, original Blobs and the active collection preference atomically. On any failure, retain the old data and review. A new collection gets a new outer archive ID while keeping entity IDs; a replacement keeps the current outer archive ID. Switching/importing clears page-session undo and view state.

Limits: 250 MiB input ZIP and total expanded data; 2,002 entries (including the two JSON files); 2,000 originals; 25 MiB/original; 10 MiB per JSON document; 100,000 normalized records; decoded images at most 40 megapixels. ZIP originals reserve 20 MiB of the total for JSON and ZIP overhead. The UI uses rounded MB labels. Files support stored or deflate ZIP compression. Transfers are bounded in-memory operations, intended for modest personal collections. For large media libraries, increase limits only with a reviewed streaming/memory design and corresponding tests.

## Validation commands

```sh
npm test
npm run build
npm run test:e2e
npm run test:offline
```

Tests cover exact original bytes, shared links, JSON warnings, known migrations, unsafe ZIP paths, forged sizes and CRCs, changed/missing/unlisted files, transaction rollback, stale-window isolation, explicit replacement, new-collection switching, reload persistence, cold offline startup and user-controlled app updates. Unit/graph scale cases include 10/100/500/1,200 people; the desktop browser case exercises 1,200 people. Mobile tests use Chromium emulation; real Safari/iOS testing remains necessary.
