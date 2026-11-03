# Server handoff for БелаПчела v1

This note describes the application artifact and requirements for a later Linux server setup. It is not a deployment script. No server, domain, certificate, container or reverse-proxy configuration is supplied here.

## Build artifact

- Use Node.js 24 and the committed lockfile. `npm ci` followed by `npm run check` creates `dist/` and starts no server.
- Serve the **complete contents of `dist/`** as static files. It includes `index.html`, hashed JS/CSS and worker assets, bundled fonts, `sw.js`, the web manifest, icons and license notices.
- There is no application backend, database service, API key, environment file or family-data upload endpoint. Node is needed for building and tests, not for executing the finished static app.
- The checked-in `dist/` folder is intentionally ignored; build it from the selected commit on the destination. Package version is 1.0.0. No GitHub release/tag or hosting publication is implied by that version.

## Requirements for the later hosting session

1. Use a secure browser context: **HTTPS** for a LAN/domain address, or localhost for local access. Plain HTTP on a LAN IP is not equivalent to localhost; offline installation and secure browser APIs require the secure context.
2. Keep the chosen URL stable. Browser working data belongs to its browser profile and origin (scheme, hostname and port). The path also determines the installed app/service-worker scope. Moving from the development URL or another host requires exporting a ZIP there and importing it at the new address.
3. The build uses relative asset URLs and hash routes (`#/tree`, `#/person/:id`), supporting a static subdirectory. Keep its trailing slash and serve `index.html` for the application entry; a hash route is never sent to the server.
4. Serve `sw.js` as JavaScript with revalidation/no-cache behavior. Revalidate `index.html` and the web manifest as well. Hashed assets may use long immutable caching. Keep all files from a build together; do not mix asset generations.
5. Preserve the web manifest, worker, fonts, icons and notices. Browser/offline tests expect actual files rather than HTML returned for missing assets.
6. Respect the offline update flow: a newly installed worker waits until the user chooses **Ажурирај и поново отвори**. Save drafts before activating an update.

## Data responsibilities

Hosting the app makes the software accessible; **family collections remain in each visitor's browser**. Multiple devices do not share or sync a tree, even on the same local server. Server filesystem backups do not back up those browser collections.

Before switching URLs, save a full ZIP from the original browser and verify its download. Use the destination's import review to open a new collection. Data-only JSON omits original files. Keep independent ZIP copies after moving; persistent storage permission is not a backup.

## Validation during the later setup

Once the user authorizes starting a server, check loading from the chosen URL, deep hash links, file MIME types, offline-ready status, a fresh offline tab, an explicit app update, creation/reload of a synthetic collection and a full ZIP round trip with an original file. Use a disposable browser profile for those checks.

The [development guide](DEVELOPMENT.md) describes optional browser tests. `npm run test:static` checks the built UI through intercepted local files without a listening server; it blocks service workers. The full E2E/offline suites start temporary loopback test servers and should be run only when that is intended. CI configuration checks the application and has no deployment step.
