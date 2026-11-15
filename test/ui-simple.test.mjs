// Interface enxuta do começo (ui/components.js simpleUi): menos informação de uma vez no 1º degrau.
// Renderiza a tela do tabuleiro com um DOM mínimo (sem navegador) e confere o que aparece.
import test from 'node:test';
import assert from 'node:assert/strict';

import { noActions as actions, walk } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const { startGame, rollAndMove } = await import('../src/sim/actions.js');
const { boardScreen } = await import('../src/ui/board.js');
const { simpleUi } = await import('../src/ui/components.js');
const { setGuide } = await import('../src/ui/prefs.js');

// O que a tela mostra: abas da lateral, botões de ação, trilha do cabeçalho e legenda das casas.
function snapshot(state) {
  const root = boardScreen(state, actions);
  const out = { tabs: [], buttons: [], steps: false, actionBar: false, subs: [], strip: false };
  walk(root, (n) => {
    if (n.tag === 'summary') out.tabs.push(n.textContent.trim());
    if (n.tag === 'button') out.buttons.push(n.textContent.trim());
    if (/\bsteps\b/.test(n.className) && n.tag === 'div') out.steps = true;
    if (/\baction-bar\b/.test(n.className)) out.actionBar = true;
    if (/\bagency-strip\b/.test(n.className)) out.strip = true;
    if (n.className === 't-sub') out.subs.push(n.textContent.trim());
  });
  return out;
}
const has = (list, word) => list.some((t) => t.includes(word));
const newGame = () => { const s = createInitialState(); startGame(s, [{ name: 'A' }], { rng: () => 0 }); return s; };

test('começo: só missão e diário na lateral, sem trilha e sem botões antes de rolar', () => {
  setGuide(true);
  const state = newGame();
  assert.equal(simpleUi(state, state.players[0]), true);
  const s = snapshot(state);
  assert.ok(has(s.tabs, 'Primeiro satélite'));
  assert.ok(has(s.tabs, 'Diário'));
  for (const hidden of ['Escada', 'Rivais']) assert.ok(!has(s.tabs, hidden), hidden);
  assert.equal(s.strip, false, 'a faixa de prédios só aparece depois do 1º prédio');
  assert.equal(s.steps, false);
  assert.equal(s.actionBar, false);
  assert.ok(has(s.buttons, 'Rolar 2 dados'));
});

test('começo: as legendas das casas ficam curtas mas mantêm o valor que decide o dado', () => {
  setGuide(true);
  const s = snapshot(newGame());
  assert.ok(s.subs.includes('+10 verba'));
  assert.ok(s.subs.includes('sorteio'));
  assert.ok(!s.subs.some((t) => t.includes('carta de dilema')));
});

test('depois de andar aparecem Oficina e Passar a vez, e Lançar só com o projeto pronto', () => {
  setGuide(true);
  const state = newGame();
  rollAndMove(state, () => 0.01);
  const s = snapshot(state);
  assert.ok(has(s.buttons, 'Oficina'));
  assert.ok(has(s.buttons, 'Passar a vez'));
  assert.ok(!has(s.buttons, 'Lançar'));
});

test('dicas desligadas mostram tudo', () => {
  setGuide(false);
  const state = newGame();
  assert.equal(simpleUi(state, state.players[0]), false);
  const s = snapshot(state);
  for (const tab of ['Escada', 'Rivais', 'Diário']) assert.ok(has(s.tabs, tab), tab);
  assert.equal(s.strip, true, 'faixa de prédios sempre à vista');
  assert.ok(!has(s.tabs, 'Sua agência'), 'a agência não é mais uma aba');
  assert.equal(s.steps, true);
  assert.ok(has(s.buttons, 'Lançar'));
  setGuide(true);
});

test('cumprir o 1º degrau mostra tudo, mesmo com as dicas ligadas', () => {
  setGuide(true);
  const state = newGame();
  const p = state.players[0];
  p.step = 1;
  p.completed.push({ missionId: 'first_satellite', year: 1957, science: 2 });
  assert.equal(simpleUi(state, p), false);
  const s = snapshot(state);
  for (const tab of ['Escada', 'Rivais']) assert.ok(has(s.tabs, tab), tab);
  assert.equal(s.strip, true);
});

test('o sandbox nunca usa a interface enxuta', () => {
  setGuide(true);
  const state = createInitialState();
  startGame(state, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.equal(simpleUi(state, state.players[0]), false);
});

test('rivais e agência aparecem quando passam a importar (espião usado ou prédio construído)', () => {
  setGuide(true);
  const state = newGame();
  const p = state.players[0];
  p.intel[1] = { year: 1957, steps: 0, total: 4 };
  p.buildings.lab = 1;
  const s = snapshot(state);
  assert.ok(has(s.tabs, 'Rivais'));
  assert.equal(s.strip, true, 'com um prédio a faixa aparece');
  assert.ok(!has(s.tabs, 'Escada'));
});
