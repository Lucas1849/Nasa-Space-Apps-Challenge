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

const RUMOR_TRUTH = 0.7;            // boatos acertam 70% das vezes

// ---------------------------------------------------------------- partida e turno

// setup = [{ name, missionId? }, ...] (1 a 4 agências); options = { sandbox, rng }
export function startGame(state, setup, options = {}) {
  const rng = options.rng || Math.random;
  state.sandbox = Boolean(options.sandbox);
  state.players = setup.map((p, i) => createPlayer(i, p.name || `Agência ${i + 1}`, p.missionId || null));
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
    pushLog(state, 'Modo sandbox: verba livre, tecnologia liberada, sem tabuleiro. Explore os trade-offs à vontade.');
    return null;
  }

  const sides = drawSides(state.players.length, rng);
  state.players.forEach((p, i) => assignSide(p, sides[i]));
  if (state.players.length === 1) state.players.push(createBot(state.players[0], rng));

  pushLog(state, `Começa a corrida espacial. A cada 3 rodadas passa um ano; a partida termina em ${yearOf(MAX_ROUNDS)}.`);
  state.players.forEach((p) => pushLog(state, `${p.name} joga pelo lado ${SIDES[p.side].name}.`));
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
  (state.sandbox || atWorkshopTile(p) ? null : 'Vá a uma casa de Oficina do tabuleiro para montar e lançar. Aqui você só planeja.');

const inFlightLock = (state, p) =>
  (!state.sandbox && p.flight ? 'Sua nave está em voo: aguarde o resultado para montar a próxima.' : null);


// ---------------------------------------------------------------- retorno imediato ao jogador
// Depois de uma escolha ou de parar numa casa, o jogador vê na hora o que aconteceu (a UI mostra no
// centro do tabuleiro, sem pedir confirmação; some no próximo turno). Só o diário guardava isso antes.
//   changes = variações numéricas (verba, tecnologia, proteção); notes = o que mais aconteceu;
//   choice = a opção escolhida; lesson = o porquê.

const statsOf = (p) => ({ funds: p.funds, tech: p.tech, shields: p.shields, discount: p.discount || 0, launchRisk: p.launchRisk || 0 });

function changesBetween(before, after) {
  return [['funds', 'Verba'], ['tech', 'Tecnologia'], ['shields', 'Proteção']]
    .filter(([key]) => after[key] !== before[key])
    .map(([key, label]) => ({ label, value: after[key] - before[key] }));
}

// Efeitos que não são um número simples viram frases.
function extrasBetween(before, after) {
  const extras = [];
  if (after.discount > before.discount) extras.push(`${after.discount}% de desconto na próxima compra.`);
  if (after.launchRisk > before.launchRisk) extras.push(`A próxima subida terá ${Math.round((after.launchRisk - before.launchRisk) * 100)}% a mais de risco.`);
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
  const bot = createPlayer(1, `Agência rival (${SIDES[sideId].name})`);
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
    pushLog(state, `${p.name}: Ano novo! Orçamento +${funds} de verba, +${tech} de tecnologia (nível ${p.tech}).`, p.id);
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
    pushLog(state, `${bot.name} cumpriu "${MISSIONS[missionId].name}".`, bot.id);
  }
}

export function endTurn(state) {
  const p = currentPlayer(state);
  if (state.sandbox) {
    state.screen = p.flight ? 'flight' : 'workshop';
    return null;
  }
  if (!p.rolled) return 'Role os dados e ande antes de passar a vez.';
  if (state.pendingDilemma) return 'Resolva a carta de dilema antes de passar a vez.';
  if (p.flight?.pending) return 'Decida o imprevisto do voo antes de passar a vez.';
  if (p.flight && !p.flightAdvanced) return 'Sua nave está em voo: avance uma etapa antes de passar a vez.';
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
      if (isNewYear(state.round)) pushLog(state, `Começa o ano de ${yearOf(state.round)}.`);
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
  pushLog(state, done.length ? `${names} completou a escada de missões!` : `Fim de ${yearOf(state.round)}: vence quem subiu mais degraus (${names}).`);
}

// ---------------------------------------------------------------- tabuleiro

// Quem está em último na corrida recebe o choque do Sputnik e desconto no upgrade.
function isLastPlayer(state, player) {
  return state.players.every((p) => compareRank(player, p) >= 0);
}

