import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  html,
  parseFragment,
  serialize,
} from "parse5";
import {
  elementSemantics,
  protectsHost,
  unsupportedElement,
} from "../../shared/elements.js";
import { hostScope, type Scope, scopeTransform } from "../../shared/scopes.js";
import { TextContext } from "../../shared/text-context.js";
import { PunctaConfigError } from "./config.js";
import { htmlSourceMap } from "./html-source.js";
import type { HtmlResult, PunctaWarning } from "./types.js";

/** Parse a div fragment without requiring a browser or adding a wrapper. */
export function transformHtml(source: string, scope: Scope): HtmlResult {
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
  const contextText = new TextContext(scopeTransform(scope));
  const leaves: DefaultTreeAdapterMap["textNode"][] = [];
  const updates: (() => void)[] = [];
  function visit(
    node: DefaultTreeAdapterMap["node"],
    path: number[],
    parent: Scope,
  ) {
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
      const attributes = Object.fromEntries(
        node.attrs.map(({ name, value }) => [name, value]),
      );
      const hostProtected = protectsHost(attributes, "html");
      if (
        semantics.unsupported &&
        !parent.protected &&
        !hostProtected &&
        node.namespaceURI === html.NS.HTML
      ) {
        const position = node.sourceCodeLocation;
        warnings.push(
          unsupportedElement(node.tagName, node.namespaceURI, parent.locale, {
            kind: "element",
            path,
            inputRange:
              position && position.endOffset >= position.startOffset
                ? {
                    accuracy: "exact",
                    start: position.startOffset,
                    end: position.endOffset,
                  }
                : {
                    accuracy: "unavailable",
                    reason: "Parser supplied no element position",
                  },
          }),
        );
      }
      const boundary =
        semantics.boundary ?? (hostProtected ? "opaque" : undefined);
      if (boundary) contextText.boundary(boundary);
      if (
        !semantics.protected &&
        !parent.protected &&
        !hostProtected &&
        node.namespaceURI === html.NS.HTML
      ) {
        const childScope = hostScope(
          parent,
          attributes,
          (name) => {
            const position = node.sourceCodeLocation?.attrs?.[name];
            return {
              kind: "attribute",
              path,
              name,
              inputRange: position
                ? {
                    accuracy: "exact",
                    start: position.startOffset,
                    end: position.endOffset,
                  }
                : {
                    accuracy: "unavailable",
                    reason: "Parser supplied no attribute position",
                  },
            };
          },
          warnings,
          PunctaConfigError,
        );
        if (childScope !== parent)
          contextText.enter(scopeTransform(childScope));
        if (childScope.protected) contextText.boundary("opaque");
        if (!childScope.protected)
          node.childNodes.forEach((child, index) => {
            visit(child, [...path, index], childScope);
          });
        if (childScope !== parent) contextText.leave();
      }
      if (boundary) contextText.boundary(boundary);
    } else if ("childNodes" in node)
      node.childNodes.forEach((child, index) => {
        visit(child, [...path, index], parent);
      });
  }
  fragment.childNodes.forEach((node, index) => {
    if (!scope.protected) visit(node, [index], scope);
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
  warnings.push(
    ...contextText.warnings.map((warning) =>
      warning.location.kind === "text"
        ? {
            ...warning,
            location: {
              kind: "text" as const,
              ranges: warning.location.ranges.map((range) => ({
                ...range,
                inputRange: mappings[range.sourceId](range.start, range.end),
              })),
            },
          }
        : warning,
    ),
  );
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
