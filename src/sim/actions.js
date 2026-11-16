// Ações do jogo: cada função altera o estado e devolve uma mensagem de erro (string) ou null.
// A UI só chama estas funções; a regra de negócio fica aqui (testável sem DOM).
//
// Regras da IDEIA.md v3:
//   - Cada agência é de um lado (EUA ou URSS) e vence completando a ESCADA de missões do lado.
//   - 3 rodadas = 1 ano. No "Ano novo" cada agência recebe verba e tecnologia.
//   - Rival escondido: só o espião e os boatos revelam o estado dos outros. Tela de troca entre turnos.
//   - Solo: o outro lado é um bot que segue o calendário histórico, com variação.
//
// Turno:
//   1. Tabuleiro: rola 2 dados, escolhe um, anda e decide (dilema, prédio, espião).
//   2. Uma ação, conforme a nave:
//      - no chão: oficina à vontade e, se quiser, LANÇA (a subida acontece na hora e encerra o turno);
//      - em voo: avança UMA etapa (imprevisto + decisão + risco explicado). A oficina fica fechada: a próxima
//        nave (e o kit do próximo degrau) só aparece quando esta cumprir a missão.
//   3. Passa a vez. No fim de cada rodada confere quem completou a escada e o limite de 1969.
import {
  createPlayer, currentPlayer, pushLog, emptySpacecraft, humans,
  SANDBOX_FUNDS, SANDBOX_TECH,
  BAILOUT_FUNDS, BAILOUT_TECH_COST, BAILOUT_LIMIT, TECH_FLOOR, SPY_COST, SABOTAGE_COST, REHEARSAL_COST,
} from './state.js';
import { isHidden, learnNeeds, assessNeeds, HIDDEN_CHECK_IDS } from './needs.js';
import { yearlyIncome } from './income.js';
import { TILES, rollDie, movePlayer, applyTile, atWorkshopTile } from '../board/board.js';
import {
  CATALOG, priceFor, isLocked, requiredTech,
  isDiscovered, discover, allDiscoverableIds, nameOf, refundFor,
} from './resources.js';
import { makeOffers, blueprintCostFor } from './suppliers.js';
import { checkDesign, simulate } from './simulate.js';
import { flightPlan, stageRisk, stageOptions, flyer, describeRisk, pct } from './flight.js';
import { ladderProgress } from './progress.js';
import { MISSIONS } from '../data/missions.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { LAUNCHERS } from '../data/launchers.js';
import { FLIGHT_EVENTS, pickEvent } from '../data/events.js';
import { STAGES, SYSTEM_NAMES, STAGE_BONUS, FAILURE_DATA_BONUS, CONSOLATION_FUNDS } from '../data/stages.js';
import { SIDES, ladderOf, drawSides, STEP_BONUS_FIRST, STEP_BONUS_LATER } from '../data/sides.js';
import { DILEMMAS, pickDilemma } from '../data/dilemmas.js';
import { BUILDINGS, MAX_LEVEL, upgradeCost, USE_FEE, CATCHUP_UPGRADE_DISCOUNT } from '../data/buildings.js';
import { MAX_ROUNDS, REAL_HISTORY, yearOf, isNewYear } from '../data/history.js';
import { t } from '../i18n/index.js';

const RUMOR_TRUTH = 0.7;            // boatos acertam 70% das vezes

// ---------------------------------------------------------------- partida e turno

// setup = [{ name, missionId? }, ...] (1 a 4 agências); options = { sandbox, rng }
export function startGame(state, setup, options = {}) {
  const rng = options.rng || Math.random;
  state.sandbox = Boolean(options.sandbox);
  state.players = setup.map((p, i) => createPlayer(i, p.name || t('act.defaultAgency', { n: i + 1 }), p.missionId || null));
  state.turn = 0;
  state.round = 1;
  state.log = [];
  state.sideFirsts = {};
  state.lots = {};
  state.dice = null;
  state.pendingTile = null;
  state.pendingDilemma = null;
  state.outcome = null;
  state.tip = null;
  state.yearChange = null;
  state.winners = [];
  state.gameOver = false;
  state.lastRoll = null;

  if (state.sandbox) {
    state.players.forEach((p) => { p.funds = SANDBOX_FUNDS; p.tech = SANDBOX_TECH; p.unlocked = allDiscoverableIds(); });
    state.screen = 'workshop';
    pushLog(state, t('act.sandboxStart'));
    return null;
  }

  const sides = drawSides(state.players.length, rng);
  state.players.forEach((p, i) => assignSide(p, sides[i]));
  if (state.players.length === 1) state.players.push(createBot(state.players[0], rng));

  pushLog(state, t('act.raceStart', { year: yearOf(MAX_ROUNDS) }));
  state.players.forEach((p) => pushLog(state, t('act.playsSide', { name: p.name, side: SIDES[p.side].name })));
  state.players.filter((p) => !p.bot).forEach((p) => {
    p.hideNeeds = true; // os mínimos de ciência e comunicação da missão começam escondidos (sim/needs.js)
    setMission(state, p, p.missionId); // kit do 1º degrau
  });
  startTurn(state);
  state.screen = humans(state).length > 1 ? 'handoff' : 'board';
  return null;
}