// Rola 2 dados; o jogador escolhe qual usar (IDEIA.md v3: ainda tem sorte, mas ele sente que decidiu).
export function rollDice(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (state.sandbox) return 'No modo sandbox não há tabuleiro.';
  if (p.rolled || state.dice) return 'Você já rolou os dados neste turno.';
  state.dice = [rollDie(rng), rollDie(rng)];
  return null;
}

export function moveBy(state, index, rng = Math.random) {
  const p = currentPlayer(state);
  if (!state.dice) return 'Role os dados primeiro.';
  const steps = state.dice[index];
  if (!steps) return 'Dado inválido.';
  state.dice = null;
  const moved = movePlayer(p, steps);
  const tile = TILES[moved.position];
  const { player, messages } = applyTile(moved, tile, { isLast: isLastPlayer(state, p) });
  Object.assign(p, player);
  p.rolled = true;
  state.lastRoll = steps;
  pushLog(state, `${p.name} andou ${steps} e parou em "${tile.label}".`, p.id);
  messages.forEach((m) => pushLog(state, `${p.name}: ${m}`, p.id));

  // Retorno imediato: o que a casa deu (casas de decisão e de evento mostram a própria carta).
  if (messages.length) setOutcome(state, p, { title: `Parou em "${tile.label}"`, notes: messages });
  else state.outcome = null;

  if (tile.type === 'workshop') raiseTip(state, p, 'workshop');

  // Fornecedor: até 4 ofertas de blueprint (as do kit do degrau atual vêm primeiro); o jogador escolhe e paga (a 1ª é de graça).
  if (tile.type === 'shop') {
    const offers = makeOffers(p, rng);
    if (offers.length) state.pendingTile = { tileId: tile.id, kind: 'supplier', offers };
    else pushLog(state, `${p.name}: o fornecedor não tem nenhuma blueprint nova para você.`, p.id);
  }

  if (tile.type === 'lot') {
    const lot = state.lots[tile.id];
    if (!lot) state.pendingTile = { tileId: tile.id, kind: 'build' };
    else if (lot.ownerId !== p.id) state.pendingTile = { tileId: tile.id, kind: 'use' };
    else pushLog(state, `${p.name}: este terreno já é seu (${BUILDINGS[lot.buildingId].name}).`, p.id);
  }

  if (tile.type === 'spy') {
    if (state.players.length < 2) pushLog(state, `${p.name}: não há rivais para espionar.`, p.id);
    else if (p.lastSpyYear === yearOf(state.round)) pushLog(state, `${p.name}: o espião já trabalhou este ano.`, p.id);
    else state.pendingTile = { tileId: tile.id, kind: 'spy' };
  }

  // Evento: com a nave em voo vira imprevisto na próxima etapa; em solo, carta de dilema.
  if (tile.type === 'event') {
    if (p.flight) {
      const eventId = pickEvent(rng).id;
      p.flight.tileEvent = eventId;
      pushLog(state, `${p.name}: sua nave em voo vai enfrentar "${FLIGHT_EVENTS[eventId].title}" na próxima etapa.`, p.id);
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
    pushLog(state, `${p.name}: ${won ? 'deu certo!' : 'deu errado.'}`, p.id);
    notes.push(won ? 'Deu certo!' : 'Deu errado.');
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
  if (!card) return 'Nenhuma carta de dilema pendente.';
  const option = card.options[index];
  if (!option) return 'Opção inválida.';
  state.pendingDilemma = null;
  pushLog(state, `${p.name} — ${card.title}: "${option.label}". ${option.lesson}`, p.id);
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
  const text = `Boato: dizem que ${rival.name} já cumpriu ${shown} de ${total} degraus. Pode não ser verdade.`;
  pushLog(state, text, p.id);
  notes.push(text);
}

// Espionagem: paga e vê o estado real de um rival (degrau atual e quanto a nave está pronta).
// Sabotar em vez de observar (mesma casa, mesma ação anual). Contra um jogador arma uma "interferência na telemetria"
// que chega na etapa final do voo dele; contra o bot do solo atrasa o próximo degrau dele em 1 ano.
export function sabotage(state, rivalId) {
  const p = currentPlayer(state);
  if (state.pendingTile?.kind !== 'spy') return 'Você não está na casa de espionagem.';
  const rival = state.players.find((r) => r.id === rivalId && r.id !== p.id);
  if (!rival) return 'Rival inválido.';
  if (p.funds < SABOTAGE_COST) return `Verba insuficiente: a sabotagem custa ${SABOTAGE_COST}.`;
  if (rival.interference) return `${rival.name} já tem uma sabotagem armada: espere ela chegar.`;
  if (rival.bot && (rival.step >= ladderOf(rival).length || rival.schedule[rival.step] == null)) return `${rival.name} não tem mais um degrau para atrasar.`;
  if (rival.bot && rival.delayedStep === rival.step) return `${rival.name} já foi atrasada neste degrau: sabotar de novo o adiaria sem fim.`;
  p.funds -= SABOTAGE_COST;
  p.lastSpyYear = yearOf(state.round);
  state.pendingTile = null;
  let note;
  if (rival.bot) {
    rival.schedule[rival.step] += 1;
    rival.delayedStep = rival.step; // só um atraso por degrau (senão, 1 sabotagem por ano o seguraria para sempre)
    note = `O próximo degrau de ${rival.name} atrasou 1 ano.`;
  } else {
    rival.interference = { fromId: p.id, year: yearOf(state.round) };
    note = `A interferência vai atingir a telemetria de ${rival.name} na etapa final do voo dele, se ele voar neste ano.`;
  }
  pushLog(state, `${p.name} pagou ${SABOTAGE_COST} ao espião para sabotar ${rival.name}.`, p.id);
  setOutcome(state, p, {
    title: `Sabotagem: ${rival.name}`,
    changes: [{ label: 'Verba', value: -SABOTAGE_COST }],
    notes: [note, 'Sabotar custa verba e uma ação de espião; o rival pode se proteger pagando a rede de reserva.'],
  });
  return null;
}

export function spyOn(state, rivalId) {
  const p = currentPlayer(state);
  if (state.pendingTile?.kind !== 'spy') return 'Você não está na casa de espionagem.';
  const rival = state.players.find((r) => r.id === rivalId && r.id !== p.id);
  if (!rival) return 'Rival inválido.';
  if (p.funds < SPY_COST) return `Verba insuficiente: o espião custa ${SPY_COST}.`;
  p.funds -= SPY_COST;
  p.lastSpyYear = yearOf(state.round);
  p.intel[rival.id] = spyReport(state, rival);
  state.pendingTile = null;
  pushLog(state, `${p.name} pagou ${SPY_COST} ao espião para observar ${rival.name}.`, p.id);
  const r = p.intel[rival.id];
  const ship = r.inFlight ? `nave em voo (etapa ${r.stage + 1} de ${r.stages})` : r.ready != null ? `nave ${Math.round(r.ready * 100)}% pronta` : r.note || '';
  setOutcome(state, p, {
    title: `Espião: ${rival.name}`,
    changes: [{ label: 'Verba', value: -SPY_COST }],
    notes: [`${r.steps} de ${r.total} degraus cumpridos${r.mission ? `, mirando "${r.mission}"` : ''}${ship ? `; ${ship}` : ''}.`, 'O relatório fica guardado na aba Rivais.'],
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
  if (rival.bot) return { ...report, note: 'Segue o próprio calendário; não dá para ver a oficina.' };
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
  if (!pending || pending.kind !== 'build') return 'Você não está num terreno livre.';
  if (!BUILDINGS[buildingId]) return 'Prédio desconhecido.';
  if (p.buildings[buildingId] > 0) return `Você já tem ${BUILDINGS[buildingId].name}. Suba o nível no painel da agência.`;
  const cost = upgradeCost(0);
  if (p.funds < cost) return `Verba insuficiente: construir custa ${cost}.`;
  p.funds -= cost;
  p.buildings[buildingId] = 1;
  state.lots[pending.tileId] = { ownerId: p.id, buildingId };
  state.pendingTile = null;
  pushLog(state, `${p.name} construiu ${BUILDINGS[buildingId].name} num terreno.`);
  setOutcome(state, p, {
    title: `Construiu ${BUILDINGS[buildingId].name}`,
    changes: [{ label: 'Verba', value: -cost }],
    notes: [BUILDINGS[buildingId].effect, 'Suba o nível na aba Sua agência.'],
  });
  return null;
}

export const useFeeFor = (level) => USE_FEE + 2 * (level - 1);

// Prédio de outro jogador: paga a taxa ao dono e recebe o efeito uma vez. Os dois ganham.
export function useRivalBuilding(state, rng = Math.random) {
  const p = currentPlayer(state);
  const pending = state.pendingTile;
  if (!pending || pending.kind !== 'use') return 'Não há prédio de rival para usar aqui.';
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const building = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  if (p.funds < fee) return `Verba insuficiente: a taxa é ${fee}.`;
  const before = statsOf(p);
  p.funds -= fee;
  owner.funds += fee;
  applyEffect(state, p, building.useEffect, rng); // `rng` injetável: o simulador (scripts/simulate.mjs) repete partidas
  state.pendingTile = null;
  pushLog(state, `${p.name} pagou ${fee} a ${owner.name} para usar o ${building.name}.`);
  const after = statsOf(p);
  setOutcome(state, p, {
    title: `Usou ${building.name} de ${owner.name}`,
    changes: changesBetween(before, after),
    notes: [...extrasBetween(before, after), `${owner.name} recebeu ${fee}: os dois saem ganhando.`],
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
  if (!pending || pending.kind !== 'supplier') return 'Você não está num fornecedor.';
  if (!pending.offers.includes(itemId)) return 'Esse item não está nas ofertas desta visita.';
  const free = !p.freeBlueprintUsed;
  const price = blueprintCostFor(p, itemId);
  if (p.funds < price) return `Verba insuficiente: a blueprint custa ${price}.`;
  p.funds -= price;
  p.freeBlueprintUsed = true;
  discover(p, [itemId]);
  pending.offers = pending.offers.filter((id) => id !== itemId);
  if (!pending.offers.length) state.pendingTile = null;
  pushLog(state, `${p.name} conseguiu a blueprint de ${nameOf(itemId)}${free ? ' (a primeira é de graça)' : ` por ${price}`}.`, p.id);
  setOutcome(state, p, {
    title: `Blueprint: ${nameOf(itemId)}`,
    changes: price ? [{ label: 'Verba', value: -price }] : [],
    notes: [free ? 'A primeira blueprint é de graça.' : 'A blueprint vale para sempre.', 'Agora você pode comprar essa peça (ou escolher esse foguete) na oficina.'],
  });
  raiseTip(state, p, 'blueprint', itemId);
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
  pushLog(state, `${p.name} subiu ${BUILDINGS[buildingId].name} para o nível ${level + 1} por ${cost}.`, p.id);
  // Retorno imediato: o clique em "subir" mostra o custo e o que o novo nível rende.
  setOutcome(state, p, {
    title: `${BUILDINGS[buildingId].name}: nível ${level + 1} de ${MAX_LEVEL}`,
    changes: [{ label: 'Verba', value: -cost }],
    notes: [BUILDINGS[buildingId].effect, level + 1 >= MAX_LEVEL ? 'Nível máximo.' : `Próximo nível: ${upgradeCostFor(state, p, buildingId)} de verba.`],
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
  if (p.funds >= BAILOUT_LIMIT) return `Socorro só com menos de ${BAILOUT_LIMIT} de verba.`;
  p.funds += BAILOUT_FUNDS;
  // Piso de tecnologia 1: toda peça exige pelo menos 1. Com a pesquisa básica de 2 em 2 anos, descer a 0 trancaria a
  // agência fora da oficina por até 2 anos, e o socorro de emergência não pode ser uma armadilha.
  const lost = Math.min(BAILOUT_TECH_COST, Math.max(0, p.tech - TECH_FLOOR));
  p.tech -= lost;
  p.bailouts += 1;
  pushLog(state, `${p.name} pediu socorro de emergência: +${BAILOUT_FUNDS} de verba${lost ? `, −${lost} de tecnologia` : ' (sem perder tecnologia: já está no mínimo)'}.`, p.id);
  return null;
}

// ---------------------------------------------------------------- missão e oficina

// Só no sandbox: no jogo normal a missão é o degrau atual da escada.
export function chooseMission(state, missionId) {
  const p = currentPlayer(state);
  if (!state.sandbox) return 'A missão é o próximo degrau da escada do seu lado.';
  if (!MISSIONS[missionId]) return 'Missão desconhecida.';
  if (p.flight) return 'Espere a nave em voo terminar a missão antes de trocar.';
  p.missionId = missionId;
  pushLog(state, `${p.name} escolheu a missão "${MISSIONS[missionId].name}".`, p.id);
  checkMilestones(state, p);
  return null;
}

export function buyItem(state, itemId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
  const item = CATALOG[itemId];
  if (!isDiscovered(p, item)) return `${item.name}: você ainda não tem a blueprint. Pare numa casa de Fornecedor do tabuleiro para consegui-la.`;
  if (isLocked(p, item)) return `${item.name} exige tecnologia ${requiredTech(p, item)} (você tem ${p.tech}).`;
  const price = priceFor(p, itemId);
  if (p.funds < price) return `Verba insuficiente: ${item.name} custa ${price}.`;
  p.funds -= price;
  const bucket = INSTRUMENTS[itemId] ? p.spacecraft.instruments : p.spacecraft.parts;
  bucket.push(itemId);
  pushLog(state, `${p.name} comprou ${item.name} por ${price}.`, p.id);
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
  if (idx === -1) return 'Item não está na espaçonave.';
  bucket.splice(idx, 1);
  const refund = refundFor(itemId); // sucata: metade do custo base (sim/resources.js)
  p.funds += refund;
  pushLog(state, `${p.name} revendeu ${CATALOG[itemId].name} como sucata por ${refund}.`, p.id);
  return null;
}

export function chooseLauncher(state, launcherId) {
  const p = currentPlayer(state);
  const locked = inFlightLock(state, p) || workshopLock(state, p);
  if (locked) return locked;
  const launcher = LAUNCHERS[launcherId];
  if (!isDiscovered(p, launcher)) return `${launcher.name}: você ainda não tem a blueprint. Pare numa casa de Fornecedor do tabuleiro para consegui-la.`;
  if (isLocked(p, launcher)) return `${launcher.name} exige tecnologia ${requiredTech(p, launcher)} (você tem ${p.tech}).`;
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
  pushLog(state, `${player.name} atingiu "${ms.name}" (${describeEffect(ms.effect)}).`, player.id);
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

// Ensaio em solo: por um custo pequeno (sem gastar foguete), diz em palavras se a nave atende aos mínimos
// escondidos da missão. Não dá o número: para isso é preciso lançar e errar (sim/needs.js).
export function rehearse(state) {
  const p = currentPlayer(state);
  if (state.sandbox) return 'No sandbox os requisitos da missão já aparecem na checagem.';
  const inFlight = inFlightLock(state, p) || workshopLock(state, p);
  if (inFlight) return inFlight;
  if (!p.missionId) return 'Sua escada já está completa.';
  if (!isHidden(p)) return 'Os requisitos desta missão já são conhecidos: veja a checagem do projeto.';
  if (p.rehearsedThisTurn) return 'Só um ensaio por turno.';
  if (p.funds < REHEARSAL_COST) return `Verba insuficiente: o ensaio custa ${REHEARSAL_COST}.`;
  p.funds -= REHEARSAL_COST;
  p.rehearsedThisTurn = true;
  const results = assessNeeds(p);
  const short = results.filter((r) => !r.ok);
  pushLog(state, `${p.name} fez um ensaio em solo da missão "${MISSIONS[p.missionId].name}".`, p.id);
  setOutcome(state, p, {
    where: 'workshop', // a oficina mostra este resultado (os da casa do tabuleiro ficam no tabuleiro)
    title: 'Ensaio em solo',
    changes: [{ label: 'Verba', value: -REHEARSAL_COST }],
    notes: [
      ...results.map((r) => `${r.label[0].toUpperCase()}${r.label.slice(1)}: ${r.status}.`),
      short.length
        ? 'Ajuste a nave e ensaie de novo no próximo turno, ou lance para descobrir os números.'
        : 'Nada indica falta de requisito. Ainda há o risco do voo.',
    ],
  });
  return null;
}

// Lança: paga o lançador, a nave sai da oficina e a SUBIDA é sorteada na hora (encerra o turno).
export function launch(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.missionId) return state.sandbox ? 'Escolha uma missão antes de lançar.' : 'Sua escada já está completa.';
  if (p.flight) return 'Você já tem uma nave em voo.';
  const away = workshopLock(state, p);
  if (away) return away;
  if (!state.sandbox && !p.rolled) return 'Ande no tabuleiro antes de lançar.';
  if (!state.sandbox && p.launchedThisTurn) return 'Só um lançamento por turno.';
  const design = checkDesign(p);
  if (!design.ok) return 'O projeto ainda tem pendências: veja a checagem na oficina.';
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
  pushLog(state, `${p.name} lançou a missão "${MISSIONS[missionId].name}".`);
  const stageId = p.flight.plan[0];
  const risk = stageRisk(flyer(p), stageId);
  p.launchRisk = 0; // o defeito ignorado só pesa nesta subida
  resolveStage(state, p, stageId, risk, { label: 'Lançamento' }, rng);
  return null;
}

// Prepara a próxima etapa: imprevisto da casa de evento onde o jogador parou (ou garantido nas chegadas).
export function advanceFlight(state, rng = Math.random) {
  const p = currentPlayer(state);
  if (!p.flight) return 'Nenhuma nave em voo.';
  if (p.flight.pending) { state.screen = 'flight'; return null; }
  if (!state.sandbox) {
    if (!p.rolled) return 'Ande no tabuleiro primeiro: uma casa de evento pode trazer um imprevisto para o voo.';
    if (p.flightAdvanced) return 'O voo avança uma etapa por turno.';
  }
  const stageId = p.flight.plan[p.flight.stageIndex];
  let eventId = p.flight.tileEvent;
  // Sabotagem armada por um rival: chega na etapa final, no lugar de qualquer outro imprevisto.
  if (p.interference && p.flight.stageIndex === p.flight.plan.length - 1) {
    const from = state.players.find((r) => r.id === p.interference.fromId);
    eventId = 'interference';
    pushLog(state, `${p.name}: a telemetria da nave sofreu interferência na etapa final (suspeita de sabotagem rival).`, p.id);
    if (from) pushLog(state, `${from.name}: sua sabotagem chegou à telemetria de ${p.name}.`, from.id);
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
  if (!pending) return 'Nenhuma etapa aguardando decisão.';
  const option = stageOptions(p, pending)[index];
  if (!option) return 'Opção inválida.';
  if (option.disabled) return 'Verba insuficiente para esta opção.';
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
  pushLog(state, `${p.name}: etapa "${stage.name}" ${failed ? 'FALHOU' : 'superada'} (risco ${pct(risk.total)})${usedShield ? ', salva pela proteção' : ''}.`, p.id);

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
      `A etapa "${stage.name}" falhou: o risco era ${pct(last.risk)}.`,
      ...(last.causes.length ? [`O que aumentou o risco: ${last.causes.join('; ')}.`] : ['Mesmo um projeto bom tem risco: nada no espaço é garantido.']),
    ],
    consolation: stage.consolation ? `${stage.consolation} Crédito parcial: +${CONSOLATION_FUNDS} de verba.` : null,
    failureLesson: `Dados de falha: na próxima tentativa, o risco de ${SYSTEM_NAMES[stage.system]} cai ${pct(FAILURE_DATA_BONUS)}, e a agência ganhou +1 de tecnologia. Falhar ensina: é o passo "Verify" do ciclo de projeto da NASA.`,
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
      result.learning = `Requisito descoberto: esta missão pede ciência ≥ ${n.science} e comunicação ≥ ${n.comms}. Os números passam a aparecer na oficina e a travar o lançamento. Errar ensinou: +1 de tecnologia.`;
      pushLog(state, `${p.name} descobriu os requisitos de "${MISSIONS[missionId].name}" ao errar.`, p.id);
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
  pushLog(state, `${p.name}: missão "${MISSIONS[missionId].name}" ${result.success ? 'CUMPRIDA' : 'não atingiu os requisitos na operação'}.`, p.id);
  p.lastResult = result;
  p.flight = null;
  // Cumprir o degrau passa a mirar o próximo; falhar mantém o degrau atual. As blueprints vêm dos fornecedores.
  retarget(state, p);
  state.screen = 'report';
  return null;
}
