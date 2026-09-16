import React, { createElement as h, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { scene, Card } from './scenarios.mjs';
import { inspectRoot, Puncta, PunctaProvider, mark } from './mechanism.mjs';

const $ = id => document.getElementById(id);
const config = { mode: 'code', locale: 'es-es', source: 'Card source', reverse: false };
const root = createRoot($('experiment'));
const refs = { direct: null, card: null };
let firstDirect, firstCard, renders = 0, handlerCalls = 0;
const directRef = node => { refs.direct = node; };
const cardRef = node => { refs.card = node; };
const onClick = () => { handlerCalls++; setTimeout(observe, 0); };
function render() {
  flushSync(() => root.render(h(StrictMode, null, scene({ ...config,
    directRef, cardRef, onClick }))));
  firstDirect ??= refs.direct; firstCard ??= refs.card; renders++;
  observe();
}
function observe() {
  const box = $('experiment');
  const at = name => box.querySelector(`[data-case="${name}"]`);
  const expected = mark(config.source, config.locale);
  const checks = [];
  const check = (name, pass, detail) => checks.push({ name, pass, detail });
  check('Защита через непрозрачный Card', at('protection').textContent ===
    (config.mode === 'none' ? expected : config.source), at('protection').textContent);
  check('Независимая соседняя область', at('sibling').textContent === mark('Sibling source', 'en-gb'), at('sibling').textContent);
  check('Вложенный Puncta получает исходник', at('nested').textContent === expected, at('nested').textContent);
  check('Provider оставляет свой текст исходным', at('provider').textContent === 'Provider raw' + expected, at('provider').textContent);
  check('enabled=true не отменяет запрет предка', at('disabled').textContent === config.source, at('disabled').textContent);
  check('Внешняя область обрабатывает свой текст', at('direct').textContent === mark('Outer source', 'en-gb'), at('direct').textContent);
  const outline = element => `${element.tagName.toLowerCase()}[${[...element.children].map(outline).join(',')}]`;
  const actualShape = [...box.children].map(outline).join(',');
  const expectedShape = `${config.mode === 'code' ? 'code' : 'span'}[span[]],span[],span[],span[],span[span[]],button[],span[span[button[]],span[button[]]]`;
  check('Нет дополнительных DOM-узлов', actualShape === expectedShape, actualShape);
  check('Host ref сохраняет тот же DOM-узел', refs.direct === firstDirect && refs.direct === at('direct'), `title: ${refs.direct?.title}`);
  check('Card ref сохраняется при перестановке и защите', refs.card === firstCard && refs.card === [...at('keys').children].find(el => el.querySelector('button')?.textContent.startsWith('a:')), `состояние: ${refs.card?.querySelector('button')?.textContent}`);
  check('Остальные DOM props сохранены', refs.direct.title === 'original -- title' && refs.direct.type === 'button', `обработчик вызван: ${handlerCalls}`);

  const ref = { current: null }, handler = () => {}, style = { color: 'red' };
  const opaque = h(Card, { source: 'opaque' });
  const nested = h(Puncta, null, 'nested');
  const provider = h(PunctaProvider, null, 'provider');
  const source = h('span', { key: 'key', ref, onClick: handler, style, title: 'unchanged' }, ['outer', opaque, nested, provider]);
  const trace = inspectRoot(source);
  const after = trace.tree.props.children.props.children;
  check('Внешний обход не раскрывает чужие исходники', trace.inputs.length === 1 && trace.inputs[0].source === 'outer' && after[1] === opaque && after[2] === nested && after[3] === provider,
    'Прочитан только outer; Card, Puncta, Provider сохранены по ссылке');
  check('Тип / key / ref / остальные props', trace.retained.every(row => row.type && row.key && row.ref && row.props),
    'Сравнение React-элементов по ссылкам, включая обработчик и style');

  $('checks').replaceChildren(...checks.map(({ name, pass, detail }) => {
    const tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
    th.textContent = name; td.textContent = `${pass ? 'PASS' : 'FAIL'} — ${detail}`; td.className = pass ? 'ok' : 'fail';
    tr.append(th, td); return tr;
  }));
  $('summary').textContent = `Наблюдения: ${checks.filter(x => x.pass).length} / ${checks.length}`;
  const fields = { 'Защита': config.mode, 'Локаль дочерней области': config.locale, 'Исходник': config.source,
    'Внешняя локаль': 'en-gb', 'Явных render из панели': renders, 'Порядок Card': config.reverse ? 'b, a' : 'a, b',
    'Состояние Card': [...at('keys').querySelectorAll('button')].map(node => node.textContent).join(' · '), 'Вызовов обработчика': handlerCalls };
  $('state').replaceChildren(...Object.entries(fields).flatMap(([name, value]) => {
    const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = name; dd.textContent = value; return [dt, dd];
  }));
  $('detail').textContent = box.innerHTML + '\n\n' + JSON.stringify({ inputs: trace.inputs, boundaries: trace.boundaries, retained: trace.retained }, null, 2);
}
function change(patch) { Object.assign(config, patch); $('source').value = config.source; render(); }
for (const mode of ['code', 'off', 'none']) $(mode).onclick = () => change({ mode });
$('locale').onclick = () => change({ locale: config.locale === 'en-gb' ? 'es-es' : 'en-gb' });
$('reverse').onclick = () => change({ reverse: !config.reverse });
$('rerender').onclick = render;
$('source').oninput = event => change({ source: event.target.value });
const walkthroughs = {
  protection: { text: 'code и data-puncta=off запрещают обработку даже через Card. После снятия защиты появляется ровно один маркер. Соседняя область всё время обрабатывается.',
    steps: [['code: исходник', { mode: 'code' }], ['data-puncta=off: исходник', { mode: 'off' }], ['Без защиты: один маркер', { mode: 'none' }]] },
  ownership: { text: 'Новая локаль и новый текст пересчитываются из исходных children. Provider raw не меняется. Повторный render не вкладывает маркеры друг в друга.',
    steps: [['Испанская область', { mode: 'none', locale: 'es-es' }], ['Английская область', { locale: 'en-gb' }], ['Новый исходник', { source: 'New source' }], ['Ещё один render', {}]] },
  identity: { text: 'Нажмите a несколько раз в результате React. Затем переставьте a / b и переключите защиту: счётчик a и ссылка на DOM-узел сохраняются. Служебные Provider не появляются в DOM.',
    steps: [['Начать без защиты', { mode: 'none', reverse: false }], ['Переставить b / a', { reverse: true }], ['Защитить без потери состояния', { mode: 'off' }], ['Снова разрешить', { mode: 'none' }]] },
};
for (const button of document.querySelectorAll('[data-tab]')) button.onclick = () => {
  for (const tab of document.querySelectorAll('[data-tab]')) tab.setAttribute('aria-selected', String(tab === button));
  const walk = walkthroughs[button.dataset.tab]; $('guide').textContent = walk.text;
  $('steps').replaceChildren(...walk.steps.map(([label, patch], i) => {
    const step = document.createElement('button'); step.textContent = `${i + 1}. ${label}`; step.onclick = () => change(patch); return step;
  }));
  change({ mode: 'code', locale: 'es-es', source: 'Card source', reverse: false });
};
document.querySelector('[data-tab="protection"]').click();
