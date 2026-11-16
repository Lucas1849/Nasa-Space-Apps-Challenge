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
import { turnClock } from './turnClock.js';
import { TILE_ART } from './boardArt.js';
import { buildingPhotoSvg } from './itemArt.js';
import { guideOn, panelOpen, setPanelOpen, themeOf, toggleTheme } from './prefs.js';
import { t, getLang } from '../i18n/index.js';
// Alias do tradutor para funções que usam `t` como variável local (ex.: gauges = totais da nave).
const tr = t;

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
  const names = { board: t('step.board'), workshop: t('step.workshop'), flight: t('step.flight'), report: t('step.report') };
  const roundInYear = ((state.round - 1) % ROUNDS_PER_YEAR) + 1;
  // Recursos sempre à vista, em números grandes, com a previsão do próximo Ano novo (de onde vem o recurso).
  // Na interface enxuta a previsão fica só no balão, para não somar texto no começo.
  const roundsLeft = ROUNDS_PER_YEAR - ((state.round - 1) % ROUNDS_PER_YEAR);
  const income = state.sandbox || !player.side ? null : yearlyIncome(player, yearOf(state.round + roundsLeft)); // o próximo Ano novo
  const when = t(roundsLeft === 1 ? 'hud.inRounds.one' : 'hud.inRounds.other', { n: roundsLeft });
  const stat = (cls, iconName, label, value, title, next = null) => el('div', { class: `stat ${cls}`, title }, [
    icon(iconName, { size: 22, label }),
    el('div', { class: 'stat-body' }, [
      el('span', { class: 'stat-num num' }, value),
      el('span', { class: 'stat-label' }, label),
      next && !simple ? el('small', { class: 'stat-next' }, next) : null,
    ]),
  ]);
  return el('div', { class: 'hud' }, [
    state.sandbox ? el('span', { class: 'chip' }, [icon('flask', { size: 15 }), t('hud.sandbox')])
      : el('span', { class: 'chip year', title: t('hud.roundOfYear', { n: roundInYear, total: ROUNDS_PER_YEAR }) }, [icon('calendar', { size: 15 }), el('span', { class: 'num' }, yearOf(state.round)), simple ? null : el('small', {}, t('hud.roundShort', { n: roundInYear, total: ROUNDS_PER_YEAR }))]),
    el('div', { class: 'who' }, [avatar(player), player.name]),
    player.side ? el('span', { class: 'chip' }, sideBadge(player)) : null,
    el('span', { class: 'chip' }, mission
      ? [missionIcon(mission.id, { size: 15 }), state.sandbox ? mission.name : t('hud.step', { n: Math.min(prog.steps + 1, prog.total), total: prog.total, mission: mission.name }), player.flight ? t('hud.inFlightSuffix') : '']
      : state.sandbox ? [icon('target', { size: 15 }), t('hud.choosingMission')] : [icon('flag', { size: 15 }), t('hud.ladderComplete')]),
    stat('funds', 'coins', t('res.funds'), player.funds,
      income ? t('hud.fundsNext', { n: income.funds, parts: Object.entries({ [t('hud.part.budget')]: income.parts.base, [t('hud.part.side')]: income.parts.side, [t('hud.part.sponsor')]: income.parts.sponsor }).filter(([, v]) => v).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ') }) : t('res.funds'),
      income ? `+${income.funds} ${when}` : null),
    state.sandbox ? null : stat('tech', 'chip', t('res.tech'), player.tech,
      income ? t('hud.techNext', { n: income.tech, slow: income.techParts.base ? '' : t('hud.techSlow') }) : t('res.techTitle'),
      income ? `+${income.tech} ${when}` : null),
    player.shields || (!simple && !state.sandbox) ? stat('shield', 'shield', t('res.shields'), player.shields, t('res.shieldsTitle')) : null,
    actions ? turnClock(state) : null,
    el('span', { class: 'spacer' }),
    // Sem `actions` (tela só de leitura) a trilha de etapas fica no topo; com `actions` ela vira a navegação
    // da barra lateral.
    !actions && !simple ? el('div', { class: 'steps' }, steps.map((s) => el('span', { class: s === step ? 'on' : '' }, names[s]))) : null,
    actions ? sideRail(state, player, step, actions, steps, names, simple) : null,
  ]);
}

// Barra lateral fixa (padrão de aplicativos de trabalho: navegação em cima, utilidades embaixo).
// Em cima, as telas da partida (a atual marcada; Voo e Relatório só acendem quando a partida está neles).
// Embaixo: regras, dicas, tema e sair.
const RAIL_ICONS = { board: 'die', workshop: 'wrench', flight: 'rocket', report: 'clipboard' };
function sideRail(state, player, step, actions, steps, names, simple) {
  const item = (iconName, label, title, run, cls = '') => el('button', { type: 'button', class: `rail-item ${cls}`, title, onclick: run }, [icon(iconName, { size: 20 }), el('span', { class: 'rail-label' }, label)]);
  const canNavigate = !(step === 'flight' && player.flight?.pending); // decisão de voo pendente: resolva antes
  // Com a nave em voo a oficina fica fechada (sim/actions.js, inFlightLock): o atalho some da barra.
  const navSteps = steps.filter((s) => !(s === 'workshop' && player.flight && !state.sandbox && step !== 'workshop'));
  const nav = navSteps.map((s) => {
    const current = s === step;
    const b = item(RAIL_ICONS[s], names[s], names[s], () => { if (!current) actions.go(s); }, current ? 'on' : '');
    if (current) b.setAttribute('aria-current', 'page');
    else if (!canNavigate || s === 'flight' || s === 'report') b.disabled = true;
    return b;
  });
  const guide = item('compass', t('rail.guide'), guideOn() ? t('rail.guideOnTitle') : t('rail.guideOffTitle'), () => actions.toggleGuide(), `guide-toggle ${guideOn() ? 'on-soft' : ''}`);
  guide.setAttribute('aria-pressed', String(guideOn()));
  const theme = themeToggle();
  theme.className = 'rail-item theme-toggle';
  const en = getLang() === 'en';
  const langItem = item('globe', en ? 'EN' : 'PT', en ? t('lang.switchToPt') : t('lang.switchToEn'), () => actions.toggleLang(), 'lang-toggle');
  langItem.setAttribute('aria-label', en ? t('lang.switchToPt') : t('lang.switchToEn'));
  return el('nav', { class: 'side-rail', 'aria-label': t('rail.nav') }, [
    el('span', { class: 'rail-brand', 'aria-hidden': 'true' }, icon('rocket', { size: 20 })),
    // a classe `steps` (trilha de etapas) só entra fora da interface enxuta (test/ui-simple.test.mjs)
    el('div', { class: simple ? 'rail-nav' : 'rail-nav steps' }, nav),
    el('span', { class: 'rail-spacer' }),
    item('bulb', t('rail.rules'), t('rail.rulesTitle'), () => openRulesModal()),
    guide,
    langItem,
    theme,
    item('arrowLeft', t('rail.exit'), t('rail.exitTitle'), () => openExitDialog(actions), 'rail-exit'),
  ]);
}

// Sair da partida: confirmação própria (o navegador não mostra confirm() dentro do visualizador).
// Online, sai também da sala; se for o anfitrião, a partida termina para todos.
export function openExitDialog(actions) {
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const online = Boolean(actions.isOnline && actions.isOnline());
  const leave = () => {
    close();
    if (online) actions.lobby.leave();
    actions.newGame();
  };
  const backdrop = el('div', { class: 'modal-backdrop', onclick: close }, [
    el('div', { class: 'modal exit-dialog', role: 'dialog', 'aria-label': t('exit.title'), onclick: (e) => e.stopPropagation() }, [
      el('h2', { class: 'modal-title' }, t('exit.question')),
      el('p', {}, online ? t('exit.online') : t('exit.local')),
      el('div', { class: 'row modal-actions' }, [
        button(t('exit.leave'), leave, { class: 'danger' }),
        button(t('exit.stay'), close, { class: 'primary' }),
      ]),
    ]),
  ]);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
}

// Modal "Como funciona": passos da partida, lados e escadas, glossário. Abre pela tela inicial e pelo menu.
export function openRulesModal() {
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  // Um turno em três passos, desenhado como fluxo (o que vem depois do quê), com os ícones do tabuleiro.
  const step = (art, title, text) => el('li', { class: 'rm-step' }, [
    el('span', { class: 'rm-step-art', html: art }),
    el('strong', {}, title),
    el('small', {}, text),
  ]);
  // A escada de cada lado como linha do tempo: um degrau por missão, o último é a vitória.
  const side = (s) => el('section', { class: 'rm-side' }, [
    el('header', { class: 'rm-side-head' }, [
      el('span', { class: 'rm-side-ic' }, icon(s.icon, { size: 18 })),
      el('div', {}, [el('strong', {}, s.name), el('small', {}, s.focus)]),
    ]),
    el('ol', { class: 'rm-ladder' }, s.ladder.map((m, i) => el('li', { class: i === s.ladder.length - 1 ? 'goal' : '' }, [
      missionIcon(m, { size: 15 }), el('span', {}, MISSIONS[m].name),
    ]))),
    el('ul', { class: 'rm-traits' }, [
      el('li', { class: 'plus' }, [icon('arrowUp', { size: 14 }), el('span', {}, s.advantage)]),
      el('li', { class: 'minus' }, [icon('trendDown', { size: 14 }), el('span', {}, s.weakness)]),
    ]),
  ]);
  const backdrop = el('div', { class: 'modal-backdrop', onclick: close }, [
    el('div', { class: 'modal rules-modal', role: 'dialog', 'aria-label': t('rules.title'), onclick: (e) => e.stopPropagation() }, [
      el('div', { class: 'rm-head' }, [
        el('div', {}, [
          el('h2', { class: 'modal-title' }, t('rules.title')),
          el('p', { class: 'rm-lead' }, t('rules.lead')),
        ]),
        button(icon('x', { size: 16 }), close, { class: 'small ghost', title: t('common.close') }),
      ]),
      el('h3', { class: 'rm-label' }, t('rules.flowTitle')),
      el('ol', { class: 'rm-flow' }, [
        step(TILE_ART.start, t('step.board'), t('rules.step1', { rounds: ROUNDS_PER_YEAR })),
        step(TILE_ART.workshop, t('step.workshop'), t('rules.step2')),
        step(TILE_ART.tech, t('step.flight'), t('rules.step3')),
      ]),
      el('h3', { class: 'rm-label' }, t('rules.sidesTitle')),
      el('div', { class: 'rm-sides' }, Object.values(SIDES).map(side)),
      glossary(),
      el('p', { class: 'rm-foot' }, t('rules.footer')),
    ]),
  ]);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
}


// Botão que alterna entre o tema Claro (papel quente Íris) e Escuro (grafite neutro Íris).
export function themeToggle() {
  const renderContent = (b) => {
    const dark = themeOf() === 'escuro';
    b.innerHTML = '';
    b.appendChild(icon(dark ? 'sun' : 'moon', { size: 15 }));
    b.appendChild(document.createTextNode(dark ? t('theme.light') : t('theme.dark')));
    b.setAttribute('aria-pressed', String(dark));
    b.title = dark ? t('theme.toLight') : t('theme.toDark');
  };
  const b = el('button', {
    class: 'small ghost theme-toggle',
    onclick: () => { toggleTheme(); renderContent(b); },
  });
  renderContent(b);
  return b;
}

// Botão de idioma: alterna entre português e inglês. Precisa de `actions.toggleLang` (em main.js),
// porque trocar o idioma redesenha a tela inteira (todo texto muda), não só o botão.
export function langToggle(actions) {
  const en = getLang() === 'en';
  const b = button([icon('globe', { size: 16 }), en ? 'EN' : 'PT'], () => actions.toggleLang(), {
    class: `small ghost lang-toggle ${en ? 'en' : ''}`,
    title: en ? t('lang.switchToPt') : t('lang.switchToEn'),
  });
  b.setAttribute('aria-label', en ? t('lang.switchToPt') : t('lang.switchToEn'));
  return b;
}

// Botão que liga e desliga as orientações (preferência salva no navegador).
export function guideToggle(actions) {
  const on = guideOn();
  const b = button([icon('compass', { size: 16 }), on ? t('guide.on') : t('guide.off')], () => actions.toggleGuide(), {
    class: `small ghost guide-toggle ${on ? 'on' : ''}`,
    title: on ? t('guide.onTitle') : t('guide.offTitle'),
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
  return sidePanel('ladder', SIDES[player.side]?.icon || 'ladder', t('ladder.title', { side: sideLabel(player) }), [
    progressBar(prog.pct, prog.done ? 'done' : 'ok'),
    el('ol', { class: 'ladder' }, ladder.map((m, i) => {
      const done = player.completed.find((c) => c.missionId === m);
      const real = REAL_HISTORY[m].sides[player.side];
      const flying = player.flight?.missionId === m;
      const cls = i < player.step ? 'done' : i === player.step ? 'now' : '';
      const status = done ? t('ladder.doneYear', { year: done.year }) : flying ? t('ladder.flyingStage', { n: player.flight.stageIndex + 1, total: player.flight.plan.length }) : i === player.step ? t('ladder.current') : '';
      return el('li', { class: cls }, [
        el('span', { class: 'ladder-name' }, [done ? icon('check', { size: 16 }) : missionIcon(m, { size: 16 }), MISSIONS[m].name]),
        el('small', { class: 'hint' }, [status, status ? '. ' : '', t('ladder.realHistory', { year: real ?? t('ladder.never') })]),
      ]);
    })),
    el('p', { class: 'hint' }, t('ladder.note')),
  ], { hint: t('ladder.hint', { steps: prog.steps, total: prog.total }) });
}

// Rival escondido (IDEIA.md v3 seção 8): só aparece o que o espião ou os boatos revelaram.
export function rivalsPanel(state, player) {
  const rivals = state.players.filter((r) => r.id !== player.id);
  if (!rivals.length) return null;
  return sidePanel('rivals', 'eye', t('rivals.title'), [
    ...rivals.map((r) => {
      const info = player.intel[r.id];
      let text = t('rivals.unknown');
      if (info?.rumor) text = t('rivals.rumor', { year: info.year, steps: info.steps, total: info.total });
      else if (info) {
        const ship = info.inFlight ? t('rivals.shipFlying', { n: info.stage + 1, total: info.stages })
          : info.ready != null ? t('rivals.shipReady', { pct: pct(info.ready) }) : info.note || '';
        text = t('rivals.spy', { year: info.year, steps: info.steps, total: info.total, mission: info.mission ? t('rivals.aiming', { mission: info.mission }) : '', ship });
      }
      return el('div', { class: 'race-row' }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [avatar(r, 26), el('strong', {}, r.name), el('span', { class: 'chip small' }, sideBadge(r))]),
        el('small', { class: `hint ${info && !info.rumor ? 'intel' : ''}` }, text),
        // Público: o lançamento foi anunciado a todos. O resultado do voo e a nave por dentro continuam secretos.
        r.flight ? el('small', { class: 'hint flight-public' }, [icon('rocket', { size: 12 }), t('rivals.flightPublic')]) : null,
      ]);
    }),
  ], { defaultOpen: rivals.some((r) => r.flight), hint: t(rivals.length === 1 ? 'rivals.hint.one' : 'rivals.hint.other', { n: rivals.length }) + (rivals.some((r) => r.flight) ? t('rivals.hintFlying') : '') });
}

// Faixa da agência, sempre visível sob o tabuleiro e os botões de ação: os 4 prédios em cartões (nível,
// o que dão e o botão de subir com o custo) e o socorro de emergência. Prédio não construído aparece
// esmaecido, para o jogador ver o que existe. Construir continua sendo num terreno livre do tabuleiro.
const seenLevels = new Map(); // `${jogador}:${prédio}` -> nível já mostrado (para animar quando sobe)
export function agencyStrip(state, player, actions) {
  const cards = Object.values(BUILDINGS).map((b) => {
    const level = player.buildings[b.id] || 0;
    const key = `${player.id}:${b.id}`;
    const grew = seenLevels.has(key) && level > seenLevels.get(key);
    seenLevels.set(key, level);
    const built = level > 0;
    const maxed = level >= MAX_LEVEL;
    const cost = built && !maxed ? upgradeCostFor(state, player, b.id) : null;
    // "Foto" do prédio no nível atual: cresce a cada nível (ui/itemArt.js). Não construído: nível 1 apagado.
    return el('div', { class: `building-card${built ? '' : ' not-built'}${maxed ? ' maxed' : ''}${grew ? ' grew' : ''}`, 'data-level': String(level) }, [
      el('span', { class: 'bc-photo', 'aria-hidden': 'true', html: buildingPhotoSvg(b.id, { level: level || 1 }) }),
      el('div', { class: 'bc-head' }, [el('strong', {}, b.name)]),
      el('div', { class: 'bc-level' }, built
        ? [el('span', { class: 'pips' }, Array.from({ length: MAX_LEVEL }, (_, i) => el('span', { class: `pip${i < level ? ' on' : ''}` }))), el('span', {}, t('agency.level', { level, max: MAX_LEVEL }))]
        : el('span', { class: 'hint' }, t('agency.notBuilt'))),
      el('small', { class: 'hint' }, built ? b.effect : t('agency.buildHint', { cost: upgradeCost(0), effect: b.effect })),
      built && !maxed
        ? button([icon('arrowUp', { size: 14 }), t('agency.upgrade'), el('span', { class: 'num' }, cost)], () => actions.upgradeBuilding(b.id), {
          class: 'small upgrade', disabled: player.funds < cost,
          title: player.funds < cost ? t('agency.upgradeNeed', { n: cost - player.funds, level: level + 1 }) : t('agency.upgradeTitle', { level: level + 1, cost }),
        })
        : null,
      maxed ? el('span', { class: 'badge max' }, t('agency.maxed')) : null,
    ]);
  });
  return el('section', { class: 'panel agency-strip' }, [
    el('div', { class: 'strip-head' }, [
      panelTitle('building', t('agency.title')),
      player.funds < BAILOUT_LIMIT
        ? button([icon('lifebuoy', { size: 16 }), t('agency.bailout', { funds: BAILOUT_FUNDS, tech: BAILOUT_TECH_COST })], () => actions.requestBailout(), { class: 'small ghost' })
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
    el('span', { class: 'diff' }, t('mission.picker.diff', { difficulty: m.difficulty, n: flightPlan(m.id).length })),
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
    o.choice ? el('small', { class: 'hint' }, t('outcome.youChose', { choice: o.choice })) : null,
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
    g(['coins', tr('gauge.launchFunds')], player.funds, hasLauncher ? t.launchCost : '—', hasLauncher && player.funds < t.launchCost ? 'bad' : 'ok',
      hasLauncher ? ratio(player.funds, t.launchCost) : 1, tr('gauge.launchFunds.title')),
    g(['weight', tr('gauge.mass')], t.mass, hasLauncher ? t.maxMass : '—', hasLauncher && t.mass > t.maxMass ? 'bad' : 'ok',
      hasLauncher ? ratio(t.mass, t.maxMass) : 0, tr('gauge.mass.title')),
    g(['bolt', tr('gauge.power')], t.powerUse, t.powerGen, t.powerUse > t.powerGen ? 'bad' : 'ok',
      ratio(t.powerUse, t.powerGen), tr('gauge.power.title')),
    g(['dish', tr('gauge.data')], t.data, t.commsEffective, t.data > t.commsEffective ? 'warn' : 'ok',
      ratio(t.data, t.commsEffective), tr('gauge.data.title')),
    // Mínimos escondidos (sim/needs.js): mostra o que a nave entrega e "?" no lugar do mínimo, em cinza.
    hidden
      ? g(['atom', tr('gauge.science')], t.scienceEffective, '?', 'unknown', 0, tr('gauge.science.hidden', { hint: needLevel('science', m.needs.science) }))
      : g(['atom', tr('gauge.science')], t.scienceEffective, m.needs.science, t.scienceEffective < m.needs.science ? 'bad' : 'ok',
        ratio(t.scienceEffective, m.needs.science), tr('gauge.science.title')),
    hidden
      ? g(['signal', tr('gauge.comms')], t.commsEffective, '?', 'unknown', 0, tr('gauge.comms.hidden', { hint: needLevel('comms', m.needs.comms) }))
      : g(['signal', tr('gauge.comms')], t.commsEffective, m.needs.comms, t.commsEffective < m.needs.comms ? 'bad' : 'ok',
        ratio(t.commsEffective, m.needs.comms), tr('gauge.comms.title')),
    g(['hourglass', tr('gauge.lifetime')], t.lifetime, m.needs.lifetime, t.lifetime < m.needs.lifetime ? 'bad' : 'ok',
      ratio(t.lifetime, m.needs.lifetime), tr('gauge.lifetime.title')),
  ]);
}

export function checklist(checks) {
  // `hidden`: mínimo da missão ainda desconhecido (sim/needs.js): cinza, nem verde nem vermelho.
  return el('ul', { class: 'checklist' }, checks.map((c) => c.hidden
    ? el('li', { class: 'unknown' }, [icon('eye', { size: 15, label: t('check.unknown') }), el('span', {}, c.text)])
    : el('li', { class: c.ok ? 'ok' : c.hard ? 'bad' : 'warn' }, [icon(c.ok ? 'check' : c.hard ? 'x' : 'alert', { size: 15, label: c.ok ? t('check.ok') : c.hard ? t('check.blocks') : t('check.warn') }), el('span', {}, c.text)])));
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
  return sidePanel('log', 'book', t('log.title'), [el('ul', {}, entries.map((l) => el('li', {}, l.text)))], {
    defaultOpen: false, extraClass: 'log', hint: entries[0] ? entries[0].text : t('log.empty'),
  });
}

export function glossary(open = false) {
  const d = el('details', { class: 'panel glossary' }, [
    el('summary', {}, [icon('bookOpen', { size: 16 }), t('glossary.title')]),
    el('dl', {}, GLOSSARY.flatMap((g) => [el('dt', {}, g.term), el('dd', {}, g.text)])),
  ]);
  if (open) d.open = true;
  return d;
}
