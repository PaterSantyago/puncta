import en from "../fixtures/hyphenation/en-gb.json" with { type: "json" };
import enNegative from "../fixtures/hyphenation/en-gb-negative.json" with {
  type: "json",
};
import es from "../fixtures/hyphenation/es-es.json" with { type: "json" };
import esNegative from "../fixtures/hyphenation/es-es-negative.json" with {
  type: "json",
};

const fixtures = {
  "en-gb.json": en,
  "en-gb-negative.json": enNegative,
  "es-es.json": es,
  "es-es-negative.json": esNegative,
};
export function readFileSync(url) {
  const value = fixtures[new URL(url).pathname.split("/").at(-1)];
  if (!value) throw new Error(`Unbundled browser fixture: ${url}`);
  return JSON.stringify(value);
}
export async function readFile(url) {
  return readFileSync(url);
}
