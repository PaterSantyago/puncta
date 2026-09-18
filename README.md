# Puncta

Puncta prepares text for publication with the typography rules of the selected
locale. Use it with plain text, HTML strings, or React children.

**Unreleased functional version.** The public `0.1.0-alpha.0` packages contain the
historical scaffold. They do not have the API shown here. Read the
[installation instructions](docs/getting-started/installation.md) before you use
this example.

## First result

Install core and the British English locale. Then run this TypeScript example:

<!-- puncta:example first-result -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("Wait..."));
```

Output:

<!-- puncta:output first-result -->

```text
Wait…
```

See the [text and HTML quick start](docs/getting-started/text-and-html.md).

## Select your input

| Input             | Start here                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Plain-text string | [Process text](docs/getting-started/text-and-html.md#process-text)  |
| HTML string       | [Process HTML](docs/getting-started/text-and-html.md#process-html)  |
| React children    | [Current React package instructions](packages/with-react/README.md) |

## Documentation

The [documentation index](docs/README.md) lists the available pages. See [compatibility](docs/compatibility.md) for version status and limits.

## Contribute

See [contributor instructions](CONTRIBUTING.md) for development, checks, and release
procedures.

## License

Puncta uses the [MIT license](LICENSE).
