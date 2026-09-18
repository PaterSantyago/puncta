# Install Puncta

[Documentation index](../README.md)

Install core and each locale that your application uses. Add the React adapter
only for React input.

## Release status

Functional alpha **`0.1.0-alpha.1`** is published for core, the React adapter,
and both locales. The commands below select those exact versions.
The earlier `0.1.0-alpha.0` scaffold does not have the API in this guide.

At publication, `next` selects `0.1.0-alpha.1`; `latest` still selects the scaffold.
Use exact versions for a reproducible installation. See
[release tags and verification](../compatibility.md#release-status).

## npm

For British English:

```sh
npm install --save-exact @use-puncta/core@0.1.0-alpha.1 @use-puncta/with-en-gb@0.1.0-alpha.1
```

## pnpm

For British English:

```sh
pnpm add --save-exact @use-puncta/core@0.1.0-alpha.1 @use-puncta/with-en-gb@0.1.0-alpha.1
```

For Spanish, replace the British English package with
`@use-puncta/with-es-es@0.1.0-alpha.1`. If the application uses the two locales, install the two locale packages. If you import `createPuncta`, install
`@use-puncta/core` as a direct dependency.

For React, also install `@use-puncta/with-react@0.1.0-alpha.1` and a
compatible `react` version. The declared React peer range is `^19.3.0`.
If a DOM renderer is necessary, the application supplies `react-dom`.
See the [React quick start](react.md).

For the React quick start with British English and a DOM renderer, use one of
these commands:

```sh
npm install --save-exact @use-puncta/core@0.1.0-alpha.1 @use-puncta/with-en-gb@0.1.0-alpha.1 @use-puncta/with-react@0.1.0-alpha.1 react@19.3.0 react-dom@19.3.0
```

```sh
pnpm add --save-exact @use-puncta/core@0.1.0-alpha.1 @use-puncta/with-en-gb@0.1.0-alpha.1 @use-puncta/with-react@0.1.0-alpha.1 react@19.3.0 react-dom@19.3.0
```

## Fresh versions with pnpm

pnpm 12.4.1 can select an older version for `@next` during its default one-day
release delay. The exact-version commands above were checked without a policy
exception. If your project enforces a stricter release-age policy, wait until the
version is old enough or follow your project's dependency approval procedure.
Do not change `next` to `latest`: `latest` still selects the scaffold.

## Requirements

Use ESM imports. Packages include TypeScript declarations. CommonJS support is
not specified. The package manifests do not declare a minimum Node version.

Node 24 is the tested consumer baseline. Node 24.21.0 and pnpm 12.4.1 are repository
tool versions. The repository build tools are not necessary for application users.
See [declared and tested requirements](../compatibility.md#requirements).

## Installation check

Run the [first text example](text-and-html.md#process-text). Make sure that its output is
`Wait…`. If `createPuncta` is missing, examine the installed versions. The old
scaffold is not the functional version.

The [public-installation report](../acceptance/documentation-116.md) records checks
against the published packages with npm and pnpm. These checks include installed
public imports, TypeScript declarations, and exact example results.

Maintainers can run these checks with the
[repository commands](../../CONTRIBUTING.md#checks). A source checkout is a
maintainer check path, not a requirement for users of the functional release.
