import type { Locale } from "@use-puncta/core";
import metadata from "../package.json" with { type: "json" };

/** A synchronously ready locale module; no global registration. */
export const enGb = Object.freeze({
  id: "en-gb",
  version: metadata.version,
  [Symbol.for("@use-puncta/locale-format")]: 1,
}) as unknown as Locale;
