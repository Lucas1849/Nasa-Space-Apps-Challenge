// Simulador sem interface: joga partidas inteiras só com a API da simulação (src/sim) e mede o ritmo do jogo:
// em que rodada sai o 1º lançamento, em que rodada e ano cada degrau é cumprido e quem vence (jogador x bot).
// Serve para CALIBRAR o balanceamento com números em vez de chute (plano em etapas, Etapa 0 e 7).
//
// Uso:  node scripts/simulate.mjs [partidas=300] [política=greedy|random] [semente=1] [--json]
//   greedy: escolhe o dado que cai na casa mais útil e constrói o Laboratório; greedy-nolab: igual, mas NUNCA constrói
//   o Laboratório (serve para medir quanto o Laboratório vale com o mesmo jogador); random: dado ao acaso.
//
// A política é de PROPÓSITO simples (um jogador "razoável", não um especialista): compra o kit do degrau,
// lança quando o checklist fecha e não usa o ensaio nem a espionagem. Os valores do jogo são FICTÍCIOS.
// Com `export` de `playGame`, os testes e outros scripts podem reaproveitar a mesma política.
import { pathToFileURL } from 'node:url';
import { createInitialState, currentPlayer } from '../src/sim/state.js';
import * as sim from '../src/sim/actions.js';
import { checkDesign } from '../src/sim/simulate.js';
import { MISSIONS } from '../src/data/missions.js';
import { LAUNCHERS } from '../src/data/launchers.js';
import { TILES, atWorkshopTile } from '../src/board/board.js';
import { CATALOG, priceFor } from '../src/sim/resources.js';
import { missingKit } from '../src/sim/suppliers.js';
import { upgradeCost } from '../src/data/buildings.js';
import { MAX_ROUNDS, yearOf } from '../src/data/history.js';

// Gerador de números repetível: a mesma semente sempre dá a mesma partida.
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Quanto vale parar numa casa, do ponto de vista de um jogador razoável. `wantsLab`: a política constrói o Laboratório.
function tileScore(tile, p, wantsLab) {
  switch (tile.type) {
    case 'tech': return 4;
    case 'funds': return tile.funds > 0 ? 3 : -2;
    case 'shop': return missingKit(p).length ? 5 : 1; // fornecedor: vale muito enquanto falta blueprint do kit
    case 'workshop': return missingKit(p).length ? 1 : 5; // oficina: vale quando já há blueprint para montar
    case 'catchup': return 2;
    case 'lot': return wantsLab && !p.buildings.lab && p.funds >= upgradeCost(0) + 10 ? 4 : 0;
    case 'repair': return 1;
    case 'event': return 1;
    case 'start': return 1;
    default: return 0; // espião e o resto
  }
}

function chooseDie(state, p, policy, rng) {
  if (policy === 'random') return Math.floor(rng() * 2);
  const score = (steps) => tileScore(TILES[(p.position + steps) % TILES.length], p, policy === 'greedy');
  return score(state.dice[0]) >= score(state.dice[1]) ? 0 : 1;
}

// Compra as peças do kit do degrau e escolhe o foguete, só se sobrar verba para lançar.
function buildShip(state, p) {
  const mission = MISSIONS[p.missionId];
  const launcherIds = mission.kit.filter((id) => LAUNCHERS[id]);
  const partIds = mission.kit.filter((id) => CATALOG[id]);
  for (const id of launcherIds) if (sim.chooseLauncher(state, id) === null) break;
  const launchCost = (LAUNCHERS[p.spacecraft.launcherId] || { cost: 0 }).cost;
  const onShip = () => [...p.spacecraft.instruments, ...p.spacecraft.parts];
  const buy = (id) => {
    if (p.funds - priceFor(p, id) < launchCost) return false; // guarda verba para o lançamento
    return sim.buyItem(state, id) === null;
  };
  // 1) Uma de cada peça do kit. Os mínimos de ciência e comunicação são escondidos, então o checklist já
  //    "fecha" com a nave vazia: o jogador razoável confia no kit, não no checklist.
  for (const id of partIds) if (!onShip().includes(id) && !buy(id)) return;
  // 2) Se o checklist (agora com os números descobertos, depois de errar) ainda não fecha, repete peças.
  for (let pass = 0; pass < 3 && !checkDesign(p).ok; pass++) {
    for (const id of partIds) {
      if (checkDesign(p).ok) return;
      if (!buy(id)) return;
    }
  }
}