function assignSide(p, sideId) {
  const side = SIDES[sideId];
  p.side = sideId;
  p.launcherTech = side.launcherTech;
  p.funds += side.startFunds;
  p.missionId = side.ladder[0];
}

// Muda a missão atual (o degrau da escada). No jogo normal revela o kit do degrau (as peças mínimas
// para fechar o projeto) e já deixa a órbita da missão escolhida, que não é decisão do jogador.
// Muda a missão atual (o degrau da escada). No jogo normal a órbita da missão já vem escolhida (não é decisão do
// jogador). As PEÇAS não vêm de graça: a blueprint de cada uma é conquistada nos fornecedores (sim/suppliers.js).
function setMission(state, p, missionId) {
  p.missionId = missionId;
  if (!missionId || state.sandbox) return;
  p.spacecraft.orbitId = MISSIONS[missionId].orbit;
}

// Com a nave em voo a oficina fica fechada no jogo normal: o kit do próximo degrau só é liberado quando
// o degrau atual é cumprido (completeMission). O sandbox continua livre.
// Agir (comprar, vender, escolher foguete/órbita, ensaiar, lançar) exige o peão numa casa de oficina. Ver é livre.
const workshopLock = (state, p) =>
  (state.sandbox || atWorkshopTile(p) ? null : t('act.lock.workshop'));

const inFlightLock = (state, p) =>
  (!state.sandbox && p.flight ? t('act.lock.inFlight') : null);


// ---------------------------------------------------------------- retorno imediato ao jogador
// Depois de uma escolha ou de parar numa casa, o jogador vê na hora o que aconteceu (a UI mostra no
// centro do tabuleiro, sem pedir confirmação; some no próximo turno). Só o diário guardava isso antes.
//   changes = variações numéricas (verba, tecnologia, proteção); notes = o que mais aconteceu;
//   choice = a opção escolhida; lesson = o porquê.

const statsOf = (p) => ({ funds: p.funds, tech: p.tech, shields: p.shields, discount: p.discount || 0, launchRisk: p.launchRisk || 0 });

function changesBetween(before, after) {
  return [['funds', t('res.funds')], ['tech', t('res.tech')], ['shields', t('act.shieldLabel')]]
    .filter(([key]) => after[key] !== before[key])
    .map(([key, label]) => ({ label, value: after[key] - before[key] }));
}

// Efeitos que não são um número simples viram frases.
function extrasBetween(before, after) {
  const extras = [];
  if (after.discount > before.discount) extras.push(t('act.extra.discount', { n: after.discount }));
  if (after.launchRisk > before.launchRisk) extras.push(t('act.extra.launchRisk', { n: Math.round((after.launchRisk - before.launchRisk) * 100) }));
  return extras;
}

// Dica contextual (Etapa 5): a 1ª vez que algo acontece o jogo explica na hora, uma única vez por jogador.
// A UI só lê `state.tip` (texto em ui/guide.js); sandbox e bots não recebem.
function raiseTip(state, p, id, item = null) {
  if (state.sandbox || p.bot || p.tipsSeen.includes(id)) return;
  p.tipsSeen.push(id);
  state.tip = { playerId: p.id, id, item };
}

function setOutcome(state, p, outcome) {
  state.outcome = { playerId: p.id, choice: null, changes: [], notes: [], lesson: null, ...outcome };
}

// Bot do solo: o outro lado, cumprindo cada degrau no ano real (±1). Se o lado nunca cumpriu, nunca cumpre.
function createBot(human, rng) {
  const sideId = human.side === 'usa' ? 'ussr' : 'usa';
  const bot = createPlayer(1, t('act.rivalAgency', { side: SIDES[sideId].name }));
  bot.bot = true;
  assignSide(bot, sideId);
  bot.schedule = ladderOf(bot).map((m) => {
    const real = REAL_HISTORY[m].sides[sideId];
    return real == null ? null : real + Math.floor(rng() * 3) - 1;
  });
  return bot;
}

// Início do turno. No "Ano novo" (1ª rodada de cada ano): verba e tecnologia.
function startTurn(state) {
  const p = currentPlayer(state);
  p.rolled = false;
  p.flightAdvanced = false;
  p.launchedThisTurn = false;
  p.rehearsedThisTurn = false;
  state.dice = null;
  state.pendingTile = null;
  state.pendingDilemma = null;
  state.outcome = null;
  state.tip = null;
  if (p.bot) return;
  // A sabotagem só vale no ano em que foi armada.
  if (p.interference && p.interference.year !== yearOf(state.round)) p.interference = null;
  if (isNewYear(state.round)) {
    const income = yearlyIncome(p, yearOf(state.round));
    const { funds, tech } = income;
    p.funds += funds;
    p.tech += tech;
    pushLog(state, t('act.newYear', { name: p.name, funds, tech, level: p.tech }), p.id);
    // Registro estruturado da virada: a UI anima o calendário e mostra o que entrou (só para este jogador).
    state.yearChange = {
      playerId: p.id, round: state.round, year: yearOf(state.round),
      funds, tech, techLevel: p.tech, parts: income.parts, techParts: income.techParts,
    };
  }
}

