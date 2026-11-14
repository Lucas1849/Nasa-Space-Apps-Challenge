// Testes do tabuleiro e das ações de turno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TILES, rollDie, movePlayer, applyTile } from '../src/board/board.js';
import { createInitialState } from '../src/sim/state.js';
import { startGame, rollAndMove, buyItem, sellItem, endTurn } from '../src/sim/actions.js';

test('dado devolve 1..6', () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.999), 6);
});

test('movimento dá a volta no tabuleiro e marca passagem pela largada', () => {
  const p = movePlayer({ position: TILES.length - 1 }, 2);
  assert.equal(p.position, 1);
  assert.equal(p.passedStart, true);
});

test('casa de verba soma verba', () => {
  const tile = TILES.find((t) => t.type === 'funds');
  const { player } = applyTile({ funds: 10, position: tile.id }, tile);
  assert.equal(player.funds, 10 + tile.funds);
});

test('casa de apoio só vale para quem está atrás', () => {
  const tile = TILES.find((t) => t.type === 'catchup');
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: true }).player.funds, tile.funds);
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: false }).player.funds, 0);
});

test('turno completo: jogar, comprar, vender, passar a vez', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A', missionId: 'first_satellite' }, { name: 'B', missionId: 'lunar_probe' }]);
  assert.equal(state.players.length, 2);
  assert.equal(state.screen, 'board');

  rollAndMove(state, () => 0.5);
  assert.equal(state.players[0].rolled, true);

  const before = state.players[0].funds;
  assert.equal(buyItem(state, 'camera'), null);
  assert.equal(state.players[0].spacecraft.instruments.length, 1);
  assert.ok(state.players[0].funds < before);

  assert.equal(sellItem(state, 'camera'), null);
  assert.equal(state.players[0].funds, before); // revenda pelo valor cheio antes do lançamento

  endTurn(state);
  assert.equal(state.turn, 1);
  endTurn(state);
  assert.equal(state.turn, 0);
  assert.equal(state.round, 2);
});

test('comprar sem verba devolve mensagem de erro', () => {
  const state = createInitialState();
  startGame(state, [{ name: 'A', missionId: 'first_satellite' }]);
  state.players[0].funds = 0;
  assert.match(buyItem(state, 'camera'), /Verba insuficiente/);
});
