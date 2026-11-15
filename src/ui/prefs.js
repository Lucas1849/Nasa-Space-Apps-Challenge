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
