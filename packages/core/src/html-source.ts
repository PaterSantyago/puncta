import { DecodingMode, EntityDecoder, htmlDecodeTree } from "entities/decode";
import type { InputRange } from "./types.js";

type Origin = {
  decodedStart: number;
  decodedEnd: number;
  start: number;
  end: number;
};

/** Map decoded UTF-16 ranges only when replaying the parser's text decoding agrees.
 * A parser-repaired/noncontiguous leaf must not receive invented input positions. */
export function htmlSourceMap(
  input: string,
  text: string,
  location: { startOffset: number; endOffset: number } | null | undefined,
  decodeEntities = true,
): (start: number, end: number) => InputRange {
  const unavailable: InputRange = {
    accuracy: "unavailable",
    reason: "Parser text cannot be mapped to a contiguous input span",
  };
  if (!location) return () => unavailable;
  const raw = input.slice(location.startOffset, location.endOffset);
  const origins: Origin[] = [];
  let decoded = "";
  let entity = "";
  const decoder = new EntityDecoder(htmlDecodeTree, (codepoint) => {
    entity += String.fromCodePoint(codepoint);
  });
  for (let index = 0; index < raw.length; ) {
    let value = raw[index];
    let consumed = 1;
    if (decodeEntities && value === "&") {
      entity = "";
      decoder.startEntity(DecodingMode.Legacy);
      let length = decoder.write(raw, index + 1);
      if (length < 0) length = decoder.end();
      if (length > 0) {
        value = entity;
        consumed = length;
      }
    } else if (value === "\r") {
      value = "\n";
      consumed = raw[index + 1] === "\n" ? 2 : 1;
    }
    origins.push({
      decodedStart: decoded.length,
      decodedEnd: decoded.length + value.length,
      start: location.startOffset + index,
      end: location.startOffset + index + consumed,
    });
    decoded += value;
    index += consumed;
  }
  if (decoded !== text) return () => unavailable;
  return (start, end) => {
    if (start === end) {
      const boundary =
        start === 0
          ? location.startOffset
          : origins.find((origin) => origin.decodedEnd === start)?.end;
      if (boundary !== undefined)
        return { accuracy: "exact", start: boundary, end: boundary };
      const containing = origins.find(
        (origin) => start > origin.decodedStart && start < origin.decodedEnd,
      );
      return containing
        ? { accuracy: "covering", start: containing.start, end: containing.end }
        : unavailable;
    }
    const first = origins.find(
      (origin) => start >= origin.decodedStart && start < origin.decodedEnd,
    );
    const last = origins.find(
      (origin) => end > origin.decodedStart && end <= origin.decodedEnd,
    );
    if (!first || !last) return unavailable;
    return {
      accuracy:
        start === first.decodedStart && end === last.decodedEnd
          ? "exact"
          : "covering",
      start: first.start,
      end: last.end,
    };
  };
}
