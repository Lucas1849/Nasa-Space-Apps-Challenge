// Etapa 6: o espião pode sabotar em vez de observar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf } from './dom-stub.mjs';
import { createInitialState, SABOTAGE_COST } from '../src/sim/state.js';
import * as sim from '../src/sim/actions.js';
import { FLIGHT_EVENTS, pickEvent } from '../src/data/events.js';
import { stageOptions } from '../src/sim/flight.js';
import { boardScreen } from '../src/ui/board.js';
import { standOn, tileOf } from './tiles.mjs';

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

function twoPlayers() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  state.players.forEach((p) => { p.funds = 100; p.tech = 5; });
  return state;
}
function atSpy(state) {
  const p = state.players[state.turn];
  p.position = tileOf('spy') - 1;
  p.rolled = false;
  assert.equal(sim.rollAndMove(state, die(1)), null);
  assert.equal(state.pendingTile.kind, 'spy');
}

test('a casa do espião vira menu: observar ou sabotar, com um botão de cada por rival', () => {
  const state = twoPlayers();
  atSpy(state);
  const text = boardScreen(state, actions).textContent;
  assert.match(text, /Observar B/);
  assert.match(text, /Sabotar B/);
});

test('sabotar um jogador custa verba, gasta a ação do ano e arma a interferência', () => {
  const state = twoPlayers();
  const [a, b] = state.players;
  atSpy(state);
  assert.equal(sim.sabotage(state, b.id), null);
  assert.equal(a.funds, 100 - SABOTAGE_COST);
  assert.deepEqual(b.interference, { fromId: a.id, year: 1955 });
  assert.equal(state.pendingTile, null);
  assert.equal(a.lastSpyYear, 1955);
  // a vítima não fica sabendo (diário privado): só quem sabotou
  assert.ok(!state.log.some((l) => l.who === b.id && /sabot/i.test(l.text)));
  // não dá para armar duas
  state.pendingTile = { tileId: tileOf('spy'), kind: 'spy' };
  assert.match(sim.sabotage(state, b.id), /já tem uma sabotagem/);
});

test('sem verba a sabotagem é recusada e nada é armado', () => {
  const state = twoPlayers();
  const b = state.players[1];
  atSpy(state);
  state.players[0].funds = SABOTAGE_COST - 1;
  assert.match(sim.sabotage(state, b.id), /Verba insuficiente/);
  assert.equal(b.interference, null);
});

test('a interferência chega na ETAPA FINAL do voo, com duas opções de risco', () => {
  const state = twoPlayers();
  const b = state.players[1];
  b.interference = { fromId: 0, year: 1955 };
  state.turn = 1;
  b.flight = { missionId: 'first_satellite', plan: ['ascent', 'orbit_insertion'], stageIndex: 0, stages: [], modifiers: { sciencePenalty: 0, lifetimeDelta: 0 }, tileEvent: null, pending: null, craft: { instruments: [], parts: ['solar_small'], launcherId: 'small', orbitId: 'leo' } };
  b.rolled = true;
  sim.advanceFlight(state, noFailure);
  assert.notEqual(b.flight.pending.eventId, 'interference', 'na 1ª etapa ainda não');
  assert.ok(b.interference, 'continua armada');
  b.flight.pending = null; b.flightAdvanced = false; b.flight.stageIndex = 1;
  sim.advanceFlight(state, noFailure);
  assert.equal(b.flight.pending.eventId, 'interference');
  assert.equal(b.interference, null, 'consumida');
  const [free, paid] = stageOptions(b, b.flight.pending);
  assert.ok(free.risk.total > paid.risk.total, 'a opção segura reduz o risco');
  assert.equal(paid.effect.funds, -15);
  assert.ok(state.log.some((l) => l.who === 0 && /sabotagem chegou/.test(l.text)), 'quem sabotou fica sabendo');
});

test('a opção paga fica desabilitada sem verba; a grátis sempre existe', () => {
  const b = { funds: 3, spacecraft: { instruments: [], parts: ['solar_small'], launcherId: 'small', orbitId: 'leo' }, missionId: 'first_satellite', shields: 0, failureData: {}, buildings: {}, flight: null };
  const [free, paid] = stageOptions(b, { stageId: 'orbit_insertion', eventId: 'interference' });
  assert.equal(free.disabled, false);
  assert.equal(paid.disabled, true);
});

test('a interferência expira no fim do ano e nunca sai no sorteio comum', () => {
  const state = twoPlayers();
  const a = state.players[0];
  a.interference = { fromId: 1, year: 1955 };
  state.round = 4; // ano novo: 1956
  state.turn = 0;
  state.players[1].rolled = a.rolled = true;
  state.round = 3;
  state.turn = 1;
  sim.endTurn(state);
  assert.equal(state.round, 4);
  assert.equal(a.interference, null);
  for (let i = 0; i < 200; i++) assert.notEqual(pickEvent(() => i / 200).id, 'interference');
  assert.ok(FLIGHT_EVENTS.interference);
});

test('contra o bot do solo, a sabotagem atrasa o próximo degrau dele em 1 ano', () => {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const a = state.players[0];
  a.funds = 100;
  const bot = state.players.find((p) => p.bot);
  const before = bot.schedule[bot.step];
  atSpy(state);
  assert.equal(sim.sabotage(state, bot.id), null);
  assert.equal(bot.schedule[bot.step], before + 1);
  assert.equal(bot.interference, null, 'o bot não recebe a interferência');
  // só um atraso por degrau: senão uma sabotagem por ano seguraria o bot para sempre
  a.lastSpyYear = null;
  state.pendingTile = { tileId: tileOf('spy'), kind: 'spy' };
  assert.match(sim.sabotage(state, bot.id), /já foi atrasada/);
  assert.equal(bot.schedule[bot.step], before + 1);
});
