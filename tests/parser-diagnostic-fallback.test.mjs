import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// parse5 8.0.0 normally supplies offsets. Inject only the missing-position
// diagnostic at the dependency boundary; still parse/serialize a real tree.
// A subprocess confines the loader hook to this defensive contract scenario.
test("parser warnings without positions retain their code and an honest unavailable location", () => {
  const script = `
    import assert from "node:assert/strict";
    import { registerHooks } from "node:module";
    registerHooks({
      load(url, context, nextLoad) {
        if (!url.endsWith("/parse5/dist/index.js")) return nextLoad(url, context);
        const original = JSON.stringify(url + "?original-parser");
        return {
          format: "module", shortCircuit: true,
          source: \`
            export * from \${original};
            import * as original from \${original};
            export class Parser extends original.Parser {
              constructor(options, ...args) {
                super(options, ...args);
                options.onParseError({code: "missing-test-position"});
              }
            }
          \`,
        };
      },
    });
    const {createPuncta} = await import(${JSON.stringify(new URL("../packages/core/dist/index.mjs", import.meta.url).href)});
    const {enGb} = await import(${JSON.stringify(new URL("../packages/with-en-gb/dist/index.mjs", import.meta.url).href)});
    const instance = createPuncta({locales: [enGb], locale: enGb.id});
    for (const mode of ["fragment", "document"]) {
      const source = mode === "document"
        ? '<!DOCTYPE html><html><head></head><body><p>Wait...</p></body></html>'
        : '<p>Wait...</p>';
      const report = instance.html(source, {mode, detailed: true});
      assert.equal(report.result, source.replace("...", "…"));
      assert.equal(report.hasEdits, true);
      const warnings = report.warnings.filter((warning) => warning.details.parserCode === "missing-test-position");
      assert.equal(warnings.length, 1);
      const { message, ...machineFields } = warnings[0];
      assert.equal(typeof message, "string");
      assert.deepEqual(machineFields, {
        code: "html.parse", source: "parser",
        details: {parserCode: "missing-test-position"}, locale: null, ruleId: null,
        location: {kind: "unavailable", reason: "Parser supplied no position"},
      });
    }
  `;
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
});
