// Testes da soma de recursos. Roda com: npm test (test runner do Node, sem dependências).
import test from 'node:test';
import assert from 'node:assert/strict';
import { totalsFor, effectiveTotals, priceFor } from '../src/sim/resources.js';
import { createPlayer } from '../src/sim/state.js';

test('soma instrumentos e peças', () => {
  const p = createPlayer(0, 'Teste', 'first_satellite');
  p.spacecraft.instruments = ['camera', 'magnetometer'];
  p.spacecraft.parts = ['solar_small'];
  const t = totalsFor(p);
  assert.equal(t.mass, 5 + 3 + 4);
  assert.equal(t.science, 4 + 3);
  assert.equal(t.powerGen, 15);
  assert.equal(t.powerUse, 8 + 4);
});

test('sem itens, tudo zero', () => {
  const t = totalsFor(createPlayer(0, 'Teste', 'first_satellite'));
  assert.equal(t.mass, 0);
  assert.equal(t.science, 0);
  assert.equal(t.lifeSupport, false);
});

test('órbita lunar reduz comunicação efetiva', () => {
  const p = createPlayer(0, 'Teste', 'lunar_probe');
  p.spacecraft.parts = ['antenna_dish']; // comms 12
  p.spacecraft.orbitId = 'moon';         // penalidade 50%
  assert.equal(effectiveTotals(p).commsEffective, 6);
});

test('desconto reduz preço', () => {
  const p = createPlayer(0, 'Teste', 'first_satellite');
  p.discount = 10;
  assert.equal(priceFor(p, 'camera'), 9);
});
