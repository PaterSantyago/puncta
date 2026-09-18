import { mixedGrouping } from "./fixtures/digit-grouping.mjs";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { test } from "node:test";
import { createElement as h, Suspense } from "react";
import {
  renderToPipeableStream,
  renderToReadableStream,
  renderToString,
} from "../examples/ssr/node_modules/react-dom/server.node.js";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { Puncta, PunctaProvider } from "../packages/with-react/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

const make = (locale = "en-gb", options = {}) =>
  createPuncta({ locales: [enGb, esEs], locale, ...options });

// React alone invokes this component and retries it after the controlled promise.
function deferredContent() {
  const { promise, resolve } = Promise.withResolvers();
  let ready = false;
  let attempts = 0;
  function Delayed({ children }) {
    attempts++;
    if (!ready) throw promise;
    return children;
  }
  return {
    Delayed,
    get attempts() {
      return attempts;
    },
    release() {
      ready = true;
      resolve();
    },
  };
}

// Observe delivery, not allReady or React's internal completion state. Each waiter
// has a bounded failure and each test aborts its stream even if an assertion fails.
async function capture(t, renderer, content) {
  const tree = h("html", null, h("head"), h("body", null, content));
  let html = "";
  let allReady = false;
  const errors = [];
  const chunks = [];
  const listeners = new Set();
  const receive = (chunk) => {
    chunks.push(chunk);
    html += chunk;
    for (const listener of listeners) listener();
  };
  const completion = Promise.withResolvers();
  // Prevent a cleanup failure from becoming an unhandled rejection.
  completion.promise.catch(() => {});
  let abort;
  if (renderer === "pipeable") {
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        receive(chunk.toString());
        callback();
      },
    });
    destination.on("finish", completion.resolve);
    destination.on("error", completion.reject);
    const stream = renderToPipeableStream(tree, {
      onShellReady() {
        stream.pipe(destination);
      },
      onShellError: completion.reject,
      onAllReady() {
        allReady = true;
      },
      onError(error) {
        errors.push(error);
      },
    });
    abort = (reason) => stream.abort(reason);
    t.after(() => {
      stream.abort();
      destination.destroy();
    });
  } else {
    const controller = new AbortController();
    t.after(() => controller.abort());
    const stream = await renderToReadableStream(tree, {
      signal: controller.signal,
      onError(error) {
        errors.push(error);
      },
    });
    stream.allReady.then(() => {
      allReady = true;
    }, completion.reject);
    const decoder = new TextDecoder();
    (async () => {
      for await (const chunk of stream)
        receive(decoder.decode(chunk, { stream: true }));
      receive(decoder.decode());
    })().then(completion.resolve, completion.reject);
    abort = (reason) => controller.abort(reason);
  }
  return {
    chunks,
    errors,
    abort,
    done: completion.promise,
    get html() {
      return html;
    },
    get allReady() {
      return allReady;
    },
    async until(fragment) {
      if (html.includes(fragment)) return;
      const pending = Promise.withResolvers();
      const check = () => {
        if (html.includes(fragment)) pending.resolve();
      };
      listeners.add(check);
      const timer = setTimeout(
        () =>
          pending.reject(
            new Error(`Stream did not deliver ${fragment}: ${html}`),
          ),
        3000,
      );
      try {
        await pending.promise;
      } finally {
        clearTimeout(timer);
        listeners.delete(check);
      }
    },
  };
}

const source = '"backbone 24kg..."';
const expectedEnglish = "‘back\u00adbone 24\u00a0kg…’";

test("Node SSR transforms original children synchronously without browser globals", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(typeof document, "undefined");
  const children = h("p", null, source);
  const instance = make("en-gb", { hyphenation: { enabled: true } });
  const tree = h(Puncta, { instance }, children);
  assert.equal(renderToString(tree), `<p>${expectedEnglish}</p>`);
  assert.equal(renderToString(tree), `<p>${expectedEnglish}</p>`);
  assert.equal(children.props.children, source);
  assert.equal(
    renderToString(
      h(Puncta, { instance: instance.with({ hyphenation: null }) }, children),
    ),
    "<p>‘backbone 24\u00a0kg…’</p>",
  );
});

