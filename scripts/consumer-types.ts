// Copied into each installed consumer: only public package declarations resolve here.
import type { PunctaInstance, TextResult, HtmlResult } from "@use-puncta/core";
import {
  transformReact,
  stripSoftHyphensReact,
  type ReactResult,
} from "@use-puncta/with-react/pure";
import type { ReactNode } from "react";

declare const instance: PunctaInstance;
declare const detailed: boolean;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

const text = instance.text("");
const textFalse = instance.text("", { detailed: false });
const textTrue = instance.text("", { detailed: true });
const textBoolean = instance.text("", { detailed });
const html = instance.html("");
const htmlFalse = instance.html("", { detailed: false });
const htmlTrue = instance.html("", { detailed: true });
const htmlBoolean = instance.html("", { detailed });
const react = transformReact("", { instance });
const reactFalse = transformReact("", { instance, detailed: false });
const reactTrue = transformReact("", { instance, detailed: true });
const reactBoolean = transformReact("", { instance, detailed });
const strip = instance.stripSoftHyphens("");
const stripFalse = instance.stripSoftHyphens("", { detailed: false });
const stripTrue = instance.stripSoftHyphens("", { detailed: true });
const stripBoolean = instance.stripSoftHyphens("", { detailed });
const stripText = instance.stripSoftHyphens("", { format: "text", detailed });
const stripHtml = instance.stripSoftHyphens("", { format: "html" });
const stripHtmlFalse = instance.stripSoftHyphens("", {
  format: "html",
  detailed: false,
});
const stripHtmlTrue = instance.stripSoftHyphens("", {
  format: "html",
  detailed: true,
});
const stripHtmlBoolean = instance.stripSoftHyphens("", {
  format: "html",
  detailed,
});
const stripReact = stripSoftHyphensReact("", { instance });
const stripReactFalse = stripSoftHyphensReact("", {
  instance,
  detailed: false,
});
const stripReactTrue = stripSoftHyphensReact("", { instance, detailed: true });
const stripReactBoolean = stripSoftHyphensReact("", { instance, detailed });

export type ExactInstalledOverloads = [
  Expect<Equal<typeof text, string>>,
  Expect<Equal<typeof textFalse, string>>,
  Expect<Equal<typeof textTrue, TextResult>>,
  Expect<Equal<typeof textBoolean, string | TextResult>>,
  Expect<Equal<typeof html, string>>,
  Expect<Equal<typeof htmlFalse, string>>,
  Expect<Equal<typeof htmlTrue, HtmlResult>>,
  Expect<Equal<typeof htmlBoolean, string | HtmlResult>>,
  Expect<Equal<typeof react, ReactNode>>,
  Expect<Equal<typeof reactFalse, ReactNode>>,
  Expect<Equal<typeof reactTrue, ReactResult>>,
  Expect<Equal<typeof reactBoolean, ReactNode | ReactResult>>,
  Expect<Equal<typeof strip, string>>,
  Expect<Equal<typeof stripFalse, string>>,
  Expect<Equal<typeof stripTrue, TextResult>>,
  Expect<Equal<typeof stripBoolean, string | TextResult>>,
  Expect<Equal<typeof stripText, string | TextResult>>,
  Expect<Equal<typeof stripHtml, string>>,
  Expect<Equal<typeof stripHtmlFalse, string>>,
  Expect<Equal<typeof stripHtmlTrue, HtmlResult>>,
  Expect<Equal<typeof stripHtmlBoolean, string | HtmlResult>>,
  Expect<Equal<typeof stripReact, ReactNode>>,
  Expect<Equal<typeof stripReactFalse, ReactNode>>,
  Expect<Equal<typeof stripReactTrue, ReactResult>>,
  Expect<Equal<typeof stripReactBoolean, ReactNode | ReactResult>>,
];