// Turno do bot: cumpre os degraus cujo ano chegou. Tudo privado (rival escondido).
function botTurn(state) {
  const bot = currentPlayer(state);
  const year = yearOf(state.round);
  const ladder = ladderOf(bot);
  while (bot.step < ladder.length && bot.schedule[bot.step] != null && year >= bot.schedule[bot.step]) {
    const missionId = ladder[bot.step];
    bot.completed.push({ missionId, year, science: 0 });
    bot.bestStage[missionId] = flightPlan(missionId).length;
    bot.step += 1;
    bot.missionId = ladder[bot.step] || null;
    pushLog(state, t('act.botCompleted', { name: bot.name, mission: MISSIONS[missionId].name }), bot.id);
  }
}

export function endTurn(state) {
  const p = currentPlayer(state);
  if (state.sandbox) {
    state.screen = p.flight ? 'flight' : 'workshop';
    return null;
  }
  if (!p.rolled) return t('gd.block.roll');
  if (state.pendingDilemma) return t('gd.block.dilemma');
  if (p.flight?.pending) return t('gd.block.flightPending');
  if (p.flight && !p.flightAdvanced) return t('gd.block.advance');
  advanceTurn(state);
  return null;
}

// Passa para o próximo jogador humano; o bot joga sozinho no caminho.
function advanceTurn(state) {
  for (;;) {
    state.turn = (state.turn + 1) % state.players.length;
    if (state.turn === 0) {
      endRound(state);
      if (state.gameOver) return;
      state.round += 1;
      if (isNewYear(state.round)) pushLog(state, t('act.yearBegins', { year: yearOf(state.round) }));
    }
    startTurn(state);
    if (!currentPlayer(state).bot) break;
    botTurn(state);
  }
  state.screen = humans(state).length > 1 ? 'handoff' : 'board';
}

// Desempate: progresso na escada, depois degraus, depois ciência entregue, depois verba.
function rankKey(p) {
  const prog = ladderProgress(p);
  return [prog.pct, prog.steps, p.completed.reduce((s, c) => s + c.science, 0), p.funds];
}
function compareRank(a, b) {
  const ka = rankKey(a);
  const kb = rankKey(b);
  for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return kb[i] - ka[i];
  return 0;
}

// Fim da rodada: termina antes de declarar vencedor, para todos jogarem o mesmo número de turnos.
function endRound(state) {
  const done = state.players.filter((p) => ladderProgress(p).done);
  const timeUp = state.round >= MAX_ROUNDS;
  if (!done.length && !timeUp) return;
  const pool = done.length ? done : state.players;
  const sorted = [...pool].sort(compareRank);
  state.winners = sorted.filter((p) => compareRank(p, sorted[0]) === 0).map((p) => p.id);
  state.gameOver = true;
  state.endReason = done.length ? 'ladder' : 'time';
  state.screen = 'gameover';
  const names = state.winners.map((id) => state.players[id].name).join(' e ');
  pushLog(state, done.length ? t('act.endLadder', { names }) : t('act.endTime', { year: yearOf(state.round), names }));
}

// ---------------------------------------------------------------- tabuleiro

// Quem está em último na corrida recebe o choque do Sputnik e desconto no upgrade.
function isLastPlayer(state, player) {
  return state.players.every((p) => compareRank(player, p) >= 0);
}

// Rola 2 dados; o jogador escolhe qual usar (IDEIA.md v3: ainda tem sorte, mas ele sente que decidiu).
export function rollDice(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (state.sandbox) return t('act.noBoardSandbox');
  if (p.rolled || state.dice) return t('act.alreadyRolled');
  state.dice = [rollDie(rng), rollDie(rng)];
  return null;
}

export function moveBy(state, index, rng = Math.random) {
  const p = currentPlayer(state);
  if (!state.dice) return t('act.rollFirst');
  const steps = state.dice[index];
  if (!steps) return t('act.invalidDie');
  state.dice = null;
  const moved = movePlayer(p, steps);
  const tile = TILES[moved.position];
  const { player, messages } = applyTile(moved, tile, { isLast: isLastPlayer(state, p) });
  Object.assign(p, player);
  p.rolled = true;
  state.lastRoll = steps;
  pushLog(state, t('act.movedTo', { name: p.name, steps, tile: tile.label }), p.id);
  messages.forEach((m) => pushLog(state, `${p.name}: ${m}`, p.id));

  // Retorno imediato: o que a casa deu (casas de decisão e de evento mostram a própria carta).
  if (messages.length) setOutcome(state, p, { title: t('act.stoppedAt', { tile: tile.label }), notes: messages });
  else state.outcome = null;

  if (tile.type === 'workshop') raiseTip(state, p, 'workshop');

  // Fornecedor: até 4 ofertas de blueprint (as do kit do degrau atual vêm primeiro); o jogador escolhe e paga (a 1ª é de graça).
  if (tile.type === 'shop') {
    const offers = makeOffers(p, rng);
    if (offers.length) state.pendingTile = { tileId: tile.id, kind: 'supplier', offers };
    else pushLog(state, t('act.noNewBlueprint', { name: p.name }), p.id);
  }

  if (tile.type === 'lot') {
    const lot = state.lots[tile.id];
    if (!lot) state.pendingTile = { tileId: tile.id, kind: 'build' };
    else if (lot.ownerId !== p.id) state.pendingTile = { tileId: tile.id, kind: 'use' };
    else pushLog(state, t('act.lotYours', { name: p.name, building: BUILDINGS[lot.buildingId].name }), p.id);
  }

  if (tile.type === 'spy') {
    if (state.players.length < 2) pushLog(state, t('act.noRivalsSpy', { name: p.name }), p.id);
    else if (p.lastSpyYear === yearOf(state.round)) pushLog(state, t('act.spyUsed', { name: p.name }), p.id);
    else state.pendingTile = { tileId: tile.id, kind: 'spy' };
  }

  // Evento: com a nave em voo vira imprevisto na próxima etapa; em solo, carta de dilema.
  if (tile.type === 'event') {
    if (p.flight) {
      const eventId = pickEvent(rng).id;
      p.flight.tileEvent = eventId;
      pushLog(state, t('act.flightEventIncoming', { name: p.name, event: FLIGHT_EVENTS[eventId].title }), p.id);
    } else {
      state.pendingDilemma = { id: pickDilemma(p, rng).id };
    }
  }
  return null;
}