for (const renderer of ["pipeable", "readable"]) {
  test(`${renderer}: transformed shell is delivered while content is still suspended`, {
    timeout: 10000,
  }, async (t) => {
    const delayed = deferredContent();
    const tree = h(
      Puncta,
      { instance: make("en-gb", { hyphenation: { enabled: true } }) },
      h("p", { id: "shell" }, source),
      h(
        Suspense,
        { fallback: h("p", { id: "fallback" }, '"Wait 24kg..."') },
        h(
          delayed.Delayed,
          null,
          h(Puncta, null, h("p", { id: "content" }, source)),
        ),
      ),
      h("p", { id: "tail" }, '"Done..."'),
    );
    const stream = await capture(t, renderer, tree);
    await stream.until('<p id="tail">‘Done…’</p>');
    assert.ok(delayed.attempts > 0);
    assert.equal(stream.allReady, false);
    assert.ok(stream.html.includes(`<p id="shell">${expectedEnglish}</p>`));
    assert.ok(stream.html.includes('<p id="fallback">‘Wait 24\u00a0kg…’</p>'));
    assert.equal(stream.html.includes('id="content"'), false);
    const issued = stream.html;
    delayed.release();
    await stream.done;
    assert.ok(delayed.attempts >= 2);
    assert.ok(stream.html.startsWith(issued));
    assert.ok(stream.html.includes(`<p id="content">${expectedEnglish}</p>`));
    assert.equal(stream.allReady, true);
    assert.deepEqual(stream.errors, []);
  });
}

for (const renderer of ["pipeable", "readable"]) {
  test(`${renderer}: Suspense separates surrounding, content and fallback quotes and words`, {
    timeout: 10000,
  }, async (t) => {
    const delayed = deferredContent();
    const tree = h(
      Puncta,
      { instance: make("en-gb", { hyphenation: { enabled: true } }) },
      '"near back',
      h(
        Suspense,
        { fallback: h("span", { id: "fallback" }, '"Wait..."') },
        h("span", { id: "content" }, '"backbone 24kg..."'),
        h(delayed.Delayed, null),
      ),
      'bone near"',
    );
    const stream = await capture(t, renderer, tree);
    await stream.until("bone near&quot;");
    assert.ok(stream.html.includes("&quot;near back"));
    assert.ok(stream.html.includes('<span id="fallback">‘Wait…’</span>'));
    assert.equal(stream.allReady, false);
    const issued = stream.html;
    delayed.release();
    await stream.done;
    assert.ok(stream.html.startsWith(issued));
    assert.ok(
      stream.html.includes(`<span id="content">${expectedEnglish}</span>`),
    );
    assert.equal(stream.html.includes("‘near"), false);
    assert.equal(stream.html.includes("back\u00ad<!--"), false);
    assert.deepEqual(stream.errors, []);
  });

  test(`${renderer}: abort, retry and changed settings preserve sources and inherited protection`, {
    timeout: 10000,
  }, async (t) => {
    const delayed = deferredContent();
    function Card() {
      return h(
        PunctaProvider,
        { enabled: true },
        h(
          Puncta,
          {
            enabled: true,
            options: {
              hyphenation: { enabled: true },
              rules: { ellipsis: null },
            },
          },
          source,
        ),
      );
    }
    const original = h(
      "section",
      null,
      h("code", null, h(Card)),
      h("div", { "data-puncta": "off" }, h("span", null, h(Card))),
      h(
        PunctaProvider,
        { locale: "es-es" },
        h("i", null, source),
        h(Puncta, { options: { hyphenation: null } }, h("b", null, source)),
      ),
      h(
        Suspense,
        { fallback: h("p", { id: "waiting" }, '"Wait..."') },
        h(delayed.Delayed, null, h(Card)),
      ),
      h("p", { id: "outside" }, source),
    );
    const instance = make("en-gb", { hyphenation: { enabled: true } });
    const tree = h(Puncta, { instance }, original);
    const aborted = await capture(t, renderer, tree);
    await aborted.until('id="waiting"');
    assert.equal(aborted.allReady, false);
    const reason = new Error("intentional SSR cancellation");
    aborted.abort(reason);
    await aborted.done;
    assert.ok(aborted.errors.includes(reason));
    delayed.release();
    const retry = await capture(t, renderer, tree);
    await retry.done;
    assert.deepEqual(retry.errors, []);
    assert.ok(retry.html.includes("<code>&quot;backbone 24kg...&quot;</code>"));
    assert.ok(retry.html.includes("<span>&quot;backbone 24kg...&quot;</span>"));
    assert.ok(retry.html.includes("<i>&quot;backbone 24kg...&quot;</i>"));
    assert.ok(retry.html.includes("<b>«backbone 24\u00a0kg…»</b>"));
    assert.ok(retry.html.includes(`<p id="outside">${expectedEnglish}</p>`));
    const changed = renderToString(
      h(
        Puncta,
        {
          instance: instance.with({
            hyphenation: null,
            rules: { ellipsis: { enabled: false } },
          }),
        },
        original,
      ),
    );
    assert.ok(changed.includes('<p id="outside">‘backbone 24\u00a0kg...’</p>'));
    assert.equal(original.props.children.at(-1).props.children, source);
    assert.equal(
      renderToString(tree).includes(`<p id="outside">${expectedEnglish}</p>`),
      true,
    );
  });
}

