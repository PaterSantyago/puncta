// The same public-API assertions run in Node and in every real browser engine.
import "../ellipsis.test.mjs";
import "../spaces.test.mjs";
import "../quotes.test.mjs";
import "../dashes.test.mjs";
import "../number-bonds.test.mjs";
import "../inline-context.test.mjs";
import "../protection.test.mjs";
import "../options-scopes.test.mjs";
import "../html-parsing.test.mjs";
import "../strip-soft-hyphens.test.mjs";
import "../hyphenation.test.mjs";
import "../hyphenation-es.test.mjs";
import "../combined-processing.test.mjs";
import { run } from "./test-adapter.mjs";

window.runSharedChecks = run;
