// Componentes de UI reutilizáveis. Só montam DOM a partir do estado; não contêm regra de jogo.
import { effectiveTotals } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { flightPlan, pct } from '../sim/flight.js';
import { ladderProgress } from '../sim/progress.js';
import { upgradeCostFor } from '../sim/actions.js';
import { BAILOUT_FUNDS, BAILOUT_TECH_COST, BAILOUT_LIMIT } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';
import { GLOSSARY } from '../data/glossary.js';
import { SIDES, ladderOf } from '../data/sides.js';
import { REAL_HISTORY, ROUNDS_PER_YEAR, yearOf } from '../data/history.js';
import { BUILDINGS, MAX_LEVEL, upgradeCost } from '../data/buildings.js';
import { STAGES } from '../data/stages.js';
import { icon } from './icons.js';
import { guideOn } from './prefs.js';

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
// Os nomes são chaves de ICONS em ui/icons.js.
export const ITEM_ICONS = {
  camera: 'camera', camera_large: 'telescope', spectro: 'prism', boom: 'magnet', beacon: 'beacon',
  panel: 'solar', panel_large: 'sun', battery: 'battery', antenna: 'signal', dish: 'dish', thruster: 'flame', capsule: 'capsule',
};
export const MISSION_ICONS = { first_satellite: 'satellite', living_being: 'paw', weather_watch: 'cloud', lunar_probe: 'moon', space_station: 'station', crewed_moon: 'helmet' };
export const missionIcon = (id, opts) => icon(MISSION_ICONS[id] || 'rocket', opts);

export function avatar(player, size) {
  return el('span', { class: `avatar c${player.id % 4}`, style: size ? `width:${size}px;height:${size}px` : null },
    player.bot ? icon('robot', { size: size ? Math.round(size * 0.6) : 20, label: 'Bot' }) : player.name[0].toUpperCase());
}

// Nome do lado como texto (para frases) e como selo com ícone (para a interface).
export const sideLabel = (p) => SIDES[p.side]?.name || '';
export const sideBadge = (p) => (SIDES[p.side] ? [icon(SIDES[p.side].icon, { size: 15 }), SIDES[p.side].name] : '');

// Barra superior: ano, quem joga, lado, degrau, verba, tecnologia e em que etapa do ciclo está.
// Com `actions`, mostra também o botão que liga e desliga as dicas.
export function hud(state, player, step, actions = null) {
  const mission = MISSIONS[player.flight?.missionId || player.missionId];
  const prog = ladderProgress(player);
  const steps = state.sandbox ? ['workshop', 'flight', 'report'] : ['board', 'workshop', 'flight', 'report'];
  const names = { board: 'Tabuleiro', workshop: 'Oficina', flight: 'Voo', report: 'Relatório' };
  const roundInYear = ((state.round - 1) % ROUNDS_PER_YEAR) + 1;
  return el('div', { class: 'hud' }, [
    state.sandbox ? el('span', { class: 'chip' }, [icon('flask', { size: 15 }), 'sandbox'])
      : el('span', { class: 'chip year', title: `Rodada ${roundInYear} de ${ROUNDS_PER_YEAR} deste ano` }, [icon('calendar', { size: 15 }), el('span', { class: 'num' }, yearOf(state.round)), el('small', {}, `rodada ${roundInYear}/${ROUNDS_PER_YEAR}`)]),
    el('div', { class: 'who' }, [avatar(player), player.name]),
    player.side ? el('span', { class: 'chip' }, sideBadge(player)) : null,
    el('span', { class: 'chip' }, mission
      ? [missionIcon(mission.id, { size: 15 }), state.sandbox ? mission.name : `Degrau ${Math.min(prog.steps + 1, prog.total)}/${prog.total}: ${mission.name}`, player.flight ? ', em voo' : '']
      : state.sandbox ? [icon('target', { size: 15 }), 'escolhendo missão'] : [icon('flag', { size: 15 }), 'escada completa']),
    el('span', { class: 'chip', title: 'Verba' }, [icon('coins', { size: 15, label: 'Verba' }), el('span', { class: 'num' }, player.funds)]),
    state.sandbox ? null : el('span', { class: 'chip', title: 'Tecnologia: desbloqueia peças e foguetes melhores' }, [icon('chip', { size: 15, label: 'Tecnologia' }), 'tec', el('span', { class: 'num' }, player.tech)]),
    player.shields ? el('span', { class: 'chip', title: 'Proteções contra falha' }, [icon('shield', { size: 15, label: 'Proteções' }), el('span', { class: 'num' }, player.shields)]) : null,
    el('span', { class: 'spacer' }),
    el('div', { class: 'steps' }, steps.map((s) => el('span', { class: s === step ? 'on' : '' }, names[s]))),
    actions ? guideToggle(actions) : null,
  ]);
}

// Botão que liga e desliga as orientações (preferência salva no navegador).
export function guideToggle(actions) {
  const on = guideOn();
  const b = button([icon('compass', { size: 16 }), on ? 'Dicas: ligadas' : 'Dicas: desligadas'], () => actions.toggleGuide(), {
    class: `small ghost guide-toggle ${on ? 'on' : ''}`,
    title: on ? 'Desligar as orientações' : 'Ligar as orientações',
  });
  b.setAttribute('aria-pressed', String(on));
  return b;
}

