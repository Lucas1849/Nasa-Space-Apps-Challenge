// Ponto de entrada: cria o estado, liga as ações à UI e re-renderiza a cada mudança.
import { createInitialState } from './sim/state.js';
import * as game from './sim/actions.js';
import { SCREENS } from './ui/screens.js';
import { rocketSvg } from './ui/icons.js';
import { setGuide, guideOn } from './ui/prefs.js';
import { endTurnBlocker } from './ui/guide.js';
import { trackTurn, markTurnEnd, resetSummaries } from './ui/summary.js';
import { createNetworkController } from './net/sync.js';
import { waitScreen } from './ui/wait.js';
import { spectateScreen } from './ui/spectate.js';
import { workshopScreen } from './ui/workshop.js';
import { yearOverlayKey, yearOverlayNode, YEAR_OVERLAY_MS, YEAR_OVERLAY_REDUCED_MS } from './ui/yearOverlay.js';

const app = document.getElementById('app');
let state = createInitialState();

let lastScreen = null;
let lastTurn = null;
let lastYearShown = null; // última virada de ano já animada (`round:playerId`), para não repetir a cada clique
// Qual tela de espectador olhar fora da sua vez (online): tabuleiro público ou a SUA oficina.
// É só local (nunca entra no estado sincronizado); volta a 'board' quando chega a sua vez.
let spectateView = 'board';
let lastSpectateView = null;

// Multiplayer remoto (opcional, ver docs/PLANO-P2P.md). Sem rede, nada muda: netWrap()
// se comporta como wrap() normal. `name` é a chave em `networkedActions`, usada para o
// host aplicar a ação que chegou do cliente (mesma função que o botão chamaria local).
// `endTurn` entra com a mesma checagem de bloqueio de hoje, para o host não pular o aviso.
// Lista fechada (não é `{ ...game }`): uma mensagem de rede só pode disparar uma destas
// ações de gameplay, nunca outra função exportada por sim/actions.js (startGame, helpers
// como useFeeFor etc., que têm outra assinatura ou efeitos que não fazem sentido vindos
// de um cliente).
const NETWORKED_ACTION_NAMES = [
  'rollDice', 'moveBy', 'chooseDilemma', 'spyOn', 'buyItem', 'sellItem', 'chooseLauncher',
  'chooseOrbit', 'chooseMission', 'buildOnLot', 'useRivalBuilding', 'skipTile',
  'upgradeBuilding', 'requestBailout', 'rehearse', 'launch', 'advanceFlight',
  'chooseStageOption',
];
const networkedActions = Object.fromEntries(NETWORKED_ACTION_NAMES.map((name) => [name, game[name]]));
networkedActions.endTurn = (s) => {
  if (s.sandbox) return game.endTurn(s);
  const blocker = endTurnBlocker(s);
  if (blocker) return blocker;
  markTurnEnd(s);
  return game.endTurn(s);
};
const net = createNetworkController({
  actionsMap: networkedActions,
  getState: () => state,
  setState: (s) => { state = s; },
  render: () => render(),
  showError: (text) => showToast(text),
  // O lobby é uma tela local (state.screen) que nunca entra no estado sincronizado:
  // quando o host inicia, o state novo chega com a tela do jogo e todo mundo sai dele.
  enterLobby: () => { state.screen = 'lobby'; render(); },
  exitToSetup: () => { state.screen = 'setup'; render(); },
});