test("parallel and reverse-order resumed requests isolate locales, settings and reports", {
  timeout: 10000,
}, async (t) => {
  const original = h("p", null, source);
  const cases = [
    {
      renderer: "pipeable",
      instance: make("en-gb", { hyphenation: { enabled: true } }),
      expected: expectedEnglish,
    },
    {
      renderer: "readable",
      instance: make("es-es"),
      expected: "«backbone 24\u00a0kg…»",
    },
    {
      renderer: "pipeable",
      instance: make("en-gb", { rules: { ellipsis: { enabled: false } } }),
      expected: "‘backbone 24\u00a0kg...’",
    },
    {
      renderer: "readable",
      instance: make("es-es", { rules: { quotes: { enabled: false } } }),
      expected: "&quot;backbone 24\u00a0kg…&quot;",
    },
  ];
  const requests = await Promise.all(
    cases.map(async ({ renderer, instance, expected }) => {
      const delayed = deferredContent();
      const report = transformReact(h("p", null, '"open...'), {
        instance,
        detailed: true,
      });
      const snapshot = JSON.stringify(report);
      const stream = await capture(
        t,
        renderer,
        h(
          PunctaProvider,
          { instance },
          h(Puncta, null, original),
          h(
            Suspense,
            { fallback: h("i", null, "waiting") },
            h(delayed.Delayed, null, h(Puncta, null, original)),
          ),
        ),
      );
      await stream.until("<i>waiting</i>");
      assert.ok(stream.html.includes(`<p>${expected}</p>`));
      assert.equal(stream.allReady, false);
      return { stream, delayed, report, snapshot, instance, expected };
    }),
  );
  for (const request of requests.toReversed()) {
    request.delayed.release();
    await request.stream.done;
    assert.equal(
      request.stream.html.split(`<p>${request.expected}</p>`).length - 1,
      2,
    );
    assert.deepEqual(request.stream.errors, []);
    assert.equal(JSON.stringify(request.report), request.snapshot);
    assert.deepEqual(
      transformReact(h("p", null, '"open...'), {
        instance: request.instance,
        detailed: true,
      }),
      request.report,
    );
  }
  assert.equal(original.props.children, source);
  for (const [index, { report }] of requests.entries()) {
    assert.deepEqual(report.sources, [
      { id: 0, text: '"open...', path: ["children"] },
    ]);
    assert.equal(
      report.warnings.some((warning) => warning.code === "quotes.unpaired"),
      index !== 3,
    );
  }
  requests[0].report.sources[0].text = "changed by caller";
  requests[0].report.warnings.length = 0;
  assert.equal(JSON.stringify(requests[1].report), requests[1].snapshot);
  assert.equal(
    transformReact('"open...', {
      instance: requests[0].instance,
      detailed: true,
    }).sources[0].text,
    '"open...',
  );
});

