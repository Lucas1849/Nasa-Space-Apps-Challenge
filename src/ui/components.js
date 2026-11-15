// Componentes de UI reutilizáveis. Só montam DOM a partir do estado; não contêm regra de jogo.
import { effectiveTotals } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { isHidden, needLevel } from '../sim/needs.js';
import { flightPlan, pct } from '../sim/flight.js';
import { ladderProgress } from '../sim/progress.js';
import { upgradeCostFor } from '../sim/actions.js';
import { yearlyIncome } from '../sim/income.js';
import { BAILOUT_FUNDS, BAILOUT_TECH_COST, BAILOUT_LIMIT } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';
import { GLOSSARY } from '../data/glossary.js';
import { SIDES, ladderOf } from '../data/sides.js';
import { REAL_HISTORY, ROUNDS_PER_YEAR, yearOf } from '../data/history.js';
import { BUILDINGS, MAX_LEVEL, upgradeCost } from '../data/buildings.js';
import { STAGES } from '../data/stages.js';
import { icon } from './icons.js';
import { guideOn, panelOpen, setPanelOpen } from './prefs.js';

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

// Interface enxuta no começo (menos informação de uma vez): vale enquanto o jogador ainda não cumpriu
// nenhum degrau e deixou as dicas ligadas. Cumprir o 1º degrau, desligar as dicas ou jogar o sandbox
// mostra tudo. Só muda o que aparece; nenhuma regra do jogo depende disso.
export function simpleUi(state, player) {
  return !state.sandbox && guideOn() && player.step === 0 && player.completed.length === 0;
}

// Barra superior: ano, quem joga, lado, degrau, verba, tecnologia e em que etapa do ciclo está.
// Com `actions`, mostra também o botão que liga e desliga as dicas.
export function hud(state, player, step, actions = null) {
  const simple = simpleUi(state, player);
  const mission = MISSIONS[player.flight?.missionId || player.missionId];
  const prog = ladderProgress(player);
  const steps = state.sandbox ? ['workshop', 'flight', 'report'] : ['board', 'workshop', 'flight', 'report'];
  const names = { board: 'Tabuleiro', workshop: 'Oficina', flight: 'Voo', report: 'Relatório' };
  const roundInYear = ((state.round - 1) % ROUNDS_PER_YEAR) + 1;
  // Recursos sempre à vista, em números grandes, com a previsão do próximo Ano novo (de onde vem o recurso).
  // Na interface enxuta a previsão fica só no balão, para não somar texto no começo.
  const roundsLeft = ROUNDS_PER_YEAR - ((state.round - 1) % ROUNDS_PER_YEAR);
  const income = state.sandbox || !player.side ? null : yearlyIncome(player, yearOf(state.round + roundsLeft)); // o próximo Ano novo
  const when = `em ${roundsLeft} ${roundsLeft === 1 ? 'rodada' : 'rodadas'}`;
  const stat = (cls, iconName, label, value, title, next = null) => el('div', { class: `stat ${cls}`, title }, [
    icon(iconName, { size: 22, label }),
    el('div', { class: 'stat-body' }, [
      el('span', { class: 'stat-num num' }, value),
      el('span', { class: 'stat-label' }, label),
      next && !simple ? el('small', { class: 'stat-next' }, next) : null,
    ]),
  ]);
  return el('div', { class: 'hud' }, [
    state.sandbox ? el('span', { class: 'chip' }, [icon('flask', { size: 15 }), 'sandbox'])
      : el('span', { class: 'chip year', title: `Rodada ${roundInYear} de ${ROUNDS_PER_YEAR} deste ano` }, [icon('calendar', { size: 15 }), el('span', { class: 'num' }, yearOf(state.round)), simple ? null : el('small', {}, `rodada ${roundInYear}/${ROUNDS_PER_YEAR}`)]),
    el('div', { class: 'who' }, [avatar(player), player.name]),
    player.side ? el('span', { class: 'chip' }, sideBadge(player)) : null,
    el('span', { class: 'chip' }, mission
      ? [missionIcon(mission.id, { size: 15 }), state.sandbox ? mission.name : `Degrau ${Math.min(prog.steps + 1, prog.total)}/${prog.total}: ${mission.name}`, player.flight ? ', em voo' : '']
      : state.sandbox ? [icon('target', { size: 15 }), 'escolhendo missão'] : [icon('flag', { size: 15 }), 'escada completa']),
    stat('funds', 'coins', 'Verba', player.funds,
      income ? `Verba. No próximo Ano novo entram +${income.funds} (${Object.entries({ orçamento: income.parts.base, lado: income.parts.side, Patrocinador: income.parts.sponsor }).filter(([, v]) => v).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ')}).` : 'Verba',
      income ? `+${income.funds} ${when}` : null),
    state.sandbox ? null : stat('tech', 'chip', 'Tecnologia', player.tech,
      income ? `Tecnologia: desbloqueia peças e foguetes melhores. No próximo Ano novo entram +${income.tech}${income.techParts.base ? '' : ' (a pesquisa básica vem de 2 em 2 anos: só o Laboratório rende)'}.` : 'Tecnologia: desbloqueia peças e foguetes melhores',
      income ? `+${income.tech} ${when}` : null),
    player.shields || (!simple && !state.sandbox) ? stat('shield', 'shield', 'Proteções', player.shields, 'Proteções contra falha: cada uma salva uma etapa do voo que falharia.') : null,
    el('span', { class: 'spacer' }),
    simple ? null : el('div', { class: 'steps' }, steps.map((s) => el('span', { class: s === step ? 'on' : '' }, names[s]))),
    actions ? guideToggle(actions) : null,
  ]);
}

