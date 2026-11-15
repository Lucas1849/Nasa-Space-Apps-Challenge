// Etapa 3: blueprints nos fornecedores. A 1ª é grátis, as seguintes custam; sem blueprint a oficina recusa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { standOn } from './tiles.mjs';
import { createInitialState } from '../src/sim/state.js';
import { startGame, moveBy, rollDice, buyBlueprint, buyItem, chooseLauncher, skipTile } from '../src/sim/actions.js';
import { makeOffers, missingKit, blueprintPrice, blueprintCostFor, SUPPLIER_OFFERS } from '../src/sim/suppliers.js';
import { MISSIONS } from '../src/data/missions.js';
import { TILES } from '../src/board/board.js';

const shopId = TILES.find((t) => t.type === 'shop').id;
function atSupplier() {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const p = state.players[0];
  p.position = shopId - 1;
  state.dice = [1, 1]; // ambos os dados andam 1 casa até o fornecedor
  state.diceRolled = true;
  assert.equal(moveBy(state, 0, () => 0), null);
  assert.equal(state.pendingTile.kind, 'supplier');
  return { state, p };
}

test('as ofertas têm 3 itens sem repetir, priorizando o kit que falta', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const p = state.players[0];
  const offers = makeOffers(p, () => 0.3);
  assert.equal(offers.length, SUPPLIER_OFFERS);
  assert.equal(new Set(offers).size, offers.length);
  const kit = MISSIONS[p.missionId].kit;
  assert.ok(offers.filter((id) => kit.includes(id)).length >= 2);
});

test('a primeira blueprint é grátis; a segunda custa o preço', () => {
  const { state, p } = atSupplier();
  const [first, second] = state.pendingTile.offers;
  assert.equal(blueprintCostFor(p, first), 0);
  const funds = p.funds;
  assert.equal(buyBlueprint(state, first), null);
  assert.equal(p.funds, funds);
  assert.ok(p.unlocked.includes(first));
  assert.equal(blueprintCostFor(p, second), blueprintPrice(second));
  p.funds = 100;
  assert.equal(buyBlueprint(state, second), null);
  assert.equal(p.funds, 100 - blueprintPrice(second));
});

test('sem verba a blueprint é recusada, e a visita pode ser recusada sem custo', () => {
  const { state, p } = atSupplier();
  p.freeBlueprintUsed = true;
  p.funds = 0;
  const id = state.pendingTile.offers[0];
  assert.match(buyBlueprint(state, id), /./);
  assert.ok(!p.unlocked.includes(id));
  assert.equal(skipTile(state), null);
  assert.equal(state.pendingTile, null);
});

test('a oficina só vende peça/foguete depois da blueprint', () => {
  const { state, p } = atSupplier();
  standOn(state, 'workshop');
  p.funds = 100;
  const id = 'radio_beacon';
  assert.match(buyItem(state, id), /blueprint/);
  assert.match(chooseLauncher(state, 'small'), /blueprint/);
  p.tech = 2;
  p.unlocked.push(id, 'small');
  assert.equal(buyItem(state, id), null);
  assert.equal(chooseLauncher(state, 'small'), null);
  assert.ok(!missingKit(p).includes(id));
});