// Título de painel com ícone.
export const panelTitle = (iconName, text) => el('h3', { class: 'panel-title' }, [icon(iconName, { size: 18 }), text]);

export function progressBar(fraction, status = 'ok') {
  return el('div', { class: `pbar ${status}` }, [el('div', { class: 'fill', style: `width:${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` })]);
}

// Escada de missões do lado do jogador, com o ano em que o lado cumpriu cada degrau na história real.
export function ladderPanel(state, player) {
  const ladder = ladderOf(player);
  const prog = ladderProgress(player);
  return el('div', { class: 'panel' }, [
    panelTitle(SIDES[player.side]?.icon || 'ladder', `Escada ${sideLabel(player)}`),
    progressBar(prog.pct, prog.done ? 'done' : 'ok'),
    el('ol', { class: 'ladder' }, ladder.map((m, i) => {
      const done = player.completed.find((c) => c.missionId === m);
      const real = REAL_HISTORY[m].sides[player.side];
      const flying = player.flight?.missionId === m;
      const cls = i < player.step ? 'done' : i === player.step ? 'now' : '';
      const status = done ? `cumprida em ${done.year}` : flying ? `em voo, etapa ${player.flight.stageIndex + 1}/${player.flight.plan.length}` : i === player.step ? 'degrau atual' : '';
      return el('li', { class: cls }, [
        el('span', { class: 'ladder-name' }, [done ? icon('check', { size: 16 }) : missionIcon(m, { size: 16 }), MISSIONS[m].name]),
        el('small', { class: 'hint' }, [status, status ? '. ' : '', `História real: ${real ?? 'nunca'}`]),
      ]);
    })),
    el('p', { class: 'hint' }, 'Cada degrau é uma nave nova. Tecnologia, prédios e verba continuam.'),
  ]);
}

// Rival escondido (IDEIA.md v3 seção 8): só aparece o que o espião ou os boatos revelaram.
export function rivalsPanel(state, player) {
  const rivals = state.players.filter((r) => r.id !== player.id);
  if (!rivals.length) return null;
  return el('div', { class: 'panel' }, [
    panelTitle('eye', 'Rivais'),
    ...rivals.map((r) => {
      const info = player.intel[r.id];
      let text = 'Estado desconhecido. Caia na Espionagem ou invista em boatos.';
      if (info?.rumor) text = `Boato de ${info.year}: ${info.steps}/${info.total} degraus. Pode estar errado.`;
      else if (info) {
        const ship = info.inFlight ? `nave em voo (etapa ${info.stage + 1}/${info.stages})`
          : info.ready != null ? `nave ${pct(info.ready)} pronta` : info.note || '';
        text = `Espião em ${info.year}: ${info.steps}/${info.total} degraus${info.mission ? `, mirando "${info.mission}"` : ''}; ${ship}.`;
      }
      return el('div', { class: 'race-row' }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [avatar(r, 26), el('strong', {}, r.name), el('span', { class: 'chip small' }, sideBadge(r))]),
        el('small', { class: `hint ${info && !info.rumor ? 'intel' : ''}` }, text),
      ]);
    }),
  ]);
}

// Painel da agência: prédios (upgrade de qualquer lugar) e socorro de emergência.
export function agencyPanel(state, player, actions) {
  return el('div', { class: 'panel' }, [
    panelTitle('building', 'Sua agência'),
    el('ul', { class: 'buildings' }, Object.values(BUILDINGS).map((b) => {
      const level = player.buildings[b.id];
      const cost = level ? upgradeCostFor(state, player, b.id) : null;
      return el('li', { class: level ? '' : 'not-built' }, [
        el('span', { class: 'b-icon' }, icon(b.icon, { size: 20 })),
        el('div', {}, [
          el('strong', {}, `${b.name}${level ? `, nível ${level}/${MAX_LEVEL}` : ''}`),
          el('small', { class: 'hint' }, level ? b.effect : `Construa num terreno livre por ${upgradeCost(0)}. ${b.effect}`),
        ]),
        level && level < MAX_LEVEL
          ? button([icon('arrowUp', { size: 14 }), el('span', { class: 'num' }, cost)], () => actions.upgradeBuilding(b.id), { class: 'small', disabled: player.funds < cost, title: `Subir para o nível ${level + 1} por ${cost}` })
          : null,
      ]);
    })),
    player.funds < BAILOUT_LIMIT
      ? button([icon('lifebuoy', { size: 16 }), `Socorro de emergência (+${BAILOUT_FUNDS} verba, −${BAILOUT_TECH_COST} tec)`], () => actions.requestBailout(), { class: 'small ghost' })
      : null,
  ]);
}