// Redesenha a tela. Só volta ao topo e anima a entrada quando a TELA (ou o jogador da vez) muda;
// num clique dentro da mesma tela (ex.: comprar peça na oficina) a rolagem fica onde estava.
function render() {
  const changed = state.screen !== lastScreen || state.turn !== lastTurn || spectateView !== lastSpectateView;
  const scrollY = window.scrollY;
  trackTurn(state);
  // Partida online (Fase 4 do PLANO-SALAS.md): cada um vê só a própria agência.
  // Fora da sua vez: tela de espectador — o palco público do jogador da vez (dados, casas,
  // o que ele fez) mais os SEUS painéis (recursos, objetivos, diário e a sua oficina em modo
  // leitura), sem os dados sigilosos do rival. O fim de jogo é público e aparece para todos.
  // Na sua vez: a tela de troca do hot-seat é pulada — você já está no seu dispositivo.
  let waiting = false;
  if (net.isPlaying() && state.screen !== 'gameover') {
    if (state.turn !== net.getMyPlayerId()) waiting = true;
    else { spectateView = 'board'; if (state.screen === 'handoff') state.screen = 'board'; }
  }
  let node;
  if (waiting) {
    const me = state.players[net.getMyPlayerId()] ?? null;
    if (!me) node = waitScreen(state, net.getMyPlayerId());
    else if (spectateView === 'workshop') node = workshopScreen(state, spectatorActions, me, { readOnly: true });
    else node = spectateScreen(state, me, spectatorActions);
  } else {
    node = SCREENS[state.screen](state, actions);
  }
  if (changed) node.classList.add('enter');
  app.replaceChildren(node);
  window.scrollTo(0, changed ? 0 : scrollY);
  lastScreen = state.screen;
  lastTurn = state.turn;
  lastSpectateView = spectateView;
  if (waiting) return; // na espera não há virada de ano a animar (os ganhos são de quem joga)
  // Virada de ano: anima uma vez, só no tabuleiro do jogador da vez (os ganhos são secretos: nunca na tela de troca).
  const yearKey = yearOverlayKey(state, lastYearShown);
  if (yearKey) {
    lastYearShown = yearKey;
    showYearOverlay(state.yearChange);
  }
}

