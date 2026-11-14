// Componentes de UI reutilizáveis. Só montam DOM a partir do estado; não contêm regra de jogo.
import { effectiveTotals } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { flightPlan } from '../sim/flight.js';
import { upgradeCostFor } from '../sim/actions.js';
import { BAILOUT_FUNDS, BAILOUT_TECH_COST, BAILOUT_LIMIT } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';
import { GLOSSARY } from '../data/glossary.js';
import { OBJECTIVES, objectiveProgress } from '../data/objectives.js';
import { REAL_HISTORY, MAX_ROUNDS, yearOf } from '../data/history.js';
import { BUILDINGS, MAX_LEVEL, upgradeCost } from '../data/buildings.js';
import { STAGES } from '../data/stages.js';

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

// Barra superior: ano, quem joga, carta, missão, verba, tecnologia e em que etapa do ciclo está.
export function hud(state, player, step) {
  const mission = MISSIONS[player.flight?.missionId || player.missionId];
  const card = OBJECTIVES[player.objectiveId];
  const steps = state.sandbox ? ['workshop', 'flight', 'report'] : ['board', 'workshop', 'flight', 'report'];
  const names = { board: 'Tabuleiro', workshop: 'Oficina', flight: 'Voo', report: 'Relatório' };
  return el('div', { class: 'hud' }, [
    state.sandbox ? el('span', { class: 'chip' }, '🧪 sandbox') : el('span', { class: 'chip year', title: `Rodada ${state.round} de ${MAX_ROUNDS}` }, ['📅 ', el('span', { class: 'num' }, yearOf(state.round))]),
    el('div', { class: 'who' }, [avatar(player), player.name]),
    card ? el('span', { class: 'chip', title: card.goal }, [card.icon, ' ', card.name]) : null,
    el('span', { class: 'chip' }, mission ? [MISSION_ICONS[mission.id] || '🚀', ' ', mission.name, player.flight ? ' · em voo' : ''] : '🎯 escolhendo missão'),
    el('span', { class: 'chip', title: 'Verba' }, ['💰 ', el('span', { class: 'num' }, player.funds)]),
    state.sandbox ? null : el('span', { class: 'chip', title: 'Tecnologia: desbloqueia peças e foguetes melhores' }, ['🔧 tec ', el('span', { class: 'num' }, player.tech)]),
    player.shields ? el('span', { class: 'chip', title: 'Proteções contra falha' }, ['🛡️ ', el('span', { class: 'num' }, player.shields)]) : null,
    el('span', { class: 'spacer' }),
    el('div', { class: 'steps' }, steps.map((s) => el('span', { class: s === step ? 'on' : '' }, names[s]))),
  ]);
}

export function progressBar(fraction, status = 'ok') {
  return el('div', { class: `pbar ${status}` }, [el('div', { class: 'fill', style: `width:${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` })]);
}

function statusText(player) {
  if (player.flight) {
    const f = player.flight;
    return `🛰️ em voo: ${MISSIONS[f.missionId].name}, etapa ${f.stageIndex + 1}/${f.plan.length}`;
  }
  if (player.missionId) return `🔧 no chão: ${MISSIONS[player.missionId].name}`;
  return '🎯 escolhendo missão';
}

// Corrida visível (IDEIA.md seção 2): todos veem a carta, o progresso e a nave de todos.
// É o custo de esperar: enquanto você melhora a nave, os rivais avançam.
export function raceTable(state) {
  return el('div', { class: 'panel race' }, [
    el('h3', { style: 'margin-top:0' }, state.players.length > 1 ? '🏁 Corrida espacial' : '🏁 Sua agência na corrida'),
    ...state.players.map((pl) => {
      const card = OBJECTIVES[pl.objectiveId];
      const prog = objectiveProgress(pl, state);
      return el('div', { class: `race-row ${pl.id === state.turn ? 'current' : ''}` }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [
          avatar(pl, 26), el('strong', {}, pl.name),
          card ? el('span', { class: 'chip small', title: card.goal }, `${card.icon} ${card.name}`) : null,
          el('span', { class: 'spacer' }),
          el('span', { class: 'num' }, `${Math.round(prog.pct * 100)}%`),
        ]),
        progressBar(prog.pct, prog.done ? 'done' : 'ok'),
        el('div', { class: 'race-meta' }, [
          el('span', {}, statusText(pl)),
          el('span', {}, `💰 ${pl.funds} · 🔧 ${pl.tech}${pl.shields ? ` · 🛡️ ${pl.shields}` : ''} · ✓ ${pl.completed.length}`),
        ]),
        card ? el('small', { class: 'hint' }, `${card.goal} (${prog.value}/${prog.target})`) : null,
      ]);
    }),
  ]);
}

