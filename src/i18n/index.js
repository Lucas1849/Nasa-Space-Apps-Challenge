// Internacionalização (i18n). Fonte única de texto: tudo que o jogador lê passa por t('chave').
// Dois dicionários planos por chave pontilhada (ui/pt.js e en.js). Padrão pt-BR; o idioma
// escolhido fica salvo no navegador (como o tema e as dicas em ui/prefs.js). Se o armazenamento
// estiver bloqueado, vale o padrão e o jogo segue. Sem dependências: qualquer módulo pode importar.
//
// Uso: t('board.roll') ou com variáveis t('report.walked', { name: p.name, n: 5 }).
// As variáveis entram como {nome} no texto do dicionário.
import { pt } from './pt.js';
import { en } from './en.js';

const DICTS = { pt, en };
const LANG_KEY = 'smdg.lang';

let lang = 'pt';
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'pt' || saved === 'en') lang = saved;
} catch { /* sem armazenamento: português por padrão */ }

// Reflete o idioma no <html lang> (acessibilidade e leitores de tela).
function syncLangDom() {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-BR');
  }
}
syncLangDom();

export const getLang = () => lang;

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'pt';
  syncLangDom();
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignora */ }
  return lang;
}

export function toggleLang() {
  return setLang(lang === 'pt' ? 'en' : 'pt');
}

// Interpola {var} com os valores passados. Deixa o marcador se faltar a variável (ajuda a achar erro).
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

// Traduz uma chave. Cai no português e, por fim, na própria chave (nunca quebra a tela).
export function t(key, vars) {
  const dict = DICTS[lang] || pt;
  let str = dict[key];
  if (str == null) str = pt[key];
  if (str == null) str = key;
  return interpolate(str, vars);
}
