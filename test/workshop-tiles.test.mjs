// Etapa 4: tabuleiro de 20 casas e oficina "ver livre, agir na casa".
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf, walk as walkDom } from './dom-stub.mjs';
import { createInitialState } from '../src/sim/state.js';
import * as sim from '../src/sim/actions.js';
import { discover } from '../src/sim/resources.js';
import { MISSIONS } from '../src/data/missions.js';
import { TILES, atWorkshopTile } from '../src/board/board.js';
import { workshopScreen } from '../src/ui/workshop.js';
import { standOn, tileOf } from './tiles.mjs';

function game() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const p = state.players[0];
  p.funds = 200;
  p.tech = 5;
  discover(p, MISSIONS.first_satellite.kit);
  return { state, p };
}
const buttons = (root) => { const out = []; walkDom(root, (n) => { if (n.tag === 'button') out.push(n); }); return out; };

test('as 3 casas de oficina e os 2 fornecedores ficam espalhados (nunca encostados)', () => {
  for (const type of ['workshop', 'shop']) {
    const ids = TILES.filter((t) => t.type === type).map((t) => t.id);
    for (let i = 0; i < ids.length; i++) {
      const next = ids[(i + 1) % ids.length];
      const gap = (next - ids[i] + TILES.length) % TILES.length;
      assert.ok(gap >= 4, `${type}: ${ids[i]} -> ${next}`);
    }
  }
  assert.equal(atWorkshopTile({ position: tileOf('workshop') }), true);
  assert.equal(atWorkshopTile({ position: tileOf('shop') }), false);
});

test('fora da oficina: comprar, vender, escolher foguete, ensaiar e lançar são recusados', () => {
  const { state, p } = game();
  standOn(state, 'lot');
  p.rolled = true;
  for (const result of [sim.buyItem(state, 'radio_beacon'), sim.sellItem(state, 'radio_beacon'), sim.chooseLauncher(state, 'small'), sim.rehearse(state), sim.launch(state)]) {
    assert.match(result, /casa de Oficina/);
  }
  assert.deepEqual(p.spacecraft.parts, []);
});

test('na casa de oficina tudo funciona; o sandbox ignora a regra', () => {
  const { state, p } = game();
  standOn(state, 'workshop');
  assert.equal(sim.chooseLauncher(state, 'small'), null);
  assert.equal(sim.buyItem(state, 'solar_small'), null);
  assert.equal(sim.sellItem(state, 'solar_small'), null);

  const sandbox = createInitialState();
  sim.startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.equal(atWorkshopTile(sandbox.players[0]), false, 'o sandbox não tem tabuleiro, mas compra mesmo assim');
  assert.equal(sim.buyItem(sandbox, 'solar_small'), null);
});

test('a tela da oficina abre de qualquer lugar: fora da casa mostra o aviso e desabilita os gastos', () => {
  const { state, p } = game();
  standOn(state, 'lot');
  const away = workshopScreen(state, actions);
  assert.match(away.textContent, /Modo planejamento/);
  const buy = buttons(away).filter((b) => /Comprar por/.test(b.textContent));
  assert.ok(buy.length > 0);
  assert.ok(buy.every((b) => b.disabled), 'comprar desabilitado');
  assert.ok(buttons(away).filter((b) => /Lançar/.test(b.textContent)).every((b) => b.disabled));

  standOn(state, 'workshop');
  const here = workshopScreen(state, actions);
  assert.ok(!/Modo planejamento/.test(here.textContent));
  assert.ok(buttons(here).some((b) => /Comprar por/.test(b.textContent) && !b.disabled));
});