test("pure traversal never invokes components, promises or arbitrary iterators", () => {
  const forbidden = () => {
    throw new Error("opaque value was inspected");
  };
  // biome-ignore lint/suspicious/noThenProperty: intentionally hostile thenable detects awaiting opaque input.
  const thenable = { then: forbidden };
  const promise = new Promise(() => {});
  const iterable = { [Symbol.iterator]: forbidden };
  function Component() {
    return forbidden();
  }
  const component = h(Component);
  const instance = make();
  for (const opaque of [component, promise, thenable, iterable]) {
    const report = transformReact([".", opaque, ".."], {
      instance,
      detailed: true,
    });
    assert.equal(report.result[1], opaque);
    assert.equal(report.result[0], ".");
    assert.equal(report.result[2], "..");
    assert.equal(report.hasEdits, false);
    assert.deepEqual(
      report.sources.map(({ text }) => text),
      [".", ".."],
    );
  }
});

test("rendering never publishes typography diagnostics; explicit detailed calls remain repeatable", (t) => {
  const messages = [];
  for (const method of ["log", "warn", "error"])
    t.mock.method(console, method, (...args) => messages.push(args));
  const instance = make();
  const children = h("p", null, '"open...');
  const tree = h(Puncta, { instance }, children);
  assert.equal(renderToString(tree), "<p>&quot;open…</p>");
  assert.equal(renderToString(tree), "<p>&quot;open…</p>");
  const report = transformReact(children, { instance, detailed: true });
  assert.ok(report.warnings.some(({ code }) => code === "quotes.unpaired"));
  assert.deepEqual(
    transformReact(children, { instance, detailed: true }),
    report,
  );
  assert.deepEqual(messages, []);
});

test("all three server APIs preserve Spanish SHY and leaf ownership", {
  timeout: 10000,
}, async (t) => {
  const children = h("p", null, '"adhe', h("em", null, "sivo 24"), 'kg..."');
  const tree = h(
    Puncta,
    { instance: make("es-es", { hyphenation: { enabled: true } }) },
    children,
  );
  // Independent corpus analysis: adhe-si-vo. Both new seam insertions belong left.
  const expected = "<p>«adhe\u00ad<em>si\u00advo 24\u00a0</em>kg…»</p>";
  assert.equal(renderToString(tree), expected);
  for (const renderer of ["pipeable", "readable"]) {
    const stream = await capture(t, renderer, tree);
    await stream.done;
    assert.ok(stream.html.includes(expected));
    assert.deepEqual(stream.errors, []);
  }
  assert.equal(children.props.children[0], '"adhe');
  assert.equal(children.props.children[1].props.children, "sivo 24");
});

test("renderToString uses a transformed independent fallback for suspended content", () => {
  const delayed = deferredContent();
  const tree = h(
    Puncta,
    { instance: make("es-es") },
    '"near ',
    h(
      Suspense,
      { fallback: h("i", null, '"Wait 24kg..."') },
      h(delayed.Delayed, null, h(Puncta, null, '"Ready..."')),
    ),
    ' end"',
  );
  const html = renderToString(tree);
  assert.ok(html.includes("&quot;near "));
  assert.ok(html.includes("<i>«Wait 24\u00a0kg…»</i>"));
  assert.ok(html.includes(" end&quot;"));
  delayed.release();
  const retry = renderToString(tree);
  assert.ok(retry.includes("«Ready…»"));
  assert.equal(retry.includes("<i>"), false);
});

