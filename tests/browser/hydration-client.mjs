import { hydrateRoot } from "../../examples/ssr/node_modules/react-dom/client.js";
import { createGate, tree } from "./hydration-tree.mjs";

const gate = createGate(location.pathname.startsWith("/ssr"));
window.hydrationErrors = [];
window.releaseHydration = () => gate.release();
const root = document.getElementById("root");
if (!root) throw new Error("Hydration bootstrap arrived before shell");
window.shellBeforeHydration = document.getElementById("shell");
window.contentBeforeHydration = document.getElementById("content");
window.hydrationRoot = hydrateRoot(
  root,
  tree(
    gate,
    () => {
      window.hydrated = true;
    },
    () => {
      window.shellHydrated = true;
    },
  ),
  {
    onRecoverableError(error) {
      window.hydrationErrors.push(error.message);
    },
  },
);
window.hydrationStarted = true;
