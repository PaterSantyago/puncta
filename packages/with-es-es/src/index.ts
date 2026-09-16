import type { Locale } from "@use-puncta/core";
import metadata from "../package.json" with { type: "json" };

/** A synchronously ready locale module; no global registration. */
export const esEs = Object.freeze({
  id: "es-es",
  version: metadata.version,
  [Symbol.for("@use-puncta/locale-format")]: 1,
}) as unknown as Locale;