// Todas as peças do kit do degrau já estão na nave?
function kitComplete(p) {
  const onShip = [...p.spacecraft.instruments, ...p.spacecraft.parts];
  return MISSIONS[p.missionId].kit.filter((id) => CATALOG[id]).every((id) => onShip.includes(id));
}

// Sonda: numa CÓPIA do estado, uma nave vazia (só o foguete pequeno) conseguiria lançar agora?
// Os mínimos de ciência e comunicação são escondidos e não travam, então basta ter a verba do foguete.
function probeEmptyLaunch(state, rng) {
  const copy = structuredClone(state);
  const q = currentPlayer(copy);
  if (q.spacecraft.instruments.length || q.spacecraft.parts.length) return false;
  sim.chooseLauncher(copy, 'small');
  return sim.launch(copy, rng) === null;
}

function playTurn(state, rng, policy, ctx) {
  const p = currentPlayer(state);
  // 1. Andar
  if (sim.rollDice(state, rng) === null) sim.moveBy(state, chooseDie(state, p, policy, rng), rng);
  if (state.pendingDilemma) sim.chooseDilemma(state, Math.floor(rng() * 2), rng);
  if (state.pendingTile) {
    const kind = state.pendingTile.kind;
    if (kind === 'build' && policy === 'greedy' && !p.buildings.lab && p.funds >= upgradeCost(0) + 10) sim.buildOnLot(state, 'lab');
    else if (kind === 'use' && p.funds >= 12) sim.useRivalBuilding(state, rng);
    else if (kind === 'supplier') {
      // compra, nesta visita, as blueprints do kit que faltam (a 1ª é grátis); ignora as surpresas
      const need = new Set(missingKit(p));
      for (const id of [...state.pendingTile.offers]) if (need.has(id) && state.pendingTile) sim.buyBlueprint(state, id);
      if (state.pendingTile) sim.skipTile(state);
    }
    else sim.skipTile(state);
  }
  // 2. A nave: voar, ou montar e lançar
  if (p.flight) {
    if (!p.flightAdvanced && sim.advanceFlight(state, rng) === null && p.flight?.pending) sim.chooseStageOption(state, 0, rng);
  } else if (p.missionId) {
    if (p.funds < 10 && p.bailouts < 2) sim.requestBailout(state); // pouca verba: pede socorro de emergência
    if (ctx.emptyLaunchTurn1 == null) ctx.emptyLaunchTurn1 = probeEmptyLaunch(state, rng); // brecha: nave só com o foguete
    if (atWorkshopTile(p)) buildShip(state, p);
    // Um jogador razoável não lança com peça do kit faltando (isso é de propósito: mede o ritmo "normal").
    if (atWorkshopTile(p) && kitComplete(p) && sim.launch(state, rng) === null && ctx.firstLaunchRound == null) ctx.firstLaunchRound = state.round;
  }
  // 3. Subir o Laboratório quando sobra verba
  if (policy === 'greedy' && p.buildings.lab && p.buildings.lab < 3 && p.funds > upgradeCost(p.buildings.lab) + 40) sim.upgradeBuilding(state, 'lab');
  return sim.endTurn(state);
}

// Joga uma partida solo (1 jogador contra o bot histórico) e devolve as medidas.
export function playGame(seed, { policy = 'greedy' } = {}) {
  const rng = seededRng(seed);
  const state = createInitialState();
  sim.startGame(state, [{ name: 'Sim' }], { rng });
  const p = state.players[0];
  const ctx = { firstLaunchRound: null, emptyLaunchTurn1: null };
  const stepRounds = [];
  let stuck = 0;
  for (let guard = 0; !state.gameOver && guard < MAX_ROUNDS * 4; guard++) {
    const stepBefore = p.step;
    const round = state.round;
    const error = playTurn(state, rng, policy, ctx);
    if (ctx.kitRound == null && p.step === 0 && !missingKit(p).length) ctx.kitRound = round; // blueprints do 1º degrau completas
    if (p.step > stepBefore) for (let s = stepBefore; s < p.step; s++) stepRounds[s] = round;
    stuck = typeof error === 'string' ? stuck + 1 : 0;
    if (stuck > 5) break; // algo travou: não fica em laço infinito
  }
  return {
    seed, side: p.side, rounds: state.round, endReason: state.endReason || (stuck > 5 ? 'travou' : 'incompleta'),
    humanWon: state.winners.includes(p.id), steps: p.step,
    firstLaunchRound: ctx.firstLaunchRound, stepRounds,
    stepYears: p.completed.map((c) => c.year), tech: p.tech, funds: p.funds, launches: p.launches, bailouts: p.bailouts,
    lab: p.buildings.lab, emptyLaunchTurn1: ctx.emptyLaunchTurn1, kitRound: ctx.kitRound ?? null,
  };
}

