# Compatibility

[Documentation index](README.md)

This page separates declared requirements from checked environments.

## Release status

| Version         | Status                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| `0.1.0-alpha.1` | Published functional alpha for all four packages. Public npm/pnpm checks passed. |
| `0.1.0-alpha.0` | Historical scaffold. It does not have the functional API in this guide.          |

The functional release tags identify commit `932ab23b959c92eef435cca7fb55a08ec12d93bc`:

- [Core release documentation](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.1/docs/README.md).
- [React release documentation](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-react%400.1.0-alpha.1/docs/README.md).
- [British English release documentation](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.1/docs/README.md).
- [Spanish release documentation](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-es-es%400.1.0-alpha.1/docs/README.md).

The [successful publication run](https://github.com/PaterSantyago/puncta/actions/runs/35367122861)
and [public-installation report](acceptance/documentation-116.md) record the checks.
At publication, `next` selects `0.1.0-alpha.1` and `latest` selects `0.1.0-alpha.0`.
Use the exact versions in the [current installation instructions](getting-started/installation.md).

The immutable release snapshots and README files inside the published archives
keep their original pre-publication notices and installation placeholders.
Their API examples match `alpha.1`. This current guide corrects the notices and
commands; it does not replace published archives or move release tags.

For historical scaffold documentation, use these tags at commit
`01362421c190d80719932e5a878fdc99762bbd70`:

- [Core scaffold README](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.0/packages/core/README.md).
- [React scaffold README](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-react%400.1.0-alpha.0/packages/with-react/README.md).
- [British English scaffold README](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.0/packages/with-en-gb/README.md).
- [Spanish scaffold README](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-es-es%400.1.0-alpha.0/packages/with-es-es/README.md).

See [the scaffold publication record](https://github.com/PaterSantyago/puncta/issues/13).

## Requirements

| Declared requirement | Contract                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| Modules              | Public ESM imports and TypeScript declarations.                                  |
| Core use             | Core plus each selected locale as direct dependencies.                           |
| React adapter        | React peer range `^19.3.0`. If application code imports core, add core directly. |
| Node                 | Public package manifests declare no minimum Node version.                        |

| Checked environment    | Evidence or limit                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node 24 consumer       | Public npm/pnpm installation checks for `0.1.0-alpha.1`.                                                                                                          |
| Documentation examples | Published packages. See the [public-installation report](acceptance/documentation-116.md) for the environment and results.                                        |
| Browser, SSR, and RSC  | Historical reports are in the [first-version acceptance record](acceptance/first-version.md). See the current [server evidence](acceptance/documentation-113.md). |

Repository tool versions are Node 24.21.0 and pnpm 12.4.1. These pins do not define
application runtime requirements. Support for CommonJS and untested environments is not
specified.

## Limits

Puncta applies the selected locale's typography profile. It does not parse
Markdown or translate text. HTML parsing is not sanitization. HTML serialization
can change notation even without typography edits. React processing does not
inspect the output of a custom component.

See the [HTML limits](guides/html.md#understand-serialization),
[React boundaries](guides/react.md#understand-child-boundaries), and
[hyphenation limits](reference/locales-and-rules.md#hyphenation).
The [acceptance report](acceptance/documentation-115.md) records the candidate checks and review.

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
