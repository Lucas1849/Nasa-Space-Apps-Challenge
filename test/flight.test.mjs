// Testes do voo em etapas, dos eventos de voo e da vida útil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, createPlayer } from '../src/sim/state.js';
import {
  startGame, launch, advanceFlight, chooseStageOption, buyItem, chooseLauncher, chooseOrbit, chooseMission,
} from '../src/sim/actions.js';
import { simulate, checkDesign } from '../src/sim/simulate.js';
import { stageRisk, stageOptions, missionRisk, flightPlan } from '../src/sim/flight.js';
import { FLIGHT_EVENTS, pickEvent, resolveOption } from '../src/data/events.js';
import { MISSIONS } from '../src/data/missions.js';
import { STAGES, FAILURE_DATA_BONUS } from '../src/data/stages.js';

const noFailure = () => 0.99;
const alwaysFail = () => 0;

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

test('sandbox começa na oficina com verba e tecnologia altas', () => {
  const state = readyState();
  assert.equal(state.sandbox, true);
  assert.ok(state.players[0].funds > 500);
  assert.ok(state.players[0].tech > 10);
});

test('plano de voo por destino: LEO 2 etapas, GEO 3, Lua 3, tripulada 4', () => {
  assert.deepEqual(flightPlan('first_satellite'), ['ascent', 'orbit_insertion']);
  assert.equal(flightPlan('weather_watch').length, 3);
  assert.equal(flightPlan('lunar_probe').length, 3);
  assert.deepEqual(flightPlan('crewed_moon').slice(-1), ['crew_return']);
});

test('lançar resolve a subida na hora e libera a oficina para a próxima nave', () => {
  const state = readyState();
  assert.equal(launch(state, noFailure), null);
  const p = state.players[0];
  assert.equal(state.screen, 'flight');
  assert.equal(p.flight.stageIndex, 1);
  assert.equal(p.flight.stages[0].stageId, 'ascent');
  assert.equal(p.flight.stages[0].success, true);
  assert.equal(p.flight.craft.instruments.length, 1);
  assert.equal(p.spacecraft.instruments.length, 0); // nave nova em branco
  assert.equal(p.spacecraft.launcherId, 'small');   // lançador e órbita pré-escolhidos
});

test('missão LEO completa: subida + entrada em órbita = cumprida', () => {
  const state = readyState();
  launch(state, noFailure);
  assert.equal(advanceFlight(state, noFailure), null);
  const p = state.players[0];
  assert.equal(p.flight.pending.stageId, 'orbit_insertion');
  assert.equal(p.flight.pending.eventId, null); // sem casa de evento e sem imprevisto garantido
  chooseStageOption(state, 0, noFailure); // seguir
  assert.equal(state.screen, 'report');
  assert.equal(p.lastResult.success, true);
  assert.equal(p.completed[0].missionId, 'first_satellite');
  assert.equal(chooseMission(state, 'living_being'), null); // sandbox: qualquer missão
});

test('falha na subida: nave perdida, dados de falha reduzem o risco da próxima', () => {
  const state = readyState();
  const p = state.players[0];
  const before = stageRisk(p, 'ascent').total;
  launch(state, alwaysFail);
  assert.equal(state.screen, 'report');
  assert.equal(p.lastResult.success, false);
  assert.equal(p.flight, null);
  assert.equal(p.failureData.launch, 1);
  assert.match(p.lastResult.failureLesson, /lançamento/);
  // Monta de novo a mesma nave: o risco da subida caiu.
  buyItem(state, 'radio_beacon'); buyItem(state, 'solar_small'); buyItem(state, 'antenna_basic');
  const after = stageRisk(p, 'ascent').total;
  assert.ok(Math.abs(before - after - FAILURE_DATA_BONUS) < 1e-9, `${before} -> ${after}`);
});

test('proteção absorve a falha de uma etapa', () => {
  const state = readyState();
  state.players[0].shields = 1;
  launch(state, alwaysFail);
  const p = state.players[0];
  assert.equal(p.flight.stages[0].success, true);
  assert.equal(p.flight.stages[0].usedShield, true);
  assert.equal(p.shields, 0);
});

test('não existe abortar: falha no meio vira missão de consolação com crédito parcial', () => {
  const state = readyState();
  launch(state, noFailure);
  advanceFlight(state, noFailure);
  const p = state.players[0];
  const options = stageOptions(p, p.flight.pending);
  assert.ok(options.every((o) => o.kind !== 'abort'));
  const funds = p.funds;
  chooseStageOption(state, 0, alwaysFail);
  assert.equal(p.lastResult.success, false);
  assert.match(p.lastResult.consolation, /Crédito parcial/);
  assert.ok(p.funds > funds);
  assert.equal(p.failureData.power, 1);
});

test('falha na subida não tem consolação', () => {
  const state = readyState();
  launch(state, alwaysFail);
  assert.equal(state.players[0].lastResult.consolation, null);
});

