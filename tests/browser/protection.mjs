import { act, createElement as h, StrictMode, useState } from "react";
import { createRoot } from "../../examples/ssr/node_modules/react-dom/client.js";
import { createPuncta } from "../../packages/core/dist/index.mjs";
import { enGb } from "../../packages/with-en-gb/dist/index.mjs";
import {
  Puncta,
  PunctaProvider,
} from "../../packages/with-react/dist/index.mjs";

const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
function check(value, expected) {
  if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`);
}
function Card({ id, buttonRef }) {
  const [count, setCount] = useState(0);
  return h(
    "button",
    {
      ref: buttonRef,
      type: "button",
      "data-card": id,
      onClick: () => setCount((value) => value + 1),
    },
    h(Puncta, { enabled: true }, `${id}...`),
    ` ${count}`,
  );
}

export async function runProtectionCheck() {
  const container = document.createElement("div");
  document.body.append(container);
  let scenarios = 0;
  for (const Component of [Puncta, PunctaProvider]) {
    for (const hostProps of [
      { "data-puncta": "off" },
      { hidden: true },
      { contentEditable: true },
      {},
    ]) {
      const root = createRoot(container);
      const refs = { a: { current: null }, b: { current: null } };
      const protectedHost = Object.keys(hostProps).length > 0;
      function view(order) {
        return h(
          StrictMode,
          null,
          h(
            Component,
            { instance },
            order.map((id) =>
              h(
                "div",
                {
                  ...hostProps,
                  key: id,
                  title: `${id}...`,
                  suppressContentEditableWarning: true,
                },
                h(
                  "span",
                  null,
                  h("em", null, h(Card, { id, buttonRef: refs[id] })),
                ),
              ),
            ),
            h(Puncta, { key: "independent" }, "Outside..."),
          ),
        );
      }
      await act(() => root.render(view(["a", "b"])));
      const button = refs.a.current;
      await act(() => button.click());
      check(button.textContent, protectedHost ? "a... 1" : "a… 1");
      for (const order of [
        ["b", "a"],
        ["a", "b"],
        ["b", "a"],
      ]) {
        await act(() => root.render(view(order)));
        check(refs.a.current, button);
        check(button.textContent, protectedHost ? "a... 1" : "a… 1");
        check(container.querySelector("button").dataset.card, order[0]);
        check(container.querySelectorAll("*").length, 8);
        check(container.textContent.endsWith("Outside…"), true);
        check(button.parentElement.parentElement.parentElement.title, "a...");
      }
      await act(() => root.unmount());
      scenarios++;
    }
  }
  container.remove();
  return {
    protectionReorderScenarios: scenarios,
    deepStateAndRefsPreserved: true,
  };
}
