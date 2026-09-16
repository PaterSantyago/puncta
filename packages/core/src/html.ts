import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  html,
  parse,
  type ParserOptions,
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
import { invalidOption, PunctaConfigError } from "./config.js";
import { htmlSourceMap } from "./html-source.js";
import type { HtmlOptions, HtmlResult, PunctaWarning } from "./types.js";

/** Parsing context affects the parser, without adding an ancestor or wrapper. */
export function transformHtml(
  source: string,
  scope: Scope,
  options: HtmlOptions,
): HtmlResult {
  const warnings: PunctaWarning[] = [];
  const context = options.context ?? "div";
  if (
    options.context !== undefined &&
    (options.mode === "document" ||
      typeof options.context !== "string" ||
      options.context === "svg" ||
      options.context === "math" ||
      elementSemantics(options.context).unsupported)
  )
    invalidOption(["context"], "value");
  const parserOptions: ParserOptions<DefaultTreeAdapterMap> = {
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
  };
  const fragmentContext = defaultTreeAdapter.createElement(
    context,
    html.NS.HTML,
    [],
  );
  const tree =
    options.mode === "document"
      ? parse(source, parserOptions)
      : parseFragment(fragmentContext, source, parserOptions);
  // parseFragment detaches its children from the context. Restore that parent
  // only for serialization/decoding semantics, keeping paths and the tree intact.
  const treeAdapter = {
    ...defaultTreeAdapter,
    getParentNode(node: DefaultTreeAdapterMap["node"]) {
      const parent = defaultTreeAdapter.getParentNode(node);
      return options.mode !== "document" && parent === tree
        ? fragmentContext
        : parent;
    },
  };
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
  tree.childNodes.forEach((node, index) => {
    if (!scope.protected) visit(node, [index], scope);
  });
  contextText.finish();
  const { sources, appliedRules } = contextText;
  const mappings = leaves.map((node, index) => {
    const parent = treeAdapter.getParentNode(node);
    const rawText =
      parent &&
      defaultTreeAdapter.isElementNode(parent) &&
      parent.namespaceURI === html.NS.HTML &&
      html.hasUnescapedText(parent.tagName, true);
    return htmlSourceMap(
      source,
      sources[index].text,
      node.sourceCodeLocation,
      !rawText,
    );
  });
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
  const result = serialize(tree, { treeAdapter });
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
