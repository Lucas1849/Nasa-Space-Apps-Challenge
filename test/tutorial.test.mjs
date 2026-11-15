// Etapa 5: dicas contextuais de "primeira vez", cada uma uma única vez por jogador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions } from './dom-stub.mjs';
import { createInitialState } from '../src/sim/state.js';
import * as sim from '../src/sim/actions.js';
import { discover } from '../src/sim/resources.js';
import { boardScreen } from '../src/ui/board.js';
import { workshopScreen } from '../src/ui/workshop.js';
import { setGuide } from '../src/ui/prefs.js';
import { standOn, tileOf } from './tiles.mjs';

const die = (steps) => () => (steps - 1) / 6 + 0.01;
function game() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  state.players[0].funds = 100;
  state.players[0].tech = 5;
  return state;
}

test('chegar à casa de oficina pela 1ª vez levanta a dica; a 2ª vez não', () => {
  const state = game();
  const a = state.players[0];
  sim.rollAndMove(state, die(2)); // casa 2: oficina
  assert.equal(state.tip?.id, 'workshop');
  assert.equal(state.tip.playerId, a.id);
  assert.deepEqual(a.tipsSeen, ['workshop']);
  sim.endTurn(state);
  assert.equal(state.tip, null, 'a dica some quando a vez passa');
  state.turn = 0;
  a.position = tileOf('workshop') - 1;
  a.rolled = false;
  sim.rollAndMove(state, die(1));
  assert.equal(state.tip, null, 'já viu: não repete');
});

test('a 1ª blueprint, a 1ª peça e o 1º lançamento têm cada um a sua dica', () => {
  const state = game();
  const a = state.players[0];
  a.position = tileOf('shop') - 1;
  sim.rollAndMove(state, die(1));
  const id = state.pendingTile.offers[0];
  assert.equal(sim.buyBlueprint(state, id), null);
  assert.deepEqual([state.tip.id, state.tip.item], ['blueprint', id]);

  discover(a, ['radio_beacon', 'solar_small', 'antenna_basic', 'small']);
  standOn(state, 'workshop');
  assert.equal(sim.chooseLauncher(state, 'small'), null);
  assert.equal(sim.buyItem(state, 'solar_small'), null);
  assert.equal(state.tip.id, 'part');
  sim.buyItem(state, 'radio_beacon');
  sim.buyItem(state, 'antenna_basic');
  assert.equal(sim.launch(state, () => 0.99), null);
  assert.equal(state.tip.id, 'launch');
  assert.deepEqual([...a.tipsSeen].sort(), ['blueprint', 'launch', 'part']);
});

test('sandbox não recebe dicas; a tela mostra a dica só com as dicas ligadas', () => {
  const sandbox = createInitialState();
  sim.startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  sim.buyItem(sandbox, 'solar_small');
  assert.equal(sandbox.tip, null);

  const state = game();
  sim.rollAndMove(state, die(2));
  setGuide(true);
  assert.match(boardScreen(state, actions).textContent, /Você está numa casa de Oficina/);
  assert.match(workshopScreen(state, actions).textContent, /Primeira vez/);
  setGuide(false);
  assert.ok(!/Primeira vez/.test(boardScreen(state, actions).textContent));
  setGuide(true);
});
