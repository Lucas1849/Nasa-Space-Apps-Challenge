// Estado central do jogo. A UI lê daqui; a simulação calcula a partir daqui.
// Cada decisão do jogador altera este objeto e tem consequência nos recursos.
// ATENÇÃO: valores iniciais FICTÍCIOS.
import { yearOf } from '../data/history.js';

export const STARTING_FUNDS = 60;
export const SANDBOX_FUNDS = 999;
export const SANDBOX_TECH = 99;
export const ANNUAL_BUDGET = 15;     // verba que toda agência recebe no início de cada turno (cada rodada = 1 ano)
export const TECH_PER_TURN = 1;      // tecnologia base por turno (IDEIA.md seção 5)
export const RECORD_BONUS = 20;      // prestígio por ser o primeiro do mundo numa missão
export const BAILOUT_FUNDS = 30;     // socorro de emergência (sem eliminação)
export const BAILOUT_TECH_COST = 2;
export const BAILOUT_LIMIT = 15;     // só pode pedir socorro com menos verba que isso

export const emptySpacecraft = () => ({
  instruments: [],     // ids de data/instruments.js (pode repetir)
  parts: [],           // ids de data/parts.js (pode repetir)
  launcherId: null,    // ver data/launchers.js
  orbitId: null,       // ver data/orbits.js
  flown: false,        // peças que já voaram (missão abortada) revendem pela metade
});

export function createPlayer(id, name, missionId = null) {
  return {
    id,
    name,
    objectiveId: null,     // carta de vitória (data/objectives.js)
    missionId,             // missão atual (data/missions.js); null = escolhendo
    position: 0,           // casa atual do tabuleiro
    funds: STARTING_FUNDS, // verba disponível
    tech: 0,               // nível de tecnologia (desbloqueia peças); o 1º turno já soma +1
    discount: 0,           // % de desconto na próxima compra (evento ou milestone)
    shields: 0,            // proteções contra falha no voo
    milestones: [],        // `${missionId}:${milestoneId}` já concedidos (bônus só uma vez por missão)
    completed: [],         // [{ missionId, year, science }] missões cumpridas
    bestStage: {},         // { missionId: etapas superadas no melhor voo } (etapas contam)
    failureData: {},       // { sistema: n } falhas anteriores; reduzem o risco desse sistema
    buildings: { lab: 0, factory: 0, control: 0, sponsor: 0 }, // nível de cada prédio
    spacecraft: emptySpacecraft(),
    flight: null,          // voo em andamento (sim/actions.js)
    launches: 0,           // quantas vezes já lançou
    lastResult: null,      // último resultado de missão (relatório)
    // Controle do turno
    rolled: false,         // já jogou o dado neste turno
    flightAdvanced: false, // já avançou o voo neste turno
    launchedThisTurn: false,
    bailouts: 0,
  };
}

export function createInitialState() {
  return {
    screen: 'setup',       // setup -> board <-> workshop -> flight -> report -> board ... -> gameover
    sandbox: false,        // modo sandbox: sem tabuleiro, verba livre, só a oficina
    players: [],
    turn: 0,               // índice do jogador da vez
    round: 1,              // rodada = ano (data/history.js)
    log: [],               // mensagens recentes (tabuleiro, compras, lançamentos)
    records: {},           // { missionId: { playerId, year } } primeiro do mundo em cada missão
    lots: {},              // { tileId: { ownerId, buildingId } } prédios no tabuleiro
    pendingTile: null,     // { tileId, kind: 'build' | 'use' } decisão de terreno do jogador da vez
    winners: [],           // ids dos vencedores (fim da partida)
    gameOver: false,
  };
}

export const currentPlayer = (state) => state.players[state.turn];

export function pushLog(state, text) {
  state.log.unshift(state.sandbox ? text : `[${yearOf(state.round)}] ${text}`);
  if (state.log.length > 14) state.log.length = 14;
}