// Toda ação passa por aqui: executa, mostra erro (se houver) e redesenha. Puramente
// local: nunca transmite nada pela rede (ver docs/PLANO-P2P.md — navegação de tela,
// dicas etc. ficam sempre só no dispositivo de quem clicou).
function wrap(fn, after) {
  return (...args) => {
    const error = fn(state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (!error && after) after();
  };
}

// Como wrap(), mas para ações de gameplay que precisam viajar pela rede quando há uma
// sala online: sem rede, roda local igual a wrap(). Como host, net.dispatch() já aplica a
// ação e devolve o erro de volta (o toast e o after() funcionam igual ao modo local). Como
// cliente, só manda a ação pro host e não sabe ainda se vai dar certo — por isso não
// mostra toast nem chama after() aqui; o after() só roda para quem sabe o resultado na
// hora (local ou host). `name` é a chave correspondente em `networkedActions`.
function netWrap(name, after) {
  return (...args) => {
    const result = net.dispatch(name, args);
    if (result) {
      if (typeof result.error === 'string') showToast(result.error);
      if (!result.error && after) after();
      return;
    }
    const error = networkedActions[name](state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (!error && after) after();
  };
}

// Para as duas ações locais que recriam o jogo inteiro (começar partida, nova partida):
// como host, precisa mandar o `state` novo pros clientes também, já que eles não "pedem"
// essa ação (não passa por netWrap/dispatch).
function wrapAndSync(fn) {
  return (...args) => {
    const error = fn(state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (!error && net.isHost()) net.broadcastState();
  };
}

const actions = {
  go: wrap((s, screen) => { s.screen = screen; }),
  startGame: wrapAndSync((s, ...args) => { resetSummaries(); lastYearShown = null; return game.startGame(s, ...args); }),
  rollDice: netWrap('rollDice'),
  moveBy: netWrap('moveBy'),
  chooseDilemma: netWrap('chooseDilemma'),
  spyOn: netWrap('spyOn'),
  buyItem: netWrap('buyItem'),
  sellItem: netWrap('sellItem'),
  chooseLauncher: netWrap('chooseLauncher'),
  chooseOrbit: netWrap('chooseOrbit'),
  chooseMission: netWrap('chooseMission'),
  buildOnLot: netWrap('buildOnLot'),
  useRivalBuilding: netWrap('useRivalBuilding'),
  skipTile: netWrap('skipTile'),
  upgradeBuilding: netWrap('upgradeBuilding'),
  requestBailout: netWrap('requestBailout'),
  rehearse: netWrap('rehearse'),
  launch: netWrap('launch', showLaunchOverlay),
  advanceFlight: netWrap('advanceFlight'),
  // Atalho de depuração no console: rola e anda com o primeiro dado.
  rollAndMove: wrap(game.rollAndMove),
  chooseStageOption: netWrap('chooseStageOption'),
  // Passar a vez é direto, sem janela de confirmação: o que aconteceu já apareceu na hora (cartão de
  // resultado no tabuleiro) e o "Desde o seu último turno" recapitula no começo da próxima vez.
  endTurn: netWrap('endTurn'),
  toggleGuide: wrap(() => { setGuide(!guideOn()); }),
  setGuide: (on) => setGuide(on),
  newGame: wrapAndSync(() => { state = createInitialState(); resetSummaries(); lastYearShown = null; }),
  // Sala online (ver docs/PLANO-SALAS.md). A tela só chama estas ações; erros viram
  // toast aqui, e o sucesso leva ao lobby (enterLobby, acima) sem a tela se preocupar.
  hostOnline: async (count) => {
    try { await net.host(count); } catch (err) {
      showToast(err?.message || 'Não foi possível criar a sala. Confira a internet.');
    }
  },
  joinOnline: async (raw) => {
    try { await net.join(raw); } catch (err) {
      showToast(err?.type === 'peer-unavailable'
        ? 'Sala não encontrada. Confira o código com o anfitrião.'
        : err?.message || 'Não foi possível entrar na sala.');
    }
  },
  isOnline: () => net.isConnected(),
  // Tudo que a tela de lobby precisa (src/ui/lobby.js): ler a sessão e pedir mudanças.
  lobby: {
    session: () => net.getSession(),
    myPeerId: () => net.getMyPeerId(),
    hostPeerId: () => net.getHostPeerId(),
    isHost: () => net.isHost(),
    claim: (slot, name) => net.claim(slot, name),
    release: () => net.release(),
    dropSlot: (slot) => net.dropSlot(slot),
    leave: () => { net.disconnect(); state.screen = 'setup'; render(); },
    // Só o host: roda o startGame de verdade e transmite estado + agência de cada um.
    start: () => {
      const error = net.startSession((players) => {
        resetSummaries();
        lastYearShown = null;
        return game.startGame(state, players, {});
      });
      if (typeof error === 'string') showToast(error);
      render();
    },
  },
};

// Ações da tela de espectador (fora da sua vez, online). Só navegação LOCAL entre o
// tabuleiro público e a sua oficina em modo leitura, mais o botão de dicas. Nenhuma
// jogada viaja pela rede: os botões de jogada nem são renderizados/ficam desabilitados
// e, se algo escapar, a trava de turno (net.dispatch) barra do mesmo jeito.
const blockedInSpectate = () => showToast('Você poderá mexer na oficina na sua vez.');
const spectatorActions = {
  openWorkshop: () => { spectateView = 'workshop'; render(); },
  go: (screen) => { spectateView = screen === 'workshop' ? 'workshop' : 'board'; render(); },
  toggleGuide: () => { setGuide(!guideOn()); render(); },
  buyItem: blockedInSpectate,
  sellItem: blockedInSpectate,
  chooseLauncher: blockedInSpectate,
  chooseOrbit: blockedInSpectate,
  chooseMission: blockedInSpectate,
  launch: blockedInSpectate,
  rehearse: blockedInSpectate,
  newGame: blockedInSpectate,
};

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// Animação curta de lançamento (contagem + foguete) antes da tela de voo. Um clique pula.
function showLaunchOverlay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const o = document.createElement('div');
  o.className = 'launch-overlay';
  o.title = 'Clique para pular';
  o.innerHTML = `<div class="count">3</div><div class="rocket">${rocketSvg(96)}</div><div class="flame"></div>`;
  document.body.appendChild(o);
  const count = o.querySelector('.count');
  const timers = [
    setTimeout(() => { count.textContent = '2'; }, 300),
    setTimeout(() => { count.textContent = '1'; }, 600),
    setTimeout(() => { count.textContent = 'Lançar!'; }, 900),
    setTimeout(() => o.remove(), 1400),
  ];
  o.addEventListener('click', () => { timers.forEach(clearTimeout); o.remove(); });
}

// Calendário da virada de ano (ui/yearOverlay.js): ~6 s, some sozinho, um clique pula, sem confirmar.
// Com movimento reduzido mostra só o ano novo e os ganhos, sem o ano antigo saindo.
function showYearOverlay(yc) {
  document.querySelector('.year-overlay')?.remove();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const node = yearOverlayNode(yc, { reduced });
  document.body.appendChild(node);
  const timer = setTimeout(() => node.remove(), reduced ? YEAR_OVERLAY_REDUCED_MS : YEAR_OVERLAY_MS);
  node.addEventListener('click', () => { clearTimeout(timer); node.remove(); });
}

// Exposto para depuração no console do navegador.
window.__game = { get state() { return state; }, actions };

render();

// Entrar direto numa sala por link de convite (?sala=<codigo>, ver docs/PLANO-SALAS.md):
// cai no lobby da sala, sem passar pela tela de setup.
const roomCode = new URLSearchParams(window.location.search).get('sala');
if (roomCode) {
  showToast('Conectando à sala...');
  actions.joinOnline(roomCode);
}
