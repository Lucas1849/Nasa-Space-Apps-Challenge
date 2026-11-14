// Testes da simulação: cada regra de falha precisa gerar um motivo legível.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, checkDesign } from '../src/sim/simulate.js';
import { createPlayer } from '../src/sim/state.js';

const noFailure = () => 0.99; // rng que nunca dispara a falha aleatória
const alwaysFail = () => 0.0;

function goodSatellite() {
  const p = createPlayer(0, 'Teste', 'first_satellite');
  p.spacecraft.instruments = ['radio_beacon'];        // ciência 2, dados 1, usa 2
  p.spacecraft.parts = ['solar_small', 'antenna_basic']; // gera 15, comunica 4, usa 3
  p.spacecraft.launcherId = 'small';
  p.spacecraft.orbitId = 'leo';
  p.funds = 100;
  return p;
}

test('projeto correto cumpre a missão', () => {
  const r = simulate(goodSatellite(), { rng: noFailure });
  assert.equal(r.success, true);
  assert.ok(r.score > 0);
  assert.match(r.reasons[0], /Missão cumprida/);
});

test('sem lançador e sem órbita, falha com motivos', () => {
  const p = createPlayer(0, 'Teste', 'first_satellite');
  const r = simulate(p, { rng: noFailure });
  assert.equal(r.success, false);
  assert.equal(r.score, 0);
  assert.ok(r.reasons.some((t) => /lançador/i.test(t)));
  assert.ok(r.reasons.some((t) => /órbita/i.test(t)));
});

test('massa acima do lançador falha', () => {
  const p = goodSatellite();
  p.spacecraft.parts.push('life_support', 'life_support'); // +50 de massa > 40
  const r = simulate(p, { rng: noFailure });
  assert.equal(r.success, false);
  assert.ok(r.reasons.some((t) => /Massa/.test(t)));
});

test('lançador pequeno não alcança a Lua', () => {
  const p = createPlayer(0, 'Teste', 'lunar_probe');
  p.spacecraft.launcherId = 'small';
  p.spacecraft.orbitId = 'moon';
  const { checks } = checkDesign(p);
  assert.equal(checks.find((c) => c.id === 'reach').ok, false);
});

test('energia insuficiente falha', () => {
  const p = goodSatellite();
  p.spacecraft.parts = ['antenna_basic']; // sem painel solar
  const r = simulate(p, { rng: noFailure });
  assert.equal(r.success, false);
  assert.ok(r.reasons.some((t) => /Energia insuficiente/.test(t)));
});

test('falha aleatória derruba missão sem escudo e é absorvida com escudo', () => {
  const semEscudo = simulate(goodSatellite(), { rng: alwaysFail });
  assert.equal(semEscudo.success, false);

  const comEscudo = goodSatellite();
  comEscudo.shields = 1;
  const r = simulate(comEscudo, { rng: alwaysFail });
  assert.equal(r.success, true);
  assert.equal(r.usedShield, true);
});

test('missão com ser vivo exige suporte de vida', () => {
  const p = goodSatellite();
  p.missionId = 'living_being';
  const { checks } = checkDesign(p);
  assert.equal(checks.find((c) => c.id === 'life').ok, false);
});
