import assert from "node:assert/strict";

const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

export function validateMetadata(entry, locale, minRight) {
  assert.equal(entry.locale, locale, `${entry.source}: locale`);
  assert.equal(entry.settings.enabled, true, `${entry.source}: enabled`);
  for (const [name, minimum] of [
    ["minWordLength", 6],
    ["minLeft", 2],
    ["minRight", minRight],
  ]) {
    assert.ok(
      Number.isInteger(entry.settings[name]) && entry.settings[name] >= minimum,
      `${entry.source}: ${name}`,
    );
  }
  assert.ok(entry.evidence.rationale.trim(), `${entry.source}: rationale`);
  assert.ok(entry.evidence.sources.length > 0, `${entry.source}: sources`);
  for (const source of entry.evidence.sources) {
    assert.equal(
      new URL(source).protocol,
      "https:",
      `${entry.source}: source URL`,
    );
  }
  assert.equal(entry.agentReview.status, "checked", `${entry.source}: review`);
  assert.ok(entry.agentReview.result.trim(), `${entry.source}: review result`);
}

export function validatePositions(entry) {
  const boundaries = [
    ...Array.from(segmenter.segment(entry.source), (part) => part.index),
    entry.source.length,
  ];
  const length = boundaries.length - 1;
  assert.ok(length >= entry.settings.minWordLength, `${entry.source}: length`);
  for (const name of ["allowedPositions", "requiredPositions"]) {
    const positions = entry[name];
    assert.ok(Array.isArray(positions), `${entry.source}: ${name}`);
    let previous = -1;
    for (const position of positions) {
      assert.ok(
        Number.isInteger(position) && position > previous,
        `${entry.source}: sorted unique positions`,
      );
      const left = boundaries.indexOf(position);
      assert.ok(left >= 0, `${entry.source}: grapheme boundary`);
      assert.ok(
        left >= entry.settings.minLeft &&
          length - left >= entry.settings.minRight,
        `${entry.source}: edge minima`,
      );
      previous = position;
    }
  }
  for (const position of entry.requiredPositions) {
    assert.ok(
      entry.allowedPositions.includes(position),
      `${entry.source}: required subset of allowed`,
    );
  }
  return length;
}
