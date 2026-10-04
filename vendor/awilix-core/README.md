# Awilix standalone container snapshot

This private package contains the official Awilix 10.0.2 standalone ESM and UMD
builds, unchanged. It provides explicit service registration, dependency
resolution, lifetimes, scopes and disposal in Node.js without filesystem globbing.

MANARATAK does not use `listModules` or `container.loadModules`. The standalone
build deliberately rejects `loadModules`; register services explicitly instead.
Its declarations omit the unsupported `listModules` value export.

The normal Node package imports `fast-glob`, which imports the `braces` version
affected by GHSA-vfj7-8cjw-p6xm. These standalone builds do not contain or depend
on that loader chain. No audit advisory is suppressed and no security gate is
relaxed. There are no runtime dependencies in this package.

`provenance.json` records the original npm tarball URL, verified SHA-512 integrity,
and SHA-256 hashes of every copied file. `LICENSE.md` preserves the upstream MIT
license; the bundled TypeScript helper license is retained in each runtime file.

When updating this snapshot, download the selected official Awilix npm release,
verify the registry integrity, copy its standalone builds and declarations,
update provenance, and run the container regression suite, API composition tests,
build and dependency audit. Do not edit the bundled runtime files by hand.
