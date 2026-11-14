// Estado central do jogo. A UI lê daqui; a simulação calcula a partir daqui.
// Cada decisão do jogador altera este objeto e tem consequência nos recursos.
// ATENÇÃO: valores iniciais FICTÍCIOS.

export const STARTING_FUNDS = 60;

export function createPlayer(id, name, missionId = null) {
  return {
    id,
    name,
    missionId,             // ver data/missions.js
    position: 0,           // casa atual do tabuleiro
    funds: STARTING_FUNDS, // verba disponível
    discount: 0,           // % de desconto na próxima compra (evento ou milestone)
    shields: 0,            // proteções contra falha na simulação
    milestones: [],        // ids de milestones já cumpridos
    spacecraft: {
      instruments: [],     // ids de data/instruments.js (pode repetir)
      parts: [],           // ids de data/parts.js (pode repetir)
      launcherId: null,    // ver data/launchers.js
      orbitId: null,       // ver data/orbits.js
    },
    launches: 0,           // quantas vezes já lançou
    lastResult: null,      // último resultado de sim/simulate.js
    won: false,
  };
}

export function createInitialState() {
  return {
    screen: 'setup',       // setup -> board <-> workshop -> report -> board ...
    players: [],
    turn: 0,               // índice do jogador da vez
    round: 1,
    log: [],               // mensagens recentes (tabuleiro, compras, lançamentos)
    winner: null,          // id do jogador que cumpriu a missão primeiro
  };
}

export const currentPlayer = (state) => state.players[state.turn];

export function pushLog(state, text) {
  state.log.unshift(`[Rodada ${state.round}] ${text}`);
  if (state.log.length > 12) state.log.length = 12;
}
