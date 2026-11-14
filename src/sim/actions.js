// Ações do jogo: cada função altera o estado e devolve uma mensagem de erro (string) ou null.
// A UI só chama estas funções; a regra de negócio fica aqui (testável sem DOM).
//
// Turno (IDEIA.md v2, seções 3 e 13.3):
//   0. Início: orçamento anual (verba) + tecnologia (base + Laboratório).
//   1. Tabuleiro (sempre): joga o dado, anda, aplica a casa. Terreno = decisão de prédio.
//   2. Uma ação, conforme a nave:
//      - no chão: oficina à vontade e, se quiser, LANÇA (a subida acontece na hora e encerra o turno);
//      - em voo: avança UMA etapa (imprevisto da casa onde parou + decisão + risco explicado);
//        pode comprar peças para a próxima nave enquanto a outra voa;
//      - missão cumprida: escolhe a próxima missão.
//   3. Passa a vez. No fim de cada rodada (= 1 ano) confere as cartas de vitória e o limite de 1969.
import {
  createPlayer, currentPlayer, pushLog, emptySpacecraft,
  SANDBOX_FUNDS, SANDBOX_TECH, ANNUAL_BUDGET, TECH_PER_TURN, RECORD_BONUS,
  BAILOUT_FUNDS, BAILOUT_TECH_COST, BAILOUT_LIMIT,
} from './state.js';
import { TILES, rollDie, movePlayer, applyTile } from '../board/board.js';
import { CATALOG, priceFor, isLocked } from './resources.js';
import { checkDesign, simulate } from './simulate.js';
import { flightPlan, stageRisk, stageOptions, flyer, describeRisk, pct } from './flight.js';
import { MISSIONS } from '../data/missions.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { LAUNCHERS } from '../data/launchers.js';
import { FLIGHT_EVENTS, pickEvent } from '../data/events.js';
import { STAGES, SYSTEM_NAMES, STAGE_BONUS, FAILURE_DATA_BONUS } from '../data/stages.js';
import { OBJECTIVES, objectiveProgress, drawObjectives } from '../data/objectives.js';
import { BUILDINGS, MAX_LEVEL, upgradeCost, USE_FEE, CATCHUP_UPGRADE_DISCOUNT } from '../data/buildings.js';
import { MAX_ROUNDS, yearOf } from '../data/history.js';

const SPONSOR_FUNDS_PER_LEVEL = 4;

// ---------------------------------------------------------------- partida e turno

// setup = [{ name, missionId? }, ...] (1 a 4 jogadores); options = { sandbox, rng }
export function startGame(state, setup, options = {}) {
  const rng = options.rng || Math.random;
  state.sandbox = Boolean(options.sandbox);
  state.players = setup.map((p, i) => createPlayer(i, p.name || `Agência ${i + 1}`, p.missionId || null));
  state.turn = 0;
  state.round = 1;
  state.log = [];
  state.records = {};
  state.lots = {};
  state.pendingTile = null;
  state.winners = [];
  state.gameOver = false;
  state.lastRoll = null;

  if (state.sandbox) {
    state.players.forEach((p) => { p.funds = SANDBOX_FUNDS; p.tech = SANDBOX_TECH; });
    state.screen = 'workshop';
    pushLog(state, 'Modo sandbox: verba livre, tecnologia liberada, sem tabuleiro. Explore os trade-offs à vontade.');
    return null;
  }

  const cards = drawObjectives(state.players.length, rng);
  state.players.forEach((p, i) => {
    p.objectiveId = cards[i];
    p.funds += OBJECTIVES[cards[i]].startBonus;
  });
  state.screen = 'board';
  pushLog(state, `Começa a corrida espacial. Cada rodada é um ano; a partida termina em ${yearOf(MAX_ROUNDS)}.`);
  startTurn(state);
  return null;
}

// Início do turno: orçamento anual e tecnologia. Esperar rende tecnologia (peças melhores),
// mas os rivais avançam: essa é a tensão central do jogo.
function startTurn(state) {
  const p = currentPlayer(state);
  p.rolled = false;
  p.flightAdvanced = false;
  p.launchedThisTurn = false;
  state.pendingTile = null;
  const funds = ANNUAL_BUDGET + SPONSOR_FUNDS_PER_LEVEL * p.buildings.sponsor;
  const tech = TECH_PER_TURN + p.buildings.lab;
  p.funds += funds;
  p.tech += tech;
  pushLog(state, `${p.name}: orçamento do ano +${funds} de verba, +${tech} de tecnologia (nível ${p.tech}).`);
}

