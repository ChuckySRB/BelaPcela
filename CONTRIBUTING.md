# Contributing to БелаПчела

БелаПчела keeps family history in the user's browser. Changes should preserve that privacy, original files and archive compatibility.

## Report a problem

Open a [GitHub issue](https://github.com/ChuckySRB/BelaPcela/issues) with reproduction steps, expected/actual behavior, app version (in **О збирци**) and browser/OS. Mention whether it happened online or offline. Use the invented example family or a small synthetic collection.

Public issues, traces and screenshots must not contain real family archives, personal details or original documents. For a privacy/security problem, use GitHub's private vulnerability reporting if it is available on the repository, or contact the maintainer privately before disclosing sensitive details.

## Make a change

1. Use Node.js 24, run `npm ci`, and read the [development guide](docs/DEVELOPMENT.md).
2. Keep changes focused. Keep domain rules and persistence outside UI components; route mutations through transactional commands.
3. Preserve optional fields, stable IDs, explicit relationships and the separation between graph presentation and family data.
4. Add tests for changed behavior, especially storage rollback, stale revisions, shared references and migrations. Run `npm run check`; for relevant UI/offline changes also run the browser suites described in the development guide.
5. After updating dependencies, run `npm run licenses` and commit the refreshed notices and lockfile. Keep public UI text in Serbian Cyrillic.
6. Explain the user-facing change and validation in the pull request. Include screenshots when they help explain a UI change.

Keep personal backups outside the source tree. Use the [design specification](docs/design/BelaPcela_Product_Spec_v0_5.md) for design constraints; the archived kickoff describes only the original first iteration.

Contributions use the project's [MIT license](LICENSE); third-party code keeps its original notices.
