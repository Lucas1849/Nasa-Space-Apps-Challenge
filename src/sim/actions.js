// Ações do jogo: cada função altera o estado e devolve mensagens para o log.
// A UI só chama estas funções; a regra de negócio fica aqui (testável sem DOM).
import { createPlayer, currentPlayer, pushLog, SANDBOX_FUNDS } from './state.js';
import { TILES, rollDie, movePlayer, applyTile } from '../board/board.js';
import { CATALOG, priceFor } from './resources.js';
import { checkDesign, simulate } from './simulate.js';
import { MISSIONS } from '../data/missions.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { FLIGHT_EVENTS, pickEvent, resolveOption } from '../data/events.js';

// setup = [{ name, missionId }, ...] (1 a 4 jogadores); options = { sandbox }
export function startGame(state, setup, options = {}) {
  state.sandbox = Boolean(options.sandbox);
  state.players = setup.map((p, i) => createPlayer(i, p.name || `Jogador ${i + 1}`, p.missionId));
  if (state.sandbox) state.players.forEach((p) => { p.funds = SANDBOX_FUNDS; });
  state.turn = 0;
  state.round = 1;
  state.log = [];
  state.winner = null;
  state.pendingFlight = null;
  state.screen = state.sandbox ? 'workshop' : 'board';
  pushLog(state, state.sandbox
    ? 'Modo sandbox: verba livre, sem tabuleiro. Explore os trade-offs à vontade.'
    : 'Partida iniciada. Jogue o dado para ganhar verba, depois monte a espaçonave na oficina.');
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
  state.lastRoll = steps; // usado pela UI para mostrar a face do dado
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

// Lançamento: paga o lançador e sorteia um evento de voo. A simulação roda em resolveFlight().
export function launch(state, rng = Math.random) {
  const p = currentPlayer(state);
  const design = checkDesign(p);
  if (p.funds < design.totals.launchCost) return 'Verba insuficiente para pagar o lançamento.';
  p.funds -= design.totals.launchCost;
  p.launches += 1;
  grant(state, p, 'launched');
  const event = pickEvent(rng);
  state.pendingFlight = { eventId: event.id };
  pushLog(state, `${p.name} lançou a missão "${MISSIONS[p.missionId].name}". Em voo: ${event.title}.`);
  state.screen = 'flight';
  return null;
}

// Jogador escolheu uma opção do evento de voo. Aplica a consequência e simula.
export function resolveFlight(state, optionIndex, rng = Math.random) {
  const p = currentPlayer(state);
  const event = FLIGHT_EVENTS[state.pendingFlight?.eventId];
  if (!event) return 'Nenhum evento de voo pendente.';
  const option = event.options[optionIndex];
  const effect = resolveOption(option, p) || {};
  if (effect.funds) p.funds = Math.max(0, p.funds + effect.funds);

  const result = simulate(p, { rng, modifiers: effect });
  if (result.usedShield) p.shields -= 1;
  result.flight = { event, option, effect };
  p.lastResult = result;
  state.pendingFlight = null;

  pushLog(state, `${p.name} decidiu: "${option.label}". Resultado: ${result.success ? 'SUCESSO' : 'FALHA'}.`);
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
  state.screen = state.sandbox ? 'workshop' : 'board';
}