export function endTurn(state) {
  const p = currentPlayer(state);
  if (state.sandbox) {
    state.screen = p.flight ? 'flight' : 'workshop';
    return null;
  }
  if (!p.rolled) return 'Jogue o dado antes de passar a vez.';
  if (p.flight?.pending) return 'Decida o imprevisto do voo antes de passar a vez.';
  if (p.flight && !p.flightAdvanced) return 'Sua nave está em voo: avance uma etapa antes de passar a vez.';

  state.pendingTile = null;
  state.turn = (state.turn + 1) % state.players.length;
  if (state.turn === 0) {
    endRound(state);
    if (state.gameOver) return null;
    state.round += 1;
  }
  state.screen = 'board';
  startTurn(state);
  return null;
}

// Desempate: progresso além da meta (ex.: ciência a mais), depois missões cumpridas, depois verba.
function rankKey(state, p) {
  const { value, target } = objectiveProgress(p, state);
  return [Math.min(1, value / target), value / target, p.completed.length, p.funds];
}
function compareRank(state, a, b) {
  const ka = rankKey(state, a);
  const kb = rankKey(state, b);
  for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return kb[i] - ka[i];
  return 0;
}

// Fim da rodada: a rodada termina antes de declarar vencedor, para todos jogarem o mesmo número de turnos.
function endRound(state) {
  const done = state.players.filter((p) => objectiveProgress(p, state).done);
  const timeUp = state.round >= MAX_ROUNDS;
  if (!done.length && !timeUp) return;
  const pool = done.length ? done : state.players;
  const sorted = [...pool].sort((a, b) => compareRank(state, a, b));
  state.winners = sorted.filter((p) => compareRank(state, p, sorted[0]) === 0).map((p) => p.id);
  state.gameOver = true;
  state.endReason = done.length ? 'objective' : 'time';
  state.screen = 'gameover';
  const names = state.winners.map((id) => state.players[id].name).join(' e ');
  pushLog(state, done.length ? `${names} cumpriu a carta de vitória!` : `Fim de ${yearOf(state.round)}: vence quem chegou mais perto da carta (${names}).`);
}

// ---------------------------------------------------------------- tabuleiro

// Jogador com menos progresso na carta (depois menos verba) recebe o apoio da casa 'catchup'.
function isLastPlayer(state, player) {
  return state.players.every((p) => compareRank(state, player, p) >= 0);
}

export function rollAndMove(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (state.sandbox) return 'No modo sandbox não há tabuleiro.';
  if (p.rolled) return 'Você já jogou o dado neste turno.';
  const steps = rollDie(rng);
  const moved = movePlayer(p, steps);
  const tile = TILES[moved.position];
  const { player, messages } = applyTile(moved, tile, { rng, isLast: isLastPlayer(state, p) });
  Object.assign(p, player);
  p.rolled = true;
  state.lastRoll = steps;
  pushLog(state, `${p.name} tirou ${steps} e parou em "${tile.label}".`);
  messages.forEach((m) => pushLog(state, `${p.name}: ${m}`));

  if (tile.type === 'lot') {
    const lot = state.lots[tile.id];
    if (!lot) state.pendingTile = { tileId: tile.id, kind: 'build' };
    else if (lot.ownerId !== p.id) state.pendingTile = { tileId: tile.id, kind: 'use' };
    else pushLog(state, `${p.name}: este terreno já é seu (${BUILDINGS[lot.buildingId].name}).`);
  }

  // Com a nave em voo, a casa define o imprevisto da próxima etapa (IDEIA.md seção 7).
  if (p.flight && (tile.type === 'hazard' || tile.type === 'event')) {
    const eventId = tile.flightEvent || pickEvent(rng).id;
    p.flight.tileEvent = eventId;
    pushLog(state, `${p.name}: sua nave em voo vai enfrentar "${FLIGHT_EVENTS[eventId].title}" na próxima etapa.`);
  } else if (tile.type === 'hazard') {
    pushLog(state, `${p.name}: sem nave em voo, nada acontece.`);
  }
  return null;
}

