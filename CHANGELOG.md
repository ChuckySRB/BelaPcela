# Release notes

## 1.0.0 — 2026-11-03

First release of БелаПчела, a private, offline family museum in Serbian Cyrillic.

- Interactive family tree with connected-family focus, branch collapse, search, profiles and preserved viewpoints.
- Optional biographies, alternative names, occupation history, contacts, custom facts and preferred portraits.
- Explicit parentage, partnerships and direct kinship records, with reviewed editing/deletion and session undo/redo.
- Shared events with participant roles, precise/approximate dates and periods; reusable places and an offline coordinate picker.
- Local original-file storage, thumbnails, galleries, metadata and shared links for photographs, documents, audio and video.
- Empty collection creation, retained demonstration family and switching between independent saved collections.
- Complete ZIP backups, data-only JSON, validated import review, explicit replacement and known-schema upgrades.
- Transactional IndexedDB persistence, stale-window protection and recovery screens for failed storage or rendering.
- Installable offline shell, explicit app updates, bundled fonts, keyboard support, responsive screens and light/dark themes.
- MIT application license and bundled dependency notices.

### Compatibility

- Normalized data schema: **3**. IndexedDB database version: **4**. Portable archive format: **1**.
- Existing supported local archives remain readable. ZIP/JSON data schemas 1 and 2 migrate during import review.
- The stable `BelaPcela` format marker and internal storage identifiers remain unchanged. The public app name is **БелаПчела**.

### Release boundaries

Relationship deletion is available; deletion of other record types and collections is deferred. Source editing, GEDCOM, online maps, shared server storage and sync are outside v1. Safari/iOS needs real-device testing. Transfer limits and browser-local storage requirements are documented in the [README](README.md) and [archive format](ARCHIVE_FORMAT.md).
