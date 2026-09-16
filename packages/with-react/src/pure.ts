import {
  PunctaConfigError,
  type PunctaInstance,
  type TextOptions,
  type TextResult,
} from "@use-puncta/core";
import { cloneElement, Fragment, isValidElement, type ReactNode } from "react";

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
  const sources: ReactResult["sources"][number][] = [];
  const edits: ReactResult["edits"][number][] = [];
  const appliedRules: ReactResult["appliedRules"][number][] = [];
  function visit(
    node: ReactNode,
    path: ReactResult["sources"][number]["path"],
  ): ReactNode {
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      const id = sources.length;
      const text = String(node);
      sources.push({ id, text, path });
      const report = instance.text(text, { ...call, detailed: true });
      for (const edit of report.edits)
        edits.push({
          ...edit,
          ranges: edit.ranges.map((range) => ({ ...range, sourceId: id })),
        });
      for (const rule of report.appliedRules)
        if (
          !appliedRules.some(
            (item) =>
              item.ruleId === rule.ruleId && item.locale === rule.locale,
          )
        )
          appliedRules.push(rule);
      return report.hasEdits ? report.result : node;
    }
    if (Array.isArray(node))
      return node.map((child, index) => visit(child, [...path, index]));
    if (!isValidElement<{ children?: ReactNode }>(node)) return node;
    if (node.type !== Fragment && typeof node.type !== "string") return node;
    if (
      typeof node.type === "string" &&
      ["code", "pre", "script", "style"].includes(node.type)
    )
      return node;
    if (!("children" in node.props)) return node;
    return cloneElement(
      node,
      undefined,
      visit(node.props.children, [...path, "children"]),
    );
  }
  const result = visit(children, []);
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
