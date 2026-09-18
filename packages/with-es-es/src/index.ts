import type { Locale } from "@use-puncta/core";
import { freezeResource } from "../../shared/hyphenation-resource.js";
import metadata from "../package.json" with { type: "json" };
import table from "./hyphenation.json" with { type: "json" };

/** A synchronously ready locale module; no global registration. */
export const esEs = Object.freeze({
  id: "es-es",
  version: metadata.version,
  [Symbol.for("@use-puncta/locale-format")]: 1,
  [Symbol.for("@use-puncta/hyphenation")]: freezeResource({
    format: 1,
    locale: "es-es",
    localeVersion: metadata.version,
    revision: "es-es-1",
    table,
  }),
}) as unknown as Locale;