const quantile = (values, q) => {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.floor(q * v.length))];
};
const pctOf = (n, total) => (total ? `${Math.round((100 * n) / total)}%` : '-');
const fmt = (x) => (x == null ? '-' : x);

export function summarize(results) {
  const groups = { todos: results, EUA: results.filter((r) => r.side === 'usa'), URSS: results.filter((r) => r.side === 'ussr') };
  const out = {};
  for (const [name, rs] of Object.entries(groups)) {
    if (!rs.length) continue;
    const row = {
      partidas: rs.length,
      venceu_do_bot: pctOf(rs.filter((r) => r.humanWon).length, rs.length),
      completou_a_escada: pctOf(rs.filter((r) => r.endReason === 'ladder' && r.steps >= 4).length, rs.length),
      lancamento_1: { p10: quantile(rs.map((r) => r.firstLaunchRound), 0.1), mediana: quantile(rs.map((r) => r.firstLaunchRound), 0.5), p90: quantile(rs.map((r) => r.firstLaunchRound), 0.9) },
      degraus: [0, 1, 2, 3].map((i) => ({
        degrau: i + 1,
        cumpriu: pctOf(rs.filter((r) => r.stepRounds[i] != null).length, rs.length),
        rodada_mediana: quantile(rs.map((r) => r.stepRounds[i]), 0.5),
        ano_mediano: quantile(rs.map((r) => r.stepYears[i]), 0.5),
      })),
      sucesso_por_lancamento: `${Math.round((100 * rs.reduce((s, r) => s + r.steps, 0)) / Math.max(1, rs.reduce((s, r) => s + r.launches, 0)))}%`,
      nave_vazia_no_turno_1: pctOf(rs.filter((r) => r.emptyLaunchTurn1).length, rs.length),
      tec_final_mediana: quantile(rs.map((r) => r.tech), 0.5),
      laboratorio_medio: (rs.reduce((s, r) => s + r.lab, 0) / rs.length).toFixed(1),
      socorros_medios: (rs.reduce((s, r) => s + r.bailouts, 0) / rs.length).toFixed(1),
    };
    out[name] = row;
  }
  return out;
}

function printReport(summary, { games, policy, seed }) {
  console.log(`Simulação: ${games} partidas solo, política "${policy}", semente ${seed}, teto de ${MAX_ROUNDS} rodadas (${yearOf(1)}–${yearOf(MAX_ROUNDS)})`);
  for (const [name, r] of Object.entries(summary)) {
    console.log(`\n== ${name} (${r.partidas} partidas) ==`);
    console.log(`  vence o bot: ${r.venceu_do_bot} | completa a escada: ${r.completou_a_escada}`);
    console.log(`  1º lançamento (rodada): p10 ${fmt(r.lancamento_1.p10)} | mediana ${fmt(r.lancamento_1.mediana)} | p90 ${fmt(r.lancamento_1.p90)}`);
    for (const d of r.degraus) console.log(`  degrau ${d.degrau}: cumprido em ${d.cumpriu} das partidas | rodada mediana ${fmt(d.rodada_mediana)} | ano mediano ${fmt(d.ano_mediano)}`);
    console.log(`  degraus cumpridos por lançamento (sucesso): ${r.sucesso_por_lancamento}`);
    console.log(`  nave VAZIA (só o foguete) lançável no turno 1: ${r.nave_vazia_no_turno_1} das partidas`);
    console.log(`  tecnologia final (mediana): ${fmt(r.tec_final_mediana)} | Laboratório médio: ${r.laboratorio_medio} | socorros médios: ${r.socorros_medios}`);
  }
}

// Só roda como script (não quando outro arquivo importa `playGame`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const games = Number(args[0]) || 300;
  const policy = ['random', 'greedy-nolab'].includes(args[1]) ? args[1] : 'greedy';
  const seed = Number(args[2]) || 1;
  const results = Array.from({ length: games }, (_, i) => playGame(seed * 100000 + i, { policy }));
  const summary = summarize(results);
  if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else printReport(summary, { games, policy, seed });
}
