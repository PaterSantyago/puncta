import { createElement as h, Fragment, useState } from 'react';
import { Puncta, PunctaProvider, instance } from './mechanism.mjs';

// React, not the walker, invokes this component. Its source is created here.
export function Card({ source = 'Card source', locale, innerRef, onClick, identity }) {
  const [clicks, setClicks] = useState(0);
  return h('span', { className: 'card', ref: innerRef, title: 'title -- unchanged' },
    h(Puncta, { locale, enabled: true }, source),
    identity ? h('button', { type: 'button', onClick: () => {
      setClicks(count => count + 1); onClick?.();
    } }, `${identity}: ${clicks}`) : null);
}

export function scene({ mode = 'code', locale = 'es-es', source = 'Card source',
  directRef, cardRef, onClick, reverse = false } = {}) {
  const protectedCard = h(Card, { source, locale });
  const protectedTree = mode === 'code'
    ? h('code', { 'data-case': 'protection' }, protectedCard)
    : h('span', { 'data-case': 'protection', 'data-puncta': mode === 'off' ? 'off' : undefined }, protectedCard);
  const keyedCards = ['a', 'b'].map(id => h(Card, {
    key: id, source: `key ${id}`, identity: id, locale,
    innerRef: id === 'a' ? cardRef : undefined, onClick,
  }));
  if (reverse) keyedCards.reverse();
  return h(PunctaProvider, { instance }, h(Puncta, null,
    h(Fragment, { key: 'cases' },
      protectedTree,
      h('span', { 'data-case': 'sibling' }, h(Puncta, null, 'Sibling source')),
      h('span', { 'data-case': 'nested' }, h(Puncta, { locale }, source)),
      h('span', { 'data-case': 'provider' }, h(PunctaProvider, { locale },
        'Provider raw', h(Puncta, null, source))),
      h('span', { 'data-case': 'disabled' }, h(Puncta, { enabled: false },
        h(PunctaProvider, { enabled: true }, h(Card, { source, locale })))),
      h('button', { key: 'direct', ref: directRef, 'data-case': 'direct',
        title: 'original -- title', style: { color: 'inherit' }, type: 'button', onClick }, 'Outer source'),
      h('span', { 'data-case': 'keys', 'data-puncta': mode === 'off' ? 'off' : undefined }, keyedCards),
    )));
}
