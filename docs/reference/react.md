# React API reference

[Documentation index](../README.md)

The component entry is `@use-puncta/with-react`. It has a `"use client"` directive.
The pure entry is `@use-puncta/with-react/pure`. It has no client directive, hooks, or Context.
Both entries use the same core instance and locale modules.

## Exports and public types

| Import path                   | Export                               | Definition                                   |
| ----------------------------- | ------------------------------------ | -------------------------------------------- |
| `@use-puncta/with-react`      | `PunctaProvider`, `Puncta`           | [Components](#components)                    |
| `@use-puncta/with-react`      | `PunctaProps`, `PunctaProviderProps` | [Component props](#component-props)          |
| `@use-puncta/with-react/pure` | `transformReact`                     | [Pure transformation](#transformreact)       |
| `@use-puncta/with-react/pure` | `ReactTransformOptions`              | [Pure options](#reacttransformoptions)       |
| `@use-puncta/with-react/pure` | `ReactResult`                        | [Detailed result](#reactresult)              |
| `@use-puncta/with-react/pure` | `stripSoftHyphensReact`              | [SHY removal status](#stripsofthyphensreact) |

## Components

Signatures use React's `ReactNode` type. These are API declarations, not a program.

```ts
function Puncta(props: PunctaProps): ReactNode;
function PunctaProvider(props: PunctaProviderProps): ReactNode;
```

`Puncta` processes accessible children and supplies Context for nested components.
`PunctaProvider` supplies settings and protection. It does not transform direct text children or host text.
The two components do not add DOM wrappers.
Nested components receive original children and use their own scope.
See [child boundaries and state limits](../guides/react.md#understand-child-boundaries).

## Component props

`PunctaProviderProps` is an alias of `PunctaProps`. Both types have these readonly fields.

| Prop       | Type                                            | Default and behavior                                                                                                       |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`                                     | Optional. Missing children produce no text.                                                                                |
| `instance` | `PunctaInstance`                                | Optional in the type for nested use. Necessary at a root with no Puncta Context. Not permitted when Puncta Context exists. |
| `locale`   | `PunctaOptions["locale"]`                       | Inherited. Must select a loaded locale when supplied.                                                                      |
| `enabled`  | `boolean`                                       | Inherited. `false` protects descendants. A child cannot cancel inherited protection.                                       |
| `options`  | `Pick<PunctaOptions, "rules" \| "hyphenation">` | Optional. Inherits settings. Field/group overrides and resets are permitted.                                               |

Use `locale` and `enabled` as props, not in `options`.
`rules` and `hyphenation` belong in `options`, not as props.
Components accept no `detailed`, `protect`, `format`, `mode`, or `context` prop.
An omitted or `undefined` setting inherits its value.
Use the [shared settings definitions](settings.md) for allowed values, defaults, and null resets.

Unknown props and unknown `options` fields are invalid.
`options={null}` and array options are invalid.
A root without a valid instance throws `PunctaConfigError` with `instance.missing`.
An explicit instance in existing Puncta Context throws `instance.nested`, even if it is the same instance.
Other invalid props throw `config.invalid-option` or the applicable core configuration error.

Components validate their own arguments even when disabled or protected.
Puncta does not read declarative options below a protected host.
See [core configuration errors](core.md#punctaconfigerror).

## transformReact

Call `transformReact(children, options)` synchronously with a `ReactNode` and an explicit instance.
The return value is a `ReactNode` unless `detailed` is `true`.
The function does not read Context or install a Provider in its result.
It does not render opaque components.

These declarations show the three overloads:

```ts
function transformReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed: true },
): ReactResult;
function transformReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed?: false },
): ReactNode;
function transformReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult;
```

A boolean variable gives the union result type.
The [pure example](../guides/react.md#use-the-pure-entry) shows an independent transformation and later Context use.
The function does not mutate the original input tree.

## ReactTransformOptions

This interface extends `Omit<TextOptions, "protect">` and adds readonly `instance: PunctaInstance`.

| Field                                       | Type                          | Default and behavior                                             |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `instance`                                  | `PunctaInstance`              | Necessary for every call, even in a React Provider.              |
| `locale`, `enabled`, `rules`, `hyphenation` | Shared `PunctaOptions` fields | Inherit from the explicit instance. See [settings](settings.md). |
| `detailed`                                  | `boolean`                     | `false`. Set `true` for `ReactResult`.                           |

Shared settings are flat fields in the options object.
There is no nested `options` field.
`protect`, `format`, `mode`, and `context` are invalid.
Use tree protection instead of text ranges.
A missing instance throws `instance.missing`. An invalid instance throws `config.invalid-option`.

Pure calls validate settings and `detailed` even when processing is disabled.
Core settings errors also apply to pure calls.
An unavailable declarative language keeps text unchanged and produces a warning.
Invalid visited markup options can throw `markup.invalid-config`.
Pure calls do not inspect protected declarative content.

## ReactResult

`ReactResult` extends `Omit<TextResult, "result" | "outputChanged">`.
All fields are readonly.

| Field          | Type                       | Meaning                                                        |
| -------------- | -------------------------- | -------------------------------------------------------------- |
| `result`       | `ReactNode`                | Transformed input tree. Render this field for a detailed call. |
| `hasEdits`     | `boolean`                  | `true` if typography edits occurred.                           |
| `sources`      | `readonly Source[]`        | Original accessible source leaves.                             |
| `edits`        | `readonly Edit[]`          | Typography edits with original source ranges.                  |
| `appliedRules` | `readonly AppliedRule[]`   | Applied rule IDs and locale IDs.                               |
| `warnings`     | `readonly PunctaWarning[]` | Rule and markup warnings.                                      |

There is no `outputChanged` field. React reports do not compare serialized HTML.
Paths address the original input tree, not the DOM.
They use numeric array indices, `"children"` transitions, and `"fallback"` transitions.
Ranges use original UTF-16 offsets in their source leaves.
See the [core public type index](core.md#public-type-index) for shared types.
Detailed coordinate walkthroughs and the full diagnostic catalog are pending.

## stripSoftHyphensReact

Import this function from `@use-puncta/with-react/pure`.
Call it synchronously with a `ReactNode` and `ReactTransformOptions`. Supply an explicit instance.
It removes U+00AD from text that it can process, without typography or digit grouping.
It does not read Context, install a Provider, or mutate the input tree.

```ts
function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed: true },
): ReactResult;
function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed?: false },
): ReactNode;
function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult;
```

`detailed` defaults to `false`. A boolean variable gives `ReactNode | ReactResult`.
All [ReactTransformOptions fields and validation](#reacttransformoptions) apply.
`format`, `mode`, `context`, `protect`, and a nested `options` field are invalid.
A missing instance throws `instance.missing`. An invalid instance throws `config.invalid-option`.
Invalid call settings throw the applicable core configuration error.

No insertion resource is necessary, even when `hyphenation.enabled` is true.
Removal validates settings, locale minima, and visited nested scopes.
Shared `enabled: false` prevents removal. `hyphenation.enabled: false` does not.
Attributes, opaque content, protected hosts, disabled scopes, and unavailable-language regions keep SHY.
The function does not render custom components or inspect their output.

`ReactResult` contains `hyphenation.remove` deletion edits in original source coordinates.
There is no `outputChanged` field.
See the [checked React removal program](../guides/hyphenation.md#remove-shy-from-react).

## Check configuration failures

This full program checks the error codes. Error message text is not a stable lookup key.

<!-- puncta:example react-errors -->

```tsx
import { createPuncta, PunctaConfigError } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import {
  transformReact,
  type ReactTransformOptions,
} from "@use-puncta/with-react/pure";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const checks = [
  () => renderToStaticMarkup(<Puncta>Wait...</Puncta>),
  () =>
    renderToStaticMarkup(
      <PunctaProvider instance={instance}>
        <Puncta instance={instance}>Wait...</Puncta>
      </PunctaProvider>,
    ),
  () => transformReact("Wait...", {} as ReactTransformOptions),
  () =>
    transformReact("Wait...", {
      instance,
      enabled: false,
      detailed: "yes",
    } as unknown as ReactTransformOptions),
];
for (const check of checks) {
  try {
    check();
    throw new Error("Expected a configuration error");
  } catch (error) {
    if (!(error instanceof PunctaConfigError)) throw error;
    console.log(error.code);
  }
}
```

<!-- puncta:output react-errors -->

```text
instance.missing
instance.nested
instance.missing
config.invalid-option
```
