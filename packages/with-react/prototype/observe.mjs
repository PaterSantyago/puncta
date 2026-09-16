// Executable observation record, not a product acceptance suite.
import React, { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Puncta, PunctaProvider, instance, inspectRoot } from './mechanism.mjs';
import { Card, scene } from './scenarios.mjs';

console.log(`PROTOTYPE — React ${React.version}; Node ${process.version}`);
for (const mode of ['code', 'off', 'none']) {
  for (const locale of ['es-es', 'en-gb']) {
    console.log(`\n${mode} / ${locale}\n${renderToStaticMarkup(scene({ mode, locale }))}`);
  }
}
console.log('\nChanged source\n' + renderToStaticMarkup(scene({ mode: 'none', source: 'New source' })));
const ref = { current: null };
const handler = () => {};
const style = { color: 'red' };
const card = h(Card, { source: 'opaque input' });
const nested = h(Puncta, null, 'nested input');
const provider = h(PunctaProvider, null, 'provider input');
const original = h('span', { key: 'stable', ref, onClick: handler, style, title: 'raw -- title' },
  ['outer input', card, nested, provider]);
const observation = inspectRoot(original);
const outputChildren = observation.tree.props.children.props.children;
console.log('\nPure walker observation\n' + JSON.stringify({
  inputs: observation.inputs,
  boundaries: observation.boundaries,
  retained: observation.retained,
  opaqueElementSame: outputChildren[1] === card,
  nestedElementSame: outputChildren[2] === nested,
  providerElementSame: outputChildren[3] === provider,
  sourceStillOriginal: original.props.children[0] === 'outer input',
}, null, 2));
// A getter detects even a read of protected children by the walker.
let reads = 0;
const secret = new Proxy(h('span', null, 'secret'), {
  get(target, key) { if (key === 'props') reads++; return Reflect.get(target, key); },
});
reads = 0;
const protectedObservation = inspectRoot(h('code', null, secret));
console.log('\nProtected traversal\n' + JSON.stringify({ inputs: protectedObservation.inputs,
  retained: protectedObservation.retained, reads,
  childIdentity: protectedObservation.tree.props.children.props.children === secret,
}, null, 2));
for (const [label, props] of [['nested instance while disabled', { instance }],
  ['invalid locale while disabled', { locale: 'xx' }]]) {
  try {
    renderToStaticMarkup(h(Puncta, { instance, enabled: false }, h(Puncta, props, 'raw')));
    console.log(label, 'UNEXPECTED SUCCESS');
  } catch (error) { console.log(label, error.message); }
}
