import { act, createElement as h, StrictMode, useState } from "react";
import { hydrateRoot } from "../../examples/ssr/node_modules/react-dom/client.js";
import { renderToString } from "../../examples/ssr/node_modules/react-dom/server.browser.js";
import { createPuncta } from "../../packages/core/dist/index.mjs";
import { enGb } from "../../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../../packages/with-es-es/dist/index.mjs";
import {
  Puncta,
  PunctaProvider,
} from "../../packages/with-react/dist/index.mjs";

const instance = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const check = (actual, expected) => {
  if (actual !== expected)
    throw new Error(
      `Grouping: expected ${String(expected)}, got ${String(actual)}`,
    );
};
function Counter({ source }) {
  const [count, setCount] = useState(0);
  return h(
    "button",
    { type: "button", onClick: () => setCount((value) => value + 1) },
    h(Puncta, null, source),
    ` | ${count}`,
  );
}
export async function runGroupingCheck() {
  const ref = { current: null };
  const view = ({
    locale = "en-gb",
    enabled = true,
    minDigits = 4,
    normalizeExisting = true,
    source = "1,234; 12345; 12 345; 12\u202f345",
    reverse = false,
  } = {}) =>
    h(
      StrictMode,
      null,
      h(
        PunctaProvider,
        {
          instance,
          locale,
          options: {
            rules: { digitGrouping: { enabled, minDigits, normalizeExisting } },
          },
        },
        h(
          Puncta,
          null,
          (reverse ? ["other", "number"] : ["number", "other"]).map((key) =>
            h(
              "span",
              { key, ref: key === "number" ? ref : null },
              key === "number" ? h(Counter, { source }) : "other",
            ),
          ),
        ),
      ),
    );
  const container = document.createElement("div");
  container.innerHTML = renderToString(view());
  document.body.append(container);
  const span = container.firstChild;
  const button = container.querySelector("button");
  const text = button.firstChild;
  const errors = [];
  let root;
  try {
    check(
      button.textContent,
      "1\u202f234; 12\u202f345; 12\u202f345; 12\u202f345 | 0",
    );
    await act(() => {
      root = hydrateRoot(container, view(), {
        onRecoverableError: (error) => errors.push(error.message),
      });
    });
    check(container.querySelector("button"), button);
    check(button.firstChild, text);
    check(ref.current, span);
    await act(() => button.click());
    const updates = [
      [
        { source: '"12345-67890kg..."; 12,345.00; 12345%' },
        "‘12\u202f345–67\u202f890\u00a0kg…’; 12\u202f345.00; 12\u202f345% | 1",
      ],
      [
        { source: '"12345-67890kg..."; 12 345,00; 12345%', locale: "es-es" },
        "«12\u202f345–67\u202f890\u00a0kg…»; 12\u202f345,00; 12\u202f345\u00a0% | 1",
      ],
      [
        { source: '"12345-67890kg..."; 12,345.00; 12345%', enabled: false },
        "‘12345–67890\u00a0kg…’; 12,345.00; 12345% | 1",
      ],
      [{ enabled: false }, "1,234; 12345; 12 345; 12\u202f345 | 1"],
      [
        { normalizeExisting: false },
        "1,234; 12\u202f345; 12 345; 12\u202f345 | 1",
      ],
      [{ minDigits: 6 }, "1,234; 12345; 12 345; 12\u202f345 | 1"],
      [{ locale: "es-es" }, "1,234; 12\u202f345; 12\u202f345; 12\u202f345 | 1"],
      [{ source: 987654321 }, "987\u202f654\u202f321 | 1"],
      [
        { source: 12345678901234567890n },
        "12\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890 | 1",
      ],
      [{ source: 1e21 }, "1e+21 | 1"],
      [{ source: 987654321, enabled: false }, "987654321 | 1"],
      [
        { reverse: true },
        "1\u202f234; 12\u202f345; 12\u202f345; 12\u202f345 | 1",
      ],
      [{}, "1\u202f234; 12\u202f345; 12\u202f345; 12\u202f345 | 1"],
    ];
    for (const [props, expected] of updates) {
      await act(() => root.render(view(props)));
      check(button.textContent, expected);
      check(container.querySelector("button"), button);
      check(button.firstChild, text);
      check(ref.current, span);
      check(container.querySelectorAll("*").length, 3);
    }
    check(errors.length, 0);
    return {
      groupingUpdates: updates.length,
      groupingHydrationAndIdentity: true,
    };
  } finally {
    if (root) await act(() => root.unmount());
    container.remove();
  }
}
