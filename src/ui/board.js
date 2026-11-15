// Tela do tabuleiro: anel de 16 casas com os dados no centro, decisões da casa, escada, rivais e diário.
// Orientações (ui/guide.js) dizem o próximo passo e destacam o botão recomendado; o resumo do turno
// e o "desde o seu último turno" vêm de ui/summary.js.
import {
  el, button, hud, milestoneTrack, logPanel, ladderPanel, rivalsPanel, agencyPanel, sideBadge, sidePanel, MISSION_ICONS, simpleUi,
} from './components.js';
import { icon, dieFace } from './icons.js';
import { guideCard, hl } from './guide.js';
import { sinceCard } from './summary.js';
import { TILES } from '../board/board.js';
import { currentPlayer, SPY_COST } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { useFeeFor } from '../sim/actions.js';
import { MISSIONS } from '../data/missions.js';
import { ladderOf } from '../data/sides.js';
import { BUILDINGS, upgradeCost } from '../data/buildings.js';
import { FLIGHT_EVENTS } from '../data/events.js';
import { STAGES } from '../data/stages.js';
import { DILEMMAS } from '../data/dilemmas.js';

const TILE_ICONS = { start: 'flag', funds: 'coins', event: 'card', tech: 'flask', shop: 'cart', lot: 'crane', spy: 'eye', repair: 'wrench', catchup: 'lifebuoy' };
// Anel 5×5 no sentido horário a partir do canto superior esquerdo (o miolo 3×3 fica para os dados).
const RING_POS = ['1/1', '1/2', '1/3', '1/4', '1/5', '2/5', '3/5', '4/5', '5/5', '5/4', '5/3', '5/2', '5/1', '4/1', '3/1', '2/1'];
let lastRollSeen = null;

// Legenda curta da casa para a interface enxuta do começo. O que decide a escolha do dado (quanto dá)
// continua; o texto longo vai só para o balão (title), que sempre tem a legenda completa.
function shortSub(state, t) {
  switch (t.type) {
    case 'funds': return `${t.funds > 0 ? '+' : ''}${t.funds} verba`;
    case 'start': return `+${t.funds} ao passar`;
    case 'event': return 'sorteio';
    case 'tech': return `+${t.tech} tecnologia`;
    case 'shop': return 'peças novas';
    case 'spy': return 'ver um rival';
    case 'repair': return '+1 proteção';
    case 'catchup': return 'ajuda a quem está atrás';
    case 'lot': return state.lots[t.id] ? tileSub(state, t) : 'construir';
    default: return '';
  }
}

function tileSub(state, t) {
  switch (t.type) {
    case 'funds': return `${t.funds > 0 ? '+' : ''}${t.funds} verba`;
    case 'start': return `+${t.funds} ao passar`;
    case 'event': return 'carta de dilema; em voo, imprevisto';
    case 'tech': return `+${t.tech} tecnologia`;
    case 'shop': return `−${t.discount}% na próxima compra`;
    case 'spy': return `ver um rival: ${SPY_COST} (1 vez por ano)`;
    case 'repair': return '+1 proteção';
    case 'catchup': return `+${t.funds} se estiver atrás`;
    case 'lot': {
      const lot = state.lots[t.id];
      if (!lot) return `construir: ${upgradeCost(0)}`;
      const owner = state.players[lot.ownerId];
      return `${owner.name}, nível ${owner.buildings[lot.buildingId]}`;
    }
    default: return '';
  }
}

function tileIcon(state, t) {
  if (t.type === 'lot' && state.lots[t.id]) return BUILDINGS[state.lots[t.id].buildingId].icon;
  if (t.type === 'funds' && t.funds < 0) return 'trendDown';
  return TILE_ICONS[t.type];
}

