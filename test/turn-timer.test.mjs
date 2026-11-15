// Relógio do turno (src/sim/turnTimer.js): quando vale e o que acontece quando o tempo acaba.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/sim/state.js';
import * as sim from '../src/sim/actions.js';
import { timerApplies, timeoutTurn, TURN_SECONDS, turnSecondsOf } from '../src/sim/turnTimer.js';

const noFailure = () => 0.99;
const game = (n, opts = {}) => { const s = createInitialState(); sim.startGame(s, Array.from({ length: n }, (_, i) => ({ name: `J${i + 1}` })), { rng: () => 0, ...opts }); s.screen = 'board'; return s; };
const lastLog = (s) => s.log[0]?.text ?? '';

test('o relógio de 120 s só vale com 2 ou mais agências humanas e fora do sandbox', () => {
  assert.equal(TURN_SECONDS, 120);
  assert.equal(timerApplies(game(1)), false, 'solo contra o bot: sem relógio');
  assert.equal(timerApplies(game(2)), true);
  assert.equal(timerApplies(game(4)), true);
  const sandbox = createInitialState();
  sim.startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.equal(timerApplies(sandbox), false);
  assert.match(timeoutTurn(sandbox), /não tem relógio/);
});

test('tempo esgotado sem rolar: rola, anda com o 1º dado, resolve a casa e passa a vez', () => {
  const s = game(2);
  const [a] = s.players;
  assert.equal(s.turn, 0);
  assert.equal(timeoutTurn(s, noFailure), null);
  assert.equal(a.rolled || s.turn === 1, true);
  assert.equal(s.turn, 1, 'a vez passou para a agência seguinte');
  assert.equal(s.pendingDilemma, null);
  assert.equal(s.pendingTile, null);
  assert.ok(s.log.some((l) => /J1: tempo esgotado \(120 s\)/.test(l.text) && /andou \d/.test(l.text)), lastLog(s));
});

test('tempo esgotado com dilema aberto: fica a 1ª opção e a vez passa', () => {
  const s = game(2);
  sim.rollAndMove(s, () => 0.01);
  s.pendingTile = null;
  s.pendingDilemma = { id: 'congress' };
  assert.equal(timeoutTurn(s, noFailure), null);
  assert.equal(s.pendingDilemma, null);
  assert.equal(s.turn, 1);
  assert.ok(s.log.some((l) => /dilema: 1ª opção/.test(l.text)));
});

test('tempo esgotado com a nave em voo: o voo avança uma etapa antes de passar a vez', () => {
  const s = game(2);
  const p = s.players[0];
  ['radio_beacon', 'solar_small', 'antenna_basic', 'small'].forEach((id) => { if (!p.unlocked.includes(id)) p.unlocked.push(id); });
  p.funds = 150;
  p.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  p.position = 2; // casa de Oficina de montagem: só nela dá para lançar
  p.rolled = true;
  assert.equal(sim.launch(s, noFailure), null);
  assert.ok(p.flight, 'nave em voo');
  const stageBefore = p.flight.stageIndex;
  sim.endTurn(s);
  timeoutTurn(s, noFailure); // vez do J2: passa por tempo
  assert.equal(s.turn, 0);
  s.screen = 'board';
  assert.equal(timeoutTurn(s, noFailure), null);
  assert.equal(s.turn, 1);
  assert.ok(!p.flight || p.flight.stageIndex > stageBefore || p.lastResult, 'o voo andou (ou terminou)');
  assert.ok(s.log.some((l) => /voo avançou uma etapa/.test(l.text)));
});

test('o tempo escolhido vale para a partida; 0 desliga o relógio', () => {
  const s = game(2);
  assert.equal(turnSecondsOf(s), 120, 'sem escolha, vale o padrão');
  s.turnSeconds = 60;
  assert.equal(turnSecondsOf(s), 60);
  assert.equal(timeoutTurn(s, noFailure), null);
  assert.ok(s.log.some((l) => /tempo esgotado \(60 s\)/.test(l.text)));
  s.turnSeconds = 0;
  assert.equal(timerApplies(s), false);
});
