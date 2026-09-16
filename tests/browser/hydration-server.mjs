import {
  renderToPipeableStream,
  renderToReadableStream,
  renderToString,
} from "../../examples/ssr/node_modules/react-dom/server.node.js";
import { createGate, documentTree, tree } from "./hydration-tree.mjs";

// Release is controlled by the browser only after it observes the initial shell.
export function createHydrationServer() {
  const pending = new Map();
  const errors = [];
  const aborts = new Set();
  return {
    errors,
    close() {
      for (const abort of aborts) abort();
    },
    release(id) {
      const gate = pending.get(id);
      if (!gate) throw new Error(`Missing streaming gate: ${id}`);
      gate.release();
      pending.delete(id);
    },
    async handle(request, response) {
      const [renderer, id] = request.url.slice(1).split("/");
      const gate = createGate(renderer === "ssr");
      const app = documentTree(tree(gate));
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (renderer === "ssr") {
        response.end(`<!doctype html>${renderToString(app)}`);
        return;
      }
      pending.set(id, gate);
      const options = {
        onError(error) {
          errors.push(error.message);
        },
      };
      if (renderer === "pipeable") {
        const stream = renderToPipeableStream(app, {
          ...options,
          onShellReady() {
            stream.pipe(response);
          },
          onShellError(error) {
            errors.push(error.message);
            response.destroy(error);
          },
        });
        const abort = () => stream.abort();
        aborts.add(abort);
        response.on("finish", () => aborts.delete(abort));
      } else if (renderer === "readable") {
        const controller = new AbortController();
        const abort = () => controller.abort();
        aborts.add(abort);
        try {
          const stream = await renderToReadableStream(app, {
            ...options,
            signal: controller.signal,
          });
          for await (const chunk of stream) response.write(chunk);
          response.end();
        } finally {
          aborts.delete(abort);
        }
      } else {
        throw new Error(`Unknown renderer: ${renderer}`);
      }
    },
  };
}
