// Testes do tabuleiro, do turno, dos dilemas, da espionagem, dos prédios e da tecnologia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TILES, rollDie, movePlayer, applyTile } from '../src/board/board.js';
import { createInitialState, YEARLY_BUDGET, STARTING_FUNDS, SPY_COST } from '../src/sim/state.js';
import {
  startGame, rollDice, moveBy, rollAndMove, buyItem, sellItem, endTurn, buildOnLot, useRivalBuilding,
  upgradeBuilding, launch, chooseLauncher, requestBailout, chooseDilemma, spyOn,
} from '../src/sim/actions.js';
import { SIDES } from '../src/data/sides.js';
import { upgradeCost } from '../src/data/buildings.js';
import { dilemmasFor } from '../src/data/dilemmas.js';

// rng que tira `steps` no dado (rollDie usa 1 + floor(rng * 6)).
const die = (steps) => () => (steps - 1) / 6 + 0.01;

// Com rng 0 o sorteio dá [URSS, EUA]: A = URSS, B = EUA.
function twoPlayers() {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  return state;
}

test('dado devolve 1..6', () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.999), 6);
});

test('tabuleiro tem 16 casas com ids em ordem, com evento, espião e terrenos', () => {
  assert.equal(TILES.length, 16);
  TILES.forEach((t, i) => assert.equal(t.id, i));
  for (const type of ['event', 'spy', 'lot', 'shop', 'funds']) assert.ok(TILES.some((t) => t.type === type), type);
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

test('choque do Sputnik só vale para quem está atrás', () => {
  const tile = TILES.find((t) => t.type === 'catchup');
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: true }).player.funds, tile.funds);
  assert.equal(applyTile({ funds: 0 }, tile, { isLast: false }).player.funds, 0);
});

test('início: lados diferentes, verba do lado e do Ano novo, tela de troca', () => {
  const state = twoPlayers();
  const [a, b] = state.players;
  assert.equal(a.side, 'ussr');
  assert.equal(b.side, 'usa');
  assert.equal(a.funds, STARTING_FUNDS + SIDES.ussr.startFunds + YEARLY_BUDGET + SIDES.ussr.yearlyBonus);
  assert.equal(a.tech, 1);
  assert.equal(a.missionId, 'first_satellite');
  assert.equal(state.screen, 'handoff');
});

test('2 dados: o jogador escolhe qual usar', () => {
  const state = twoPlayers();
  const seq = [0.01, 0.99]; // dados 1 e 6
  rollDice(state, () => seq.shift());
  assert.deepEqual(state.dice, [1, 6]);
  assert.match(rollDice(state), /já rolou/);
  moveBy(state, 1);
  assert.equal(state.players[0].position, 6);
  assert.equal(state.dice, null);
});

test('turno completo: andar, comprar, vender, passar a vez; 3 rodadas = 1 ano', () => {
  const state = twoPlayers();
  assert.match(endTurn(state), /Role os dados/);
  rollAndMove(state, die(2)); // casa 2: verba
  assert.match(rollAndMove(state, die(2)), /já rolou/);
  const before = state.players[0].funds;
  assert.equal(buyItem(state, 'camera'), null);
  assert.ok(state.players[0].funds < before);
  assert.equal(sellItem(state, 'camera'), null);
  assert.equal(state.players[0].funds, before);
  endTurn(state);
  assert.equal(state.turn, 1);
  rollAndMove(state, die(2));
  endTurn(state);
  assert.equal(state.round, 2);
  assert.equal(state.players[0].tech, 1); // ainda o mesmo ano
});

test('carta de dilema precisa ser resolvida e aplica o efeito escolhido', () => {
  const state = twoPlayers();
  rollAndMove(state, die(3)); // casa 3: evento
  assert.ok(state.pendingDilemma);
  assert.match(endTurn(state), /dilema/);
  assert.equal(chooseDilemma(state, 0, () => 0.99), null);
  assert.equal(state.pendingDilemma, null);
  assert.equal(endTurn(state), null);
});

test('dilemas dependem da situação: montando a nave aparecem cartas da nave', () => {
  const p = { spacecraft: { instruments: [], parts: [] } };
  assert.ok(dilemmasFor(p).some((d) => d.when === 'idle'));
  p.spacecraft.parts.push('battery');
  assert.ok(dilemmasFor(p).some((d) => d.when === 'building'));
  assert.ok(dilemmasFor(p).every((d) => d.when !== 'idle'));
});

test('espionagem revela o estado real do rival, uma vez por ano', () => {
  const state = twoPlayers();
  const [a, b] = state.players;
  b.step = 1;
  rollAndMove(state, die(4)); // casa 4: espionagem
  assert.equal(state.pendingTile.kind, 'spy');
  const funds = a.funds;
  assert.equal(spyOn(state, b.id), null);
  assert.equal(a.funds, funds - SPY_COST);
  assert.equal(a.intel[b.id].steps, 1);
  assert.equal(a.intel[b.id].rumor, false);
  assert.equal(a.lastSpyYear, 1957);
});

test('peça e lançador bloqueados por tecnologia; o lado muda o lançador', () => {
  const state = twoPlayers();
  const a = state.players[0]; // URSS: lançadores exigem −1
  a.funds = 999;
  assert.match(buyItem(state, 'hires_camera'), /exige tecnologia 4/);
  assert.match(chooseLauncher(state, 'heavy'), /exige tecnologia 4/);
  a.tech = 4;
  assert.equal(chooseLauncher(state, 'heavy'), null);
});

test('lançar exige andar no tabuleiro antes', () => {
  const state = twoPlayers();
  assert.match(launch(state), /tabuleiro/);
});

test('terreno livre: construir prédio; rival paga ao dono para usar', () => {
  const state = twoPlayers();
  rollAndMove(state, die(1)); // casa 1: terreno
  assert.equal(state.pendingTile.kind, 'build');
  const fundsA = state.players[0].funds;
  assert.equal(buildOnLot(state, 'lab'), null);
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

test('upgrade custa mais a cada nível; Laboratório soma tecnologia no Ano novo', () => {
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
  state.round = 3; // a próxima rodada abre 1958
  rollAndMove(state, die(2)); endTurn(state);
  rollAndMove(state, die(2)); endTurn(state);
  assert.equal(state.round, 4);
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