const grouping = (locale = "en-gb", patch = {}) =>
  make(locale, {
    rules: { digitGrouping: { enabled: true, minDigits: 4, ...patch } },
  });

for (const renderer of ["pipeable", "readable"]) {
  test(`${renderer}: grouping reaches shell and independent fallback before resolution, then survives abort/retry`, {
    timeout: 10000,
  }, async (t) => {
    const delayed = deferredContent();
    const original = h(
      "section",
      null,
      h("p", { id: "group-shell" }, 12, h("em", null, 345n), "; 12,345"),
      h("span", { id: "before" }, "12"),
      h(
        Suspense,
        { fallback: h("i", { id: "group-fallback" }, "6789") },
        h(
          delayed.Delayed,
          null,
          h(Puncta, null, h("b", { id: "group-content" }, "45678")),
        ),
      ),
      h("span", { id: "after" }, "345"),
      h("code", null, 12345),
    );
    const tree = h(Puncta, { instance: grouping() }, original);
    const sync = renderToString(tree);
    assert.ok(sync.includes('<i id="group-fallback">6\u202f789</i>'));
    const stream = await capture(t, renderer, tree);
    await stream.until('<span id="after">345</span>');
    assert.equal(stream.allReady, false);
    assert.ok(delayed.attempts > 0);
    assert.ok(
      stream.html.includes(
        '<p id="group-shell">12\u202f<em>345</em>; 12\u202f345</p>',
      ),
    );
    assert.ok(stream.html.includes('<span id="before">12</span>'));
    assert.ok(stream.html.includes('<i id="group-fallback">6\u202f789</i>'));
    assert.equal(stream.html.includes('id="group-content"'), false);
    const reason = new Error("grouping cancellation");
    stream.abort(reason);
    await stream.done;
    assert.ok(stream.errors.includes(reason));
    delayed.release();
    const retry = await capture(t, renderer, tree);
    await retry.done;
    assert.ok(retry.html.includes('<b id="group-content">45\u202f678</b>'));
    assert.ok(
      retry.html.includes(
        '<p id="group-shell">12\u202f<em>345</em>; 12\u202f345</p>',
      ),
    );
    assert.ok(retry.html.includes("<code>12345</code>"));
    assert.deepEqual(retry.errors, []);
    const disabled = renderToString(
      h(Puncta, { instance: grouping("en-gb", { enabled: false }) }, original),
    );
    assert.ok(
      disabled.includes('<p id="group-shell">12<em>345</em>; 12,345</p>'),
    );
    assert.ok(disabled.includes('<b id="group-content">45678</b>'));
    assert.equal(original.props.children[0].props.children[0], 12);
    assert.equal(
      original.props.children[0].props.children[1].props.children,
      345n,
    );
  });
}

