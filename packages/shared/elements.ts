import type {
  ConfigLocation,
  LocaleId,
  PunctaWarning,
} from "../core/src/types.js";
import type { Boundary } from "./text-context.js";

const blocks = new Set(
  "address article aside blockquote body caption center dd details dialog dir div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup html legend li listing main menu nav ol p plaintext pre search section summary table tbody td tfoot th thead title tr ul xmp".split(
    " ",
  ),
);
const protectedElements = new Set(
  "code pre script style kbd samp textarea select input option optgroup datalist template noscript svg math ruby iframe object embed canvas audio video".split(
    " ",
  ),
);
const inline = new Set(
  "a abbr acronym area b base basefont bdi bdo big button cite col colgroup data del dfn em font i ins label link map mark meta meter nobr output picture progress q rb rp rt rtc s small slot source span strike strong sub sup time track tt u var".split(
    " ",
  ),
);

export function elementSemantics(tag: string): {
  boundary?: Boundary;
  protected: boolean;
  unsupported?: boolean;
} {
  if (tag === "br" || tag === "wbr")
    return { boundary: "line", protected: true };
  if (tag === "hr") return { boundary: "block", protected: true };
  if (blocks.has(tag))
    return { boundary: "block", protected: protectedElements.has(tag) };
  if (protectedElements.has(tag) || tag === "img")
    return { boundary: "opaque", protected: true };
  if (!inline.has(tag))
    return { boundary: "opaque", protected: true, unsupported: true };
  return { protected: false };
}

/** HTML boolean-attribute presence differs from React's boolean prop value. */
export function protectsHost(
  attributes: Readonly<Record<string, unknown>>,
  format: "html" | "react",
): boolean {
  if (format === "html" ? attributes.hidden !== undefined : !!attributes.hidden)
    return true;
  const editable =
    attributes[format === "html" ? "contenteditable" : "contentEditable"];
  return (
    editable === true ||
    (typeof editable === "string" &&
      ["", "true", "plaintext-only"].includes(editable.toLowerCase()))
  );
}

export function unsupportedElement(
  tagName: string,
  namespace: string,
  locale: LocaleId | null,
  location: ConfigLocation,
): PunctaWarning {
  return {
    code: "markup.element-unsupported",
    source: "markup",
    message: "Element is unsupported.",
    details: { tagName, namespace },
    locale,
    ruleId: null,
    location,
  };
}
