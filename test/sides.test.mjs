// Testes dos lados, das escadas, do bot histórico, do rival escondido e do fim da partida.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, pushLog } from '../src/sim/state.js';
import {
  startGame, rollAndMove, endTurn, launch, advanceFlight, chooseStageOption, chooseDilemma, skipTile,
} from '../src/sim/actions.js';
import { ladderProgress } from '../src/sim/progress.js';
import { SIDES, drawSides, STEP_BONUS_FIRST, STEP_BONUS_LATER } from '../src/data/sides.js';
import { MAX_ROUNDS, REAL_HISTORY, yearOf, ROUNDS_PER_YEAR } from '../src/data/history.js';
import { MISSIONS } from '../src/data/missions.js';

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

// Anda e resolve o que a casa pedir, para os testes de fluxo não travarem.
function walk(state, steps = 2) {
  rollAndMove(state, die(steps));
  if (state.pendingDilemma) chooseDilemma(state, 0, noFailure);
  if (state.pendingTile) skipTile(state);
}

test('3 rodadas = 1 ano, de 1957 a 1969', () => {
  assert.equal(ROUNDS_PER_YEAR, 3);
  assert.equal(yearOf(1), 1957);
  assert.equal(yearOf(4), 1958);
  assert.equal(yearOf(MAX_ROUNDS), 1969);
});

test('toda missão das escadas existe e tem marco histórico com fonte da NASA', () => {
  for (const side of Object.values(SIDES)) {
    for (const m of side.ladder) {
      assert.ok(MISSIONS[m], m);
      assert.match(REAL_HISTORY[m].source, /nasa\.gov/);
      assert.ok(side.id in REAL_HISTORY[m].sides, `${side.id} sem ano real (ou null) para ${m}`);
    }
  }
});

test('sorteio equilibrado dos lados', () => {
  for (const r of [0, 0.3, 0.7, 0.99]) {
    const two = drawSides(2, () => r);
    assert.notEqual(two[0], two[1]);
    const four = drawSides(4, () => r);
    assert.equal(four.filter((s) => s === 'usa').length, 2);
    const three = drawSides(3, () => r);
    const usa = three.filter((s) => s === 'usa').length;
    assert.ok(usa === 1 || usa === 2);
  }
});

test('solo: o bot é do outro lado e segue o calendário histórico (±1 ano)', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0.5 });
  const [a, bot] = state.players;
  assert.equal(bot.bot, true);
  assert.notEqual(bot.side, a.side);
  bot.schedule.forEach((year, i) => {
    const real = REAL_HISTORY[SIDES[bot.side].ladder[i]].sides[bot.side];
    if (real == null) assert.equal(year, null);
    else assert.ok(Math.abs(year - real) <= 1);
  });
  assert.equal(state.screen, 'board'); // solo não precisa de tela de troca
});

test('solo: o bot cumpre degraus em segredo conforme os anos passam', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0.5 });
  const bot = state.players[1];
  bot.schedule = [1957, 1958, null, null];
  walk(state); endTurn(state);
  assert.equal(bot.step, 1);
  const human = state.players[0];
  const visible = state.log.filter((l) => l.who == null || l.who === human.id).map((l) => l.text).join(' ');
  assert.doesNotMatch(visible, /cumpriu "Primeiro satélite"/); // rival escondido
  for (let i = 0; i < ROUNDS_PER_YEAR; i += 1) { walk(state); endTurn(state); }
  assert.equal(bot.step, 2);
});

test('diário privado: cada agência só vê o que é seu e o que é público', () => {
  const state = createInitialState();
  pushLog(state, 'público');
  pushLog(state, 'segredo de A', 0);
  assert.equal(state.log.filter((l) => l.who == null || l.who === 1).length, 1);
});

test('cumprir um degrau sobe a escada; o primeiro do lado leva o bônus cheio', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  const [a, b] = state.players;
  b.side = a.side; // mesmo lado para testar o bônus
  for (const p of [a, b]) {
    p.funds = 500;
    p.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  }
  walk(state); launch(state, noFailure); endTurn(state);           // A lança
  walk(state); launch(state, noFailure); endTurn(state);           // B lança
  walk(state); advanceFlight(state, noFailure); chooseStageOption(state, 0, noFailure);
  assert.equal(a.step, 1);
  assert.equal(a.lastResult.stepBonus.bonus, STEP_BONUS_FIRST);
  assert.equal(a.missionId, SIDES[a.side].ladder[1]);
  endTurn(state);
  walk(state); advanceFlight(state, noFailure); chooseStageOption(state, 0, noFailure);
  assert.equal(b.lastResult.stepBonus.bonus, STEP_BONUS_LATER);
});

test('durante o voo a oficina mira o próximo degrau; se falhar, volta para o atual', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const a = state.players[0];
  a.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  walk(state);
  launch(state, noFailure);
  assert.equal(a.missionId, SIDES[a.side].ladder[1]);
  endTurn(state);
  walk(state); advanceFlight(state, noFailure); chooseStageOption(state, 0, () => 0);
  assert.equal(a.step, 0);
  assert.equal(a.missionId, SIDES[a.side].ladder[0]);
});

test('ao lançar, o degrau seguinte revela o kit dele e escolhe a órbita da nova missão', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const a = state.players[0];
  const next = MISSIONS[SIDES[a.side].ladder[1]];
  assert.ok(!a.unlocked.includes('life_support')); // ainda escondida no 1º degrau
  a.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  walk(state);
  assert.equal(launch(state, noFailure), null);
  assert.equal(a.missionId, next.id);
  for (const id of next.kit) assert.ok(a.unlocked.includes(id), id);
  assert.equal(a.spacecraft.orbitId, next.orbit);
});

test('vitória pela escada só é revelada no fim da rodada', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  const a = state.players[0];
  a.step = SIDES[a.side].ladder.length;
  walk(state); endTurn(state);
  assert.equal(state.gameOver, false); // B ainda joga nesta rodada
  walk(state); endTurn(state);
  assert.equal(state.gameOver, true);
  assert.deepEqual(state.winners, [a.id]);
  assert.equal(state.screen, 'gameover');
});

test('em 1969 sem escada completa, vence quem subiu mais degraus', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  const [a, b] = state.players;
  a.step = 2;
  b.step = 1;
  for (let r = 1; r <= MAX_ROUNDS; r += 1) {
    assert.equal(state.gameOver, false, `rodada ${r}`);
    walk(state); endTurn(state);
    walk(state); endTurn(state);
  }
  assert.equal(state.gameOver, true);
  assert.equal(state.endReason, 'time');
  assert.deepEqual(state.winners, [a.id]);
  assert.ok(ladderProgress(a).pct > ladderProgress(b).pct);
});
