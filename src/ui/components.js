// Componentes de UI reutilizáveis. Só montam DOM a partir do estado; não contêm regra de jogo.
import { effectiveTotals } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { MISSIONS } from '../data/missions.js';
import { GLOSSARY } from '../data/glossary.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'onclick') node.addEventListener('click', v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function button(label, onclick, opts = {}) {
  const b = el('button', { class: opts.class || '', onclick }, label);
  if (opts.disabled) b.disabled = true;
  if (opts.title) b.title = opts.title;
  return b;
}

// Painel de recursos: mostra cada recurso contra o limite, com cor de alerta.
export function resourceBar(player) {
  const t = effectiveTotals(player);
  const mission = MISSIONS[player.missionId];
  const row = (label, value, limit, ok, hint) =>
    el('div', { class: `res ${ok ? 'ok' : 'bad'}`, title: hint }, [
      el('span', { class: 'res-label' }, label),
      el('span', { class: 'res-value' }, limit == null ? `${value}` : `${value} / ${limit}`),
    ]);
  return el('div', { class: 'resources' }, [
    row('Verba', player.funds, null, player.funds >= t.launchCost, 'Dinheiro disponível. O lançamento custa ' + t.launchCost + '.'),
    row('Massa', t.mass, t.maxMass ?? '?', t.maxMass == null || t.mass <= t.maxMass, 'Massa total da espaçonave contra a capacidade do lançador.'),
    row('Energia', `${t.powerGen} gera / ${t.powerUse} usa`, null, t.powerBalance >= 0, 'Energia gerada precisa cobrir a consumida.'),
    row('Dados → Comunicação', `${t.data} → ${t.commsEffective}`, null, t.commsEffective >= t.data, 'Dados gerados por turno contra a capacidade de transmitir (já com a penalidade da órbita).'),
    row('Ciência', t.scienceEffective, mission.needs.science, t.scienceEffective >= mission.needs.science, 'Valor científico contra o mínimo da missão.'),
    row('Comunicação', t.commsEffective, mission.needs.comms, t.commsEffective >= mission.needs.comms, 'Comunicação efetiva contra o mínimo da missão.'),
    row('Vida útil (anos)', t.lifetime, mission.needs.lifetime, t.lifetime >= mission.needs.lifetime, 'Anos de operação: vida da órbita + bônus de propulsor/bateria, contra o mínimo da missão.'),
  ]);
}

// Lista de checagens do projeto (verde/vermelho/amarelo), reaproveitada na oficina e no relatório.
export function checklist(checks) {
  return el('ul', { class: 'checklist' }, checks.map((c) =>
    el('li', { class: c.ok ? 'ok' : c.hard ? 'bad' : 'warn' }, `${c.ok ? '✔' : c.hard ? '✖' : '⚠'} ${c.text}`)));
}

export function designChecklist(player) {
  return checklist(checkDesign(player).checks);
}

export function milestoneTrack(player) {
  const mission = MISSIONS[player.missionId];
  return el('ol', { class: 'milestones' }, mission.milestones.map((m) =>
    el('li', { class: player.milestones.includes(m.id) ? 'done' : '' }, [
      el('strong', {}, m.name), ` — ${m.requirement}`,
    ])));
}

export function logPanel(state) {
  return el('div', { class: 'log' }, [el('h3', {}, 'Diário da missão'), el('ul', {}, state.log.map((l) => el('li', {}, l)))]);
}

// Glossário recolhível: explica cada recurso em uma frase.
export function glossary(open = false) {
  const d = el('details', { class: 'glossary' }, [
    el('summary', {}, '📘 O que significam os recursos?'),
    el('dl', {}, GLOSSARY.flatMap((g) => [el('dt', {}, g.term), el('dd', {}, g.text)])),
  ]);
  if (open) d.open = true;
  return d;
}