// Atalho: rola e anda com o primeiro dado (usado nos testes).
export function rollAndMove(state, rng = Math.random) {
  return rollDice(state, rng) || moveBy(state, 0, rng);
}

// `notes` (opcional) recebe frases para o retorno imediato ao jogador (aposta, boato).
function applyEffect(state, p, e, rng, notes = []) {
  if (e.gamble) {
    const won = rng() < e.gamble.chance;
    pushLog(state, `${p.name}: ${won ? t('act.gambleWonLog') : t('act.gambleLostLog')}`, p.id);
    notes.push(won ? t('act.gambleWon') : t('act.gambleLost'));
    applyEffect(state, p, won ? e.gamble.win : e.gamble.lose, rng, notes);
    return;
  }
  if (e.funds) p.funds = Math.max(0, p.funds + e.funds);
  if (e.tech) p.tech = Math.max(0, p.tech + e.tech);
  if (e.discount) p.discount = Math.max(p.discount, e.discount);
  if (e.shield) p.shields += e.shield;
  if (e.launchRisk) p.launchRisk = (p.launchRisk || 0) + e.launchRisk;
  if (e.rumor) spreadRumor(state, p, rng, notes);
}

export function chooseDilemma(state, index, rng = Math.random) {
  const p = currentPlayer(state);
  const card = DILEMMAS.find((d) => d.id === state.pendingDilemma?.id);
  if (!card) return t('act.noDilemma');
  const option = card.options[index];
  if (!option) return t('act.invalidOption');
  state.pendingDilemma = null;
  pushLog(state, t('act.dilemmaLog', { name: p.name, title: card.title, label: option.label, lesson: option.lesson }), p.id);
  const before = statsOf(p);
  const notes = [];
  applyEffect(state, p, option.effect, rng, notes);
  const after = statsOf(p);
  setOutcome(state, p, {
    title: card.title,
    choice: option.label,
    changes: changesBetween(before, after),
    notes: [...notes, ...extrasBetween(before, after)],
    lesson: option.lesson,
  });
  return null;
}

// Boato: informação vaga sobre um rival, às vezes errada.
function spreadRumor(state, p, rng, notes = []) {
  const rivals = state.players.filter((r) => r.id !== p.id);
  if (!rivals.length) return;
  const rival = rivals[Math.floor(rng() * rivals.length)];
  const total = ladderOf(rival).length;
  const truth = rng() < RUMOR_TRUTH;
  const shown = truth ? rival.step : Math.max(0, Math.min(total, rival.step + (rng() < 0.5 ? -1 : 1)));
  p.intel[rival.id] = { year: yearOf(state.round), rumor: true, steps: shown, total };
  const text = t('act.rumorText', { name: rival.name, shown, total });
  pushLog(state, text, p.id);
  notes.push(text);
}

// Espionagem: paga e vê o estado real de um rival (degrau atual e quanto a nave está pronta).
// Sabotar em vez de observar (mesma casa, mesma ação anual). Contra um jogador arma uma "interferência na telemetria"
// que chega na etapa final do voo dele; contra o bot do solo atrasa o próximo degrau dele em 1 ano.
export function sabotage(state, rivalId) {
  const p = currentPlayer(state);
  if (state.pendingTile?.kind !== 'spy') return t('act.notSpyTile');
  const rival = state.players.find((r) => r.id === rivalId && r.id !== p.id);
  if (!rival) return t('act.invalidRival');
  if (p.funds < SABOTAGE_COST) return t('act.sabotageCost', { cost: SABOTAGE_COST });
  if (rival.interference) return t('act.sabotageArmed', { name: rival.name });
  if (rival.bot && (rival.step >= ladderOf(rival).length || rival.schedule[rival.step] == null)) return t('act.noStepToDelay', { name: rival.name });
  if (rival.bot && rival.delayedStep === rival.step) return t('act.alreadyDelayed', { name: rival.name });
  p.funds -= SABOTAGE_COST;
  p.lastSpyYear = yearOf(state.round);
  state.pendingTile = null;
  let note;
  if (rival.bot) {
    rival.schedule[rival.step] += 1;
    rival.delayedStep = rival.step; // só um atraso por degrau (senão, 1 sabotagem por ano o seguraria para sempre)
    note = t('act.sabotageBotNote', { name: rival.name });
  } else {
    rival.interference = { fromId: p.id, year: yearOf(state.round) };
    note = t('act.sabotageNote', { name: rival.name });
  }
  pushLog(state, t('act.sabotageLog', { name: p.name, cost: SABOTAGE_COST, rival: rival.name }), p.id);
  setOutcome(state, p, {
    title: t('act.sabotageTitle', { name: rival.name }),
    changes: [{ label: t('res.funds'), value: -SABOTAGE_COST }],
    notes: [note, t('act.sabotageHint')],
  });
  return null;
}

