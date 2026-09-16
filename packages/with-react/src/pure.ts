import {
  PunctaConfigError,
  type PunctaInstance,
  type TextOptions,
  type TextResult,
} from "@use-puncta/core";
import type { ReactNode } from "react";
import {
  instanceScope,
  removalScope,
  requireInstance,
} from "../../shared/scopes.js";
import { transformTree } from "./tree.js";

export interface ReactTransformOptions extends Omit<TextOptions, "protect"> {
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
  return transform(children, options, (instance, settings) =>
    instanceScope(instance.with(settings)),
  );
}

export function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed: true },
): ReactResult;
export function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions & { detailed?: false },
): ReactNode;
export function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult;
export function stripSoftHyphensReact(
  children: ReactNode,
  options: ReactTransformOptions,
): ReactNode | ReactResult {
  return transform(children, options, removalScope);
}

function transform(
  children: ReactNode,
  options: ReactTransformOptions,
  scopeFor: typeof removalScope,
): ReactNode | ReactResult {
  requireInstance(options?.instance, PunctaConfigError);
  const { instance, detailed, ...settings } = options;
  // Shared-only validation excludes protect/mode/context/format from React.
  const scope = scopeFor(instance, settings);
  scope.instance.text("", { detailed });
  const report = transformTree(children, scope);
  return detailed ? report : report.result;
}