// Terreno livre: constrói um prédio novo (nível 1). Upgrade depois é de qualquer lugar.
export function buildOnLot(state, buildingId) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'build') return 'Você não está num terreno livre.';
  if (!BUILDINGS[buildingId]) return 'Prédio desconhecido.';
  if (p.buildings[buildingId] > 0) return `Você já tem ${BUILDINGS[buildingId].name}. Suba o nível no painel da agência.`;
  const cost = upgradeCost(0);
  if (p.funds < cost) return `Verba insuficiente: construir custa ${cost}.`;
  p.funds -= cost;
  p.buildings[buildingId] = 1;
  state.lots[pending.tileId] = { ownerId: p.id, buildingId };
  state.pendingTile = null;
  pushLog(state, `${p.name} construiu ${BUILDINGS[buildingId].name} por ${cost}.`);
  return null;
}

export const useFeeFor = (level) => USE_FEE + 2 * (level - 1);

// Prédio de outro jogador: paga a taxa ao dono e recebe o efeito uma vez. Os dois ganham.
export function useRivalBuilding(state) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'use') return 'Não há prédio de rival para usar aqui.';
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const building = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  if (p.funds < fee) return `Verba insuficiente: a taxa é ${fee}.`;
  p.funds -= fee;
  owner.funds += fee;
  const e = building.useEffect;
  if (e.tech) p.tech += e.tech;
  if (e.discount) p.discount = Math.max(p.discount, e.discount);
  if (e.shield) p.shields += e.shield;
  if (e.funds) p.funds += e.funds;
  state.pendingTile = null;
  pushLog(state, `${p.name} pagou ${fee} a ${owner.name} para usar o ${building.name}: ${building.useText}.`);
  return null;
}

export function skipTile(state) {
  state.pendingTile = null;
  return null;
}

export function upgradeBuilding(state, buildingId) {
  const p = currentPlayer(state);
  if (state.sandbox) return 'Prédios não existem no modo sandbox.';
  const level = p.buildings[buildingId];
  if (!level) return 'Construa este prédio num terreno livre primeiro.';
  if (level >= MAX_LEVEL) return 'Este prédio já está no nível máximo.';
  const cost = upgradeCostFor(state, p, buildingId);
  if (p.funds < cost) return `Verba insuficiente: o upgrade custa ${cost}.`;
  p.funds -= cost;
  p.buildings[buildingId] = level + 1;
  pushLog(state, `${p.name} subiu ${BUILDINGS[buildingId].name} para o nível ${level + 1} por ${cost}.`);
  return null;
}

// Quem está em último paga metade no upgrade (freio contra bola de neve).
export function upgradeCostFor(state, player, buildingId) {
  const base = upgradeCost(player.buildings[buildingId]);
  const behind = state.players.length > 1 && isLastPlayer(state, player);
  return behind ? Math.round(base * CATCHUP_UPGRADE_DISCOUNT) : base;
}

// Sem eliminação: com pouca verba, a agência pede socorro e perde tecnologia (IDEIA.md seção 8).
export function requestBailout(state) {
  const p = currentPlayer(state);
  if (p.funds >= BAILOUT_LIMIT) return `Socorro só com menos de ${BAILOUT_LIMIT} de verba.`;
  p.funds += BAILOUT_FUNDS;
  p.tech = Math.max(0, p.tech - BAILOUT_TECH_COST);
  p.bailouts += 1;
  pushLog(state, `${p.name} pediu socorro de emergência: +${BAILOUT_FUNDS} de verba, −${BAILOUT_TECH_COST} de tecnologia.`);
  return null;
}

// ---------------------------------------------------------------- missão e oficina

export function chooseMission(state, missionId) {
  const p = currentPlayer(state);
  if (!MISSIONS[missionId]) return 'Missão desconhecida.';
  if (p.flight) return 'Espere a nave em voo terminar a missão antes de trocar.';
  if (p.completed.some((c) => c.missionId === missionId)) return 'Você já cumpriu esta missão. Escolha outra.';
  p.missionId = missionId;
  pushLog(state, `${p.name} escolheu a missão "${MISSIONS[missionId].name}".`);
  checkMilestones(state, p);
  return null;
}

