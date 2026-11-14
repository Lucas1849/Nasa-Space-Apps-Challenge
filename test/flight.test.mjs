// Testes dos eventos de voo e da vida útil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, createPlayer } from '../src/sim/state.js';
import { startGame, launch, resolveFlight, buyItem, chooseLauncher, chooseOrbit } from '../src/sim/actions.js';
import { simulate, checkDesign } from '../src/sim/simulate.js';
import { FLIGHT_EVENTS, pickEvent, resolveOption } from '../src/data/events.js';
import { MISSIONS } from '../src/data/missions.js';

const noFailure = () => 0.99;

function readyState(missionId = 'first_satellite') {
  const state = createInitialState();
  startGame(state, [{ name: 'A', missionId }], { sandbox: true });
  buyItem(state, 'radio_beacon');
  buyItem(state, 'solar_small');
  buyItem(state, 'antenna_basic');
  chooseLauncher(state, 'small');
  chooseOrbit(state, 'leo');
  return state;
}

test('sandbox começa na oficina com verba alta', () => {
  const state = readyState();
  assert.equal(state.sandbox, true);
  assert.ok(state.players[0].funds > 500);
});

test('lançar abre a tela de voo com um evento pendente', () => {
  const state = readyState();
  assert.equal(launch(state, () => 0), null);
  assert.equal(state.screen, 'flight');
  assert.ok(FLIGHT_EVENTS[state.pendingFlight.eventId]);
});

test('pickEvent é determinístico com rng fixo', () => {
  const ids = Object.keys(FLIGHT_EVENTS);
  assert.equal(pickEvent(() => 0).id, ids[0]);
  assert.equal(pickEvent(() => 0.999).id, ids[ids.length - 1]);
});

test('resolver o evento gera relatório com a decisão e a lição', () => {
  const state = readyState();
  launch(state, () => 0); // primeiro evento: tempestade solar
  assert.equal(state.pendingFlight.eventId, 'solar_storm');
  resolveFlight(state, 0, noFailure); // modo seguro: -25% ciência
  const r = state.players[0].lastResult;
  assert.equal(state.screen, 'report');
  assert.equal(r.flight.event.id, 'solar_storm');
  assert.ok(r.flight.option.lesson.length > 10);
  assert.equal(r.success, true);
});

test('opção arriscada aumenta a chance de falha', () => {
  const p = createPlayer(0, 'T', 'first_satellite');
  p.spacecraft.instruments = ['radio_beacon'];
  p.spacecraft.parts = ['solar_small', 'antenna_basic'];
  p.spacecraft.launcherId = 'small';
  p.spacecraft.orbitId = 'leo';
  p.funds = 100;
  // rng 0.3: acima da chance base (0.15), abaixo de base + 0.35
  assert.equal(simulate(p, { rng: () => 0.3 }).success, true);
  assert.equal(simulate(p, { rng: () => 0.3, modifiers: { failChance: 0.35 } }).success, false);
});

test('antena reserva anula a penalidade da antena travada', () => {
  const opt = FLIGHT_EVENTS.antenna_stuck.options[0];
  const semReserva = createPlayer(0, 'T', 'first_satellite');
  semReserva.spacecraft.parts = ['antenna_basic'];
  assert.equal(resolveOption(opt, semReserva).sciencePenalty, 0.5);
  const comReserva = createPlayer(0, 'T', 'first_satellite');
  comReserva.spacecraft.parts = ['antenna_basic', 'antenna_dish'];
  assert.equal(resolveOption(opt, comReserva).sciencePenalty, 0);
});

test('vida útil: órbita baixa não basta para missão de 5 anos sem propulsor', () => {
  const p = createPlayer(0, 'T', 'weather_watch');
  p.spacecraft.orbitId = 'geo'; // 8 anos base
  assert.equal(checkDesign(p).checks.find((c) => c.id === 'lifetime').ok, true);
  p.spacecraft.orbitId = 'leo'; // 2 anos base
  assert.equal(checkDesign(p).checks.find((c) => c.id === 'lifetime').ok, false);
  p.spacecraft.parts = ['thruster']; // +3 = 5
  assert.equal(checkDesign(p).checks.find((c) => c.id === 'lifetime').ok, true);
});

test('corte de orçamento com encerramento antecipado pode derrubar a vida útil', () => {
  const p = createPlayer(0, 'T', 'lunar_probe'); // exige 2 anos
  p.spacecraft.orbitId = 'moon'; // 4 anos base
  const ok = checkDesign(p, { lifetimeDelta: -2 }).checks.find((c) => c.id === 'lifetime');
  assert.equal(ok.ok, true); // 4 - 2 = 2, no limite
  const bad = checkDesign(p, { lifetimeDelta: -3 }).checks.find((c) => c.id === 'lifetime');
  assert.equal(bad.ok, false);
});

test('toda missão tem pelo menos um projeto viável no catálogo', () => {
  // Projeto "máximo": tudo que ajuda, lançador pesado, órbita da missão. Garante que nenhuma missão é impossível.
  for (const m of Object.values(MISSIONS)) {
    const p = createPlayer(0, 'T', m.id);
    p.spacecraft.instruments = ['hires_camera', 'spectrometer', 'magnetometer', 'radio_beacon'];
    p.spacecraft.parts = ['solar_large', 'solar_large', 'antenna_dish', 'antenna_dish', 'thruster', 'battery', 'life_support'];
    p.spacecraft.launcherId = 'heavy';
    p.spacecraft.orbitId = m.orbit;
    p.funds = 999;
    const { ok, checks } = checkDesign(p);
    assert.ok(ok, `${m.name}: ${checks.filter((c) => !c.ok).map((c) => c.text).join(' | ')}`);
  }
});
