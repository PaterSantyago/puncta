/** Technical scaffold contract; locales are passed explicitly. */
export interface Locale {
  readonly id: string;
}

export function localeId(locale: Locale): string {
  return locale.id;
}