export function spyOn(state, rivalId) {
  const p = currentPlayer(state);
  if (state.pendingTile?.kind !== 'spy') return t('act.notSpyTile');
  const rival = state.players.find((r) => r.id === rivalId && r.id !== p.id);
  if (!rival) return t('act.invalidRival');
  if (p.funds < SPY_COST) return t('act.spyCost', { cost: SPY_COST });
  p.funds -= SPY_COST;
  p.lastSpyYear = yearOf(state.round);
  p.intel[rival.id] = spyReport(state, rival);
  state.pendingTile = null;
  pushLog(state, t('act.spyLog', { name: p.name, cost: SPY_COST, rival: rival.name }), p.id);
  const r = p.intel[rival.id];
  const ship = r.inFlight ? t('act.spyShipFlying', { n: r.stage + 1, total: r.stages }) : r.ready != null ? t('act.spyShipReady', { pct: Math.round(r.ready * 100) }) : r.note || '';
  setOutcome(state, p, {
    title: t('act.spyTitle', { name: rival.name }),
    changes: [{ label: t('res.funds'), value: -SPY_COST }],
    notes: [t('act.spyNote', { steps: r.steps, total: r.total, mission: r.mission ? t('act.spyAiming', { mission: r.mission }) : '', ship: ship ? `; ${ship}` : '' }), t('act.spySaved')],
  });
  return null;
}

function spyReport(state, rival) {
  const ladder = ladderOf(rival);
  const report = {
    year: yearOf(state.round),
    rumor: false,
    steps: rival.step,
    total: ladder.length,
    mission: rival.missionId ? MISSIONS[rival.missionId].name : null,
  };
  if (rival.bot) return { ...report, note: t('act.spyBotNote') };
  if (rival.flight) {
    return { ...report, mission: MISSIONS[rival.flight.missionId].name, inFlight: true, stage: rival.flight.stageIndex, stages: rival.flight.plan.length };
  }
  const checks = checkDesign(rival, { evaluate: true }).checks.filter((c) => c.hard); // o espião vê a verdade
  return { ...report, ready: checks.length ? checks.filter((c) => c.ok).length / checks.length : 0 };
}

// Terreno livre: constrói um prédio novo (nível 1). Upgrade depois é de qualquer lugar.
export function buildOnLot(state, buildingId) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'build') return t('act.notFreeLot');
  if (!BUILDINGS[buildingId]) return t('act.unknownBuilding');
  if (p.buildings[buildingId] > 0) return t('act.alreadyHaveBuilding', { building: BUILDINGS[buildingId].name });
  const cost = upgradeCost(0);
  if (p.funds < cost) return t('act.buildCost', { cost });
  p.funds -= cost;
  p.buildings[buildingId] = 1;
  state.lots[pending.tileId] = { ownerId: p.id, buildingId };
  state.pendingTile = null;
  pushLog(state, t('act.builtLog', { name: p.name, building: BUILDINGS[buildingId].name }));
  setOutcome(state, p, {
    title: t('act.builtTitle', { building: BUILDINGS[buildingId].name }),
    changes: [{ label: t('res.funds'), value: -cost }],
    notes: [BUILDINGS[buildingId].effect, t('act.upgradeInPanel')],
  });
  return null;
}

export const useFeeFor = (level) => USE_FEE + 2 * (level - 1);

// Prédio de outro jogador: paga a taxa ao dono e recebe o efeito uma vez. Os dois ganham.
export function useRivalBuilding(state, rng = Math.random) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'use') return t('act.noRivalBuilding');
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const building = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  if (p.funds < fee) return t('act.feeCost', { fee });
  const before = statsOf(p);
  p.funds -= fee;
  owner.funds += fee;
  applyEffect(state, p, building.useEffect, rng); // `rng` injetável: o simulador (scripts/simulate.mjs) repete partidas
  state.pendingTile = null;
  pushLog(state, t('act.usedLog', { name: p.name, fee, owner: owner.name, building: building.name }));
  const after = statsOf(p);
  setOutcome(state, p, {
    title: t('act.usedTitle', { building: building.name, owner: owner.name }),
    changes: changesBetween(before, after),
    notes: [...extrasBetween(before, after), t('act.ownerReceived', { owner: owner.name, fee })],
  });
  return null;
}

export function skipTile(state) {
  state.pendingTile = null;
  return null;
}