export function buyItem(state, itemId) {
  const p = currentPlayer(state);
  const item = CATALOG[itemId];
  if (isLocked(p, item)) return `${item.name} exige tecnologia ${item.minTech} (você tem ${p.tech}).`;
  const price = priceFor(p, itemId);
  if (p.funds < price) return `Verba insuficiente: ${item.name} custa ${price}.`;
  p.funds -= price;
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  bucket.push(itemId);
  pushLog(state, `${p.name} comprou ${item.name} por ${price}${p.discount ? ` (desconto de ${p.discount}%)` : ''}.`);
  p.discount = 0; // desconto de evento vale para uma compra (a Fábrica é permanente)
  checkMilestones(state, p);
  return null;
}

// Antes de voar, revende pelo valor cheio (regra do IDEIA.md). Peças que voltaram de missão abortada valem metade.
export function sellItem(state, itemId) {
  const p = currentPlayer(state);
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  const idx = bucket.indexOf(itemId);
  if (idx === -1) return 'Item não está na espaçonave.';
  bucket.splice(idx, 1);
  const refund = p.spacecraft.flown ? Math.floor(CATALOG[itemId].cost / 2) : CATALOG[itemId].cost;
  p.funds += refund;
  pushLog(state, `${p.name} vendeu ${CATALOG[itemId].name} por ${refund}.`);
  return null;
}

export function chooseLauncher(state, launcherId) {
  const p = currentPlayer(state);
  const launcher = LAUNCHERS[launcherId];
  if (isLocked(p, launcher)) return `${launcher.name} exige tecnologia ${launcher.minTech} (você tem ${p.tech}).`;
  p.spacecraft.launcherId = launcherId;
  checkMilestones(state, p);
  return null;
}

export function chooseOrbit(state, orbitId) {
  const p = currentPlayer(state);
  p.spacecraft.orbitId = orbitId;
  checkMilestones(state, p);
  return null;
}

// ---------------------------------------------------------------- degraus (milestones)

// Bônus só uma vez por missão (chave `${missionId}:${milestoneId}`). Efeitos: funds, discount, shield.
function grant(state, player, milestoneId, missionId = player.missionId) {
  const key = `${missionId}:${milestoneId}`;
  if (!missionId || player.milestones.includes(key)) return;
  const ms = MISSIONS[missionId].milestones.find((m) => m.id === milestoneId);
  player.milestones.push(key);
  if (ms.effect.type === 'funds') player.funds += ms.effect.value;
  if (ms.effect.type === 'discount') player.discount = Math.max(player.discount, ms.effect.value);
  if (ms.effect.type === 'shield') player.shields += ms.effect.value;
  pushLog(state, `${player.name} atingiu o degrau "${ms.name}" (${describeEffect(ms.effect)}).`);
}

export function describeEffect(effect) {
  if (effect.type === 'funds') return `+${effect.value} de verba`;
  if (effect.type === 'discount') return `${effect.value}% de desconto na próxima compra`;
  return 'proteção contra uma falha';
}

function checkMilestones(state, player) {
  if (player.missionId && !player.flight && checkDesign(player).designOk) grant(state, player, 'design_ready');
}

// ---------------------------------------------------------------- voo em etapas

