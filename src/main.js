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
function wrap(fn) {
  return (...args) => {
    const error = fn(state, ...args);
    if (typeof error === 'string') showToast(error);
    render();
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
  launch: wrap(game.launch),
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

// Exposto para depuração no console do navegador.
window.__game = { get state() { return state; }, actions };

render();
