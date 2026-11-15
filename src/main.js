// Ponto de entrada: cria o estado, liga as ações à UI e re-renderiza a cada mudança.
import { createInitialState } from './sim/state.js';
import * as game from './sim/actions.js';
import { SCREENS } from './ui/screens.js';
import { rocketSvg } from './ui/icons.js';
import { setGuide, guideOn } from './ui/prefs.js';
import { endTurnBlocker } from './ui/guide.js';
import { trackTurn, markTurnEnd, resetSummaries } from './ui/summary.js';
import { createNetworkController } from './net/sync.js';
import { yearOverlayKey, yearOverlayNode } from './ui/yearOverlay.js';

const app = document.getElementById('app');
let state = createInitialState();

let lastScreen = null;
let lastTurn = null;
let lastYearShown = null; // última virada de ano já animada (`round:playerId`), para não repetir a cada clique

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

// Calendário da virada de ano (ui/yearOverlay.js): ~2,3 s, some sozinho, um clique pula, sem confirmar.
// Com movimento reduzido mostra só o ano novo e os ganhos, sem o ano antigo saindo.
function showYearOverlay(yc) {
  document.querySelector('.year-overlay')?.remove();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const node = yearOverlayNode(yc, { reduced });
  document.body.appendChild(node);
  const timer = setTimeout(() => node.remove(), reduced ? 1800 : 2300);
  node.addEventListener('click', () => { clearTimeout(timer); node.remove(); });
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