// Escolha de missão: só no modo sandbox (no jogo normal a missão é o degrau da escada).
export function missionPicker(state, player, actions) {
  return el('div', { class: 'mission-grid' }, Object.values(MISSIONS).map((m) => button([
    el('span', { class: 'icon' }, missionIcon(m.id, { size: 26 })),
    el('strong', {}, m.name),
    el('span', { class: 'diff' }, `${m.difficulty} · ${flightPlan(m.id).length} etapas de voo`),
    el('span', { class: 'goal' }, m.goal),
  ], () => actions.chooseMission(m.id), { class: `mission-card ${player.missionId === m.id ? 'selected' : ''}`, disabled: Boolean(player.flight) })));
}

// Linha do tempo das etapas do voo.
export function stageTrack(plan, stages, currentIndex) {
  return el('ol', { class: 'stage-track' }, plan.map((id, i) => {
    const rec = stages[i];
    const cls = rec ? (rec.success ? 'done' : 'fail') : i === currentIndex ? 'now' : '';
    const glyph = rec ? (rec.success ? 'check' : 'x') : STAGES[id].icon;
    return el('li', { class: cls }, [el('span', { class: 's-icon' }, icon(glyph, { size: 15 })), el('span', {}, STAGES[id].name)]);
  }));
}

// Medidores: cada recurso contra o limite ou o mínimo, com barra e cor de alerta.
export function gauges(player) {
  const t = effectiveTotals(player);
  const m = MISSIONS[player.missionId];
  const g = ([iconName, label], value, limit, status, fill, hint) =>
    el('div', { class: `gauge ${status}`, title: hint }, [
      el('span', { class: 'g-label' }, [icon(iconName, { size: 15 }), label]),
      el('span', { class: 'g-value' }, limit == null ? `${value}` : `${value} / ${limit}`),
      el('div', { class: 'bar' }, [el('div', { class: 'fill', style: `width:${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` })]),
    ]);
  const ratio = (a, b) => (b > 0 ? a / b : a > 0 ? 1 : 0);
  const hasLauncher = t.maxMass != null;

  return el('div', { class: 'gauges' }, [
    g(['coins', 'Verba para lançar'], player.funds, hasLauncher ? t.launchCost : '—', hasLauncher && player.funds < t.launchCost ? 'bad' : 'ok',
      hasLauncher ? ratio(player.funds, t.launchCost) : 1, 'Verba disponível contra o custo do lançador escolhido.'),
    g(['weight', 'Massa'], t.mass, hasLauncher ? t.maxMass : '—', hasLauncher && t.mass > t.maxMass ? 'bad' : 'ok',
      hasLauncher ? ratio(t.mass, t.maxMass) : 0, 'Massa total contra a capacidade do lançador. Barra cheia = no limite.'),
    g(['bolt', 'Energia usada'], t.powerUse, t.powerGen, t.powerUse > t.powerGen ? 'bad' : 'ok',
      ratio(t.powerUse, t.powerGen), 'Energia consumida contra a gerada. Precisa sobrar.'),
    g(['dish', 'Dados e transmissão'], t.data, t.commsEffective, t.data > t.commsEffective ? 'warn' : 'ok',
      ratio(t.data, t.commsEffective), 'Dados gerados contra o que a antena transmite (já com a penalidade da órbita). Se passar, metade da ciência se perde.'),
    g(['atom', 'Ciência'], t.scienceEffective, m.needs.science, t.scienceEffective < m.needs.science ? 'bad' : 'ok',
      ratio(t.scienceEffective, m.needs.science), 'Valor científico contra o mínimo da missão.'),
    g(['signal', 'Comunicação'], t.commsEffective, m.needs.comms, t.commsEffective < m.needs.comms ? 'bad' : 'ok',
      ratio(t.commsEffective, m.needs.comms), 'Comunicação efetiva contra o mínimo da missão.'),
    g(['hourglass', 'Vida útil (anos)'], t.lifetime, m.needs.lifetime, t.lifetime < m.needs.lifetime ? 'bad' : 'ok',
      ratio(t.lifetime, m.needs.lifetime), 'Anos de operação (órbita + propulsor/bateria) contra o mínimo da missão.'),
  ]);
}

export function checklist(checks) {
  return el('ul', { class: 'checklist' }, checks.map((c) =>
    el('li', { class: c.ok ? 'ok' : c.hard ? 'bad' : 'warn' }, [icon(c.ok ? 'check' : c.hard ? 'x' : 'alert', { size: 15, label: c.ok ? 'ok' : c.hard ? 'impede o lançamento' : 'atenção' }), el('span', {}, c.text)])));
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

// Diário: só mostra mensagens públicas e as do jogador da vez (rival escondido).
export function logPanel(state, viewer) {
  const entries = state.log.filter((l) => l.who == null || l.who === viewer.id).slice(0, 14);
  return el('div', { class: 'panel log' }, [panelTitle('book', 'Diário da agência'), el('ul', {}, entries.map((l) => el('li', {}, l.text)))]);
}

export function glossary(open = false) {
  const d = el('details', { class: 'panel glossary' }, [
    el('summary', {}, [icon('bookOpen', { size: 16 }), 'O que significam os recursos?']),
    el('dl', {}, GLOSSARY.flatMap((g) => [el('dt', {}, g.term), el('dd', {}, g.text)])),
  ]);
  if (open) d.open = true;
  return d;
}
