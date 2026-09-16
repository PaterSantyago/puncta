export type LocaleId = "en-gb" | "es-es";
declare const localeBrand: unique symbol;
/** Ready-to-use locale supplied by a Puncta locale package. */
export interface Locale {
  readonly id: LocaleId;
  readonly version: string;
  readonly [localeBrand]: true;
}

/** The options implemented by the first ellipsis slice. */
export interface PunctaOptions {
  readonly locale?: LocaleId;
}
export interface TextOptions extends PunctaOptions {
  readonly detailed?: boolean;
}
export interface HtmlOptions extends TextOptions {
  readonly mode?: "fragment";
  readonly context?: "div";
}
export type RuleId = "ellipsis";
export interface Source {
  readonly id: number;
  readonly text: string;
  readonly path: readonly (number | "children" | "fallback")[];
}
export type InputRange =
  | {
      readonly accuracy: "exact" | "covering";
      readonly start: number;
      readonly end: number;
    }
  | { readonly accuracy: "unavailable"; readonly reason: string };
export interface TextRange {
  readonly sourceId: number;
  readonly start: number;
  readonly end: number;
}
export interface HtmlRange extends TextRange {
  readonly inputRange: InputRange;
}
export interface Edit<Range = TextRange> {
  readonly kind: "replace";
  readonly before: string;
  readonly after: string;
  readonly locale: LocaleId;
  readonly ruleIds: readonly RuleId[];
  readonly ranges: readonly Range[];
}
export interface AppliedRule {
  readonly ruleId: RuleId;
  readonly locale: LocaleId;
}
export interface PunctaWarning {
  readonly code: string;
  readonly source: "rule" | "markup" | "parser";
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly locale: LocaleId | null;
  readonly ruleId: RuleId | null;
  readonly location:
    | { readonly kind: "input"; readonly start: number; readonly end: number }
    | { readonly kind: "unavailable"; readonly reason: string };
}
export interface TextResult {
  readonly result: string;
  readonly hasEdits: boolean;
  readonly outputChanged: boolean;
  readonly edits: readonly Edit[];
  readonly sources: readonly Source[];
  readonly appliedRules: readonly AppliedRule[];
  readonly warnings: readonly PunctaWarning[];
}
export interface HtmlResult extends Omit<TextResult, "edits"> {
  readonly edits: readonly Edit<HtmlRange>[];
}
export interface PunctaInstance {
  text(source: string, options: TextOptions & { detailed: true }): TextResult;
  text(source: string, options?: TextOptions & { detailed?: false }): string;
  text(source: string, options: TextOptions): string | TextResult;
  html(source: string, options: HtmlOptions & { detailed: true }): HtmlResult;
  html(source: string, options?: HtmlOptions & { detailed?: false }): string;
  html(source: string, options: HtmlOptions): string | HtmlResult;
}
