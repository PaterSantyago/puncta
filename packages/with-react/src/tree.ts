import { PunctaConfigError, type PunctaWarning } from "@use-puncta/core";
import {
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  Suspense,
} from "react";
import {
  elementSemantics,
  protectsHost,
  unsupportedElement,
} from "../../shared/elements.js";
import { hostScope, type Scope, scopeTransform } from "../../shared/scopes.js";
import { TextContext } from "../../shared/text-context.js";
import type { ReactResult } from "./pure.js";

// React serializes these children as text, not as an element subtree.
const textOnlyHosts = new Set(["script", "style", "textarea", "title"]);

type ChildProps = { children?: ReactNode; fallback?: ReactNode };

/** Variadic children preserve React's static-sibling key validation. Passing the
 * rebuilt array as one argument would turn valid static siblings into a list. */
function cloneChildren(
  node: ReactElement<ChildProps>,
  children: ReactNode,
  props?: Partial<ChildProps>,
): ReactElement<ChildProps> {
  if (!Array.isArray(children)) return cloneElement(node, props, children);
  const result = cloneElement(node, props, ...children);
  // cloneElement collapses zero/one variadic children; retain the input array shape.
  return children.length > 1 ? result : cloneElement(result, { children });
}

export function transformTree(
  children: ReactNode,
  scope: Scope,
  transformText = true,
  wrapScope?: (scope: Scope, children: ReactNode) => ReactNode,
): ReactResult {
  if (scope.protected)
    return {
      result: children,
      sources: [],
      edits: [],
      hasEdits: false,
      appliedRules: [],
      warnings: [],
    };
  const context = new TextContext(scopeTransform(scope));
  const warnings: PunctaWarning[] = [];
  function visit(
    node: ReactNode,
    path: ReactResult["sources"][number]["path"],
    parent: Scope,
  ): () => ReactNode {
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      const original = String(node);
      const value =
        transformText && !parent.protected
          ? context.append(original, path)
          : () => original;
      return () => (value() === original ? node : value());
    }
    if (Array.isArray(node)) {
      const children = node.map((child, index) =>
        visit(child, [...path, index], parent),
      );
      return () => children.map((child) => child());
    }
    if (node == null || typeof node === "boolean") return () => node;
    if (!isValidElement<ChildProps>(node)) {
      context.boundary("opaque");
      return () => node;
    }
    if (node.type === Suspense) {
      context.boundary("block");
      const children = visit(
        node.props.children,
        [...path, "children"],
        parent,
      );
      context.boundary("block");
      const fallback = visit(
        node.props.fallback,
        [...path, "fallback"],
        parent,
      );
      context.boundary("block");
      return () => cloneChildren(node, children(), { fallback: fallback() });
    }
    if (node.type !== Fragment && typeof node.type !== "string") {
      context.boundary("opaque");
      return () => node;
    }
    const semantics =
      node.type === Fragment
        ? { protected: false }
        : elementSemantics(node.type as string);
    const hostProtected =
      node.type !== Fragment && protectsHost(node.props, "react");
    if (semantics.unsupported && !parent.protected && !hostProtected)
      warnings.push(
        unsupportedElement(
          node.type as string,
          "http://www.w3.org/1999/xhtml",
          parent.locale,
          { kind: "element", path },
        ),
      );
    const boundary =
      semantics.boundary ?? (hostProtected ? "opaque" : undefined);
    if (boundary) context.boundary(boundary);
    const childScope =
      semantics.protected || parent.protected || hostProtected
        ? { ...parent, protected: true }
        : node.type === Fragment
          ? parent
          : hostScope(
              parent,
              node.props,
              (name) => ({ kind: "attribute", path, name }),
              warnings,
              PunctaConfigError,
            );
    if (childScope !== parent) context.use(scopeTransform(childScope));
    const children =
      "children" in node.props
        ? childScope.protected
          ? () => node.props.children
          : visit(node.props.children, [...path, "children"], childScope)
        : undefined;
    if (childScope !== parent) context.use(scopeTransform(parent));
    if (boundary) context.boundary(boundary);
    return () => {
      if (!children) return node;
      const result = children();
      return cloneChildren(
        node,
        wrapScope && !textOnlyHosts.has(node.type as string)
          ? wrapScope(childScope, result)
          : result,
      );
    };
  }
  const resultTree = visit(children, [], scope);
  context.finish();
  const { sources, edits, appliedRules } = context;
  const result = resultTree();
  return {
    result,
    sources,
    edits,
    hasEdits: edits.length > 0,
    appliedRules,
    warnings,
  };
}
