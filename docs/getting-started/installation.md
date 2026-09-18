# Install Puncta

[Documentation index](../README.md)

Install core and each locale that your application uses. Add the React adapter
only for React input.

## Release status

The functional version is **unreleased**. The historical public version,
`0.1.0-alpha.0`, does not have this API. Do not use its version number or a
moving npm tag as a substitute for the functional release.

The commands below are templates for the functional release. Replace each
uppercase version field with its actual compatible release version when that
release is available. The fields can have different values. These public
installation commands remain pending until publication.

## npm

For British English:

```sh
npm install --save-exact @use-puncta/core@CORE_VERSION @use-puncta/with-en-gb@EN_GB_VERSION
```

## pnpm

For British English:

```sh
pnpm add --save-exact @use-puncta/core@CORE_VERSION @use-puncta/with-en-gb@EN_GB_VERSION
```

For Spanish, replace the British English package with
`@use-puncta/with-es-es@ES_ES_VERSION`. Install both locale packages only if the
application uses both locales. If you import `createPuncta`, install
`@use-puncta/core` as a direct dependency.

For React, also install `@use-puncta/with-react@REACT_ADAPTER_VERSION` and a
compatible `react` version. The declared React peer range is `^19.3.0`.
If a DOM renderer is necessary, the application supplies `react-dom`.
See the [current React instructions](../../packages/with-react/README.md).

## Requirements

Use ESM imports. Packages include TypeScript declarations. CommonJS support is
not specified. The package manifests do not declare a minimum Node version.

Node 24 is the tested consumer baseline. Node 24.21.0 and pnpm 12.4.1 are repository
tool versions; the repository build tools are not necessary for application users.
See [declared and tested requirements](../compatibility.md#requirements).

## Installation check

Run the [first text example](text-and-html.md#process-text). Make sure that its output is
`Wait…`. If `createPuncta` is missing, examine the installed versions. The old
scaffold is not the functional version.

Before publication, repository checks use matching built archives in an isolated
registry. The npm and pnpm checks install core and the selected locale directly.
The examples use installed public imports and declarations. This check gives no
evidence for an installation from public npm.

Maintainers can run these checks with the
[repository commands](../../CONTRIBUTING.md#checks). A source checkout is a
maintainer check path, not a requirement for users of the functional release.
