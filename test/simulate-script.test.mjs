// O simulador (scripts/simulate.mjs) precisa ser confiável para calibrar o jogo: repetível, sempre termina
// e mede o que diz medir. Também confere que o uso do prédio de um rival aceita um gerador de sorteios.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playGame, summarize, seededRng } from '../scripts/simulate.mjs';
import { createInitialState } from '../src/sim/state.js';
import { startGame, rollAndMove, buildOnLot, endTurn, useRivalBuilding } from '../src/sim/actions.js';

test('o gerador com semente repete a mesma sequência', () => {
  const a = seededRng(42);
  const b = seededRng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(seededRng(1)(), seededRng(2)());
});

test('a mesma semente dá exatamente a mesma partida', () => {
  assert.deepEqual(playGame(123), playGame(123));
  assert.deepEqual(playGame(123, { policy: 'random' }), playGame(123, { policy: 'random' }));
});

test('toda partida termina por escada ou por tempo, sem travar', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = playGame(seed);
    assert.ok(['ladder', 'time'].includes(r.endReason), `semente ${seed}: ${r.endReason}`);
    assert.ok(r.rounds >= 1);
    assert.ok(['usa', 'ussr'].includes(r.side));
  }
});

test('mede o 1º lançamento e os degraus na ordem certa', () => {
  const r = playGame(5);
  assert.equal(typeof r.firstLaunchRound, 'number');
  assert.ok(r.firstLaunchRound >= 1);
  // o 1º degrau não sai antes do 1º lançamento, e cada degrau vem depois do anterior
  for (let i = 0; i < r.stepRounds.length; i++) {
    if (i === 0) assert.ok(r.stepRounds[0] >= r.firstLaunchRound);
    else assert.ok(r.stepRounds[i] >= r.stepRounds[i - 1]);
  }
  assert.equal(r.stepRounds.filter((x) => x != null).length, r.steps);
});

test('resumo agrupa por lado e conta as partidas', () => {
  const results = Array.from({ length: 30 }, (_, i) => playGame(i + 1));
  const summary = summarize(results);
  assert.equal(summary.todos.partidas, 30);
  assert.equal(summary.EUA.partidas + summary.URSS.partidas, 30);
  assert.equal(summary.todos.degraus.length, 4);
  assert.match(summary.todos.nave_vazia_no_turno_1, /%$/);
});

test('usar o prédio de um rival aceita um gerador de sorteios', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  const die1 = () => 0.01; // dado 1: cai no terreno livre
  rollAndMove(state, die1);
  assert.equal(buildOnLot(state, 'lab'), null);
  endTurn(state);
  state.players[1].funds = 100;
  rollAndMove(state, die1);
  assert.equal(state.pendingTile.kind, 'use');
  assert.equal(useRivalBuilding(state, () => 0.5), null);
});

test('a política greedy-nolab nunca constrói Laboratório; a greedy constrói', () => {
  const nolab = Array.from({ length: 25 }, (_, i) => playGame(i + 1, { policy: 'greedy-nolab' }));
  assert.ok(nolab.every((r) => r.lab === 0));
  const withLab = Array.from({ length: 25 }, (_, i) => playGame(i + 1, { policy: 'greedy' }));
  assert.ok(withLab.some((r) => r.lab > 0));
});

test('o resumo traz o sucesso por lançamento', () => {
  const summary = summarize(Array.from({ length: 20 }, (_, i) => playGame(i + 1)));
  assert.match(summary.todos.sucesso_por_lancamento, /^\d+%$/);
});
