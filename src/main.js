// Ponto de entrada: cria o estado, liga as ações à UI e re-renderiza a cada mudança.
import { createInitialState } from './sim/state.js';
import * as game from './sim/actions.js';
import { SCREENS } from './ui/screens.js';
import { rocketSvg } from './ui/icons.js';
import { setGuide, guideOn } from './ui/prefs.js';
import { endTurnBlocker } from './ui/guide.js';
import { trackTurn, markTurnEnd, resetSummaries } from './ui/summary.js';
import { createNetworkController } from './net/sync.js';

const app = document.getElementById('app');
let state = createInitialState();

let lastScreen = null;
let lastTurn = null;

// Multiplayer remoto (opcional, ver docs/PLANO-P2P.md). Sem rede, nada muda: netWrap()
// se comporta como wrap() normal. `name` é a chave em `networkedActions`, usada para o
// host aplicar a ação que chegou do cliente (mesma função que o botão chamaria local).
// `endTurn` entra com a mesma checagem de bloqueio de hoje, para o host não pular o aviso.
const networkedActions = {
  ...game,
  endTurn: (s) => {
    if (s.sandbox) return game.endTurn(s);
    const blocker = endTurnBlocker(s);
    if (blocker) return blocker;
    markTurnEnd(s);
    return game.endTurn(s);
  },
};
const net = createNetworkController({
  actionsMap: networkedActions,
  getState: () => state,
  setState: (s) => { state = s; },
  render: () => render(),
});

// Redesenha a tela. Só volta ao topo e anima a entrada quando a TELA (ou o jogador da vez) muda;
// num clique dentro da mesma tela (ex.: comprar peça na oficina) a rolagem fica onde estava.
function render() {
  const changed = state.screen !== lastScreen || state.turn !== lastTurn;
  const scrollY = window.scrollY;
  trackTurn(state);
  const node = SCREENS[state.screen](state, actions);
  if (changed) node.classList.add('enter');
  app.replaceChildren(node);
  window.scrollTo(0, changed ? 0 : scrollY);
  lastScreen = state.screen;
  lastTurn = state.turn;
}

// Toda ação passa por aqui: executa, mostra erro (se houver) e redesenha.
// Como host de uma sala online, também transmite o `state` novo (ver docs/PLANO-P2P.md):
// cobre ações locais que mudam o jogo todo (começar partida, nova partida), que não
// passam pelo netWrap por não terem um cliente "pedindo" a mesma ação.
function wrap(fn, after) {
  return (...args) => {
    const error = fn(state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (net.isHost()) net.broadcastState();
    if (!error && after) after();
  };
}

// Como wrap(), mas para ações de gameplay que precisam viajar pela rede quando há uma
// sala online: sem rede, roda local igual a wrap(); como host, roda local e transmite o
// `state`; como cliente, só manda a ação pro host (quem aplica é ele) e espera o `state`
// atualizado chegar. `name` é a chave correspondente em `game` (src/sim/actions.js).
function netWrap(name, after) {
  return (...args) => {
    if (net.dispatch(name, args)) {
      if (!net.isHost() && after) after();
      return;
    }
    const error = networkedActions[name](state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (!error && after) after();
  };
}

const actions = {
  go: wrap((s, screen) => { s.screen = screen; }),
  startGame: wrap((s, ...args) => { resetSummaries(); return game.startGame(s, ...args); }),
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
  newGame: wrap(() => { state = createInitialState(); resetSummaries(); }),
  // Sala online (ver docs/PLANO-P2P.md). hostOnline resolve com o id da sala para montar
  // o link de convite; joinOnline troca o `state` local pelo que vier do host.
  hostOnline: () => net.host(),
  joinOnline: (id) => net.join(id),
  isOnline: () => net.isConnected(),
  isHostOnline: () => net.isHost(),
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

// Exposto para depuração no console do navegador.
window.__game = { get state() { return state; }, actions };

render();

// Entrar direto numa sala por link (?sala=<id>, montado por hostOnline() na tela de
// setup). Ver docs/PLANO-P2P.md.
const roomId = new URLSearchParams(window.location.search).get('sala');
if (roomId) {
  showToast('Conectando à sala...');
  net.join(roomId).catch((err) => showToast(err.message || 'Não foi possível entrar na sala.'));
}