// Carta de dilema: sempre uma escolha, conforme a situação do jogador.
function dilemmaDecision(state, actions) {
  const card = DILEMMAS.find((d) => d.id === state.pendingDilemma?.id);
  if (!card) return null;
  return el('div', { class: `tile-decision dilemma ${hl(state, 'board', 'dilemma')}` }, [
    el('strong', { class: 'decision-title' }, [icon('card', { size: 18 }), card.title]),
    el('small', { class: 'hint' }, card.text),
    el('div', { class: 'row wrap', style: 'justify-content:center' }, card.options.map((o, i) => button(o.label, () => actions.chooseDilemma(i), { class: 'small' }))),
  ]);
}

// Decisão da casa onde o jogador parou: construir, usar o prédio do rival ou espionar.
function tileDecision(state, p, actions) {
  const pending = state.pendingTile;
  if (!pending) return null;
  const cls = `tile-decision ${hl(state, 'board', 'tile')}`;
  if (pending.kind === 'build') {
    const options = Object.values(BUILDINGS).filter((b) => !p.buildings[b.id]);
    if (!options.length) return el('p', { class: 'hint' }, 'Você já tem todos os prédios. Suba o nível no painel da agência.');
    return el('div', { class: cls }, [
      el('strong', { class: 'decision-title' }, [icon('crane', { size: 18 }), `Terreno livre: construir por ${upgradeCost(0)}?`]),
      el('div', { class: 'row wrap', style: 'justify-content:center' }, [
        ...options.map((b) => button([icon(b.icon, { size: 16 }), b.name], () => actions.buildOnLot(b.id), { class: 'small', disabled: p.funds < upgradeCost(0), title: b.effect })),
        button('Seguir sem construir', () => actions.skipTile(), { class: 'small ghost' }),
      ]),
    ]);
  }
  if (pending.kind === 'spy') {
    const rivals = state.players.filter((r) => r.id !== p.id);
    return el('div', { class: cls }, [
      el('strong', { class: 'decision-title' }, [icon('eye', { size: 18 }), `Espionagem: ver o estado real de um rival por ${SPY_COST}?`]),
      el('div', { class: 'row wrap', style: 'justify-content:center' }, [
        ...rivals.map((r) => button([`${r.name}, `, ...[].concat(sideBadge(r))], () => actions.spyOn(r.id), { class: 'small', disabled: p.funds < SPY_COST })),
        button('Seguir sem espionar', () => actions.skipTile(), { class: 'small ghost' }),
      ]),
    ]);
  }
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const b = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  return el('div', { class: cls }, [
    el('strong', { class: 'decision-title' }, [icon(b.icon, { size: 18 }), `${b.name} de ${owner.name}`]),
    el('small', { class: 'hint' }, `Pague ${fee} a ${owner.name} e ganhe ${b.useText}. Os dois saem ganhando, mas você ajuda um rival.`),
    el('div', { class: 'row', style: 'justify-content:center' }, [
      button(`Usar por ${fee}`, () => actions.useRivalBuilding(), { class: 'small', disabled: p.funds < fee }),
      button('Seguir', () => actions.skipTile(), { class: 'small ghost' }),
    ]),
  ]);
}

// Centro do anel: dados (rolar 2, escolher 1) e as decisões da casa.
function centerPanel(state, p, actions, rolling) {
  let dice;
  if (state.dice) {
    dice = el('div', { class: 'dice-choice' }, [
      el('span', { class: 'label' }, 'Escolha um dado'),
      el('div', { class: 'row', style: 'justify-content:center' }, state.dice.map((d, i) =>
        button([dieFace(d, { size: 26 }), `Andar ${d}`], () => actions.moveBy(i), { class: `primary ${hl(state, 'board', 'die')}` }))),
    ]);
  } else if (!p.rolled) {
    dice = el('div', { class: 'dice-choice' }, [
      el('span', { class: 'label' }, `Vez de ${p.name}`),
      el('span', { class: 'dice-pair' }, [dieFace(5, { size: 46 }), dieFace(2, { size: 46 })]),
      button([icon('die', { size: 18 }), 'Rolar 2 dados'], () => actions.rollDice(), { class: `primary ${hl(state, 'board', 'roll')}` }),
    ]);
  } else {
    dice = el('div', { class: 'dice-choice' }, [
      el('span', { class: 'label' }, `${p.name} andou ${state.lastRoll}`),
      dieFace(state.lastRoll, { size: 54, className: rolling ? 'rolling' : '' }),
    ]);
  }
  return el('div', { class: 'panel ring-center' }, [dice, dilemmaDecision(state, actions), tileDecision(state, p, actions)]);
}

