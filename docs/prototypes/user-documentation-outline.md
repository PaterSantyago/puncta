# PROTOTYPE — Puncta user documentation

This outline is for discussion. It is not the user documentation and is not ready for release. Do not merge this prototype into the release branch.

Question: Can a developer find a first example, complete a task, and find an exact API answer with this structure?

- Planning ticket: [User documentation: page structure and reader journeys](https://github.com/PaterSantyago/puncta/issues/103).
- Baseline decision: [User documentation: version baseline and installation contract](https://github.com/PaterSantyago/puncta/issues/102#issuecomment-5727581674).
- Source baseline: `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
- Audience: developers who use Puncta. The functional release and its documentation ship together.
- Language target: ASD-STE100, Issue 9. These fragments have not had the final language review. No new approved dictionary or term-approval process is proposed.
- Paths below are proposed destinations, not files created by this prototype.

## Proposed structure

```text
README.md                         Product introduction and first example
packages/*/README.md               Short package entry pages
CONTRIBUTING.md                    Entry for existing contributor material

docs/
  README.md                       User documentation index
  getting-started/
    installation.md               Packages, versions, and requirements
    text-and-html.md               First string results
    react.md                      First React result
  guides/
    configuration.md              Instances, overrides, resets, and locales
    html.md                       Fragments, documents, and HTML markers
    react.md                      Accessible children, scopes, and pure calls
    server-rendering.md           SSR, hydration, streaming, and RSC
    protection.md                 Text ranges and protected subtrees
    hyphenation.md                Insert and remove soft hyphens
  reference/
    core.md                       Core exports, methods, and signatures
    react.md                      Components and pure function signatures
    settings.md                   All options, defaults, and merge behavior
    locales-and-rules.md           Locale exports and typography profiles
    diagnostics.md                Results, coordinates, errors, and warnings
  troubleshooting.md              Symptoms, causes, and next actions
  compatibility.md                Release status, environments, and limits
```

Existing `docs/acceptance/`, `docs/agents/`, and release-operation pages remain distinct. They are not required steps in the user guide. This ticket proposes a contributor entry link and relocation of existing root development material; it does not commission a new contributor handbook.

## Page outlines and ownership

| Page | Proposed headings | What it owns |
| --- | --- | --- |
| Root README | What Puncta does; First result; Choose your input; Documentation; Contribute; License | Product entry and one short working example. Link the example to its full guide. |
| Package README | Purpose; Install; Example; Guide and reference; License | A useful npm landing page. Show the required companion packages. Link to release-matched repository docs with absolute URLs that work on npm. |
| Documentation index | Start; Complete a task; Look up the API; Solve a problem | Navigation by user intent, with a short input-choice table. |
| Installation | Release status; Choose packages; npm; pnpm; Requirements; Check the installation | One complete installation contract. Release values are filled in before publication. |
| Text and HTML quick start | Create an instance; Process text; Process HTML; Next steps | Minimal runnable examples, imports, and visible expected results. |
| React quick start | Prepare the instance; Add the Provider; Process children; Next steps | Minimal wrapper-free React example. Link the custom-component boundary next to the example. |
| Configuration guide | Change settings; Create a variant; Reset a setting; Change locale; Nested scopes | Task examples, with links to exact option definitions. |
| HTML guide | Choose fragment or document; Set context; Use markers; Work across inline elements; Understand serialization | HTML-specific procedures. State locally that HTML parsing does not sanitize input. |
| React guide | Process host children; Process a custom component; Use nested scopes; Use pure functions; Preserve state | React-specific procedures and boundaries. |
| Server rendering guide | Render on the server; Hydrate; Stream; Use Server Components | Supported integration patterns, including separate client-owned instances for RSC. Link runnable examples. |
| Protection guide | Protect text ranges; Exclude markup; Understand inherited protection | Procedures for protection and links to the exact API/settings contract. |
| Hyphenation guide | Enable insertion; Change minima; Remove soft hyphens; Explain unchanged words | A complete task path. Explain that SHY marks an opportunity, not a forced line break. |
| Core reference | Exports; createPuncta; Instance methods; Return types; Configuration errors | Exact signatures and method-specific arguments. Link shared settings and diagnostic schemas. |
| React reference | Exports; PunctaProvider; Puncta; transformReact; stripSoftHyphensReact | Exact props/signatures and return types. Link shared settings and diagnostic schemas. |
| Settings reference | Option locations; Shared settings; Rule options; Hyphenation options; Inheritance and reset; Declarative markers | One canonical definition for each setting, including defaults and validation. Method-specific parameters remain in their API reference. |
| Locales and rules reference | Load a locale; Locale exports; en-gb profile; es-es profile; Rule examples; Rule limits | Exact locale behavior with before/after examples, including optional digit grouping. Link option definitions instead of copying tables. |
| Diagnostics reference | Result fields; Source paths; UTF-16 ranges; Errors; Warnings | Canonical diagnostic schemas and code catalogues. Include causes and remedies. |
| Troubleshooting | No change; Unexpected HTML output; Text inside a component is unchanged; A word does not wrap; Installation or version mismatch | Symptom-first entry points. Link relevant fixes and exact diagnostic codes. |
| Compatibility | Release versions; Declared requirements; Tested environments; Unsupported uses; Earlier versions | Compatibility facts and limits. Link historical docs through tags. |

## Navigation and reader journeys

Use normal relative Markdown links inside the documentation. Each page starts with a link to the index and a short purpose statement. Guides state prerequisites and end with related tasks/reference links. Reference pages do not force the reader through the quick starts.

Do not require a linear book sequence. These are the main paths:

| Reader intent | Entry | Next pages | Successful result |
| --- | --- | --- | --- |
| Format a string | Root README | Installation → Text and HTML | The reader obtains `Wait…` from `Wait...`. |
| Add Puncta to React | React package README or index | Installation → React quick start → React guide | The reader formats accessible child text and knows where custom components need their own processing. |
| Process HTML from a service | Index | Text and HTML → HTML → Protection | The reader selects parsing mode and preserves technical content. |
| Change quotation or number behavior | Index task links | Configuration → Locales and rules → Settings | The reader finds the setting, locale behavior, and a result example. |
| Use multiple locales | Index task links | Configuration → Locales and rules | The reader loads explicit locale modules and switches a scope correctly. |
| Add optional digit grouping | Index task links | Locales and rules, Digit grouping section → Settings | The reader opts in and understands separators, thresholds, and excluded forms. |
| Add or remove word-break opportunities | Index | Hyphenation → Settings | The reader inserts SHY or removes it for export without mistaking it for layout. |
| Integrate SSR or RSC | React quick start or index | Server rendering → Compatibility | The reader uses the correct server/client ownership pattern. |
| Explain a warning or unexpected output | Index or guide | Troubleshooting → Diagnostics → Relevant guide | The reader can interpret the code/source range and choose a supported action. |
| Look up a signature | Package README or index | Core or React reference | The reader reaches the signature directly. |

## Sample fragment: documentation index

# Puncta documentation

Puncta prepares text for publication. It applies the typography rules of the locale that you select.

Choose the input that you use:

| Your input | Start here |
| --- | --- |
| A plain-text string | Process text and HTML |
| An HTML string | Process text and HTML |
| React children | Use Puncta with React |

First, install the packages for your application. Then use the example for your input.

To change the result, see Configure Puncta. To find a function or option, see the API reference.

Prototype note: page titles in this fragment will become links to the proposed paths. The release-status notice follows the baseline decision and is removed or updated when the functional release is published.

## Sample fragment: text quick start

# Process text

Create an instance with one locale. Then call `text()` with the source string.

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const result = puncta.text("Wait...");
console.log(result); // Wait…
```

The result is a string. To get a report of the changes, set `detailed` to `true`.

Next: Process HTML · Change settings · Read a change report.

Prototype note: this fragment follows the installation page. Package versions and executable verification belong to the later documentation work.

## Sample fragment: troubleshooting

# Text inside a React component does not change

An outer `Puncta` component does not call your component to inspect its output. Put `Puncta` around the text inside your component.

```tsx
import { Puncta } from "@use-puncta/with-react";

function Message() {
  return <Puncta>Wait...</Puncta>;
}
```

This example requires a `PunctaProvider` with an instance above `Message`.

Related: React quick start · Process a custom component · React API.

## Reuse and migration

- Split existing core and React README explanations across the guides and reference pages that own them. Keep a concise example and links in each package README.
- Use existing locale README material for locale behavior and limits. Keep locale installation/export examples in package entry pages.
- Keep runnable SSR/RSC examples in `examples/`. Their READMEs explain how to run them; user guides explain when and how to use the patterns.
- Move or link root development/check/release material through CONTRIBUTING.md and existing maintainer documents. Preserve useful content and inbound paths; do not rewrite it as part of user documentation scope.
- Keep diagnostic details in the diagnostics reference. Troubleshooting routes symptoms there without copying the catalogue.
- Keep full option definitions in settings; keep locale behavior in locales and rules. Short example overlap is useful, but normative tables have one home.
- Add a standalone recipe page only when it describes a distinct multi-step task that cannot be explained clearly in the relevant guide. Start with digit grouping, multiple locales, option reset, and protected content as guide sections.

## Review questions

1. Are the separate text/HTML and React quick starts the right first paths?
2. Is this guide/reference split useful, or should the first edition combine more pages?
3. Can recipes start as sections in their relevant guides, with one symptom-based troubleshooting page?

Status: proposed. The owner has not yet approved this outline. No ticket resolution is recorded by this prototype.
