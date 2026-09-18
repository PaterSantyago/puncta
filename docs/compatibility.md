# Compatibility

[Documentation index](README.md)

This page separates declared requirements from checked environments.

## Release status

| Version                   | Status                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Public `0.1.0-alpha.0`    | Historical scaffold; it does not have the functional API in this guide.  |
| Functional candidate      | Unreleased. Source baseline: `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`. |
| Functional public release | Versions, release tags, and public installation checks are pending.      |

The functional documentation follows the current guide. Use the corresponding
Git tag for earlier documentation. The historical scaffold is described in
[the first alpha publication record](https://github.com/PaterSantyago/puncta/issues/13).
Functional release tag links are pending until those tags exist.

The unreleased archives can carry the same manifest version as the old scaffold.
A matching version string alone does not prove that an archive has the functional
API. The isolated installation check exercises that API and prevents fallback to
public scaffold packages.

## Requirements

| Declared requirement | Contract                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| Modules              | Public ESM imports and TypeScript declarations.                               |
| Core use             | Core plus each selected locale as direct dependencies.                        |
| React adapter        | React peer range `^19.3.0`; add core directly if application code imports it. |
| Node                 | Public package manifests declare no minimum Node version.                     |

| Checked environment    | Evidence or limit                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node 24 consumer       | Existing isolated npm/pnpm package checks.                                                                                                                         |
| Documentation examples | Matching local archives; exact environment and results in the [slice report](acceptance/documentation-107.md).                                                     |
| Browser, SSR, and RSC  | Existing reports remain in the [first-version acceptance record](acceptance/first-version.md). See the current [server evidence](acceptance/documentation-113.md). |

Repository tool versions are Node 24.21.0 and pnpm 12.4.1. These pins do not define
application runtime requirements. Support for CommonJS and untested environments is not
specified.

## Limits

Puncta applies the selected locale's typography profile. It does not parse
Markdown or translate text. HTML parsing is not sanitization. HTML serialization
can change notation even without typography edits. React processing does not
inspect the output of a custom component.

The full feature limits and integration environments with test evidence are
pending until their guide and reference sections are complete. See the
[coverage record](acceptance/documentation-coverage.json) for pending work.

## Server environments

The [server guide](guides/server-rendering.md) includes the checked integration paths.
These are tested environments, not general runtime guarantees.

| Path              | Checked environment                                                      | Scope                                                                                                       |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Node SSR          | Node 24.21.0, React/React DOM 19.3.0                                     | `renderToString`, `renderToPipeableStream`, `renderToReadableStream` through `react-dom/server.node`        |
| Browser hydration | Playwright 1.58.2, Chromium, Firefox, WebKit                             | All three SSR modes, early shell/fallback, resolved content, node identity, no hydration errors             |
| RSC               | Next.js 16.3.5 production App Router, application React/React DOM 19.3.0 | Flight client references, HTML without JavaScript, hydration, client updates, separate server configuration |
| Framework React   | `19.3.0-canary-cbb046ab-20260731`                                        | Next's bundled server and client React, recorded separately from application dependencies                   |

The [slice evidence](acceptance/documentation-113.md) records browser versions, revisions, commands, and limits.
The repository lockfile pins these dependencies.
The browser and RSC commands are separate from `pnpm check`.
This fixture gives no general promise of support for Next.js versions or edge runtimes.

The client entry supplies no server Provider or server JSX adapter.
An instance or locale module cannot cross the RSC boundary as a serialized prop.
Opaque component output stays outside an outer Puncta transformation.
The pure entry does not provide arbitrary RSC-tree traversal.