// Fornecedor: compra uma das ofertas da visita. A blueprint é pesquisa (paga uma vez, vale para sempre); a peça física
// ainda é paga na oficina. A PRIMEIRA blueprint da partida é de graça. A visita continua aberta até acabarem as ofertas
// ou o jogador seguir (skipTile).
export function buyBlueprint(state, itemId) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'supplier') return t('act.notSupplier');
  if (!pending.offers.includes(itemId)) return t('act.notInOffers');
  const free = !p.freeBlueprintUsed;
  const price = blueprintCostFor(p, itemId);
  if (p.funds < price) return t('act.blueprintCost', { price });
  p.funds -= price;
  p.freeBlueprintUsed = true;
  discover(p, [itemId]);
  pending.offers = pending.offers.filter((id) => id !== itemId);
  if (!pending.offers.length) state.pendingTile = null;
  pushLog(state, t('act.blueprintLog', { name: p.name, item: nameOf(itemId), suffix: free ? t('act.blueprintFreeSuffix') : t('act.blueprintPaidSuffix', { price }) }), p.id);
  setOutcome(state, p, {
    title: t('act.blueprintTitle', { item: nameOf(itemId) }),
    changes: price ? [{ label: t('res.funds'), value: -price }] : [],
    notes: [free ? t('act.blueprintFree') : t('act.blueprintForever'), t('act.blueprintBuyNow')],
  });
  raiseTip(state, p, 'blueprint', itemId);
  return null;
}

export function upgradeBuilding(state, buildingId) {
  const p = currentPlayer(state);
  if (state.sandbox) return t('act.noBuildingsSandbox');
  const level = p.buildings[buildingId];
  if (!level) return t('act.buildFirst');
  if (level >= MAX_LEVEL) return t('act.maxLevel');
  const cost = upgradeCostFor(state, p, buildingId);
  if (p.funds < cost) return t('act.upgradeCost', { cost });
  p.funds -= cost;
  p.buildings[buildingId] = level + 1;
  pushLog(state, t('act.upgradeLog', { name: p.name, building: BUILDINGS[buildingId].name, level: level + 1, cost }), p.id);
  // Retorno imediato: o clique em "subir" mostra o custo e o que o novo nível rende.
  setOutcome(state, p, {
    title: t('act.upgradeTitle', { building: BUILDINGS[buildingId].name, level: level + 1, max: MAX_LEVEL }),
    changes: [{ label: t('res.funds'), value: -cost }],
    notes: [BUILDINGS[buildingId].effect, level + 1 >= MAX_LEVEL ? t('act.maxLevelNote') : t('act.nextLevel', { cost: upgradeCostFor(state, p, buildingId) })],
  });
  return null;
}

// Quem está em último paga metade no upgrade (freio contra bola de neve).
export function upgradeCostFor(state, player, buildingId) {
  const base = upgradeCost(player.buildings[buildingId]);
  const behind = state.players.length > 1 && isLastPlayer(state, player);
  return behind ? Math.round(base * CATCHUP_UPGRADE_DISCOUNT) : base;
}

// Sem eliminação: com pouca verba, a agência pede socorro e perde tecnologia.
export function requestBailout(state) {
  const p = currentPlayer(state);
  if (p.funds >= BAILOUT_LIMIT) return t('act.bailoutLimit', { limit: BAILOUT_LIMIT });
  p.funds += BAILOUT_FUNDS;
  // Piso de tecnologia 1: toda peça exige pelo menos 1. Com a pesquisa básica de 2 em 2 anos, descer a 0 trancaria a
  // agência fora da oficina por até 2 anos, e o socorro de emergência não pode ser uma armadilha.
  const lost = Math.min(BAILOUT_TECH_COST, Math.max(0, p.tech - TECH_FLOOR));
  p.tech -= lost;
  p.bailouts += 1;
  pushLog(state, t('act.bailoutLog', { name: p.name, funds: BAILOUT_FUNDS, tech: lost ? t('act.bailoutTechLost', { lost }) : t('act.bailoutNoTech') }), p.id);
  return null;
}

// ---------------------------------------------------------------- missão e oficina

// Só no sandbox: no jogo normal a missão é o degrau atual da escada.
export function chooseMission(state, missionId) {
  const p = currentPlayer(state);
  if (!state.sandbox) return t('act.missionIsStep');
  if (!MISSIONS[missionId]) return t('act.unknownMission');
  if (p.flight) return t('act.waitFlightSwap');
  p.missionId = missionId;
  pushLog(state, t('act.choseMission', { name: p.name, mission: MISSIONS[missionId].name }), p.id);
  checkMilestones(state, p);
  return null;
}

export function buyItem(state, itemId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
  const item = CATALOG[itemId];
  if (!isDiscovered(p, item)) return t('act.noBlueprint', { name: item.name });
  if (isLocked(p, item)) return t('act.itemLocked', { name: item.name, req: requiredTech(p, item), tech: p.tech });
  const price = priceFor(p, itemId);
  if (p.funds < price) return t('act.itemCost', { name: item.name, price });
  p.funds -= price;
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  bucket.push(itemId);
  pushLog(state, t('act.boughtLog', { name: p.name, item: item.name, price }), p.id);
  raiseTip(state, p, 'part');
  p.discount = 0; // desconto de evento vale para uma compra (a Fábrica é permanente)
  checkMilestones(state, p);
  return null;
}

// Antes de voar, revende pelo valor cheio (regra do IDEIA.md).
export function sellItem(state, itemId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  const idx = bucket.indexOf(itemId);
  if (idx === -1) return t('act.itemNotOnboard');
  bucket.splice(idx, 1);
  const refund = refundFor(itemId); // sucata: metade do custo base (sim/resources.js)
  p.funds += refund;
  pushLog(state, t('act.soldLog', { name: p.name, item: CATALOG[itemId].name, refund }), p.id);
  return null;
}

