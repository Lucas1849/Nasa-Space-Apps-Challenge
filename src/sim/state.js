// Estado central do jogo. A UI lê daqui; a simulação calcula a partir daqui.
// Cada decisão do jogador altera este objeto e tem consequência nos recursos.
// ATENÇÃO: valores iniciais FICTÍCIOS.
import { yearOf } from '../data/history.js';

export const STARTING_FUNDS = 20;
export const SANDBOX_FUNDS = 999;
export const SANDBOX_TECH = 99;
export const YEARLY_BUDGET = 20;   // "Ano novo": verba de cada agência no início de cada ano (3 rodadas)
export const TECH_PER_YEAR = 1;      // tecnologia base por ano (+ Laboratório)
export const BAILOUT_FUNDS = 30;     // socorro de emergência (sem eliminação)
export const BAILOUT_TECH_COST = 2;
export const BAILOUT_LIMIT = 15;     // só pode pedir socorro com menos verba que isso
export const SPY_COST = 12;          // espionagem: uma vez por ano
export const REHEARSAL_COST = 5;     // ensaio em solo: diz em palavras se a nave atende aos mínimos escondidos

export const emptySpacecraft = () => ({
  instruments: [],     // ids de data/instruments.js (pode repetir)
  parts: [],           // ids de data/parts.js (pode repetir)
  launcherId: null,    // ver data/launchers.js
  orbitId: null,       // ver data/orbits.js
});

export function createPlayer(id, name, missionId = null) {
  return {
    id,
    name,
    bot: false,            // rival automático do modo solo (segue o calendário histórico)
    side: null,            // 'usa' | 'ussr' (data/sides.js)
    step: 0,               // degraus da escada já cumpridos
    missionId,             // missão atual = degrau atual da escada
    position: 0,           // casa atual do tabuleiro
    funds: STARTING_FUNDS, // verba disponível
    tech: 0,               // nível de tecnologia (desbloqueia peças); o 1º ano já soma +1
    unlocked: [],          // ids de peças e lançadores já descobertos (sim/resources.js); o kit do degrau entra ao começar o degrau
    hideNeeds: false,      // jogo normal: mínimos de ciência e comunicação da missão escondidos (sim/needs.js)
    knownNeeds: {},        // { missionId: true } missões cujos mínimos já foram descobertos
    rehearsedThisTurn: false, // 1 ensaio em solo por turno
    launcherTech: 0,       // ajuste do lado no nível exigido pelos lançadores
    discount: 0,           // % de desconto na próxima compra (evento ou degrau)
    shields: 0,            // proteções contra falha no voo
    launchRisk: 0,         // risco extra na próxima subida (dilema "lançar assim mesmo")
    milestones: [],        // `${missionId}:${milestoneId}` já concedidos (bônus só uma vez por missão)
    completed: [],         // [{ missionId, year, science }] degraus cumpridos
    bestStage: {},         // { missionId: etapas superadas no melhor voo } (etapas contam)
    failureData: {},       // { sistema: n } falhas anteriores; reduzem o risco desse sistema
    buildings: { lab: 0, factory: 0, control: 0, sponsor: 0 }, // nível de cada prédio
    intel: {},             // { rivalId: { year, ... } } o que o espião descobriu
    lastSpyYear: null,
    spacecraft: emptySpacecraft(),
    flight: null,          // voo em andamento (sim/actions.js)
    launches: 0,
    lastResult: null,      // último resultado de missão (relatório)
    // Controle do turno
    rolled: false,         // já andou no tabuleiro neste turno
    flightAdvanced: false, // já avançou o voo neste turno
    launchedThisTurn: false,
    bailouts: 0,
  };
}

export function createInitialState() {
  return {
    screen: 'setup',       // setup -> handoff -> board <-> workshop -> flight -> report -> ... -> gameover
    sandbox: false,        // modo sandbox: sem tabuleiro, verba livre, só a oficina
    players: [],           // inclui o bot do modo solo (bot: true)
    turn: 0,               // índice do jogador da vez
    round: 1,              // 3 rodadas = 1 ano (data/history.js)
    log: [],               // [{ text, who }] who = id do jogador (privado) ou null (público)
    sideFirsts: {},        // { `${lado}:${missionId}`: playerId } primeiro do lado em cada degrau
    lots: {},              // { tileId: { ownerId, buildingId } } prédios no tabuleiro
    dice: null,            // [a, b] dados rolados aguardando escolha
    pendingTile: null,     // { tileId, kind: 'build' | 'use' | 'spy' } decisão de casa
    pendingDilemma: null,  // { id } carta de dilema aguardando escolha
    outcome: null,         // retorno imediato ao jogador: { playerId, title, choice, changes, notes, lesson }
    winners: [],
    gameOver: false,
  };
}

export const currentPlayer = (state) => state.players[state.turn];
export const humans = (state) => state.players.filter((p) => !p.bot);

// Diário. Com rival escondido, cada mensagem é privada do jogador (who) ou pública (who = null).
export function pushLog(state, text, who = null) {
  state.log.unshift({ text: state.sandbox ? text : `[${yearOf(state.round)}] ${text}`, who });
  if (state.log.length > 60) state.log.length = 60;
}
