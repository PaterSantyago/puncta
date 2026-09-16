import {
  PunctaConfigError,
  type PunctaInstance,
  type TextOptions,
  type TextResult,
} from "@use-puncta/core";
import {
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
  Suspense,
} from "react";
import { elementSemantics } from "../../shared/elements.js";
import { TextContext } from "../../shared/text-context.js";

export interface ReactTransformOptions extends TextOptions {
  readonly instance: PunctaInstance;
}
export interface ReactResult
  extends Omit<TextResult, "result" | "outputChanged"> {
  readonly result: ReactNode;
}

export function transformReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed: true },
): ReactResult;
export function transformReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed?: false },
): ReactNode;
export function transformReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult;
export function transformReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult {
  if (!options?.instance)
    throw new PunctaConfigError(
      "instance.missing",
      "A Puncta instance is required.",
      {},
      ["instance"],
    );
  const { instance, ...call } = options;
  // Core validates shared options, including calls with no accessible text.
  instance.text("", call);
  const context = new TextContext((text) =>
    instance.text(text, { ...call, detailed: true }),
  );
  function visit(
    node: ReactNode,
    path: ReactResult["sources"][number]["path"],
  ): () => ReactNode {
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      const original = String(node);
      const value = context.append(original, path);
      return () => (value() === original ? node : value());
    }
    if (Array.isArray(node)) {
      const children = node.map((child, index) =>
        visit(child, [...path, index]),
      );
      return () => children.map((child) => child());
    }
    if (node == null || typeof node === "boolean") return () => node;
    if (!isValidElement<{ children?: ReactNode; fallback?: ReactNode }>(node)) {
      context.boundary("opaque");
      return () => node;
    }
    if (node.type === Suspense) {
      context.boundary("block");
      const children = visit(node.props.children, [...path, "children"]);
      context.boundary("block");
      const fallback = visit(node.props.fallback, [...path, "fallback"]);
      context.boundary("block");
      return () => cloneElement(node, { fallback: fallback() }, children());
    }
    if (node.type !== Fragment && typeof node.type !== "string") {
      context.boundary("opaque");
      return () => node;
    }
    const semantics =
      node.type === Fragment
        ? { protected: false }
        : elementSemantics(node.type as string);
    if (semantics.boundary) context.boundary(semantics.boundary);
    const children =
      !semantics.protected && "children" in node.props
        ? visit(node.props.children, [...path, "children"])
        : undefined;
    if (semantics.boundary) context.boundary(semantics.boundary);
    return () => (children ? cloneElement(node, undefined, children()) : node);
  }
  const resultTree = visit(children, []);
  context.finish();
  const { sources, edits, appliedRules } = context;
  const result = resultTree();
  return options.detailed
    ? {
        result,
        sources,
        edits,
        hasEdits: edits.length > 0,
        appliedRules,
        warnings: [],
      }
    : result;
}
