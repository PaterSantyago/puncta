export type LocaleId = "en-gb" | "es-es";
declare const localeBrand: unique symbol;
/** Ready-to-use locale supplied by a Puncta locale package. */
export interface Locale {
  readonly id: LocaleId;
  readonly version: string;
  readonly [localeBrand]: true;
}

export interface RuleOptions {
  readonly enabled?: boolean | null;
}
export interface RulesOptions {
  readonly quotes?:
    | (RuleOptions & { readonly normalizeExisting?: boolean | null })
    | null;
  readonly apostrophes?: RuleOptions | null;
  readonly spaces?: RuleOptions | null;
  readonly ellipsis?: RuleOptions | null;
  readonly dashes?:
    | (RuleOptions & { readonly normalizeExisting?: boolean | null })
    | null;
  readonly ranges?:
    | (RuleOptions & { readonly standalone?: boolean | null })
    | null;
  readonly minus?: RuleOptions | null;
  readonly units?:
    | (RuleOptions & { readonly additional?: readonly string[] | null })
    | null;
  readonly percentages?:
    | (RuleOptions & { readonly space?: "none" | "nbsp" | null })
    | null;
  readonly currencies?: RuleOptions | null;
}
export interface HyphenationOptions {
  readonly enabled?: boolean | null;
  readonly minWordLength?: number | null;
  readonly minLeft?: number | null;
  readonly minRight?: number | null;
}
/** Shared configuration; spaces and ellipsis currently transform text. */
export interface PunctaOptions {
  readonly locale?: LocaleId;
  readonly enabled?: boolean;
  readonly rules?: RulesOptions;
  readonly hyphenation?: HyphenationOptions | null;
}
export interface ProtectedRange {
  readonly start: number;
  readonly end: number;
}
export interface TextOptions extends PunctaOptions {
  readonly protect?: readonly ProtectedRange[];
  readonly detailed?: boolean;
}
export interface HtmlOptions extends Omit<TextOptions, "protect"> {
  readonly mode?: "fragment";
  readonly context?: "div";
}
export type RuleId = "spaces" | "ellipsis";
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
  readonly kind: "replace" | "insert" | "delete";
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
export type ConfigLocation =
  | {
      readonly kind: "element";
      readonly path: Source["path"];
      readonly inputRange?: InputRange;
    }
  | {
      readonly kind: "attribute";
      readonly path: Source["path"];
      readonly name: string;
      readonly inputRange?: InputRange;
    }
  | { readonly kind: "input"; readonly start: number; readonly end: number }
  | { readonly kind: "unavailable"; readonly reason: string };
export interface PunctaWarning {
  readonly code: string;
  readonly source: "rule" | "markup" | "parser";
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly locale: LocaleId | null;
  readonly ruleId: RuleId | null;
  readonly location:
    | ConfigLocation
    | {
        readonly kind: "text";
        readonly ranges: readonly (TextRange | HtmlRange)[];
      };
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
  with(overrides: PunctaOptions): PunctaInstance;
  text(source: string, options: TextOptions & { detailed: true }): TextResult;
  text(source: string, options?: TextOptions & { detailed?: false }): string;
  text(source: string, options: TextOptions): string | TextResult;
  html(source: string, options: HtmlOptions & { detailed: true }): HtmlResult;
  html(source: string, options?: HtmlOptions & { detailed?: false }): string;
  html(source: string, options: HtmlOptions): string | HtmlResult;
}