export function chooseLauncher(state, launcherId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
  const launcher = LAUNCHERS[launcherId];
  if (!isDiscovered(p, launcher)) return t('act.noBlueprint', { name: launcher.name });
  if (isLocked(p, launcher)) return t('act.itemLocked', { name: launcher.name, req: requiredTech(p, launcher), tech: p.tech });
  p.spacecraft.launcherId = launcherId;
  checkMilestones(state, p);
  return null;
}

export function chooseOrbit(state, orbitId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
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
  pushLog(state, t('act.milestoneLog', { name: player.name, ms: ms.name, effect: describeEffect(ms.effect) }), player.id);
}

export function describeEffect(effect) {
  if (effect.type === 'funds') return t('act.effectFunds', { n: effect.value });
  if (effect.type === 'discount') return t('act.effectDiscount', { n: effect.value });
  return t('act.effectShield');
}

function checkMilestones(state, player) {
  if (player.missionId && !player.flight && checkDesign(player).designOk) grant(state, player, 'design_ready');
}

// ---------------------------------------------------------------- voo em etapas

// Ensaio em solo: por um custo pequeno (sem gastar foguete), diz em palavras se a nave atende aos mínimos
// escondidos da missão. Não dá o número: para isso é preciso lançar e errar (sim/needs.js).
export function rehearse(state) {
  const p = currentPlayer(state);
  if (state.sandbox) return t('act.rehearseSandbox');
  const inFlight = inFlightLock(state, p) || workshopLock(state, p);
  if (inFlight) return inFlight;
  if (!p.missionId) return t('act.ladderDone');
  if (!isHidden(p)) return t('act.reqsKnown');
  if (p.rehearsedThisTurn) return t('act.rehearseOnce');
  if (p.funds < REHEARSAL_COST) return t('act.rehearseCost', { cost: REHEARSAL_COST });
  p.funds -= REHEARSAL_COST;
  p.rehearsedThisTurn = true;
  const results = assessNeeds(p);
  const short = results.filter((r) => !r.ok);
  pushLog(state, t('act.rehearseLog', { name: p.name, mission: MISSIONS[p.missionId].name }), p.id);
  setOutcome(state, p, {
    where: 'workshop', // a oficina mostra este resultado (os da casa do tabuleiro ficam no tabuleiro)
    title: t('act.rehearseTitle'),
    changes: [{ label: t('res.funds'), value: -REHEARSAL_COST }],
    notes: [
      ...results.map((r) => `${r.label[0].toUpperCase()}${r.label.slice(1)}: ${r.status}.`),
      short.length ? t('act.rehearseShort') : t('act.rehearseOk'),
    ],
  });
  return null;
}

// Lança: paga o lançador, a nave sai da oficina e a SUBIDA é sorteada na hora (encerra o turno).
export function launch(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.missionId) return state.sandbox ? t('act.chooseMissionFirst') : t('act.ladderDone');
  if (p.flight) return t('act.alreadyInFlight');
  const away = workshopLock(state, p);
  if (away) return away;
  if (!state.sandbox && !p.rolled) return t('act.moveBeforeLaunch');
  if (!state.sandbox && p.launchedThisTurn) return t('act.launchOnce');
  const design = checkDesign(p);
  if (!design.ok) return t('act.designPending');
  p.funds -= design.totals.launchCost;
  p.launches += 1;
  raiseTip(state, p, 'launch');
  grant(state, p, 'launched');
  const missionId = p.missionId;
  p.flight = {
    missionId,
    plan: flightPlan(missionId),
    stageIndex: 0,
    craft: p.spacecraft,
    modifiers: { sciencePenalty: 0, lifetimeDelta: 0 },
    stages: [],
    pending: null,
    tileEvent: null,
    last: null,
  };
  // A nave da oficina sai zerada (lançador e órbita ficam). No jogo normal a missão continua sendo este degrau
  // até o voo terminar: o kit do próximo só é liberado ao cumpri-lo (completeMission) e a oficina fica fechada.
  p.spacecraft = { ...emptySpacecraft(), launcherId: p.flight.craft.launcherId, orbitId: p.flight.craft.orbitId };
  p.launchedThisTurn = true;
  p.flightAdvanced = true;
  // Lançar é público (o mundo vê um foguete subir): todos ficam sabendo e o peão ganha o marcador "em voo".
  // O que continua secreto: a nave por dentro e se o voo deu certo (só o espião ou o fim da partida revelam).
  pushLog(state, t('act.launchLog', { name: p.name, mission: MISSIONS[missionId].name }));
  const stageId = p.flight.plan[0];
  const risk = stageRisk(flyer(p), stageId);
  p.launchRisk = 0; // o defeito ignorado só pesa nesta subida
  resolveStage(state, p, stageId, risk, { label: t('milestone.launched') }, rng);
  return null;
}