test("parallel grouping streams isolate locales, thresholds, normalization and reports through reverse resumption", {
  timeout: 10000,
}, async (t) => {
  const children = h("p", null, "1,234; 12345; 12 345");
  const cases = [
    ["pipeable", grouping(), "1\u202f234; 12\u202f345; 12\u202f345", "en-gb"],
    ["readable", grouping("es-es"), "1,234; 12\u202f345; 12\u202f345", "es-es"],
    [
      "readable",
      grouping("en-gb", { minDigits: 6 }),
      "1,234; 12345; 12 345",
      "en-gb",
    ],
    [
      "pipeable",
      grouping("en-gb", { normalizeExisting: false }),
      "1,234; 12\u202f345; 12 345",
      "en-gb",
    ],
    [
      "readable",
      grouping("es-es", { enabled: false }),
      "1,234; 12345; 12 345",
      null,
    ],
  ];
  const requests = await Promise.all(
    cases.map(async ([renderer, instance, expected, expectedWarningLocale]) => {
      const delayed = deferredContent();
      const report = transformReact("12 34; 12345", {
        instance,
        detailed: true,
      });
      const snapshot = JSON.stringify(report);
      const stream = await capture(
        t,
        renderer,
        h(
          PunctaProvider,
          { instance },
          h(Puncta, null, children),
          h(
            Suspense,
            { fallback: h(Puncta, null, h("i", null, "12345")) },
            h(delayed.Delayed, null, h(Puncta, null, children)),
          ),
        ),
      );
      await stream.until("</i>");
      assert.equal(stream.allReady, false);
      assert.ok(stream.html.includes(`<p>${expected}</p>`));
      return {
        stream,
        delayed,
        instance,
        expected,
        report,
        snapshot,
        expectedWarningLocale,
      };
    }),
  );
  for (const request of requests.toReversed()) {
    const issued = request.stream.html;
    request.delayed.release();
    await request.stream.done;
    assert.ok(request.stream.html.startsWith(issued));
    assert.equal(
      request.stream.html.split(`<p>${request.expected}</p>`).length - 1,
      2,
    );
    assert.deepEqual(request.stream.errors, []);
    assert.equal(JSON.stringify(request.report), request.snapshot);
    assert.deepEqual(
      transformReact("12 34; 12345", {
        instance: request.instance,
        detailed: true,
      }),
      request.report,
    );
  }
  for (const { report, expectedWarningLocale } of requests) {
    assert.deepEqual(report.sources, [
      { id: 0, text: "12 34; 12345", path: [] },
    ]);
    assert.equal(
      report.warnings.length,
      expectedWarningLocale === null ? 0 : 1,
    );
    if (expectedWarningLocale !== null) {
      assert.equal(report.warnings[0].locale, expectedWarningLocale);
      assert.equal(report.warnings[0].ruleId, "digitGrouping");
      assert.deepEqual(report.warnings[0].location.ranges, [
        { sourceId: 0, start: 0, end: 5 },
      ]);
    }
  }
  requests[0].report.sources[0].text = "caller mutation";
  requests[0].report.warnings.length = 0;
  assert.equal(JSON.stringify(requests[1].report), requests[1].snapshot);
  assert.equal(
    transformReact("12 34; 12345", {
      instance: requests[0].instance,
      detailed: true,
    }).sources[0].text,
    "12 34; 12345",
  );
});

for (const renderer of ["pipeable", "readable"]) {
  test(`${renderer}: mixed range and bond corpus is complete in shell/fallback before resolution`, {
    timeout: 10000,
  }, async (t) => {
    const delayed = deferredContent();
    const [english, spanish] = mixedGrouping;
    const instance = make("en-gb", {
      rules: { digitGrouping: { enabled: true } },
      hyphenation: { enabled: true },
    });
    const tree = h(
      Puncta,
      { instance },
      h("p", { id: "mixed-shell" }, english.source),
      h(
        Suspense,
        {
          fallback: h(
            Puncta,
            { locale: "es-es" },
            h("p", { id: "mixed-fallback" }, spanish.source),
          ),
        },
        h(
          delayed.Delayed,
          null,
          h(
            Puncta,
            { locale: "es-es" },
            h("p", { id: "mixed-content" }, spanish.source),
          ),
        ),
      ),
      h("code", null, '"12345-67890kg..."'),
    );
    const sync = renderToString(tree);
    assert.ok(sync.includes(english.expected));
    assert.ok(sync.includes(spanish.expected));
    const stream = await capture(t, renderer, tree);
    await stream.until(`id="mixed-fallback"`);
    assert.equal(stream.allReady, false);
    assert.ok(stream.html.includes(english.expected));
    assert.ok(stream.html.includes(spanish.expected));
    assert.equal(stream.html.includes('id="mixed-content"'), false);
    delayed.release();
    await stream.done;
    assert.ok(
      stream.html.includes(`<p id="mixed-content">${spanish.expected}</p>`),
    );
    assert.ok(
      stream.html.includes("<code>&quot;12345-67890kg...&quot;</code>"),
    );
    assert.deepEqual(stream.errors, []);
  });
}
