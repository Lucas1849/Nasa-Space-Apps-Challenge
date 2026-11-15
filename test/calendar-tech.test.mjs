// Etapa 2: calendário começando em 1955 e pesquisa básica de 2 em 2 anos (o Laboratório rende todo ano).
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf } from './dom-stub.mjs';

const { createInitialState, TECH_PER_YEAR, TECH_EVERY_YEARS, TECH_FLOOR, BAILOUT_FUNDS } = await import('../src/sim/state.js');
const sim = await import('../src/sim/actions.js');
const { yearlyIncome, isTechYear } = await import('../src/sim/income.js');
const { START_YEAR, END_YEAR, MAX_ROUNDS, ROUNDS_PER_YEAR, yearOf } = await import('../src/data/history.js');
const { isLocked } = await import('../src/sim/resources.js');
const { PARTS } = await import('../src/data/parts.js');
const { hud } = await import('../src/ui/components.js');
const { yearOverlayNode } = await import('../src/ui/yearOverlay.js');
const { setGuide } = await import('../src/ui/prefs.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
function newGame() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'J' }], { rng: () => 0 });
  return state;
}
function pass(state) {
  sim.rollAndMove(state, die(2));
  if (state.pendingDilemma) sim.chooseDilemma(state, 0, () => 0.99);
  if (state.pendingTile) sim.skipTile(state);
  assert.equal(sim.endTurn(state), null);
}

test('o calendário começa em 1955 e dura até 1969 (45 rodadas no teto)', () => {
  assert.equal(START_YEAR, 1955);
  assert.equal(END_YEAR, 1969);
  assert.equal(MAX_ROUNDS, (1969 - 1955 + 1) * ROUNDS_PER_YEAR);
  assert.equal(MAX_ROUNDS, 45);
  assert.equal(yearOf(1), 1955);
  assert.equal(yearOf(MAX_ROUNDS), 1969);
});

test('a pesquisa básica rende no 1º ano e depois de 2 em 2 anos', () => {
  assert.equal(TECH_EVERY_YEARS, 2);
  const years = Array.from({ length: 6 }, (_, i) => START_YEAR + i);
  assert.deepEqual(years.map(isTechYear), [true, false, true, false, true, false]);
});

test('a renda de tecnologia depende do ano; o Laboratório rende todo ano', () => {
  const p = newGame().players[0];
  assert.equal(yearlyIncome(p, 1955).tech, TECH_PER_YEAR);
  assert.equal(yearlyIncome(p, 1956).tech, 0);
  assert.equal(yearlyIncome(p, 1957).tech, TECH_PER_YEAR);
  p.buildings.lab = 2;
  assert.equal(yearlyIncome(p, 1956).tech, 2, 'só o Laboratório, no ano sem pesquisa básica');
  assert.equal(yearlyIncome(p, 1957).tech, TECH_PER_YEAR + 2);
  assert.equal(yearlyIncome(p, 1956).funds, yearlyIncome(p, 1957).funds, 'a verba do ano não muda');
});

test('o jogo começa com tecnologia 1: dá para comprar a primeira peça já no 1º ano', () => {
  const state = newGame();
  const p = state.players[0];
  assert.equal(p.tech, 1);
  for (const part of Object.values(PARTS).filter((x) => x.minTech === 1)) assert.equal(isLocked(p, part), false, part.id);
});

test('sem laboratório o Ano novo entrega tecnologia de 2 em 2 anos: 1955 sim, 1956 não, 1957 sim, 1958 não', () => {
  const state = newGame();
  const byYear = { [state.yearChange.year]: state.yearChange.tech };
  for (let i = 0; i < 9; i++) {
    pass(state);
    if (state.yearChange && !(state.yearChange.year in byYear)) byYear[state.yearChange.year] = state.yearChange.tech;
  }
  assert.deepEqual(byYear, { 1955: TECH_PER_YEAR, 1956: 0, 1957: TECH_PER_YEAR, 1958: 0 });
});

test('HUD: a previsão olha o PRÓXIMO Ano novo, que pode vir sem pesquisa básica', () => {
  setGuide(false); // interface completa: a previsão aparece como texto
  const state = newGame();
  const p = state.players[0];
  const forecast = () => textsOf(hud(state, p, 'board', actions), 'stat-next');
  state.round = 1; // o próximo Ano novo é o de 1956 (sem pesquisa básica)
  assert.deepEqual(forecast().filter((t) => /em 3 rodadas/.test(t)).slice(-1), ['+0 em 3 rodadas']);
  state.round = 4; // o próximo é o de 1957 (com pesquisa básica)
  assert.deepEqual(forecast().filter((t) => /em 3 rodadas/.test(t)).slice(-1), [`+${TECH_PER_YEAR} em 3 rodadas`]);
  p.buildings.lab = 2;
  state.round = 1;
  assert.deepEqual(forecast().filter((t) => /em 3 rodadas/.test(t)).slice(-1), ['+2 em 3 rodadas'], 'o Laboratório rende mesmo sem pesquisa básica');
  setGuide(true);
});

test('animação do ano: sem pesquisa básica não mostra o ganho de tecnologia e explica o motivo', () => {
  const state = newGame();
  for (let i = 0; i < 3; i++) pass(state); // rodada 4 = 1956
  const root = yearOverlayNode(state.yearChange);
  assert.equal(state.yearChange.tech, 0);
  const gains = textsOf(root, 'gain');
  assert.ok(gains.some((g) => /Verba/.test(g)));
  assert.ok(!gains.some((g) => /Tecnologia/.test(g)), 'nenhum chip de tecnologia');
  assert.match(root.textContent, /pesquisa básica vem de 2 em 2 anos/);
});

test('socorro de emergência não derruba a tecnologia abaixo do mínimo (senão tranca a oficina)', () => {
  const state = newGame();
  const p = state.players[0];
  p.funds = 5;
  p.tech = 1;
  assert.equal(sim.requestBailout(state), null);
  assert.equal(p.tech, TECH_FLOOR, 'continua podendo comprar peças básicas');
  assert.equal(p.funds, 5 + BAILOUT_FUNDS);
  p.funds = 5;
  p.tech = 4;
  sim.requestBailout(state);
  assert.equal(p.tech, 2, 'com tecnologia de sobra o custo normal vale');
});
