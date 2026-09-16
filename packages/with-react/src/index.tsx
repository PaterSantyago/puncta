"use client";

import type { LocaleId, PunctaInstance } from "@use-puncta/core";
import type { ReactNode } from "react";
import { transformReact } from "./pure.js";

/** Standalone ellipsis component. Context/Provider support is a later slice. */
export interface PunctaProps {
  readonly children?: ReactNode;
  readonly instance: PunctaInstance;
  readonly locale?: LocaleId;
}

export function Puncta({ children, instance, locale }: PunctaProps): ReactNode {
  return transformReact(children, { instance, locale });
}
