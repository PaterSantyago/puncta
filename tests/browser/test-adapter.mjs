// Only registration is adapted: assertions, inputs and expected values stay shared.
// Unsupported node:test features fail rather than silently skip coverage.
const cases = [];
export function test(name, callback) {
  if (typeof name !== "string" || typeof callback !== "function")
    throw new Error("Browser tests require test(name, callback)");
  cases.push({ name, callback });
}
export default test;
export async function run() {
  const passed = [];
  for (const { name, callback } of cases) {
    try {
      await callback();
      passed.push(name);
    } catch (cause) {
      throw new Error(`Shared browser oracle failed: ${name}\n${cause.stack}`, {
        cause,
      });
    }
  }
  return passed;
}
