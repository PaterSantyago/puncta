import {
  PunctaConfigError,
  type PunctaInstance,
  type TextOptions,
  type TextResult,
} from "@use-puncta/core";
import type { ReactNode } from "react";
import { instanceScope, requireInstance } from "../../shared/scopes.js";
import { transformTree } from "./tree.js";

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
  requireInstance(options?.instance, PunctaConfigError);
  const { instance, ...call } = options;
  // Core validates shared options, including calls with no accessible text.
  instance.text("", call);
  const { detailed: _detailed, ...settings } = call;
  const report = transformTree(
    children,
    instanceScope(instance.with(settings)),
  );
  return options.detailed ? report : report.result;
}