// Lança: paga o lançador, a nave sai da oficina e a SUBIDA é sorteada na hora (encerra o turno).
export function launch(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.missionId) return 'Escolha uma missão antes de lançar.';
  if (p.flight) return 'Você já tem uma nave em voo.';
  if (!state.sandbox && !p.rolled) return 'Jogue o dado antes de lançar.';
  if (!state.sandbox && p.launchedThisTurn) return 'Só um lançamento por turno.';
  const design = checkDesign(p);
  if (!design.ok) return 'O projeto ainda tem pendências: veja a checagem na oficina.';
  p.funds -= design.totals.launchCost;
  p.launches += 1;
  grant(state, p, 'launched');
  p.flight = {
    missionId: p.missionId,
    plan: flightPlan(p.missionId),
    stageIndex: 0,
    craft: p.spacecraft,
    modifiers: { sciencePenalty: 0, lifetimeDelta: 0 },
    stages: [],
    pending: null,
    tileEvent: null,
    last: null,
    year: yearOf(state.round),
  };
  // A oficina fica livre: dá para montar a próxima nave enquanto esta voa. Lançador e órbita ficam pré-escolhidos.
  p.spacecraft = { ...emptySpacecraft(), launcherId: p.flight.craft.launcherId, orbitId: p.flight.craft.orbitId };
  p.launchedThisTurn = true;
  p.flightAdvanced = true;
  pushLog(state, `${p.name} lançou a missão "${MISSIONS[p.missionId].name}".`);
  const stageId = p.flight.plan[0];
  resolveStage(state, p, stageId, stageRisk(flyer(p), stageId), { label: 'Lançamento' }, rng);
  return null;
}

// Prepara a próxima etapa: imprevisto da casa onde o jogador parou (ou garantido nos pontos-chave).
export function advanceFlight(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.flight) return 'Nenhuma nave em voo.';
  if (p.flight.pending) { state.screen = 'flight'; return null; }
  if (!state.sandbox) {
    if (!p.rolled) return 'Jogue o dado primeiro: a casa onde você parar pode trazer um imprevisto para o voo.';
    if (p.flightAdvanced) return 'O voo avança uma etapa por turno.';
  }
  const stageId = p.flight.plan[p.flight.stageIndex];
  let eventId = p.flight.tileEvent;
  if (!eventId && STAGES[stageId].guaranteedEvent) eventId = pickEvent(rng).id;
  p.flight.tileEvent = null;
  p.flight.pending = { stageId, eventId: eventId || null };
  p.flightAdvanced = true;
  state.screen = 'flight';
  return null;
}

const combinePenalty = (a, b) => 1 - (1 - a) * (1 - b);

// O jogador escolheu uma opção da etapa: aplica a consequência e sorteia o risco.
export function chooseStageOption(state, index, rng = Math.random) {
  const p = currentPlayer(state);
  const pending = p.flight?.pending;
  if (!pending) return 'Nenhuma etapa aguardando decisão.';
  const option = stageOptions(p, pending)[index];
  if (!option) return 'Opção inválida.';
  if (option.disabled) return 'Verba insuficiente para esta opção.';
  if (option.kind === 'abort') return abortFlight(state, p);

  const e = option.effect;
  if (e.funds) p.funds = Math.max(0, p.funds + e.funds);
  if (e.sciencePenalty) p.flight.modifiers.sciencePenalty = combinePenalty(p.flight.modifiers.sciencePenalty, e.sciencePenalty);
  if (e.lifetimeDelta) p.flight.modifiers.lifetimeDelta += e.lifetimeDelta;
  p.flight.pending = null;
  const event = pending.eventId ? FLIGHT_EVENTS[pending.eventId] : null;
  resolveStage(state, p, pending.stageId, option.risk, { event, label: option.label, lesson: option.lesson, effect: e }, rng);
  return null;
}

// Sorteia a etapa. Proteção absorve uma falha. Falha = nave perdida + dados de falha.
function resolveStage(state, p, stageId, risk, info, rng) {
  const stage = STAGES[stageId];
  let failed = rng() < risk.total;
  let usedShield = false;
  if (failed && p.shields > 0) {
    p.shields -= 1;
    usedShield = true;
    failed = false;
  }
  const record = {
    stageId,
    name: stage.name,
    risk: risk.total,
    riskText: describeRisk(risk),
    causes: risk.parts.filter((x, i) => i > 0 && x.value > 0).map((x) => x.text),
    success: !failed,
    usedShield,
    eventTitle: info.event?.title || null,
    choice: info.label,
    lesson: info.lesson || null,
    effect: info.effect || {},
  };
  p.flight.stages.push(record);
  p.flight.last = record;
  pushLog(state, `${p.name}: etapa "${stage.name}" ${failed ? 'FALHOU' : 'superada'} (risco ${pct(risk.total)})${usedShield ? ', salva pela proteção' : ''}.`);

  if (failed) return failMission(state, p, stageId);

  p.flight.stageIndex += 1;
  const missionId = p.flight.missionId;
  p.bestStage[missionId] = Math.max(p.bestStage[missionId] || 0, p.flight.stageIndex);
  if (p.flight.stageIndex >= p.flight.plan.length) return completeMission(state, p);
  // Etapas contam: cada etapa superada já rende prestígio, mesmo que a nave falhe depois.
  p.funds += STAGE_BONUS;
  record.bonus = STAGE_BONUS;
  state.screen = 'flight';
  return null;
}

