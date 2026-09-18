import { decodeHTML } from "entities";
import { escapeText } from "entities/escape";
import {
  defaultTreeAdapter,
  type DefaultTreeAdapterMap,
  html,
  Parser,
  type ParserOptions,
  type Token,
} from "parse5";
import type { Edit } from "./types.js";

type TextNode = DefaultTreeAdapterMap["textNode"];
type Chunk = {
  node: TextNode;
  text: string;
  start: number;
  inputStart: number;
  inputEnd: number;
  changes: { start: number; end: number; after: string }[];
};

/** Keep the original markup scaffold for actual plaintext elements. Ordinary
 * serialization appends closing tags that plaintext would consume on reparse,
 * including foster-parented siblings. Token origins let us change text without
 * losing that scaffold or guessing positions in a repaired text leaf.
 *
 * This module alone depends on parse5 8.0.0's exported internal Parser hook:
 * _insertCharacters synchronously inserts its token through the tree adapter.
 * Its behavior is pinned by public malformed-HTML roundtrip tests. */
export function parseHtml(
  input: string,
  context: DefaultTreeAdapterMap["element"] | undefined,
  options: ParserOptions<DefaultTreeAdapterMap>,
): {
  tree:
    | DefaultTreeAdapterMap["document"]
    | DefaultTreeAdapterMap["documentFragment"];
  serializePlaintext(
    leaves: TextNode[],
    edits: readonly Edit[],
  ): string | undefined;
} {
  const chunks: Chunk[] = [];
  let token: Token.CharacterToken | undefined;
  let hasPlaintext = false;
  function record(node: TextNode, text: string) {
    if (!token?.location)
      throw new Error("HTML character token has no source location");
    chunks.push({
      node,
      text,
      start: node.value.length - text.length,
      inputStart: token.location.startOffset,
      inputEnd: token.location.endOffset,
      changes: [],
    });
  }
  const treeAdapter = {
    ...defaultTreeAdapter,
    createElement(tag: string, namespace: html.NS, attrs: Token.Attribute[]) {
      if (tag === "plaintext" && namespace === html.NS.HTML)
        hasPlaintext = true;
      return defaultTreeAdapter.createElement(tag, namespace, attrs);
    },
    insertText(parent: DefaultTreeAdapterMap["parentNode"], text: string) {
      defaultTreeAdapter.insertText(parent, text);
      record(parent.childNodes.at(-1) as TextNode, text);
    },
    insertTextBefore(
      parent: DefaultTreeAdapterMap["parentNode"],
      text: string,
      reference: DefaultTreeAdapterMap["childNode"],
    ) {
      defaultTreeAdapter.insertTextBefore(parent, text, reference);
      record(
        parent.childNodes[parent.childNodes.indexOf(reference) - 1] as TextNode,
        text,
      );
    },
  };
  class OriginParser extends Parser<DefaultTreeAdapterMap> {
    override _insertCharacters(current: Token.CharacterToken) {
      token = current;
      super._insertCharacters(current);
      token = undefined;
    }
  }
  const parserOptions = { ...options, treeAdapter };
  const parser = context
    ? OriginParser.getFragmentParser<DefaultTreeAdapterMap>(
        context,
        parserOptions,
      )
    : new OriginParser(parserOptions);
  parser.tokenizer.write(input, true);
  const tree = context ? parser.getFragment() : parser.document;
  return {
    tree,
    serializePlaintext(
      leaves: TextNode[],
      edits: readonly Edit[],
    ): string | undefined {
      if (!hasPlaintext) return undefined;
      for (const edit of edits) {
        edit.ranges.forEach((range, index) => {
          const owned = chunks.filter(
            (chunk) => chunk.node === leaves[range.sourceId],
          );
          if (range.start === range.end) {
            const chunk =
              owned.find(
                (chunk) =>
                  range.start > chunk.start &&
                  range.start <= chunk.start + chunk.text.length,
              ) ?? owned[0];
            chunk.changes.push({
              start: range.start - chunk.start,
              end: range.end - chunk.start,
              after: index === 0 ? edit.after : "",
            });
            return;
          }
          let first = true;
          for (const chunk of owned) {
            const start = Math.max(range.start, chunk.start);
            const end = Math.min(range.end, chunk.start + chunk.text.length);
            if (start >= end) continue;
            chunk.changes.push({
              start: start - chunk.start,
              end: end - chunk.start,
              after: first && index === 0 ? edit.after : "",
            });
            first = false;
          }
        });
      }
      let result = input;
      for (const chunk of chunks
        .filter((chunk) => chunk.changes.length)
        .sort((a, b) => b.inputStart - a.inputStart)) {
        let value = chunk.text;
        for (const change of chunk.changes.sort(
          (a, b) => b.start - a.start || b.end - a.end,
        ))
          value =
            value.slice(0, change.start) +
            change.after +
            value.slice(change.end);
        const raw = input.slice(chunk.inputStart, chunk.inputEnd);
        const parent =
          chunk.node.parentNode === tree && context
            ? context
            : chunk.node.parentNode;
        const rawText =
          parent &&
          defaultTreeAdapter.isElementNode(parent) &&
          parent.namespaceURI === html.NS.HTML &&
          html.hasUnescapedText(parent.tagName, true);
        const decoded = (rawText ? raw : decodeHTML(raw)).replace(
          /\r\n?/g,
          "\n",
        );
        // pre/textarea/listing discard one leading newline during tree construction.
        const ignoredNewline = decoded === `\n${chunk.text}` ? "\n" : "";
        const replacement =
          ignoredNewline + (rawText ? value : escapeText(value));
        result =
          result.slice(0, chunk.inputStart) +
          replacement +
          result.slice(chunk.inputEnd);
      }
      return result;
    },
  };
}