// Botão que liga e desliga as orientações (preferência salva no navegador).
export function guideToggle(actions) {
  const on = guideOn();
  const b = button([icon('compass', { size: 16 }), on ? 'Dicas: ligadas' : 'Dicas: desligadas'], () => actions.toggleGuide(), {
    class: `small ghost guide-toggle ${on ? 'on' : ''}`,
    title: on ? 'Dicas ligadas: orientação passo a passo e interface enxuta no começo. Desligue para ver tudo.' : 'Ligar as orientações e a interface enxuta no começo',
  });
  b.setAttribute('aria-pressed', String(on));
  return b;
}

// Título de painel com ícone.
export const panelTitle = (iconName, text) => el('h3', { class: 'panel-title' }, [icon(iconName, { size: 18 }), text]);

// Aba expansível da lateral: cabeçalho clicável (abre/fecha) + corpo. O estado fica salvo por `id`,
// então cada jogador escolhe o que deixa aberto. `hint` é um subtítulo curto, sempre visível.
// Como toda a tela é redesenhada a cada ação, o abrir/fechar guarda a preferência em vez de re-render.
export function sidePanel(id, iconName, title, children, { defaultOpen = true, hint = null, extraClass = '' } = {}) {
  const d = el('details', { class: `panel collapsible ${extraClass}`.trim() }, [
    el('summary', { class: 'panel-head' }, [
      icon(iconName, { size: 18, className: 'head-icon' }),
      el('div', { class: 'head-text' }, [el('strong', {}, title), hint ? el('small', { class: 'hint' }, hint) : null]),
      icon('chevronDown', { size: 16, className: 'chev' }),
    ]),
    el('div', { class: 'panel-body' }, children),
  ]);
  if (panelOpen(id, defaultOpen)) d.open = true;
  d.addEventListener('toggle', () => setPanelOpen(id, d.open));
  return d;
}

export function progressBar(fraction, status = 'ok') {
  return el('div', { class: `pbar ${status}` }, [el('div', { class: 'fill', style: `width:${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` })]);
}

// Escada de missões do lado do jogador, com o ano em que o lado cumpriu cada degrau na história real.
export function ladderPanel(state, player) {
  const ladder = ladderOf(player);
  const prog = ladderProgress(player);
  return sidePanel('ladder', SIDES[player.side]?.icon || 'ladder', `Escada ${sideLabel(player)}`, [
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
  ], { hint: `${prog.steps}/${prog.total} degraus cumpridos` });
}

