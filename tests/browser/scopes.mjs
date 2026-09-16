import { act, createElement as h, StrictMode, useState } from "react";
import {
  createRoot,
  hydrateRoot,
} from "../../examples/ssr/node_modules/react-dom/client.js";
import { renderToString } from "../../examples/ssr/node_modules/react-dom/server.browser.js";
import { createPuncta } from "../../packages/core/dist/index.mjs";
import { enGb } from "../../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../../packages/with-es-es/dist/index.mjs";
import {
  Puncta,
  PunctaProvider,
} from "../../packages/with-react/dist/index.mjs";
import { runProtectionCheck } from "./protection.mjs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const instance = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const check = (value, expected) => {
  if (value !== expected)
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`,
    );
};
function Counter({ source }) {
  const [count, setCount] = useState(0);
  return h(
    "button",
    { type: "button", onClick: () => setCount((value) => value + 1) },
    h(Puncta, null, source),
    ` ${count}`,
  );
}
function view({
  lang = "en",
  marker,
  enabled = true,
  spaces = true,
  hyphenation = false,
  source = "Wait...",
} = {}) {
  return h(
    StrictMode,
    null,
    h(
      PunctaProvider,
      { instance },
      h(
        Puncta,
        {
          options: {
            hyphenation: hyphenation === null ? null : { enabled: hyphenation },
            rules: { ellipsis: { enabled }, spaces: { enabled: spaces } },
          },
        },
        h("span", { lang, "data-puncta": marker }, h(Counter, { source })),
      ),
    ),
  );
}
window.runScopesCheck = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() => root.render(view()));
  const button = container.querySelector("button");
  await act(() => button.click());
  check(container.textContent, "Wait… 1");
  const updates = [
    [{ lang: "es" }, "Wait… 1"],
    [{ marker: "" }, "Wait… 1"],
    [{ marker: "off" }, "Wait... 1"],
    [{ enabled: false }, "Wait... 1"],
    [{ source: "New..." }, "New… 1"],
    [{}, "Wait… 1"],
    [
      { source: '"backbone 24kg..."', hyphenation: true },
      "‘back\u00adbone 24\u00a0kg…’ 1",
    ],
    [
      { source: '"backbone 24kg..."', hyphenation: null },
      "‘backbone 24\u00a0kg…’ 1",
    ],
    [{ source: '"Hola..."', lang: "es" }, "«Hola…» 1"],
    [{ source: '"Hola..."', lang: "en" }, "‘Hola…’ 1"],
    [{ source: "Hello ,  world..." }, "Hello, world… 1"],
    [{ source: "Hello ,  world...", spaces: false }, "Hello ,  world… 1"],
    [{ source: "¿ Hola ?", lang: "es" }, "¿Hola? 1"],
    [{ source: "¿ Hola ?", lang: "es", spaces: null }, "¿Hola? 1"],
  ];
  for (const [props, expected] of updates) {
    await act(() => root.render(view(props)));
    check(container.textContent, expected);
    check(container.querySelector("button"), button);
    check(container.querySelectorAll("*").length, 2);
  }
  await act(() => root.unmount());
  const server = renderToString(
    view({ lang: "es", source: "¿ Hola ?  Wait..." }),
  );
  container.innerHTML = server;
  const errors = [];
  let hydrated;
  await act(() => {
    hydrated = hydrateRoot(
      container,
      view({ lang: "es", source: "¿ Hola ?  Wait..." }),
      { onRecoverableError: (error) => errors.push(error.message) },
    );
  });
  check(container.textContent, "¿Hola? Wait… 0");
  check(errors.length, 0);
  await act(() => hydrated.unmount());
  container.remove();
  return {
    updates: updates.length,
    stateAndNodePreserved: true,
    hydrationErrors: errors,
    ...(await runProtectionCheck()),
  };
};
