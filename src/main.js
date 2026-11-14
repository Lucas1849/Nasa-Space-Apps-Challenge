// Ponto de entrada: cria o estado, liga as ações à UI e re-renderiza a cada mudança.
import { createInitialState } from './sim/state.js';
import * as game from './sim/actions.js';
import { SCREENS } from './ui/screens.js';

const app = document.getElementById('app');
let state = createInitialState();

function render() {
  app.innerHTML = '';
  app.appendChild(SCREENS[state.screen](state, actions));
  window.scrollTo(0, 0);
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
  startGame: wrap(game.startGame),
  rollAndMove: wrap(game.rollAndMove),
  buyItem: wrap(game.buyItem),
  sellItem: wrap(game.sellItem),
  chooseLauncher: wrap(game.chooseLauncher),
  chooseOrbit: wrap(game.chooseOrbit),
  launch: wrap(game.launch, showLaunchOverlay),
  resolveFlight: wrap(game.resolveFlight),
  endTurn: wrap(game.endTurn),
  newGame: wrap(() => { state = createInitialState(); }),
};

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// Animação curta de lançamento (contagem + foguete) antes da tela de voo.
function showLaunchOverlay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const o = document.createElement('div');
  o.className = 'launch-overlay';
  o.innerHTML = '<div class="count">3</div><div class="rocket">🚀</div><div class="flame"></div>';
  document.body.appendChild(o);
  const count = o.querySelector('.count');
  setTimeout(() => { count.textContent = '2'; }, 500);
  setTimeout(() => { count.textContent = '1'; }, 1000);
  setTimeout(() => { count.textContent = 'Lançar!'; }, 1500);
  setTimeout(() => o.remove(), 2400);
}

// Exposto para depuração no console do navegador.
window.__game = { get state() { return state; }, actions };

render();