// Rival escondido (IDEIA.md v3 seção 8): só aparece o que o espião ou os boatos revelaram.
export function rivalsPanel(state, player) {
  const rivals = state.players.filter((r) => r.id !== player.id);
  if (!rivals.length) return null;
  return sidePanel('rivals', 'eye', 'Rivais', [
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
        // Público: o lançamento foi anunciado a todos. O resultado do voo e a nave por dentro continuam secretos.
        r.flight ? el('small', { class: 'hint flight-public' }, [icon('rocket', { size: 12 }), 'Nave em voo (anúncio público).']) : null,
      ]);
    }),
  ], { defaultOpen: rivals.some((r) => r.flight), hint: `${rivals.length} ${rivals.length === 1 ? 'rival' : 'rivais'} na corrida${rivals.some((r) => r.flight) ? ', com nave em voo' : ''}` });
}

// Faixa da agência, sempre visível sob o tabuleiro e os botões de ação: os 4 prédios em cartões (nível,
// o que dão e o botão de subir com o custo) e o socorro de emergência. Prédio não construído aparece
// esmaecido, para o jogador ver o que existe. Construir continua sendo num terreno livre do tabuleiro.
export function agencyStrip(state, player, actions) {
  const cards = Object.values(BUILDINGS).map((b) => {
    const level = player.buildings[b.id] || 0;
    const built = level > 0;
    const maxed = level >= MAX_LEVEL;
    const cost = built && !maxed ? upgradeCostFor(state, player, b.id) : null;
    return el('div', { class: `building-card${built ? '' : ' not-built'}${maxed ? ' maxed' : ''}` }, [
      el('div', { class: 'bc-head' }, [el('span', { class: 'b-icon' }, icon(b.icon, { size: 22 })), el('strong', {}, b.name)]),
      el('div', { class: 'bc-level' }, built
        ? [el('span', { class: 'pips' }, Array.from({ length: MAX_LEVEL }, (_, i) => el('span', { class: `pip${i < level ? ' on' : ''}` }))), el('span', {}, `nível ${level}/${MAX_LEVEL}`)]
        : el('span', { class: 'hint' }, 'não construído')),
      el('small', { class: 'hint' }, built ? b.effect : `Construa num terreno livre por ${upgradeCost(0)}. ${b.effect}`),
      built && !maxed
        ? button([icon('arrowUp', { size: 14 }), 'Subir ', el('span', { class: 'num' }, cost)], () => actions.upgradeBuilding(b.id), {
          class: 'small upgrade', disabled: player.funds < cost,
          title: player.funds < cost ? `Faltam ${cost - player.funds} de verba para subir ao nível ${level + 1}` : `Subir para o nível ${level + 1} por ${cost}`,
        })
        : null,
      maxed ? el('span', { class: 'badge max' }, 'nível máximo') : null,
    ]);
  });
  return el('section', { class: 'panel agency-strip' }, [
    el('div', { class: 'strip-head' }, [
      panelTitle('building', 'Sua agência'),
      player.funds < BAILOUT_LIMIT
        ? button([icon('lifebuoy', { size: 16 }), `Socorro de emergência (+${BAILOUT_FUNDS} verba, −${BAILOUT_TECH_COST} tec)`], () => actions.requestBailout(), { class: 'small ghost' })
        : null,
    ]),
    el('div', { class: 'building-grid' }, cards),
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

// Retorno imediato: o que acabou de acontecer (escolha do dilema, o que a casa deu, espião, prédio).
// Fica no centro sem pedir confirmação e some no próximo turno (state.outcome, ver sim/actions.js).
export function outcomeCard(state, p) {
  const o = state.outcome;
  if (!o || o.playerId !== p.id || state.pendingDilemma) return null;
  return el('div', { class: 'outcome' }, [
    el('strong', { class: 'decision-title' }, [icon('check', { size: 18 }), o.title]),
    o.choice ? el('small', { class: 'hint' }, `Você escolheu: ${o.choice}`) : null,
    o.changes.length ? el('div', { class: 'delta-row' }, o.changes.map((c) => el('span', { class: `delta ${c.value > 0 ? 'up' : 'down'}` }, [
      `${c.label} `, el('strong', { class: 'num' }, `${c.value > 0 ? '+' : ''}${c.value}`),
    ]))) : null,
    ...o.notes.map((n) => el('small', { class: 'hint' }, n)),
    o.lesson ? el('small', { class: 'outcome-lesson' }, [icon('bulb', { size: 14 }), o.lesson]) : null,
  ]);
}

// Largura de cada barra no desenho anterior: a barra nova cresce a partir dela (CSS .fill.grow),
// para o jogador ver o que a peça comprada mudou. Só visual.
const lastFill = {};

// Medidores: cada recurso contra o limite ou o mínimo, com barra e cor de alerta.
export function gauges(player) {
  const t = effectiveTotals(player);
  const m = MISSIONS[player.missionId];
  const hidden = isHidden(player);
  const g = ([iconName, label], value, limit, status, fill, hint) =>
    el('div', { class: `gauge ${status}`, title: hint }, [
      el('span', { class: 'g-label' }, [icon(iconName, { size: 15 }), label]),
      el('span', { class: 'g-value' }, limit == null ? `${value}` : `${value} / ${limit}`),
      (() => {
        const width = Math.round(Math.max(0, Math.min(1, fill)) * 100);
        const key = `${player.id}:${label}`;
        const prev = lastFill[key];
        lastFill[key] = width;
        const grow = prev != null && prev !== width;
        return el('div', { class: 'bar' }, [el('div', { class: `fill ${grow ? 'grow' : ''}`, style: `width:${width}%${grow ? `;--from:${prev}%` : ''}` })]);
      })(),
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
    // Mínimos escondidos (sim/needs.js): mostra o que a nave entrega e "?" no lugar do mínimo, em cinza.
    hidden
      ? g(['atom', 'Ciência'], t.scienceEffective, '?', 'unknown', 0, `O mínimo de ciência desta missão é desconhecido (pista: ${needLevel('science', m.needs.science)}). Faça um ensaio em solo ou lance para descobrir.`)
      : g(['atom', 'Ciência'], t.scienceEffective, m.needs.science, t.scienceEffective < m.needs.science ? 'bad' : 'ok',
        ratio(t.scienceEffective, m.needs.science), 'Valor científico contra o mínimo da missão.'),
    hidden
      ? g(['signal', 'Comunicação'], t.commsEffective, '?', 'unknown', 0, `O mínimo de comunicação desta missão é desconhecido (pista: ${needLevel('comms', m.needs.comms)}). Faça um ensaio em solo ou lance para descobrir.`)
      : g(['signal', 'Comunicação'], t.commsEffective, m.needs.comms, t.commsEffective < m.needs.comms ? 'bad' : 'ok',
        ratio(t.commsEffective, m.needs.comms), 'Comunicação efetiva contra o mínimo da missão.'),
    g(['hourglass', 'Vida útil (anos)'], t.lifetime, m.needs.lifetime, t.lifetime < m.needs.lifetime ? 'bad' : 'ok',
      ratio(t.lifetime, m.needs.lifetime), 'Anos de operação (órbita + propulsor/bateria) contra o mínimo da missão.'),
  ]);
}

export function checklist(checks) {
  // `hidden`: mínimo da missão ainda desconhecido (sim/needs.js): cinza, nem verde nem vermelho.
  return el('ul', { class: 'checklist' }, checks.map((c) => c.hidden
    ? el('li', { class: 'unknown' }, [icon('eye', { size: 15, label: 'desconhecido' }), el('span', {}, c.text)])
    : el('li', { class: c.ok ? 'ok' : c.hard ? 'bad' : 'warn' }, [icon(c.ok ? 'check' : c.hard ? 'x' : 'alert', { size: 15, label: c.ok ? 'ok' : c.hard ? 'impede o lançamento' : 'atenção' }), el('span', {}, c.text)])));
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
  return sidePanel('log', 'book', 'Diário da agência', [el('ul', {}, entries.map((l) => el('li', {}, l.text)))], {
    defaultOpen: false, extraClass: 'log', hint: entries[0] ? entries[0].text : 'Sem registros ainda',
  });
}

export function glossary(open = false) {
  const d = el('details', { class: 'panel glossary' }, [
    el('summary', {}, [icon('bookOpen', { size: 16 }), 'O que significam os recursos?']),
    el('dl', {}, GLOSSARY.flatMap((g) => [el('dt', {}, g.term), el('dd', {}, g.text)])),
  ]);
  if (open) d.open = true;
  return d;
}
