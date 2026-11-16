// Preferências da interface guardadas no navegador. Sem imports, para qualquer módulo de UI usar.
// Se o navegador bloquear o armazenamento (aba anônima, prévia), vale o padrão e o jogo segue.

const GUIDE_KEY = 'smdg.guide';
let guide = true;
try {
  const saved = localStorage.getItem(GUIDE_KEY);
  if (saved != null) guide = saved === 'on';
} catch { /* sem armazenamento: dicas ligadas */ }

export const guideOn = () => guide;

export function setGuide(on) {
  guide = Boolean(on);
  try { localStorage.setItem(GUIDE_KEY, guide ? 'on' : 'off'); } catch { /* ignora */ }
}

// Quais abas da lateral estão fechadas. Guarda só o que foge do padrão (fica curto no armazenamento).
const PANELS_KEY = 'smdg.panels';
let collapsed = {};
try {
  const saved = localStorage.getItem(PANELS_KEY);
  if (saved) collapsed = JSON.parse(saved) || {};
} catch { /* sem armazenamento: usa o padrão de cada aba */ }

// Uma aba está aberta se o jogador não a fechou; na primeira vez vale o padrão (defaultOpen).
export const panelOpen = (id, defaultOpen = true) => (id in collapsed ? !collapsed[id] : defaultOpen);

export function setPanelOpen(id, open) {
  collapsed[id] = !open;
  try { localStorage.setItem(PANELS_KEY, JSON.stringify(collapsed)); } catch { /* ignora */ }
}

// Tema visual inspirado no sistema Íris (Tesela): 'claro' (papel quente #efeeeb) ou 'escuro' (grafite #0f1012).
const THEME_KEY = 'smdg.theme';
let theme = 'claro';
try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'escuro' || saved === 'claro') theme = saved;
} catch { /* sem armazenamento: claro por padrão */ }

function syncThemeDom() {
  if (typeof document !== 'undefined' && document.documentElement) {
    if (theme === 'escuro') document.documentElement.setAttribute('data-tema', 'escuro');
    else document.documentElement.removeAttribute('data-tema');
  }
}
syncThemeDom();

export const themeOf = () => theme;

export function toggleTheme() {
  theme = theme === 'escuro' ? 'claro' : 'escuro';
  syncThemeDom();
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignora */ }
  return theme;
}


// Tempo do relógio do turno (sim/turnTimer.js), em segundos; 0 desliga. Padrão: 120.
const TIMER_KEY = 'smdg.timer';
let timer = 120;
try {
  const saved = Number(localStorage.getItem(TIMER_KEY));
  if ([0, 60, 90, 120, 180].includes(saved) && localStorage.getItem(TIMER_KEY) != null) timer = saved;
} catch { /* sem armazenamento: 120 s */ }

export const timerSeconds = () => timer;

export function setTimerSeconds(seconds) {
  timer = Number(seconds) || 0;
  try { localStorage.setItem(TIMER_KEY, String(timer)); } catch { /* ignora */ }
}
