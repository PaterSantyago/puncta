"use client";

import {
  PunctaConfigError,
  type PunctaInstance,
  type PunctaOptions,
} from "@use-puncta/core";
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";
import {
  instanceScope,
  requireInstance,
  type Scope,
} from "../../shared/scopes.js";
import { transformTree } from "./tree.js";

export interface PunctaProps {
  readonly children?: ReactNode;
  readonly instance?: PunctaInstance;
  readonly locale?: PunctaOptions["locale"];
  readonly enabled?: boolean;
  readonly options?: Pick<PunctaOptions, "rules" | "hyphenation">;
}
export type PunctaProviderProps = PunctaProps;
const Context = createContext<Scope | null>(null);

function invalid(path: string[], reason: string): never {
  throw new PunctaConfigError(
    "config.invalid-option",
    "Invalid component option.",
    { reason },
    path,
  );
}
function useScope(props: PunctaProps): Scope {
  const parent = useContext(Context);
  for (const key of Object.keys(props))
    if (!["children", "instance", "locale", "enabled", "options"].includes(key))
      invalid([key], "unknown");
  if (parent && props.instance !== undefined)
    throw new PunctaConfigError(
      "instance.nested",
      "An instance is forbidden inside Puncta Context.",
      {},
      ["instance"],
    );
  const instance = parent?.instance ?? props.instance;
  requireInstance(instance, PunctaConfigError);
  if (props.options !== undefined) {
    if (
      !props.options ||
      typeof props.options !== "object" ||
      Array.isArray(props.options)
    )
      invalid(["options"], "type");
    for (const key of Object.keys(props.options))
      if (key !== "rules" && key !== "hyphenation")
        invalid(["options", key], "unknown");
  }
  // Always validate a running component's own arguments, even inside protection.
  const resolved = instanceScope(
    instance.with({
      ...props.options,
      locale: props.locale,
      enabled: props.enabled,
    }),
  );
  return {
    ...resolved,
    locale:
      props.locale === undefined && parent ? parent.locale : resolved.locale,
    protected: !!parent?.protected || resolved.protected,
  };
}

function provide(scope: Scope, children: ReactNode): ReactNode {
  return Array.isArray(children)
    ? createElement(Context.Provider, { value: scope }, ...children)
    : createElement(Context.Provider, { value: scope }, children);
}

export function Puncta(props: PunctaProps): ReactNode {
  const scope = useScope(props);
  return provide(
    scope,
    transformTree(props.children, scope, true, provide).result,
  );
}

/** Settings and ownership only: immediate text remains the original input. */
export function PunctaProvider(props: PunctaProviderProps): ReactNode {
  const scope = useScope(props);
  return provide(
    scope,
    transformTree(props.children, scope, false, provide).result,
  );
}
