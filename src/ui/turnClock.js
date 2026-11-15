// Relógio do turno na tela: conta o tempo da partida (state.turnSeconds) a partir da primeira vez que o tabuleiro do jogador da vez aparece
// (no mesmo aparelho, depois do "Sou eu"). Quando zera, main.js chama a ação de tempo esgotado
// (sim/turnTimer.js), que termina o turno. Atualiza só o próprio número a cada tique, sem redesenhar a tela.
import { icon } from './icons.js';
import { timerApplies, turnSecondsOf } from '../sim/turnTimer.js';

const GAME_SCREENS = ['board', 'workshop', 'flight', 'report'];
let clockKey = null;   // `rodada:vez` do turno que está sendo contado
let startedAt = 0;
let firedKey = null;   // turno cujo tempo esgotado já foi disparado (dispara uma vez só)

export const clockActive = (state) => timerApplies(state) && GAME_SCREENS.includes(state.screen);

// Segundos que faltam. O turno começa a contar na primeira vez que é consultado.
export function secondsLeft(state, now = Date.now()) {
  const key = `${state.round}:${state.turn}`;
  if (key !== clockKey) { clockKey = key; startedAt = now; }
  return Math.max(0, turnSecondsOf(state) - (now - startedAt) / 1000);
}

const fmt = (s) => { const t = Math.ceil(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const level = (s) => (s <= 10 ? 'danger' : s <= 30 ? 'warn' : '');

function paint(node, s, total) {
  node.className = `turn-clock ${level(s)}`.trim();
  node.querySelector('.tc-num').textContent = fmt(s);
  node.querySelector('.tc-fill').style.width = `${(s / total) * 100}%`;
  node.setAttribute('aria-label', `Tempo do turno: ${fmt(s)}`);
}

// Elemento do relógio para o HUD (ui/components.js). Null quando a partida não tem relógio.
export function turnClock(state) {
  if (!clockActive(state)) return null;
  const node = document.createElement('div');
  node.setAttribute('role', 'timer');
  node.title = `Cada agência tem ${turnSecondsOf(state)} s por turno. Quando o tempo acaba, o turno termina sozinho (o tempo se escolhe antes da partida).`;
  const num = document.createElement('span'); num.className = 'tc-num num';
  const bar = document.createElement('span'); bar.className = 'tc-bar';
  const fill = document.createElement('span'); fill.className = 'tc-fill';
  bar.appendChild(fill);
  [icon('hourglass', { size: 16 }), num, bar].forEach((child) => node.appendChild(child));
  const s = secondsLeft(state);
  node.className = `turn-clock ${level(s)}`.trim();
  num.textContent = fmt(s);
  if (fill.style) fill.style.width = `${(s / turnSecondsOf(state)) * 100}%`;
  return node;
}

// Chamado por main.js a cada fração de segundo: atualiza o número e, no zero, avisa uma vez.
export function tickClock(state, onTimeout) {
  if (!clockActive(state)) return;
  const s = secondsLeft(state);
  document.querySelectorAll('.turn-clock').forEach((n) => paint(n, s, turnSecondsOf(state)));
  if (s <= 0 && firedKey !== clockKey) { firedKey = clockKey; onTimeout(); }
}
