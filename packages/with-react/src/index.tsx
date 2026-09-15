import { type Locale, localeId } from "@use-puncta/core";

export interface PunctaProps {
  readonly locale: Locale;
}

/** Technical scaffold that displays the explicitly supplied locale identifier. */
export function Puncta({ locale }: PunctaProps) {
  return <span>{localeId(locale)}</span>;
}
