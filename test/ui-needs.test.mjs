// Requisitos escondidos na interface: a oficina não mostra o mínimo enquanto desconhecido, mostra depois de
// descoberto, e o relatório explica o que foi descoberto. Usa o DOM de mentira (sem navegador).
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf, walk } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const sim = await import('../src/sim/actions.js');
const { workshopScreen } = await import('../src/ui/workshop.js');
const { reportScreen } = await import('../src/ui/report.js');
const { learnNeeds } = await import('../src/sim/needs.js');
const { setGuide } = await import('../src/ui/prefs.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

function soloShortScience() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const p = state.players[0];
  p.spacecraft = { instruments: [], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  return { state, p };
}
const buttons = (root) => { const out = []; walk(root, (n) => { if (n.tag === 'button') out.push(n.textContent.replace(/\s+/g, ' ').trim()); }); return out; };
const gauge = (root, label) => textsOf(root, 'gauge').find((t) => t.includes(label));

test('oficina: o mínimo escondido aparece como "?" e como pista, nunca como número', () => {
  setGuide(true);
  const { state } = soloShortScience();
  const root = workshopScreen(state, actions);
  assert.match(gauge(root, 'Ciência'), /\/ \?/);
  assert.match(gauge(root, 'Comunicação'), /\/ \?/);
  const caption = textsOf(root, 'caption')[0];
  assert.match(caption, /ciência baixa/);
  assert.match(caption, /comunicação baixa/);
  assert.ok(!/ciência ≥/.test(caption) && !/comunicação ≥/.test(caption));
  assert.ok(buttons(root).some((b) => /Ensaio em solo \(5\)/.test(b)));
  assert.ok(textsOf(root, 'hint with-icon').some((t) => /ainda não sabe se a nave atende/.test(t)));
});

test('oficina: o checklist mostra o mínimo desconhecido em cinza, sem travar o Lançar', () => {
  const { state, p } = soloShortScience();
  p.rolled = true; // já andou no tabuleiro: o Lançar só depende do projeto
  const root = workshopScreen(state, actions);
  const rows = [];
  let launchButton = null;
  walk(root, (n) => {
    if (n.tag === 'li' && n.className === 'unknown') rows.push(n.textContent.replace(/\s+/g, ' ').trim());
    if (n.tag === 'button' && /Lançar/.test(n.textContent)) launchButton = n;
  });
  assert.equal(rows.length, 2, 'ciência e comunicação como desconhecidos');
  assert.ok(rows.every((t) => /ainda não é conhecido/.test(t)));
  assert.equal(root.textContent.includes('abaixo do mínimo'), false);
  assert.ok(launchButton, 'botão Lançar');
  assert.equal(launchButton.disabled, false, 'um mínimo desconhecido não trava o lançamento');
});

test('oficina: depois de descoberto aparece o número e o ensaio some', () => {
  const { state, p } = soloShortScience();
  learnNeeds(p, 'first_satellite');
  const root = workshopScreen(state, actions);
  assert.match(gauge(root, 'Ciência'), /0 \/ 2/);
  assert.match(textsOf(root, 'caption')[0], /ciência ≥ 2/);
  assert.ok(!buttons(root).some((b) => /Ensaio em solo/.test(b)));
});

test('oficina: o sandbox mostra os números e não tem ensaio', () => {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  const root = workshopScreen(state, actions);
  assert.match(textsOf(root, 'caption')[0], /ciência ≥ 2/);
  assert.ok(!buttons(root).some((b) => /Ensaio em solo/.test(b)));
});

test('depois do ensaio, a oficina mostra o resultado em palavras', () => {
  const { state } = soloShortScience();
  sim.rehearse(state);
  const root = workshopScreen(state, actions);
  const outcome = textsOf(root, 'outcome')[0];
  assert.match(outcome, /Ensaio em solo/);
  assert.match(outcome, /Ciência: está bem abaixo/);
  assert.match(outcome, /Verba -5/);
});

test('relatório: errar pelo mínimo escondido explica o que faltou e o que foi descoberto', () => {
  const { state, p } = soloShortScience();
  sim.rollAndMove(state, die(2));
  sim.launch(state, noFailure);
  sim.endTurn(state);
  sim.rollAndMove(state, die(2));
  sim.advanceFlight(state, noFailure);
  sim.chooseStageOption(state, 0, noFailure);
  assert.equal(p.lastResult.success, false);
  const root = reportScreen(state, actions);
  const text = root.textContent.replace(/\s+/g, ' ');
  assert.match(text, /Requisito descoberto/);
  assert.match(text, /ciência ≥ 2/);
  assert.match(text, /Ciência 0 abaixo do mínimo 2/);
});
