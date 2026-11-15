// Ponto de entrada: cria o estado, liga as ações à UI e re-renderiza a cada mudança.
import { createInitialState } from './sim/state.js';
import * as game from './sim/actions.js';
import { SCREENS } from './ui/screens.js';
import { rocketSvg } from './ui/icons.js';
import { setGuide, guideOn } from './ui/prefs.js';
import { endTurnBlocker } from './ui/guide.js';
import { trackTurn, markTurnEnd, resetSummaries, turnSummaryModal } from './ui/summary.js';

const app = document.getElementById('app');
let state = createInitialState();

let lastScreen = null;
let lastTurn = null;
// Estado só da interface (não entra no jogo): qual janela está aberta por cima da tela.
const ui = { modal: null };

// Redesenha a tela. Só volta ao topo e anima a entrada quando a TELA (ou o jogador da vez) muda;
// num clique dentro da mesma tela (ex.: comprar peça na oficina) a rolagem fica onde estava.
function render() {
  const changed = state.screen !== lastScreen || state.turn !== lastTurn;
  const scrollY = window.scrollY;
  trackTurn(state);
  if (state.screen !== 'board' && state.screen !== 'report' && state.screen !== 'flight') ui.modal = null;
  const node = SCREENS[state.screen](state, actions);
  if (changed) node.classList.add('enter');
  if (ui.modal === 'turnSummary') node.appendChild(turnSummaryModal(state, actions));
  app.replaceChildren(node);
  if (ui.modal) node.querySelector('.modal .primary')?.focus();
  window.scrollTo(0, changed ? 0 : scrollY);
  lastScreen = state.screen;
  lastTurn = state.turn;
}

// Toda ação passa por aqui: executa, mostra erro (se houver) e redesenha.
function wrap(fn, after) {
  return (...args) => {
    const error = fn(state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
    if (!error && after) after();
  };
}

const actions = {
  go: wrap((s, screen) => { s.screen = screen; }),
  startGame: wrap((s, ...args) => { resetSummaries(); ui.modal = null; return game.startGame(s, ...args); }),
  rollDice: wrap(game.rollDice),
  moveBy: wrap(game.moveBy),
  chooseDilemma: wrap(game.chooseDilemma),
  spyOn: wrap(game.spyOn),
  buyItem: wrap(game.buyItem),
  sellItem: wrap(game.sellItem),
  chooseLauncher: wrap(game.chooseLauncher),
  chooseOrbit: wrap(game.chooseOrbit),
  chooseMission: wrap(game.chooseMission),
  buildOnLot: wrap(game.buildOnLot),
  useRivalBuilding: wrap(game.useRivalBuilding),
  skipTile: wrap(game.skipTile),
  upgradeBuilding: wrap(game.upgradeBuilding),
  requestBailout: wrap(game.requestBailout),
  launch: wrap(game.launch, showLaunchOverlay),
  advanceFlight: wrap(game.advanceFlight),
  // Atalho de depuração no console: rola e anda com o primeiro dado.
  rollAndMove: wrap(game.rollAndMove),
  chooseStageOption: wrap(game.chooseStageOption),
  // Passar a vez abre primeiro o "Resumo do turno"; o turno só termina em confirmEndTurn.
  endTurn: wrap((s) => {
    if (s.sandbox) return game.endTurn(s);
    const blocker = endTurnBlocker(s);
    if (blocker) return blocker;
    ui.modal = 'turnSummary';
    return null;
  }),
  confirmEndTurn: wrap((s) => {
    ui.modal = null;
    markTurnEnd(s);
    return game.endTurn(s);
  }),
  closeModal: wrap(() => { ui.modal = null; }),
  toggleGuide: wrap(() => { setGuide(!guideOn()); }),
  setGuide: (on) => setGuide(on),
  newGame: wrap(() => { state = createInitialState(); resetSummaries(); ui.modal = null; }),
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

// Esc fecha o resumo do turno (volta ao turno, sem passar a vez).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.modal) actions.closeModal();
});

// Exposto para depuração no console do navegador.
window.__game = { get state() { return state; }, actions };

render();