// Recordes mundiais: quem cumpriu cada missão primeiro (vale bônus e conta para a carta Pioneira).
export function recordsPanel(state) {
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🏆 Recordes mundiais'),
    el('ul', { class: 'records' }, Object.values(MISSIONS).map((m) => {
      const r = state.records[m.id];
      return el('li', { class: r ? 'taken' : '' }, [
        el('span', {}, `${MISSION_ICONS[m.id] || '🚀'} ${m.name}`),
        el('span', { class: 'hint' }, r ? `${state.players[r.playerId].name}, ${r.year}` : `em aberto (história real: ${REAL_HISTORY[m.id].year})`),
      ]);
    })),
  ]);
}

// Escolha da missão atual. Mostra se ela ajuda a carta de vitória e se o recorde ainda está em aberto.
export function missionPicker(state, player, actions) {
  const card = OBJECTIVES[player.objectiveId];
  return el('div', { class: 'mission-grid' }, Object.values(MISSIONS).map((m) => {
    const done = player.completed.some((c) => c.missionId === m.id);
    const record = state.records[m.id];
    const helps = card && !done && card.counts(m.id, state);
    const stages = flightPlan(m.id).length;
    return button([
      el('span', { class: 'icon' }, MISSION_ICONS[m.id] || '🚀'),
      el('strong', {}, m.name),
      el('span', { class: 'diff' }, `${m.difficulty} · ${stages} etapas de voo`),
      el('span', { class: 'goal' }, m.goal),
      done ? el('span', { class: 'tag ok' }, '✓ cumprida') : null,
      helps ? el('span', { class: 'tag accent' }, `${card.icon} conta para sua carta`) : null,
      !state.sandbox ? el('span', { class: 'tag' }, record ? `recorde: ${state.players[record.playerId].name}` : '🏆 recorde em aberto') : null,
    ], () => actions.chooseMission(m.id), {
      class: `mission-card ${player.missionId === m.id ? 'selected' : ''}`,
      disabled: done || Boolean(player.flight),
    });
  }));
}

// Painel da agência: prédios (upgrade de qualquer lugar) e socorro de emergência.
export function agencyPanel(state, player, actions) {
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🏢 Sua agência'),
    el('ul', { class: 'buildings' }, Object.values(BUILDINGS).map((b) => {
      const level = player.buildings[b.id];
      const cost = level ? upgradeCostFor(state, player, b.id) : null;
      return el('li', {}, [
        el('span', { class: 'b-icon' }, b.icon),
        el('div', {}, [
          el('strong', {}, `${b.name} ${level ? `nível ${level}/${MAX_LEVEL}` : ''}`),
          el('small', { class: 'hint' }, level ? b.effect : `Construa num terreno livre (🏗️) por ${upgradeCost(0)}. ${b.effect}`),
        ]),
        level && level < MAX_LEVEL
          ? button(`⬆ ${cost}`, () => actions.upgradeBuilding(b.id), { class: 'small', disabled: player.funds < cost, title: 'Subir de nível' })
          : null,
      ]);
    })),
    player.funds < BAILOUT_LIMIT
      ? button(`🆘 Socorro de emergência (+${BAILOUT_FUNDS} verba, −${BAILOUT_TECH_COST} tec)`, () => actions.requestBailout(), { class: 'small ghost' })
      : null,
  ]);
}

// Linha do tempo das etapas do voo.
export function stageTrack(plan, stages, currentIndex) {
  return el('ol', { class: 'stage-track' }, plan.map((id, i) => {
    const rec = stages[i];
    const cls = rec ? (rec.success ? 'done' : 'fail') : i === currentIndex ? 'now' : '';
    return el('li', { class: cls }, [el('span', { class: 's-icon' }, STAGES[id].icon), el('span', {}, STAGES[id].name)]);
  }));
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

export function milestoneTrack(player, missionId = player.missionId) {
  const mission = MISSIONS[missionId];
  if (!mission) return null;
  return el('ol', { class: 'milestones' }, mission.milestones.map((m) =>
    el('li', { class: player.milestones.includes(`${missionId}:${m.id}`) ? 'done' : '' }, [
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
