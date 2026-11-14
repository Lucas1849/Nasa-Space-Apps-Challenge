// Testes das cartas de vitória, dos recordes e do fim da partida (rodada = ano, até 1969).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, createPlayer } from '../src/sim/state.js';
import { startGame, rollAndMove, endTurn, launch, advanceFlight } from '../src/sim/actions.js';
import { OBJECTIVES, objectiveProgress, drawObjectives } from '../src/data/objectives.js';
import { MAX_ROUNDS, REAL_HISTORY, yearOf } from '../src/data/history.js';
import { MISSIONS } from '../src/data/missions.js';

const die = (steps) => () => (steps - 1) / 6 + 0.01;

test('13 rodadas, de 1957 a 1969', () => {
  assert.equal(MAX_ROUNDS, 13);
  assert.equal(yearOf(1), 1957);
  assert.equal(yearOf(MAX_ROUNDS), 1969);
});

test('toda missão tem marco histórico com fonte da NASA', () => {
  for (const id of Object.keys(MISSIONS)) {
    assert.ok(REAL_HISTORY[id], id);
    assert.match(REAL_HISTORY[id].source, /nasa\.gov/);
  }
});

test('sorteio de cartas sem repetição', () => {
  const cards = drawObjectives(4, () => 0.5);
  assert.equal(new Set(cards).size, 4);
  assert.equal(drawObjectives(2, () => 0.3).length, 2);
  for (const r of [0, 0.3, 0.6, 0.99]) assert.notEqual(drawObjectives(1, () => r)[0], 'pioneer'); // solo
});

test('progresso de cada carta', () => {
  const state = createInitialState();
  const p = createPlayer(0, 'A');
  state.players = [p];

  p.objectiveId = 'scientist';
  p.completed = [{ missionId: 'first_satellite', year: 1957, science: 6 }, { missionId: 'lunar_probe', year: 1960, science: 9 }];
  assert.equal(objectiveProgress(p, state).done, true);

  p.objectiveId = 'infrastructure';
  assert.equal(objectiveProgress(p, state).value, 1);

  p.objectiveId = 'pioneer';
  state.records = { first_satellite: { playerId: 0, year: 1957 } };
  assert.equal(objectiveProgress(p, state).value, 1);
  assert.equal(OBJECTIVES.pioneer.counts('first_satellite', state), false); // recorde já tomado
  assert.equal(OBJECTIVES.pioneer.counts('living_being', state), true);

  p.objectiveId = 'explorer';
  p.bestStage = { crewed_moon: 3 }; // chegou à Lua mas não voltou: etapas contam
  assert.equal(objectiveProgress(p, state).pct, 0.75);
});

test('vitória só é declarada no fim da rodada', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  const a = state.players[0];
  a.objectiveId = 'scientist';
  a.completed = [{ missionId: 'lunar_probe', year: 1957, science: 20 }];
  rollAndMove(state, die(2));
  endTurn(state);
  assert.equal(state.gameOver, false); // B ainda joga nesta rodada
  rollAndMove(state, die(2));
  endTurn(state);
  assert.equal(state.gameOver, true);
  assert.deepEqual(state.winners, [0]);
  assert.equal(state.screen, 'gameover');
});

test('em 1969 sem carta cumprida, vence o maior progresso', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const a = state.players[0];
  for (let r = 1; r <= MAX_ROUNDS; r += 1) {
    assert.equal(state.gameOver, false, `rodada ${r}`);
    rollAndMove(state, die(2));
    endTurn(state);
  }
  assert.equal(state.gameOver, true);
  assert.equal(state.endReason, 'time');
  assert.deepEqual(state.winners, [a.id]);
});

test('com nave em voo, é preciso avançar uma etapa antes de passar a vez', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A', missionId: 'first_satellite' }], { rng: () => 0 });
  const p = state.players[0];
  p.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo', flown: false };
  rollAndMove(state, die(2));
  assert.equal(launch(state, () => 0.99), null);
  assert.equal(endTurn(state), null); // lançar encerra o turno
  rollAndMove(state, die(2));
  assert.match(endTurn(state), /avance uma etapa/);
  advanceFlight(state, () => 0.99);
  assert.match(endTurn(state), /Decida o imprevisto/);
});
