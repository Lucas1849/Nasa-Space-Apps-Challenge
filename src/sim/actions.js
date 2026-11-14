// Ações do jogo: cada função altera o estado e devolve mensagens para o log.
// A UI só chama estas funções; a regra de negócio fica aqui (testável sem DOM).
import { createPlayer, currentPlayer, pushLog } from './state.js';
import { TILES, rollDie, movePlayer, applyTile } from '../board/board.js';
import { CATALOG, priceFor } from './resources.js';
import { checkDesign, simulate } from './simulate.js';
import { MISSIONS } from '../data/missions.js';
import { INSTRUMENTS } from '../data/instruments.js';

export function startGame(state, setup) {
  // setup = [{ name, missionId }, ...] (1 a 4 jogadores)
  state.players = setup.map((p, i) => createPlayer(i, p.name || `Jogador ${i + 1}`, p.missionId));
  state.turn = 0;
  state.round = 1;
  state.log = [];
  state.winner = null;
  state.screen = 'board';
  pushLog(state, 'Partida iniciada. Jogue o dado para ganhar verba, depois monte a espaçonave na oficina.');
}

// Jogador com menos progresso (menos milestones, depois menos verba) recebe o apoio da casa 'catchup'.
function isLastPlayer(state, player) {
  const rank = (p) => p.milestones.length * 1000 + p.funds;
  return state.players.every((p) => rank(player) <= rank(p));
}

export function rollAndMove(state, rng = Math.random) {
  const p = currentPlayer(state);
  const steps = rollDie(rng);
  const moved = movePlayer(p, steps);
  const tile = TILES[moved.position];
  const { player, messages } = applyTile(moved, tile, { rng, isLast: isLastPlayer(state, p) });
  state.players[state.turn] = { ...p, ...player };
  pushLog(state, `${p.name} tirou ${steps} e parou em "${tile.label}".`);
  messages.forEach((m) => pushLog(state, `${p.name}: ${m}`));
  state.players[state.turn].rolled = true;
  return steps;
}

export function buyItem(state, itemId) {
  const p = currentPlayer(state);
  const price = priceFor(p, itemId);
  if (p.funds < price) return `Verba insuficiente: ${CATALOG[itemId].name} custa ${price}.`;
  p.funds -= price;
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  bucket.push(itemId);
  const msg = `${p.name} comprou ${CATALOG[itemId].name} por ${price}${p.discount ? ` (desconto de ${p.discount}%)` : ''}.`;
  p.discount = 0; // desconto vale para uma compra
  pushLog(state, msg);
  checkMilestones(state, p);
  return null;
}

// Antes do lançamento, revende pelo valor cheio (regra do IDEIA.md).
export function sellItem(state, itemId) {
  const p = currentPlayer(state);
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  const idx = bucket.indexOf(itemId);
  if (idx === -1) return 'Item não está na espaçonave.';
  bucket.splice(idx, 1);
  const refund = p.launches === 0 ? CATALOG[itemId].cost : Math.floor(CATALOG[itemId].cost / 2);
  p.funds += refund;
  pushLog(state, `${p.name} vendeu ${CATALOG[itemId].name} por ${refund}.`);
  return null;
}

export function chooseLauncher(state, launcherId) {
  currentPlayer(state).spacecraft.launcherId = launcherId;
  checkMilestones(state, currentPlayer(state));
}

export function chooseOrbit(state, orbitId) {
  currentPlayer(state).spacecraft.orbitId = orbitId;
  checkMilestones(state, currentPlayer(state));
}

// Concede milestones e aplica seus efeitos (só 3 tipos: funds, discount, shield).
function grant(state, player, milestoneId) {
  if (player.milestones.includes(milestoneId)) return;
  const ms = MISSIONS[player.missionId].milestones.find((m) => m.id === milestoneId);
  player.milestones.push(milestoneId);
  if (ms.effect.type === 'funds') player.funds += ms.effect.value;
  if (ms.effect.type === 'discount') player.discount = Math.max(player.discount, ms.effect.value);
  if (ms.effect.type === 'shield') player.shields += ms.effect.value;
  pushLog(state, `${player.name} atingiu o milestone "${ms.name}" (${describeEffect(ms.effect)}).`);
}

export function describeEffect(effect) {
  if (effect.type === 'funds') return `+${effect.value} de verba`;
  if (effect.type === 'discount') return `${effect.value}% de desconto na próxima compra`;
  return 'proteção contra uma falha';
}

function checkMilestones(state, player) {
  if (checkDesign(player).designOk) grant(state, player, 'design_ready');
}

export function launch(state, rng = Math.random) {
  const p = currentPlayer(state);
  const design = checkDesign(p);
  if (p.funds < design.totals.launchCost) return 'Verba insuficiente para pagar o lançamento.';
  p.funds -= design.totals.launchCost;
  p.launches += 1;
  grant(state, p, 'launched');
  const result = simulate(p, { rng });
  if (result.usedShield) p.shields -= 1;
  p.lastResult = result;
  pushLog(state, `${p.name} lançou a missão "${MISSIONS[p.missionId].name}": ${result.success ? 'SUCESSO' : 'FALHA'}.`);
  if (result.success) {
    grant(state, p, 'mission_complete');
    p.won = true;
    if (state.winner === null) state.winner = p.id;
  }
  state.screen = 'report';
  return null;
}

export function endTurn(state) {
  const p = currentPlayer(state);
  delete p.rolled;
  state.turn = (state.turn + 1) % state.players.length;
  if (state.turn === 0) state.round += 1;
  state.screen = 'board';
}
