import type { Locale } from "@use-puncta/core";
import { freezeResource } from "../../shared/hyphenation-resource.js";
import metadata from "../package.json" with { type: "json" };
import table from "./hyphenation.json" with { type: "json" };

/** A synchronously ready locale module; no global registration. */
export const enGb = Object.freeze({
  id: "en-gb",
  version: metadata.version,
  [Symbol.for("@use-puncta/locale-format")]: 1,
  [Symbol.for("@use-puncta/hyphenation")]: freezeResource({
    format: 1,
    locale: "en-gb",
    localeVersion: metadata.version,
    revision: "en-gb-1",
    table,
  }),
}) as unknown as Locale;