function failMission(state, p, stageId) {
  const stage = STAGES[stageId];
  const flight = p.flight;
  const ship = flyer(p);
  p.failureData[stage.system] = (p.failureData[stage.system] || 0) + 1;
  p.tech += 1;
  const last = flight.last;
  p.lastResult = {
    success: false,
    missionId: flight.missionId,
    stages: flight.stages,
    failedStage: stageId,
    system: stage.system,
    reasons: [
      `A etapa "${stage.name}" falhou: o risco era ${pct(last.risk)}.`,
      ...(last.causes.length ? [`O que aumentou o risco: ${last.causes.join('; ')}.`] : ['Mesmo um projeto bom tem risco: nada no espaço é garantido.']),
      'A nave foi perdida.',
    ],
    failureLesson: `Dados de falha: na próxima tentativa, o risco de ${SYSTEM_NAMES[stage.system]} cai ${pct(FAILURE_DATA_BONUS)}, e a agência ganhou +1 de tecnologia. Falhar ensina: é o passo "Verify" do ciclo de projeto da NASA.`,
    checks: checkDesign(ship, { ...flight.modifiers, launched: true }).checks,
    score: 0,
    scienceDelivered: 0,
    craft: flight.craft,
  };
  p.flight = null;
  state.screen = 'report';
  return null;
}

function completeMission(state, p) {
  const flight = p.flight;
  const missionId = flight.missionId;
  const ship = flyer(p);
  const result = simulate(ship, { modifiers: { ...flight.modifiers, launched: true }, randomFailure: false });
  result.missionId = missionId;
  result.stages = flight.stages;
  result.craft = flight.craft;
  const year = yearOf(state.round);
  if (result.success) {
    p.completed.push({ missionId, year, science: result.scienceDelivered });
    grant(state, p, 'mission_complete', missionId);
    if (!state.records[missionId]) {
      state.records[missionId] = { playerId: p.id, year };
      p.funds += RECORD_BONUS;
      result.record = true;
      pushLog(state, `🏆 ${p.name} é a primeira agência do mundo a cumprir "${MISSIONS[missionId].name}" (+${RECORD_BONUS} de prestígio).`);
    }
    if (p.missionId === missionId) p.missionId = null; // escolhe a próxima missão
  }
  pushLog(state, `${p.name}: missão "${MISSIONS[missionId].name}" ${result.success ? 'CUMPRIDA' : 'não atingiu os requisitos na operação'}.`);
  p.lastResult = result;
  p.flight = null;
  state.screen = 'report';
  return null;
}

// Abortar: sem risco; as peças voltam (revendem pela metade), o lançamento e o tempo se perdem.
function abortFlight(state, p) {
  const flight = p.flight;
  const craft = flight.craft;
  p.spacecraft.instruments.push(...craft.instruments);
  p.spacecraft.parts.push(...craft.parts);
  p.spacecraft.launcherId = p.spacecraft.launcherId || craft.launcherId;
  p.spacecraft.orbitId = p.spacecraft.orbitId || craft.orbitId;
  p.spacecraft.flown = true;
  p.lastResult = {
    success: false,
    aborted: true,
    missionId: flight.missionId,
    stages: flight.stages,
    reasons: [
      `Missão abortada na etapa "${STAGES[flight.pending.stageId].name}".`,
      'As peças voltaram para a oficina, mas o custo do lançamento e o tempo foram perdidos.',
    ],
    checks: [],
    score: 0,
    scienceDelivered: 0,
    craft,
  };
  pushLog(state, `${p.name} abortou a missão "${MISSIONS[flight.missionId].name}".`);
  p.flight = null;
  state.screen = 'report';
  return null;
}
