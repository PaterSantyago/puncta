import {
  defaultTreeAdapter,
  html,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";
import type {
  HtmlResult,
  InputRange,
  PunctaWarning,
  TextResult,
} from "./types.js";

/** Parse a div fragment without requiring a browser or adding a wrapper. */
export function transformHtml(
  source: string,
  transform: (text: string) => TextResult,
): HtmlResult {
  const warnings: PunctaWarning[] = [];
  const context = defaultTreeAdapter.createElement("div", html.NS.HTML, []);
  const fragment = parseFragment(context, source, {
    sourceCodeLocationInfo: true,
    onParseError(error) {
      warnings.push({
        code: "html.parse",
        source: "parser",
        message: "HTML parser reported a problem.",
        details: { parserCode: error.code },
        locale: null,
        ruleId: null,
        location:
          error.startOffset >= 0
            ? { kind: "input", start: error.startOffset, end: error.endOffset }
            : { kind: "unavailable", reason: "Parser supplied no position" },
      });
    },
  });
  const sources: HtmlResult["sources"][number][] = [];
  const edits: HtmlResult["edits"][number][] = [];
  const appliedRules: HtmlResult["appliedRules"][number][] = [];
  function visit(node: DefaultTreeAdapterMap["node"], path: number[]) {
    if (
      defaultTreeAdapter.isElementNode(node) &&
      ["code", "pre", "script", "style"].includes(node.tagName)
    )
      return;
    if (defaultTreeAdapter.isTextNode(node)) {
      const id = sources.length;
      const text = node.value;
      sources.push({ id, text, path });
      const report = transform(text);
      for (const edit of report.edits) {
        edits.push({
          ...edit,
          ranges: edit.ranges.map((range) => {
            const location = node.sourceCodeLocation;
            // Entity/CRLF provenance belongs to the later source-mapping slice.
            const inputRange: InputRange =
              location &&
              source.slice(location.startOffset, location.endOffset) === text
                ? {
                    accuracy: "exact",
                    start: location.startOffset + range.start,
                    end: location.startOffset + range.end,
                  }
                : {
                    accuracy: "unavailable",
                    reason:
                      "Decoded HTML source mapping is not implemented in this slice",
                  };
            return { ...range, sourceId: id, inputRange };
          }),
        });
      }
      for (const rule of report.appliedRules)
        if (
          !appliedRules.some(
            (item) =>
              item.ruleId === rule.ruleId && item.locale === rule.locale,
          )
        )
          appliedRules.push(rule);
      node.value = report.result;
    } else if ("childNodes" in node)
      node.childNodes.forEach((child, index) => {
        visit(child, [...path, index]);
      });
  }
  fragment.childNodes.forEach((node, index) => {
    visit(node, [index]);
  });
  const result = serialize(fragment);
  return {
    result,
    hasEdits: edits.length > 0,
    outputChanged: result !== source,
    sources,
    edits,
    appliedRules,
    warnings,
  };
}
