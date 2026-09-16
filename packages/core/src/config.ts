import type { ConfigLocation } from "./types.js";
export class PunctaConfigError extends Error {
  readonly name = "PunctaConfigError";
  constructor(
    readonly code: string,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
    readonly optionPath: readonly (string | number)[] = [],
    readonly location: ConfigLocation = {
      kind: "unavailable",
      reason: "Configuration argument",
    },
  ) {
    super(message);
  }
}
export function invalidOption(
  path: readonly (string | number)[],
  reason: "required" | "type" | "value" | "unknown",
): never {
  throw new PunctaConfigError(
    "config.invalid-option",
    "Invalid option.",
    { reason },
    path,
  );
}
export function checkObject(
  value: unknown,
  allowed: readonly string[],
  path: readonly (string | number)[] = [],
): void {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalidOption(path, value === undefined ? "required" : "type");
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) invalidOption([...path, key], "unknown");
}