test('revisão paga reduz o risco da etapa', () => {
  const state = readyState();
  launch(state, noFailure);
  advanceFlight(state, noFailure);
  const p = state.players[0];
  const [go, review] = stageOptions(p, p.flight.pending);
  assert.equal(review.kind, 'review');
  assert.ok(review.risk.total < go.risk.total);
});

test('carga perto do limite do foguete aumenta o risco da subida', () => {
  const p = createPlayer(0, 'T', 'first_satellite');
  p.spacecraft.launcherId = 'small'; // carga máxima 40
  p.spacecraft.parts = ['life_support', 'solar_small', 'antenna_basic', 'antenna_basic', 'antenna_basic'];
  const risk = stageRisk(p, 'ascent');
  assert.ok(risk.parts.some((x) => /limite do foguete/.test(x.text)));
  assert.ok(risk.total > STAGES.ascent.baseRisk);
});

test('antena reserva reduz o risco da chegada; Controle de missão também', () => {
  const p = createPlayer(0, 'T', 'lunar_probe');
  p.spacecraft.parts = ['antenna_basic'];
  const one = stageRisk(p, 'lunar_arrival').total;
  p.spacecraft.parts = ['antenna_basic', 'antenna_dish'];
  const two = stageRisk(p, 'lunar_arrival').total;
  assert.ok(two < one);
  p.buildings.control = 2;
  assert.ok(stageRisk(p, 'lunar_arrival').total < two);
});

test('opção arriscada do imprevisto soma à chance de falha e mostra o motivo', () => {
  const p = createPlayer(0, 'T', 'first_satellite');
  p.flight = { missionId: 'first_satellite', craft: p.spacecraft };
  const opts = stageOptions(p, { stageId: 'orbit_insertion', eventId: 'solar_storm' });
  assert.equal(opts.length, 2); // as 2 opções do evento
  assert.ok(opts[1].risk.total > opts[0].risk.total); // "manter tudo ligado" é mais arriscado
  assert.ok(opts[1].risk.parts.some((x) => /arriscada/.test(x.text)));
});

test('dilema "lançar assim mesmo" aumenta o risco da próxima subida, só uma vez', () => {
  const state = readyState();
  const p = state.players[0];
  const base = stageRisk(p, 'ascent').total;
  p.launchRisk = 0.12;
  assert.ok(stageRisk(p, 'ascent').total > base);
  launch(state, noFailure);
  assert.equal(p.launchRisk, 0);
});

test('casa de evento no tabuleiro vira o imprevisto da próxima etapa', () => {
  const state = readyState();
  launch(state, noFailure);
  state.players[0].flight.tileEvent = 'debris';
  advanceFlight(state, noFailure);
  assert.equal(state.players[0].flight.pending.eventId, 'debris');
});

test('chegada à Lua sempre tem imprevisto (ponto-chave)', () => {
  assert.equal(STAGES.lunar_arrival.guaranteedEvent, true);
  assert.equal(missionRisk(createPlayer(0, 'T', 'crewed_moon')).stages.length, 4);
});

test('pickEvent é determinístico com rng fixo', () => {
  const ids = Object.values(FLIGHT_EVENTS).filter((e) => !e.armed).map((e) => e.id); // a interferência (armed) não entra no sorteio
  assert.equal(pickEvent(() => 0).id, ids[0]);
  assert.equal(pickEvent(() => 0.999).id, ids[ids.length - 1]);
});

test('opção arriscada aumenta a chance de falha na simulação clássica', () => {
  const p = createPlayer(0, 'T', 'first_satellite');
  p.spacecraft.instruments = ['radio_beacon'];
  p.spacecraft.parts = ['solar_small', 'antenna_basic'];
  p.spacecraft.launcherId = 'small';
  p.spacecraft.orbitId = 'leo';
  p.funds = 100;
  assert.equal(simulate(p, { rng: () => 0.3 }).success, true);
  assert.equal(simulate(p, { rng: () => 0.3, modifiers: { failChance: 0.35 } }).success, false);
  assert.equal(simulate(p, { rng: () => 0, randomFailure: false }).success, true);
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

test('decisão em voo que encurta a vida útil pode derrubar a missão na avaliação final', () => {
  const p = createPlayer(0, 'T', 'lunar_probe'); // exige 2 anos
  p.spacecraft.orbitId = 'moon'; // 4 anos base
  assert.equal(checkDesign(p, { lifetimeDelta: -2 }).checks.find((c) => c.id === 'lifetime').ok, true);
  assert.equal(checkDesign(p, { lifetimeDelta: -3 }).checks.find((c) => c.id === 'lifetime').ok, false);
});

test('avaliação depois do voo não cobra a verba do lançamento de novo', () => {
  const p = createPlayer(0, 'T', 'first_satellite');
  p.spacecraft.instruments = ['radio_beacon'];
  p.spacecraft.parts = ['solar_small', 'antenna_basic'];
  p.spacecraft.launcherId = 'small';
  p.spacecraft.orbitId = 'leo';
  p.funds = 0;
  assert.equal(checkDesign(p).ok, false);
  assert.equal(checkDesign(p, { launched: true }).ok, true);
});

test('toda missão tem pelo menos um projeto viável no catálogo', () => {
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