// Prepara a próxima etapa: imprevisto da casa de evento onde o jogador parou (ou garantido nas chegadas).
export function advanceFlight(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.flight) return t('fl.noFlight');
  if (p.flight.pending) { state.screen = 'flight'; return null; }
  if (!state.sandbox) {
    if (!p.rolled) return t('act.moveBeforeAdvance');
    if (p.flightAdvanced) return t('act.oneAdvancePerTurn');
  }
  const stageId = p.flight.plan[p.flight.stageIndex];
  let eventId = p.flight.tileEvent;
  // Sabotagem armada por um rival: chega na etapa final, no lugar de qualquer outro imprevisto.
  if (p.interference && p.flight.stageIndex === p.flight.plan.length - 1) {
    const from = state.players.find((r) => r.id === p.interference.fromId);
    eventId = 'interference';
    pushLog(state, t('act.interferenceLog', { name: p.name }), p.id);
    if (from) pushLog(state, t('act.sabotageArrived', { from: from.name, name: p.name }), from.id);
    p.interference = null;
  }
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
  if (!pending) return t('act.noStagePending');
  const option = stageOptions(p, pending)[index];
  if (!option) return t('act.invalidOption');
  if (option.disabled) return t('act.optionNoFunds');
  const e = option.effect;
  if (e.funds) p.funds = Math.max(0, p.funds + e.funds);
  if (e.sciencePenalty) p.flight.modifiers.sciencePenalty = combinePenalty(p.flight.modifiers.sciencePenalty, e.sciencePenalty);
  if (e.lifetimeDelta) p.flight.modifiers.lifetimeDelta += e.lifetimeDelta;
  p.flight.pending = null;
  const event = pending.eventId ? FLIGHT_EVENTS[pending.eventId] : null;
  resolveStage(state, p, pending.stageId, option.risk, { event, label: option.label, lesson: option.lesson, effect: e }, rng);
  return null;
}

// Sorteia a etapa. Proteção absorve uma falha. Falha = nave perdida + dados de falha (+ consolação).
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
  pushLog(state, t('act.stageLog', { name: p.name, stage: stage.name, result: failed ? t('act.stageFailed') : t('act.stagePassed'), pct: pct(risk.total), shield: usedShield ? t('rep.savedByShield') : '' }), p.id);

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

// Depois do voo, a oficina volta a mirar o degrau atual (se falhou) ou o próximo (se cumpriu).
function retarget(state, p) {
  if (!state.sandbox) setMission(state, p, ladderOf(p)[p.step] || null);
}

function failMission(state, p, stageId) {
  const stage = STAGES[stageId];
  const flight = p.flight;
  const ship = flyer(p);
  p.failureData[stage.system] = (p.failureData[stage.system] || 0) + 1;
  p.tech += 1;
  // Missão de consolação: a nave cumpre um objetivo menor e dá crédito parcial (não na subida).
  if (stage.consolation) p.funds += CONSOLATION_FUNDS;
  const last = flight.last;
  p.lastResult = {
    success: false,
    missionId: flight.missionId,
    stages: flight.stages,
    failedStage: stageId,
    system: stage.system,
    reasons: [
      t('act.failReason', { stage: stage.name, pct: pct(last.risk) }),
      ...(last.causes.length ? [t('act.failCauses', { causes: last.causes.join('; ') })] : [t('act.failNoCause')]),
    ],
    consolation: stage.consolation ? t('act.consolationText', { text: stage.consolation, funds: CONSOLATION_FUNDS }) : null,
    failureLesson: t('act.failureLesson', { system: SYSTEM_NAMES[stage.system], pct: pct(FAILURE_DATA_BONUS) }),
    checks: checkDesign(ship, { ...flight.modifiers, launched: true }).checks,
    score: 0,
    scienceDelivered: 0,
    craft: flight.craft,
  };
  p.flight = null;
  retarget(state, p);
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
  result.year = year;
  // Mínimos escondidos: depois da avaliação final eles passam a aparecer. Falhar por causa deles ensina:
  // +1 de tecnologia, só na primeira vez (não dá para abusar), e o relatório explica o que faltou.
  const wasHidden = isHidden(p, missionId);
  const shortfalls = result.checks.filter((c) => !c.ok && c.hard && HIDDEN_CHECK_IDS.includes(c.id));
  if (wasHidden) {
    learnNeeds(p, missionId);
    if (shortfalls.length) {
      p.tech += 1;
      const n = MISSIONS[missionId].needs;
      result.learning = t('act.learning', { science: n.science, comms: n.comms });
      pushLog(state, t('act.learnedLog', { name: p.name, mission: MISSIONS[missionId].name }), p.id);
    }
  }
  if (result.success) {
    p.completed.push({ missionId, year, science: result.scienceDelivered });
    grant(state, p, 'mission_complete', missionId);
    if (!state.sandbox && ladderOf(p)[p.step] === missionId) {
      p.step += 1;
      // Primeiro do lado leva o bônus cheio; quem chega depois no mesmo lado leva menos.
      const key = `${p.side}:${missionId}`;
      const first = state.sideFirsts[key] == null;
      if (first) state.sideFirsts[key] = p.id;
      const bonus = first ? STEP_BONUS_FIRST : STEP_BONUS_LATER;
      p.funds += bonus;
      result.stepBonus = { bonus, first };
    }
  }
  pushLog(state, t('act.missionResultLog', { name: p.name, mission: MISSIONS[missionId].name, result: result.success ? t('act.missionDone') : t('act.missionShort') }), p.id);
  p.lastResult = result;
  p.flight = null;
  // Cumprir o degrau passa a mirar o próximo; falhar mantém o degrau atual. As blueprints vêm dos fornecedores.
  retarget(state, p);
  state.screen = 'report';
  return null;
}
