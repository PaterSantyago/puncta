import { createElement as h, Suspense, useEffect } from "react";
import { createPuncta } from "../../packages/core/dist/index.mjs";
import { enGb } from "../../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../../packages/with-es-es/dist/index.mjs";
import {
  Puncta,
  PunctaProvider,
} from "../../packages/with-react/dist/index.mjs";

export const expected = {
  shell: "‘back\u00adbone 24\u00a0kg…’",
  fallback: "«Ya…»",
  content: "«ca\u00admi\u00adno 50\u00a0%…»",
  protected: '"backbone 24kg..."',
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
  });
  function Content() {
    gate.read();
    useEffect(onHydrated, []);
    return h(
      Puncta,
      { locale: "es-es" },
      h("p", { id: "content" }, '"camino 50%..."'),
    );
  }
  return h(
    PunctaProvider,
    { instance },
    h(ShellReady),
    h(
      Puncta,
      null,
      h("p", { id: "shell" }, '"back', h("em", null, "bone"), ' 24kg..."'),
      h(
        Suspense,
        {
          fallback: h(
            Puncta,
            { locale: "es-es" },
            h("p", { id: "fallback" }, '"Ya..."'),
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
          '"backbone 24kg..."',
        ),
      ),
    ),
  );
}
export function documentTree(children) {
  return h(
    "html",
    null,
    h("head", null, h("title", null, "Puncta hydration")),
    h(
      "body",
      null,
      h("div", { id: "root" }, children),
      h("script", { src: "/hydration-client.js" }),
    ),
  );
}
