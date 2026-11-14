// Testes do tabuleiro, do turno, dos prédios e da tecnologia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TILES, rollDie, movePlayer, applyTile } from '../src/board/board.js';
import { createInitialState, ANNUAL_BUDGET, STARTING_FUNDS } from '../src/sim/state.js';
import {
  startGame, rollAndMove, buyItem, sellItem, endTurn, buildOnLot, useRivalBuilding, upgradeBuilding,
  launch, chooseLauncher, requestBailout,
} from '../src/sim/actions.js';
import { OBJECTIVES } from '../src/data/objectives.js';
import { upgradeCost } from '../src/data/buildings.js';

// rng que tira `steps` no dado (rollDie usa 1 + floor(rng * 6)).
const die = (steps) => () => (steps - 1) / 6 + 0.01;
const fixedCards = () => 0; // sorteio de cartas determinístico

function twoPlayers() {
  const state = createInitialState();
  startGame(state, [{ name: 'A', missionId: 'first_satellite' }, { name: 'B', missionId: 'lunar_probe' }], { rng: fixedCards });
  return state;
}

test('dado devolve 1..6', () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.999), 6);
});

test('tabuleiro tem 16 casas com ids em ordem', () => {
  assert.equal(TILES.length, 16);
  TILES.forEach((t, i) => assert.equal(t.id, i));
});

test('movimento dá a volta no tabuleiro e marca passagem pela largada', () => {
  const p = movePlayer({ position: TILES.length - 1 }, 2);
  assert.equal(p.position, 1);
  assert.equal(p.passedStart, true);
});

test('casa de verba soma verba; casa de tecnologia soma tecnologia', () => {
  const funds = TILES.find((t) => t.type === 'funds' && t.funds > 0);
  assert.equal(applyTile({ funds: 10 }, funds).player.funds, 10 + funds.funds);
  const tech = TILES.find((t) => t.type === 'tech');
  assert.equal(applyTile({ funds: 0, tech: 2 }, tech).player.tech, 2 + tech.tech);
});

test('casa de apoio só vale para quem está atrás', () => {
  const tile = TILES.find((t) => t.type === 'catchup');
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: true }).player.funds, tile.funds);
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: false }).player.funds, 0);
});

test('início da partida: cartas sorteadas sem repetição e orçamento do 1º ano', () => {
  const state = twoPlayers();
  const [a, b] = state.players;
  assert.notEqual(a.objectiveId, b.objectiveId);
  assert.equal(a.funds, STARTING_FUNDS + OBJECTIVES[a.objectiveId].startBonus + ANNUAL_BUDGET);
  assert.equal(a.tech, 1);
  assert.equal(b.tech, 0); // B ainda não começou o turno
});

test('turno completo: jogar, comprar, vender, passar a vez; rodada = ano', () => {
  const state = twoPlayers();
  assert.match(endTurn(state), /Jogue o dado/);
  rollAndMove(state, die(2)); // casa 2: verba
  assert.equal(state.players[0].rolled, true);
  assert.match(rollAndMove(state, die(2)), /já jogou/);

  const before = state.players[0].funds;
  assert.equal(buyItem(state, 'camera'), null);
  assert.ok(state.players[0].funds < before);
  assert.equal(sellItem(state, 'camera'), null);
  assert.equal(state.players[0].funds, before); // revenda pelo valor cheio antes de voar

  endTurn(state);
  assert.equal(state.turn, 1);
  rollAndMove(state, die(2));
  endTurn(state);
  assert.equal(state.turn, 0);
  assert.equal(state.round, 2);
  assert.equal(state.players[0].tech, 2);
});

test('peça bloqueada por tecnologia não pode ser comprada', () => {
  const state = twoPlayers();
  state.players[0].funds = 999;
  assert.match(buyItem(state, 'hires_camera'), /exige tecnologia/);
  assert.match(chooseLauncher(state, 'heavy'), /exige tecnologia/);
  state.players[0].tech = 5;
  assert.equal(buyItem(state, 'hires_camera'), null);
  assert.equal(chooseLauncher(state, 'heavy'), null);
});

test('lançar exige jogar o dado antes', () => {
  const state = twoPlayers();
  assert.match(launch(state), /dado/);
});

test('terreno livre: construir prédio; rival paga ao dono para usar', () => {
  const state = twoPlayers();
  rollAndMove(state, die(1)); // casa 1: terreno
  assert.equal(state.pendingTile.kind, 'build');
  const fundsA = state.players[0].funds;
  assert.equal(buildOnLot(state, 'lab'), null);
  assert.equal(state.players[0].buildings.lab, 1);
  assert.equal(state.players[0].funds, fundsA - upgradeCost(0));
  assert.equal(state.lots[1].ownerId, 0);
  endTurn(state);

  rollAndMove(state, die(1)); // B cai no laboratório de A
  assert.equal(state.pendingTile.kind, 'use');
  const [a, b] = state.players;
  const techB = b.tech;
  const ownerFunds = a.funds;
  assert.equal(useRivalBuilding(state), null);
  assert.equal(b.tech, techB + 1);
  assert.ok(a.funds > ownerFunds);
});

test('upgrade custa mais a cada nível; Laboratório soma tecnologia por turno', () => {
  const state = twoPlayers();
  const a = state.players[0];
  a.buildings.lab = 1;
  a.funds = 999;
  const f0 = a.funds;
  upgradeBuilding(state, 'lab');
  const firstCost = f0 - a.funds;
  const f1 = a.funds;
  upgradeBuilding(state, 'lab');
  assert.ok(f1 - a.funds > firstCost);
  assert.match(upgradeBuilding(state, 'lab'), /máximo/);
  // Próximo turno de A: +1 base +3 do laboratório
  rollAndMove(state, die(2)); endTurn(state);
  rollAndMove(state, die(2)); endTurn(state);
  assert.equal(a.tech, 1 + 1 + 3);
});

test('socorro de emergência só com pouca verba e custa tecnologia', () => {
  const state = twoPlayers();
  const a = state.players[0];
  assert.match(requestBailout(state), /Socorro só/);
  a.funds = 5;
  a.tech = 3;
  assert.equal(requestBailout(state), null);
  assert.equal(a.funds, 35);
  assert.equal(a.tech, 1);
});

test('comprar sem verba devolve mensagem de erro', () => {
  const state = twoPlayers();
  state.players[0].funds = 0;
  assert.match(buyItem(state, 'camera'), /Verba insuficiente/);
});
