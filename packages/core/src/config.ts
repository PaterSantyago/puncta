export class PunctaConfigError extends Error {
  readonly name = "PunctaConfigError";
  readonly location = {
    kind: "unavailable",
    reason: "Configuration argument",
  } as const;
  constructor(
    readonly code: string,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
    readonly optionPath: readonly (string | number)[] = [],
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
export function checkObject(value: unknown, allowed: readonly string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalidOption([], value === undefined ? "required" : "type");
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) invalidOption([key], "unknown");
}