// Bloco "o que fazer agora" (fase 2 do turno), conforme a situação da nave.
function missionPanel(state, p, actions, simple = false) {
  if (p.flight) {
    const f = p.flight;
    const next = STAGES[f.plan[f.stageIndex]];
    const event = f.tileEvent ? FLIGHT_EVENTS[f.tileEvent] : null;
    return sidePanel('mission', 'satellite', `Em voo: ${MISSIONS[f.missionId].name}`, [
      el('p', { class: 'hint' }, `Próxima etapa: ${next.name} (${f.stageIndex + 1} de ${f.plan.length}).${event ? ` Imprevisto vindo do tabuleiro: ${event.title}.` : ''}`),
      p.flightAdvanced
        ? el('p', { class: 'hint' }, 'O voo já avançou neste turno.')
        : button([icon('satellite', { size: 18 }), 'Avançar o voo'], () => actions.advanceFlight(), { class: `primary ${hl(state, 'board', 'advance')}`, disabled: !p.rolled, title: p.rolled ? '' : 'Ande no tabuleiro primeiro: uma casa de evento pode trazer um imprevisto.' }),
      !p.rolled ? el('p', { class: 'hint' }, 'Role os dados antes: uma casa de evento pode trazer um imprevisto para o voo.') : null,
      el('p', { class: 'hint' }, 'Enquanto a nave voa, você já pode montar a próxima na oficina.'),
    ], { hint: `Etapa ${f.stageIndex + 1} de ${f.plan.length}` });
  }
  if (!p.missionId) {
    return sidePanel('mission', 'flag', 'Escada completa', [el('p', { class: 'hint' }, 'O vencedor é revelado no fim da rodada.')], { hint: 'Todos os degraus cumpridos' });
  }
  return sidePanel('mission', MISSION_ICONS[p.missionId] || 'rocket', MISSIONS[p.missionId].name, [
    el('p', { class: 'hint' }, MISSIONS[p.missionId].goal),
    // Interface enxuta: a vitória dita em uma frase, já que a aba da escada só aparece depois.
    simple ? el('p', { class: 'hint' }, `Objetivo da partida: cumprir os ${ladderOf(p).length} degraus da sua escada antes do rival.`) : null,
    milestoneTrack(p),
  ], { hint: 'Missão atual' });
}

// Passo a passo do turno, sempre visível: o que já foi feito e o que falta.
function turnSteps(state, p, design) {
  const moved = p.rolled && !state.dice;
  const tileDone = moved && !state.pendingTile && !state.pendingDilemma;
  const shipDone = p.flight ? p.flightAdvanced : p.launchedThisTurn || !p.missionId;
  const steps = [
    { label: 'Rolar e andar', done: moved },
    { label: 'Resolver a casa', done: tileDone },
    { label: p.flight ? 'Avançar o voo' : design.ok ? 'Lançar (opcional)' : 'Montar a nave', done: shipDone, optional: !p.flight },
    { label: 'Passar a vez', done: false },
  ];
  const current = steps.findIndex((s) => !s.done && !(s.optional && tileDone));
  return el('ol', { class: 'turn-steps', 'aria-label': 'Etapas do turno' }, steps.map((s, i) =>
    el('li', { class: s.done ? 'done' : i === current ? 'now' : '' }, [
      el('span', { class: 'n' }, s.done ? icon('check', { size: 14 }) : String(i + 1)),
      s.label,
    ])));
}

