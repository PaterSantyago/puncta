import { createElement as h, Suspense, useEffect } from "react";
import { createPuncta } from "../../packages/core/dist/index.mjs";
import { enGb } from "../../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../../packages/with-es-es/dist/index.mjs";
import {
  Puncta,
  PunctaProvider,
} from "../../packages/with-react/dist/index.mjs";

export const expected = {
  shell:
    "‘back\u00adbone 12\u202f345–67\u202f890\u00a0kg…’ 12\u202f345; 12\u202f345",
  fallback: "«Ya…» 67\u202f890–123\u202f456\u00a0kg",
  content:
    "«ca\u00admi\u00adno 12\u202f345\u00a0%…» 12,345; 123\u202f456\u202f789\u202f012\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890",
  protected: '"backbone 24kg..." 12345',
};
export function createGate(ready = false) {
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return {
    read() {
      if (!ready) throw promise;
    },
    release() {
      ready = true;
      release();
    },
  };
}
export function tree(gate, onHydrated = () => {}, onShellHydrated = () => {}) {
  function ShellReady() {
    useEffect(onShellHydrated, []);
    return null;
  }
  const instance = createPuncta({
    locales: [enGb, esEs],
    locale: "en-gb",
    hyphenation: { enabled: true },
    rules: { digitGrouping: { enabled: true } },
  });
  function Content() {
    gate.read();
    useEffect(onHydrated, []);
    return h(
      Puncta,
      { locale: "es-es" },
      h(
        "p",
        { id: "content" },
        '"camino 12345%..." 12,345; ',
        123456789012345678901234567890n,
      ),
    );
  }
  return h(
    PunctaProvider,
    { instance },
    h(ShellReady),
    h(
      Puncta,
      null,
      h(
        "p",
        { id: "shell" },
        '"back',
        h("em", null, "bone"),
        ' 12345-67890kg..." ',
        12345,
        "; 12,345",
      ),
      h(
        Suspense,
        {
          fallback: h(
            Puncta,
            { locale: "es-es" },
            h("p", { id: "fallback" }, '"Ya..." ', 67890, "–123456kg"),
          ),
        },
        h(Content),
      ),
      h(
        "p",
        { id: "protected", "data-puncta": "off" },
        h(
          Puncta,
          { enabled: true, options: { hyphenation: { enabled: true } } },
          '"backbone 24kg..." 12345',
        ),
      ),
    ),
  );
}
export function documentTree(children) {
  return h(
    "html",
    null,
    h(
      "head",
      null,
      h("title", null, "Puncta hydration"),
      // Linux WebKit CI did not commit the small pending HTTP document.
      // Supply a larger initial response outside the Puncta root.
      h("meta", { name: "stream-fixture-padding", content: ".".repeat(4096) }),
    ),
    h(
      "body",
      null,
      h("div", { id: "root" }, children),
      h("script", { src: "/hydration-client.js" }),
    ),
  );
}
