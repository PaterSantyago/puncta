import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  html,
  parseFragment,
  serialize,
} from "parse5";
import { elementSemantics } from "../../shared/elements.js";
import { TextContext } from "../../shared/text-context.js";
import { htmlSourceMap } from "./html-source.js";
import type { HtmlResult, PunctaWarning, TextResult } from "./types.js";

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
  const contextText = new TextContext(transform);
  const leaves: DefaultTreeAdapterMap["textNode"][] = [];
  const updates: (() => void)[] = [];
  function visit(node: DefaultTreeAdapterMap["node"], path: number[]) {
    if (defaultTreeAdapter.isTextNode(node)) {
      leaves.push(node);
      const value = contextText.append(node.value, path);
      updates.push(() => {
        node.value = value();
      });
      return;
    }
    if (defaultTreeAdapter.isElementNode(node)) {
      const semantics = elementSemantics(node.tagName);
      if (semantics.boundary) contextText.boundary(semantics.boundary);
      if (!semantics.protected && node.namespaceURI === html.NS.HTML)
        node.childNodes.forEach((child, index) => {
          visit(child, [...path, index]);
        });
      if (semantics.boundary) contextText.boundary(semantics.boundary);
    } else if ("childNodes" in node)
      node.childNodes.forEach((child, index) => {
        visit(child, [...path, index]);
      });
  }
  fragment.childNodes.forEach((node, index) => {
    visit(node, [index]);
  });
  contextText.finish();
  const { sources, appliedRules } = contextText;
  const mappings = leaves.map((node, index) =>
    htmlSourceMap(source, sources[index].text, node.sourceCodeLocation),
  );
  const edits = contextText.edits.map((edit) => ({
    ...edit,
    ranges: edit.ranges.map((range) => ({
      ...range,
      inputRange: mappings[range.sourceId](range.start, range.end),
    })),
  }));
  for (const update of updates) update();
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