export function boardScreen(state, actions) {
  const p = currentPlayer(state);
  const design = p.missionId ? checkDesign(p) : { ok: false };
  const rolling = state.lastRoll != null && state.lastRoll !== lastRollSeen && p.rolled;
  if (p.rolled) lastRollSeen = state.lastRoll;
  const simple = simpleUi(state, p);

  const tiles = TILES.map((t, i) => {
    const [r, c] = RING_POS[i].split('/');
    const lot = state.lots[t.id];
    return el('div', { class: `tile tile-${t.type} ${p.position === t.id ? 'active' : ''} ${lot ? `owned o${lot.ownerId % 4}` : ''}`, style: `grid-row:${r};grid-column:${c}`, title: `${t.label}: ${tileSub(state, t)}` }, [
      el('div', { class: 'pawns' }, state.players.filter((pl) => !pl.bot && pl.position === t.id).map((pl) => el('span', { class: `pawn c${pl.id % 4}`, title: pl.name }, pl.name[0].toUpperCase()))),
      el('span', { class: 't-icon' }, icon(tileIcon(state, t), { size: 20 })),
      el('div', {}, [el('div', { class: 't-label' }, t.label), el('div', { class: 't-sub' }, simple ? shortSub(state, t) : tileSub(state, t))]),
    ]);
  });

  const canLaunch = design.ok && !p.flight && p.rolled && !p.launchedThisTurn;
  const launchTitle = p.flight ? 'Você já tem uma nave em voo.'
    : !p.rolled ? 'Ande no tabuleiro antes de lançar.'
      : design.ok ? 'Projeto pronto e verba suficiente.' : 'Resolva as pendências na oficina antes de lançar.';
  const mustAdvance = p.flight && !p.flightAdvanced;
  const blocked = !p.rolled || mustAdvance || Boolean(state.pendingDilemma);
  const blockedReason = !p.rolled ? 'Role os dados para poder passar a vez.'
    : state.pendingDilemma ? 'Resolva a carta de dilema para poder passar a vez.'
      : mustAdvance ? 'Avance o voo para poder passar a vez.' : '';

  // Interface enxuta: um passo de cada vez. Rolar primeiro; Oficina e Passar a vez só depois de andar;
  // Lançar só quando o projeto fecha. Com a nave em voo aparece tudo (o jogador já conhece o turno).
  const showWorkshop = !simple || p.rolled || Boolean(p.flight);
  const showLaunch = !simple || design.ok || Boolean(p.flight) || p.launchedThisTurn;
  const showEnd = !simple || p.rolled;
  const actionBar = [
    showWorkshop && button([icon('wrench', { size: 18 }), 'Oficina'], () => actions.go('workshop'), { class: hl(state, 'board', 'workshop') }),
    showLaunch && button([icon('rocket', { size: 18 }), 'Lançar'], () => actions.launch(), { disabled: !canLaunch, title: launchTitle, class: hl(state, 'board', 'launch') }),
    showEnd && button(['Passar a vez', icon('arrowRight', { size: 18 })], () => actions.endTurn(), { disabled: blocked, class: `ghost ${hl(state, 'board', 'end')}`, title: blockedReason }),
  ].filter(Boolean);

  // Abas da lateral: no começo só a missão e o diário; o resto aparece quando passa a fazer sentido.
  const showLadder = !simple;
  const showRivals = !simple || Object.keys(p.intel).length > 0 || state.round > 3;
  const showAgency = !simple || Object.values(p.buildings).some(Boolean);

  return el('section', { class: 'screen board-screen' }, [
    hud(state, p, 'board', actions),
    guideCard(state, 'board'),
    el('div', { class: 'board-layout' }, [
      el('div', {}, [
        sinceCard(state),
        turnSteps(state, p, design),
        el('div', { class: 'ring ring-16' }, [...tiles, centerPanel(state, p, actions, rolling)]),
        actionBar.length ? el('div', { class: 'row action-bar' }, actionBar) : null,
        blocked && blockedReason && showEnd ? el('p', { class: 'hint action-hint' }, blockedReason) : null,
      ]),
      el('div', { class: 'side-stack' }, [
        missionPanel(state, p, actions, simple),
        showLadder ? ladderPanel(state, p) : null,
        showRivals ? rivalsPanel(state, p) : null,
        showAgency ? agencyPanel(state, p, actions) : null,
        logPanel(state, p),
      ]),
    ]),
  ]);
}

