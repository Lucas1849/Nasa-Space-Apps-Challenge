// Componentes de UI reutilizáveis. Só montam DOM a partir do estado; não contêm regra de jogo.
import { effectiveTotals } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { MISSIONS } from '../data/missions.js';
import { GLOSSARY } from '../data/glossary.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'onclick') node.addEventListener('click', v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return node;
}

export function button(label, onclick, opts = {}) {
  const b = el('button', { class: opts.class || '', onclick, title: opts.title }, label);
  if (opts.disabled) b.disabled = true;
  return b;
}

// Ícones por tipo visual de peça (ver campo `visual` em data/parts.js e data/instruments.js).
export const ITEM_ICONS = {
  camera: '📷', camera_large: '🔭', spectro: '🌈', boom: '🧲', beacon: '📻',
  panel: '☀️', panel_large: '🔆', battery: '🔋', antenna: '📶', dish: '📡', thruster: '🔥', capsule: '🧑‍🚀',
};
export const MISSION_ICONS = { first_satellite: '🛰️', living_being: '🐕', weather_watch: '🌦️', lunar_probe: '🌙', crewed_moon: '👩‍🚀' };
export const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function avatar(player, size) {
  return el('span', { class: `avatar c${player.id % 4}`, style: size ? `width:${size}px;height:${size}px` : null }, player.name[0].toUpperCase());
}

// Barra superior: quem joga, missão, verba, rodada e em que etapa do ciclo está.
export function hud(state, player, step) {
  const mission = MISSIONS[player.missionId];
  const steps = state.sandbox ? ['workshop', 'flight', 'report'] : ['board', 'workshop', 'flight', 'report'];
  const names = { board: 'Tabuleiro', workshop: 'Oficina', flight: 'Voo', report: 'Relatório' };
  return el('div', { class: 'hud' }, [
    el('div', { class: 'who' }, [avatar(player), player.name]),
    el('span', { class: 'chip' }, [MISSION_ICONS[mission.id] || '🚀', ' ', mission.name]),
    el('span', { class: 'chip' }, ['💰 ', el('span', { class: 'num' }, player.funds)]),
    state.sandbox ? el('span', { class: 'chip' }, '🧪 sandbox') : el('span', { class: 'chip' }, ['Rodada ', el('span', { class: 'num' }, state.round)]),
    player.shields ? el('span', { class: 'chip', title: 'Proteções contra falha' }, ['🛡️ ', el('span', { class: 'num' }, player.shields)]) : null,
    el('span', { class: 'spacer' }),
    el('div', { class: 'steps' }, steps.map((s) => el('span', { class: s === step ? 'on' : '' }, names[s]))),
  ]);
}

// Medidores: cada recurso contra o limite ou o mínimo, com barra e cor de alerta.
export function gauges(player) {
  const t = effectiveTotals(player);
  const m = MISSIONS[player.missionId];
  const g = (label, value, limit, status, fill, hint) =>
    el('div', { class: `gauge ${status}`, title: hint }, [
      el('span', { class: 'g-label' }, label),
      el('span', { class: 'g-value' }, limit == null ? `${value}` : `${value} / ${limit}`),
      el('div', { class: 'bar' }, [el('div', { class: 'fill', style: `width:${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` })]),
    ]);
  const ratio = (a, b) => (b > 0 ? a / b : a > 0 ? 1 : 0);
  const hasLauncher = t.maxMass != null;

  return el('div', { class: 'gauges' }, [
    g('💰 Verba p/ lançar', player.funds, hasLauncher ? t.launchCost : '—', hasLauncher && player.funds < t.launchCost ? 'bad' : 'ok',
      hasLauncher ? ratio(player.funds, t.launchCost) : 1, 'Verba disponível contra o custo do lançador escolhido.'),
    g('⚖️ Massa', t.mass, hasLauncher ? t.maxMass : '—', hasLauncher && t.mass > t.maxMass ? 'bad' : 'ok',
      hasLauncher ? ratio(t.mass, t.maxMass) : 0, 'Massa total contra a capacidade do lançador. Barra cheia = no limite.'),
    g('⚡ Energia usada', t.powerUse, t.powerGen, t.powerUse > t.powerGen ? 'bad' : 'ok',
      ratio(t.powerUse, t.powerGen), 'Energia consumida contra a gerada. Precisa sobrar.'),
    g('📡 Dados → comunicação', t.data, t.commsEffective, t.data > t.commsEffective ? 'warn' : 'ok',
      ratio(t.data, t.commsEffective), 'Dados gerados contra o que a antena transmite (já com a penalidade da órbita). Se passar, metade da ciência se perde.'),
    g('🔬 Ciência', t.scienceEffective, m.needs.science, t.scienceEffective < m.needs.science ? 'bad' : 'ok',
      ratio(t.scienceEffective, m.needs.science), 'Valor científico contra o mínimo da missão.'),
    g('📶 Comunicação', t.commsEffective, m.needs.comms, t.commsEffective < m.needs.comms ? 'bad' : 'ok',
      ratio(t.commsEffective, m.needs.comms), 'Comunicação efetiva contra o mínimo da missão.'),
    g('⏳ Vida útil (anos)', t.lifetime, m.needs.lifetime, t.lifetime < m.needs.lifetime ? 'bad' : 'ok',
      ratio(t.lifetime, m.needs.lifetime), 'Anos de operação (órbita + propulsor/bateria) contra o mínimo da missão.'),
  ]);
}

export function checklist(checks) {
  return el('ul', { class: 'checklist' }, checks.map((c) =>
    el('li', { class: c.ok ? 'ok' : c.hard ? 'bad' : 'warn' }, [el('span', {}, c.ok ? '✓' : c.hard ? '✕' : '!'), el('span', {}, c.text)])));
}
export const designChecklist = (player) => checklist(checkDesign(player).checks);

export function milestoneTrack(player) {
  const mission = MISSIONS[player.missionId];
  return el('ol', { class: 'milestones' }, mission.milestones.map((m) =>
    el('li', { class: player.milestones.includes(m.id) ? 'done' : '' }, [
      el('div', {}, [el('strong', {}, m.name), el('small', {}, m.requirement)]),
    ])));
}

export function logPanel(state) {
  return el('div', { class: 'panel log' }, [el('h3', { style: 'margin-top:0' }, '📓 Diário da missão'), el('ul', {}, state.log.map((l) => el('li', {}, l)))]);
}

export function glossary(open = false) {
  const d = el('details', { class: 'panel glossary' }, [
    el('summary', {}, '📘 O que significam os recursos?'),
    el('dl', {}, GLOSSARY.flatMap((g) => [el('dt', {}, g.term), el('dd', {}, g.text)])),
  ]);
  if (open) d.open = true;
  return d;
}
