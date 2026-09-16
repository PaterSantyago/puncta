// THROWAWAY PROTOTYPE. Only the ownership/protection question from issue 37.
import { createContext, useContext, createElement as h, cloneElement,
  isValidElement, Fragment } from 'react';

const Settings = createContext(null);
export const instance = Object.freeze({ locale: 'en-gb' });

function settings(parent, props) {
  if (parent && props.instance) throw new Error('instance.nested');
  const root = parent?.instance ?? props.instance;
  if (!root) throw new Error('instance.missing');
  const locale = props.locale ?? parent?.locale ?? root.locale;
  if (!['en-gb', 'es-es'].includes(locale)) throw new Error('locale.unavailable');
  return {
    instance: root, locale,
    blocked: Boolean(parent?.blocked || props.enabled === false),
  };
}

// Deliberately NON-idempotent. A second owner visibly produces nested brackets.
// A pure function: no global trace, DOM, effects, or mutation during render.
export function mark(source, locale) { return `⟦${locale}:${source}⟧`; }

export function PunctaProvider(props) {
  const state = settings(useContext(Settings), props);
  return h(Settings.Provider, { value: state }, props.children);
}

export function Puncta(props) {
  const state = settings(useContext(Settings), props);
  const { tree } = inspect(props.children, state);
  return h(Settings.Provider, { value: state }, tree);
}

// Intentionally only the host types needed by the experiment.
const hosts = new Set(['div', 'span', 'p', 'b', 'em', 'button', 'code']);

export function inspect(source, state) {
  const inputs = [];
  const boundaries = [];
  const retained = [];
  function walk(node, path) {
    if (typeof node === 'string') {
      inputs.push({ path, source: node, locale: state.locale });
      return mark(node, state.locale);
    }
    if (Array.isArray(node)) return node.map((child, i) => walk(child, `${path}[${i}]`));
    if (!isValidElement(node)) return node;
    if (node.type === Puncta || node.type === PunctaProvider) {
      boundaries.push({ path, kind: node.type === Puncta ? 'Puncta' : 'Provider' });
      return node; // original element and original children, no prior transformation
    }
    if (node.type === Fragment) {
      const mapped = walk(node.props.children, `${path}.children`);
      const result = Array.isArray(mapped) && mapped.length > 1
        ? cloneElement(node, {}, ...mapped)
        : cloneElement(node, {}, mapped);
      record(node, result, path);
      return result;
    }
    if (!hosts.has(node.type)) {
      boundaries.push({ path, kind: 'opaque' });
      return node; // never manually invoke components or inspect their props
    }
    if (!Object.hasOwn(node.props, 'children')) return node;
    const blocked = node.type === 'code' || node.props['data-puncta'] === 'off';
    if (blocked) boundaries.push({ path, kind: 'protected' });
    // Always put the bridge INSIDE the host, even when unprotected. Changing
    // data-puncta must not replace the host or remount its children.
    // When protected, pass children through WITHOUT inspecting them.
    const contents = blocked ? node.props.children : walk(node.props.children, `${path}.children`);
    const result = cloneElement(node, {}, h(Settings.Provider, {
      value: blocked ? { ...state, blocked: true } : state,
    }, contents));
    record(node, result, path);
    return result;
  }
  function record(before, after, path) {
    retained.push({ path, type: before.type === after.type, key: before.key === after.key,
      ref: before.props.ref === after.props.ref,
      props: Object.keys(before.props).filter(key => key !== 'children')
        .every(key => before.props[key] === after.props[key]),
    });
  }
  return { tree: state.blocked ? source : walk(source, '$'), inputs, boundaries, retained };
}

export function inspectRoot(children, props = {}) {
  return inspect(children, settings(null, { instance, ...props }));
}
