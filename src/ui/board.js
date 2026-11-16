// Tela do tabuleiro: planta de engenharia (cianotipia) + tabuleiro estilo Monopoly
// (caminhos conectados, faixas de propriedade, cantos especiais, ilustrações vetoriais em cada casa
// e baralhos de cartas no tapete central), mantendo 100% da mecânica e dos testes.
// Orientações (ui/guide.js) dizem o próximo passo e destacam o botão recomendado; o "desde o seu último
// turno" vem de ui/summary.js e o retorno imediato (outcomeCard) e a faixa de prédios, de ui/components.js.
import {
  el, button, hud, milestoneTrack, logPanel, ladderPanel, rivalsPanel, agencyStrip, sideBadge, sidePanel, MISSION_ICONS, simpleUi, outcomeCard,
} from './components.js';
import { icon } from './icons.js';
import { dieSvg, TILE_ART, ORBIT_ART } from './boardArt.js';
import { buildingPhotoSvg } from './itemArt.js';
import { walkPawn, scrollIntoViewIfNeeded } from './motion.js';
import { guideCard, hl } from './guide.js';
import { sinceCard } from './summary.js';
import { TILES, atWorkshopTile } from '../board/board.js';
import { currentPlayer, SPY_COST, SABOTAGE_COST } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { useFeeFor } from '../sim/actions.js';
import { MISSIONS } from '../data/missions.js';
import { blueprintPrice, blueprintCostFor, itemOf, isLauncherId } from '../sim/suppliers.js';
import { ORBITS } from '../data/orbits.js';
import { ladderOf } from '../data/sides.js';
import { BUILDINGS, upgradeCost } from '../data/buildings.js';
import { FLIGHT_EVENTS } from '../data/events.js';
import { STAGES } from '../data/stages.js';
import { DILEMMAS } from '../data/dilemmas.js';
import { yearOf, ROUNDS_PER_YEAR } from '../data/history.js';
import { t } from '../i18n/index.js';

// Anel quadrado no sentido horário a partir do canto superior esquerdo, calculado pelo número de casas
// (16 casas = 5×5, 20 casas = 6×6); o miolo fica para os dados. Cantos, setas e a trilha saem da mesma conta.
const RING_N = TILES.length / 4 + 1;
const RING_POS = TILES.map((_, i) => {
  const side = RING_N - 1;
  if (i < side) return `1/${i + 1}`;
  if (i < 2 * side) return `${i - side + 1}/${RING_N}`;
  if (i < 3 * side) return `${RING_N}/${RING_N - (i - 2 * side)}`;
  return `${RING_N - (i - 3 * side)}/1`;
});
// Centro de cada casa num viewBox 600×600 (para a trilha e o rastro do movimento).
const TILE_CENTERS = RING_POS.map((rc) => {
  const [r, c] = rc.split('/').map(Number);
  const cell = 600 / RING_N;
  return [Math.round((c - 0.5) * cell), Math.round((r - 0.5) * cell)];
});
const STEP_DIRS = TILES.map((_, i) => ['→', '↓', '←', '↑'][Math.floor(i / (RING_N - 1))]);
const CORNER_IDS = new Set([0, 1, 2, 3].map((k) => k * (RING_N - 1)));
// Grade do anel com os cantos maiores (1,4× na largura e mais altos), como num tabuleiro impresso.
export const RING_STYLE = `--ring-n:${RING_N};grid-template-columns:1.4fr repeat(${RING_N - 2}, minmax(0, 1fr)) 1.4fr;`
  + `grid-template-rows:minmax(80px, auto) repeat(${RING_N - 2}, minmax(58px, auto)) minmax(80px, auto)`;
let lastRollSeen = null;
let lastDiceKey = null;
let lastCardKey = null;     // carta já mostrada no miolo (entra saindo do baralho só quando é nova)
let dismissedOutcome = null; // aviso de resultado que o jogador fechou no X
let knownLots = null;      // terrenos com prédio no desenho anterior (o prédio novo "sobe" na casa)
const freshLots = new Set();     // último par de dados já mostrado (para girar só os recém-rolados)
const lastPositions = {};   // casa de cada jogador no desenho anterior (o peão anda a partir dela)

// Nome curto na casa: o que vem antes dos dois-pontos ("Discurso", "Crise diplomática"); o completo fica no balão.
const shortName = (t) => t.label.split(':')[0];

function shortSub(state, tile) {
  switch (tile.type) {
    case 'funds': return t('board.sub.funds', { v: `${tile.funds > 0 ? '+' : ''}${tile.funds}` });
    case 'start': return t('board.sub.start', { n: tile.funds });
    case 'event': return t('board.sub.eventShort');
    case 'tech': return t('board.sub.tech', { n: tile.tech });
    case 'shop': return t('board.sub.shopShort');
    case 'workshop': return t('board.sub.workshopShort');
    case 'spy': return t('board.sub.spyShort');
    case 'repair': return t('board.sub.repair');
    case 'catchup': return t('board.sub.catchupShort', { n: tile.funds });
    case 'lot': return state.lots[tile.id] ? tileSub(state, tile) : t('board.sub.build');
    default: return '';
  }
}

function tileSub(state, tile) {
  switch (tile.type) {
    case 'funds': return t('board.sub.funds', { v: `${tile.funds > 0 ? '+' : ''}${tile.funds}` });
    case 'start': return t('board.sub.start', { n: tile.funds });
    case 'event': return t('board.sub.event');
    case 'tech': return t('board.sub.tech', { n: tile.tech });
    case 'shop': return t('board.sub.shop');
    case 'workshop': return t('board.sub.workshop');
    case 'spy': return t('board.sub.spy', { cost: SPY_COST });
    case 'repair': return t('board.sub.repair');
    case 'catchup': return t('board.sub.catchup', { n: tile.funds });
    case 'lot': {
      const lot = state.lots[tile.id];
      if (!lot) return t('board.sub.buildCost', { cost: upgradeCost(0) });
      const owner = state.players[lot.ownerId];
      return t('board.sub.lotOwned', { owner: owner.name, level: owner.buildings[lot.buildingId] });
    }
    default: return '';
  }
}

// Ilustração vetorial estilo jogo de tabuleiro (Monopoly espacial) para cada casa
function tileBoardArt(state, tile, targetDice) {
  const lot = state.lots[tile.id];
  const isCorner = CORNER_IDS.has(tile.id);
  const dir = STEP_DIRS[tile.id];
  const num = String(tile.id).padStart(2, '0');
  // Faixa do topo: o tipo real da casa (o mesmo que decide o efeito), nunca um rótulo de enfeite.
  const BAND = { start: t('board.band.start'), event: t('board.band.event'), tech: t('board.band.tech'), shop: t('board.band.shop'), workshop: t('board.band.workshop'), spy: t('board.band.spy'), repair: t('board.band.repair'), catchup: t('board.band.catchup') };
  let bandTitle = BAND[tile.type] || t('board.band.tile', { num });
  if (tile.type === 'funds') bandTitle = tile.funds > 0 ? t('board.band.funds') : t('board.band.crisis');
  else if (tile.type === 'lot') {
    if (lot) {
      const lvl = state.players[lot.ownerId].buildings[lot.buildingId] || 1;
      bandTitle = `${'★'.repeat(lvl)} ${t('board.band.level', { lvl })}`;
    } else bandTitle = t('board.band.lot');
  }

  // Ícone de traço único (ui/boardArt.js), na cor da tinta da planta. Terreno com prédio mostra o prédio.
  const art = lot ? buildingPhotoSvg(lot.buildingId, { bare: true, level: state.players[lot.ownerId].buildings[lot.buildingId] || 1 }) : TILE_ART[tile.type === 'funds' && tile.funds < 0 ? 'crisis' : tile.type] || '';

  const targetBadge = targetDice
    ? `<span class="t-target-pill">${t('board.diceTarget', { n: targetDice })}</span>`
    : '';

  const wrap = document.createElement('div');
  wrap.className = `t-monopoly-top ${isCorner ? 'is-corner' : ''}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <div class="t-band">
      <span class="t-band-num">${bandTitle}</span>
      <span class="t-band-dir">${dir}</span>
    </div>
    <div class="t-art-row">
      <span class="t-art-ink${lot ? ' t-art-photo' : ''}">${art}</span>
      ${targetBadge}
    </div>
  `;
  return wrap;
}

// Trilha contínua do tabuleiro conectando as casas, com o rastro do último movimento
function boardMapLayer(state, p) {
  const wrap = document.createElement('div');
  wrap.className = 'gadget-map-layer';
  wrap.setAttribute('aria-hidden', 'true');

  // Rastro do último movimento do jogador pela trilha (traço de propulsão âmbar).
  const trailPts = [];
  if (p.rolled && state.lastRoll) {
    const n = TILES.length;
    const startIdx = (p.position - state.lastRoll + n) % n;
    for (let s = 0; s <= state.lastRoll; s += 1) trailPts.push(TILE_CENTERS[(startIdx + s) % n].join(','));
  }
  const trailSvg = trailPts.length > 1
    ? `<polyline points="${trailPts.join(' ')}" fill="none" stroke="#f2c14e" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
    : '';

  // Trilha como órbita fina (vector-effect: o traço não deforma quando o tabuleiro estica na largura).
  wrap.innerHTML = `
    <svg class="gadget-map-svg" viewBox="0 0 600 600" preserveAspectRatio="none" focusable="false">
      <rect x="${TILE_CENTERS[0][0]}" y="${TILE_CENTERS[0][1]}" width="${600 - 2 * TILE_CENTERS[0][0]}" height="${600 - 2 * TILE_CENTERS[0][1]}" rx="30" fill="none" stroke="rgba(150, 175, 255, 0.28)" stroke-width="1.5" stroke-dasharray="1 7" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      ${trailSvg}
    </svg>
  `;
  return wrap;
}

// O que uma oferta do fornecedor dá e custa, em uma linha para o balão.
function offerInfo(id) {
  const it = itemOf(id);
  if (isLauncherId(id)) return t('board.offer.launcher', { maxMass: it.maxMass, cost: it.cost, reach: it.reach.join(', '), minTech: it.minTech });
  const gains = [it.powerGen && t('board.offer.power', { n: it.powerGen }), it.commsRate && t('board.offer.comms', { n: it.commsRate }), it.science && t('board.offer.science', { n: it.science }), it.lifetimeBonus && t('board.offer.life', { n: it.lifetimeBonus }), it.lifeSupport && t('board.offer.lifeSupport')].filter(Boolean);
  const costs = [t('board.offer.mass', { n: it.mass }), it.power && t('board.offer.powerCost', { n: it.power }), it.dataRate && t('board.offer.data', { n: it.dataRate }), t('board.offer.partCost', { n: it.cost })].filter(Boolean);
  return t('board.offer.info', { gains: gains.join(', ') || t('board.offer.nothing'), costs: costs.join(', '), minTech: it.minTech });
}

// Cartão de decisão no miolo (dilema, terreno, fornecedor, espião), no estilo do console.
function deckCard(kind, title, text, buttons, extraClass = '') {
  return el('div', { class: `tile-decision deck-${kind} ${extraClass}` }, [
    el('strong', { class: 'decision-title' }, title),
    text ? el('small', { class: 'hint' }, text) : null,
    el('div', { class: 'row wrap', style: 'justify-content:center' }, buttons),
  ]);
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
    if (!options.length) return el('p', { class: 'hint' }, t('board.build.all'));
    return el('div', { class: cls }, [
      el('strong', { class: 'decision-title' }, [icon('crane', { size: 18 }), t('board.build.q', { cost: upgradeCost(0) })]),
      el('div', { class: 'build-options' }, options.map((b) => button([el('span', { class: 'build-photo', 'aria-hidden': 'true', html: buildingPhotoSvg(b.id) }), el('span', { class: 'build-name' }, b.name)], () => actions.buildOnLot(b.id), { class: 'build-option', disabled: p.funds < upgradeCost(0), title: b.effect }))),
      el('div', { class: 'row', style: 'justify-content:center' }, [
        button(t('board.build.skip'), () => actions.skipTile(), { class: 'small ghost' }),
      ]),
    ]);
  }
  if (pending.kind === 'supplier') {
    const first = !p.freeBlueprintUsed;
    return deckCard('shop', t('board.supplier.title'), first ? t('board.supplier.hintFirst') : t('board.supplier.hint'), [
      ...pending.offers.map((id) => {
        const price = blueprintCostFor(p, id);
        return button([el('span', {}, itemOf(id).name), el('span', { class: 'gb-price' }, price ? `${price}` : t('board.supplier.free'))], () => actions.buyBlueprint(id), { class: 'gb-btn', disabled: p.funds < price, title: `${offerInfo(id)} ${t('board.supplier.bpInfo', { price: price || t('board.supplier.free'), normal: blueprintPrice(id) })}` });
      }),
      button(t('board.go'), () => actions.skipTile(), { class: 'gb-btn ghost' }),
    ], cls);
  }
  if (pending.kind === 'spy') {
    const rivals = state.players.filter((r) => r.id !== p.id);
    return deckCard('spy', t('board.spy.title'), t('board.spy.hint', { spy: SPY_COST, sabotage: SABOTAGE_COST }), [
      ...rivals.map((r) => button([t('board.spy.observe', { name: r.name }) + ' ', ...[].concat(sideBadge(r))], () => actions.spyOn(r.id), { class: 'gb-btn', disabled: p.funds < SPY_COST })),
      ...rivals.map((r) => button([t('board.spy.sabotage', { name: r.name }) + ' ', ...[].concat(sideBadge(r))], () => actions.sabotage(r.id), { class: 'gb-btn', disabled: p.funds < SABOTAGE_COST || Boolean(r.interference), title: r.bot ? t('board.spy.sabotageBotTitle') : t('board.spy.sabotageTitle') })),
      button(t('board.spy.skip'), () => actions.skipTile(), { class: 'gb-btn ghost' }),
    ], cls);
  }
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const b = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  return el('div', { class: cls }, [
    el('strong', { class: 'decision-title' }, [icon(b.icon, { size: 18 }), t('board.rival.of', { building: b.name, owner: owner.name })]),
    el('small', { class: 'hint' }, t('board.rival.hint', { fee, owner: owner.name, use: b.useText })),
    el('div', { class: 'row', style: 'justify-content:center' }, [
      button(t('board.rival.use', { fee }), () => actions.useRivalBuilding(), { class: 'small', disabled: p.funds < fee }),
      button(t('board.go'), () => actions.skipTile(), { class: 'small ghost' }),
    ]),
  ]);
}

// Monte de cartas de dilema no tapete central. Só aparece com o centro livre (sem decisão nem resultado),
// para não disputar espaço com o que o jogador precisa ler.
function dilemmaDeck(state, p) {
  if (state.pendingDilemma || state.pendingTile || (state.outcome && state.outcome.playerId === p.id)) return null;
  return el('div', { class: 'center-court-decks', 'aria-hidden': 'true' }, [
    el('div', { class: 'court-deck deck-dilemma' }, [el('span', { class: 'deck-icon' }, '?'), el('span', { class: 'deck-label' }, t('board.deck.dilemmas'))]),
  ]);
}

// Dados do miolo (função da equipe, 15/11, no visual do nosso console): antes de rolar, os dois dados
// mostram "?" e são o próprio botão de rolar; recém-rolados, entram girando (CSS .tumble) e cada um vira
// um botão "andar N". Passar o mouse (ou o foco) num dado acende a casa onde ele para.
function diceView(state, p, actions, rolling) {
  if (state.dice) {
    const key = `${state.round}:${state.turn}:${state.dice.join(',')}`;
    const fresh = key !== lastDiceKey;
    lastDiceKey = key;
    // Passar o mouse num dado acende a casa onde ele para e desenha o caminho pela trilha.
    const preview = (d, on) => () => {
      const tile = document.querySelector(`[data-tile="${(p.position + d) % TILES.length}"]`);
      if (tile) tile.classList.toggle('tile-preview', on);
      document.querySelector('.route-preview')?.remove();
      const svg = document.querySelector('.gadget-map-svg');
      if (!on || !svg) return;
      const ptsList = Array.from({ length: d + 1 }, (_, k) => TILE_CENTERS[(p.position + k) % TILES.length].join(',')).join(' ');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', ptsList);
      line.setAttribute('class', 'route-preview');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(line);
    };
    return el('div', { class: 'dice-choice gb-dice' }, [
      el('div', { class: 'gb-dice-row' }, state.dice.map((d, i) => {
        const b = button([el('span', { class: `gb-die ${fresh ? 'tumble' : ''}`, style: `--i:${i}`, html: dieSvg(d) }), el('span', {}, t('board.walkN', { d }))],
          () => actions.moveBy(i), { class: `gb-die-btn ${hl(state, 'board', 'die')}`, title: t(d > 1 ? 'board.walkTiles.other' : 'board.walkTiles.one', { d }) });
        b.addEventListener('mouseenter', preview(d, true));
        b.addEventListener('mouseleave', preview(d, false));
        b.addEventListener('focus', preview(d, true));
        b.addEventListener('blur', preview(d, false));
        return b;
      })),
      el('span', { class: 'label' }, t('board.chooseDie')),
    ]);
  }
  if (!p.rolled) {
    return el('div', { class: 'dice-choice gb-dice' }, [
      button([el('span', { class: 'gb-die idle', html: dieSvg(0) }), el('span', { class: 'gb-die idle', html: dieSvg(0) })],
        () => actions.rollDice(), { class: 'gb-die-btn pair', title: t('board.roll') }),
      el('span', { class: 'label' }, t('board.turnClickDice', { name: p.name })),
    ]);
  }
  return el('div', { class: 'dice-choice gb-dice' }, [
    el('span', { class: `gb-die ${rolling ? 'landed' : ''}`, html: dieSvg(state.lastRoll) }),
    el('span', { class: 'label' }, t(state.lastRoll > 1 ? 'board.walked.other' : 'board.walked.one', { name: p.name, n: state.lastRoll })),
  ]);
}

// Centro do anel: faixa de situação, dados e as decisões da casa.
function centerPanel(state, p, actions, rolling) {
  const activeTile = TILES[p.position];
  const bannerText = state.dice
    ? t('board.banner.chooseDie')
    : !p.rolled
      ? t('board.banner.turn', { name: p.name.toUpperCase() })
      : t('board.banner.tile', { num: String(p.position).padStart(2, '0'), label: activeTile.label.toUpperCase() });
  const decision = dilemmaDecision(state, actions) || tileDecision(state, p, actions);
  // Aviso de resultado com X para fechar (não volta a aparecer depois de fechado).
  const outcomeKey = state.outcome ? `${state.round}:${state.turn}:${state.outcome.title}:${state.outcome.choice || ''}` : null;
  const outcome = outcomeKey && outcomeKey === dismissedOutcome ? null : outcomeCard(state, p);
  if (outcome) {
    const close = button(icon('x', { size: 14 }), () => { dismissedOutcome = outcomeKey; outcome.remove(); }, { class: 'card-close', title: t('board.closeAlert') });
    close.setAttribute('aria-label', t('board.closeAlert'));
    outcome.appendChild(close);
  }
  const cardKey = decision ? `d:${state.round}:${state.turn}:${p.position}:${state.pendingDilemma?.id || state.pendingTile?.kind}`
    : outcome ? `o:${state.round}:${state.turn}:${state.outcome?.title}` : null;
  const fresh = cardKey && cardKey !== lastCardKey;
  lastCardKey = cardKey;
  if (fresh) [decision, outcome].forEach((n) => { if (n && n.className != null) n.className += ' deal-in'; });
  return el('div', { class: 'panel ring-center gb-center' }, [
    el('span', { class: 'center-orbits', 'aria-hidden': 'true', html: ORBIT_ART }),
    dilemmaDeck(state, p),
    el('div', { class: 'gadget-banner', 'aria-hidden': 'true' }, [el('div', { class: 'gadget-banner-plate' }, bannerText)]),
    diceView(state, p, actions, rolling),
    // Aviso e decisão empilhados (aviso em cima), nunca um cobrindo o outro.
    decision || outcome ? el('div', { class: 'center-cards' }, [outcome, decision]) : null,
  ]);
}

// Bloco da missão atual (lateral), conforme a situação da nave.
function missionPanel(state, p, simple = false) {
  if (p.flight) {
    const f = p.flight;
    const next = STAGES[f.plan[f.stageIndex]];
    const event = f.tileEvent ? FLIGHT_EVENTS[f.tileEvent] : null;
    return sidePanel('mission', 'satellite', t('board.mission.flying', { name: MISSIONS[f.missionId].name }), [
      el('p', { class: 'hint' }, t('board.mission.nextStage', { name: next.name, n: f.stageIndex + 1, total: f.plan.length }) + (event ? t('board.mission.tileEvent', { title: event.title }) : '')),
      p.flightAdvanced ? el('p', { class: 'hint' }, t('board.mission.advanced'))
        : el('p', { class: 'hint' }, !p.rolled ? t('board.mission.rollFirst') : t('board.mission.advanceDock')),
      el('p', { class: 'hint' }, t('board.mission.nextShip')),
    ], { hint: t('board.mission.stageHint', { n: f.stageIndex + 1, total: f.plan.length }) });
  }
  if (!p.missionId) {
    return sidePanel('mission', 'flag', t('board.mission.ladderDone'), [el('p', { class: 'hint' }, t('board.mission.winnerEnd'))], { hint: t('board.mission.allDone') });
  }
  return sidePanel('mission', MISSION_ICONS[p.missionId] || 'rocket', MISSIONS[p.missionId].name, [
    el('p', { class: 'hint' }, MISSIONS[p.missionId].goal),
    // Interface enxuta: a vitória dita em uma frase, já que a aba da escada só aparece depois.
    simple ? el('p', { class: 'hint' }, t('board.mission.simpleGoal', { n: ladderOf(p).length })) : null,
    milestoneTrack(p),
  ], { hint: t('board.mission.current') });
}

// Passo a passo do turno, sempre visível na barra fixa: o que já foi feito e o que falta.
function turnSteps(state, p, design) {
  const moved = p.rolled && !state.dice;
  const tileDone = moved && !state.pendingTile && !state.pendingDilemma;
  const shipDone = p.flight ? p.flightAdvanced : p.launchedThisTurn || !p.missionId;
  const steps = [
    { label: t('board.step.roll'), done: moved },
    { label: t('board.step.tile'), done: tileDone },
    { label: p.flight ? t('board.step.advance') : design.ok ? t('board.step.launchOpt') : t('board.step.build'), done: shipDone, optional: !p.flight },
    { label: t('board.step.end'), done: false },
  ];
  const current = steps.findIndex((s) => !s.done && !(s.optional && tileDone));
  return el('ol', { class: 'turn-steps', 'aria-label': t('board.turnSteps') }, steps.map((s, i) =>
    el('li', { class: s.done ? 'done' : i === current ? 'now' : '', title: `${i + 1}. ${s.label}` }, [
      el('span', { class: 'n' }, s.done ? icon('check', { size: 14 }) : String(i + 1)),
      el('span', { class: 'lbl' }, s.label),
    ])));
}

// Barra fixa do turno: os passos à esquerda e, à direita, só as ações que fazem sentido agora.
// A ação recomendada é a primária (cheia); as outras ficam discretas.
function turnDock(state, p, design, actions, simple) {
  const inShop = atWorkshopTile(p);
  const canLaunch = design.ok && !p.flight && p.rolled && !p.launchedThisTurn && inShop;
  const launchTitle = p.flight ? t('board.launch.inFlight')
    : !p.rolled ? t('board.launch.moveFirst')
      : !inShop ? t('board.launch.needShop')
      : design.ok ? t('board.launch.ready') : t('board.launch.fix');
  const mustAdvance = p.flight && !p.flightAdvanced;
  const deciding = Boolean(state.pendingDilemma || state.pendingTile);
  const blocked = !p.rolled || mustAdvance || Boolean(state.pendingDilemma);
  const blockedReason = !p.rolled ? t('board.end.roll')
    : state.pendingDilemma ? t('board.end.dilemma')
      : mustAdvance ? t('board.end.advance') : '';

  let main = [];
  let note = null;
  if (state.dice) {
    main = state.dice.map((d, i) => button([el('span', { class: 'dock-die', html: dieSvg(d) }), t('board.walkBtn', { d })], () => actions.moveBy(i), { class: `primary reveal ${hl(state, 'board', 'die')}` }));
    note = t('board.note.chooseDie');
  } else if (!p.rolled) {
    main = [button([icon('die', { size: 18 }), t('board.roll')], () => actions.rollDice(), { class: `primary ${hl(state, 'board', 'roll')}` })];
  } else if (deciding) {
    note = t('board.note.decide');
  }

  // A Oficina fica SEMPRE na barra: dá para planejar a nave antes de rolar (só o lançamento exige andar).
  // Com a nave em voo ela fecha.
  const showWorkshop = !p.flight;
  const early = showWorkshop && !(p.rolled && !state.dice)
    ? button([icon('wrench', { size: 18 }), t('step.workshop')], () => actions.go('workshop'), { class: `ghost ${hl(state, 'board', 'workshop')}`, title: inShop ? t('board.workshop.build') : t('board.workshop.plan') })
    : null;

  // Depois de andar: oficina, voo, lançar e passar a vez (interface enxuta: um passo de cada vez).
  const after = [];
  if (p.rolled && !state.dice) {
    const showLaunch = !simple || design.ok || p.launchedThisTurn;
    // Só UMA ação cheia por vez: a oficina se a nave não fecha, o Lançar se fecha, e o Passar a vez quando
    // não sobrou nada recomendado (voo avançado, lançou ou a escada acabou).
    const turnDone = !blocked && !deciding && (p.flight ? p.flightAdvanced : p.launchedThisTurn || !p.missionId);
    if (mustAdvance) after.push(button([icon('satellite', { size: 18 }), t('board.advanceFlight')], () => actions.advanceFlight(), { class: `primary ${hl(state, 'board', 'advance')}` }));
    if (showWorkshop) after.push(button([icon('wrench', { size: 18 }), t('step.workshop')], () => actions.go('workshop'), { class: `${!design.ok && !p.launchedThisTurn ? 'primary' : ''} ${hl(state, 'board', 'workshop')}` }));
    if (showLaunch && !p.flight) after.push(button([icon('rocket', { size: 18 }), t('board.launchBtn')], () => actions.launch(), { disabled: !canLaunch, title: launchTitle, class: `${canLaunch ? 'primary launch-ready' : ''} ${hl(state, 'board', 'launch')}` }));
    after.push(button([t('board.endTurn'), icon('arrowRight', { size: 18 })], () => actions.endTurn(), { disabled: blocked, class: `${turnDone ? 'primary' : 'ghost'} ${hl(state, 'board', 'end')}`, title: blockedReason }));
  }

  return el('div', { class: 'turn-dock', role: 'region', 'aria-label': t('board.turnActions') }, [
    turnSteps(state, p, design),
    el('div', { class: 'dock-actions' }, [
      note ? el('span', { class: 'dock-note' }, note) : null,
      early,
      ...main,
      after.length ? el('div', { class: 'row action-bar' }, after) : null,
    ]),
  ]);
}

// Topo do console: visor com o ano e a rodada (dados reais da partida) e a casa atual.
function gadgetTopBar(state, p) {
  const roundInYear = ((state.round - 1) % ROUNDS_PER_YEAR) + 1;
  return el('div', { class: 'gadget-top', 'aria-hidden': 'true' }, [
    el('div', { class: 'gadget-lcd-bezel' }, [
      el('div', { class: 'gadget-lcd-screen' }, t('board.lcd', { year: yearOf(state.round), n: roundInYear, total: ROUNDS_PER_YEAR })),
    ]),
    el('span', { class: 'g-chip coral' }, t('board.banner.tile', { num: String(p.position).padStart(2, '0'), label: TILES[p.position].label.toUpperCase() })),
  ]);
}

// Peão de cada agência: um foguete na cor do jogador (os mesmos tons dos avatares do topo), com contorno
// branco para aparecer sobre a casa. Com a nave em voo (lançar é público) o foguete ganha a chama acesa.
const PAWN_COLORS = ['#6ea6ee', '#f0cf7a', '#4cc49a', '#f08a5c'];
function rocketPawnSvg(color, flying) {
  return `<svg viewBox="0 0 20 30" aria-hidden="true" focusable="false">
    <path class="rk-flame${flying ? ' on' : ''}" d="M7.2 23.5 10 29.5l2.8-6z" fill="#ffc857" stroke="#ff7a3c" stroke-width="0.8"/>
    <path d="M10 1.2c3.6 3 5.2 7.2 5.2 12.3v8.7H4.8v-8.7C4.8 8.4 6.4 4.2 10 1.2z" fill="${color}" stroke="#f2f6ff" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M4.8 15.5 1.6 20.5v3.6l3.2-1.9zM15.2 15.5l3.2 5v3.6l-3.2-1.9z" fill="${color}" stroke="#f2f6ff" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="10" cy="11" r="2.4" fill="#10213d" stroke="#f2f6ff" stroke-width="1"/>
    <path d="M7 22.2h6" stroke="#f2f6ff" stroke-width="1.1"/>
  </svg>`;
}

// Uma casa do tabuleiro. Exportada para a tela de espectador (ui/spectate.js) usar o mesmo tabuleiro.
// `current` é o jogador cuja casa fica destacada; `targetDice` marca a casa onde um dos dados para.
export function boardTile(state, t, i, current, simple, targetDice = null) {
  const [r, c] = RING_POS[i].split('/');
  const lot = state.lots[t.id];
  const neg = t.type === 'funds' && t.funds < 0;
  const isCorner = CORNER_IDS.has(t.id);
  return el('div', {
    class: `tile tile-${t.type} ${neg ? 'tile-neg' : ''} ${isCorner ? 'tile-corner' : ''} ${targetDice ? 'tile-target' : ''} ${current.position === t.id ? 'active' : ''} ${lot ? `owned o${lot.ownerId % 4}` : ''} ${freshLots.has(t.id) ? 'just-built' : ''}`,
    style: `grid-row:${r};grid-column:${c}`,
    'data-tile': String(t.id),
    title: `${t.label}: ${tileSub(state, t)}`,
  }, [
    tileBoardArt(state, t, targetDice),
    // Lançar é público: o peão de quem está com a nave no ar ganha um marcador de foguete.
    el('div', { class: 'pawns' }, state.players.filter((pl) => !pl.bot && pl.position === t.id).map((pl) => el('span', {
      class: `pawn gb-pawn rocket-pawn${pl.flight ? ' in-flight' : ''}`, 'data-pid': String(pl.id),
      role: 'img', 'aria-label': pl.flight ? `${pl.name}, nave em voo` : pl.name, title: pl.flight ? `${pl.name}: nave em voo` : pl.name,
      html: rocketPawnSvg(PAWN_COLORS[pl.id % 4], Boolean(pl.flight)),
    }))),
    el('div', { class: 't-main-row' }, [
      el('div', { class: 't-body', lang: 'pt-BR' }, [
        el('div', { class: 't-label' }, lot ? BUILDINGS[lot.buildingId].name : shortName(t)),
        // Na casa vai só o efeito curto (como em jogos de tabuleiro publicados); o texto completo fica no balão.
        el('div', { class: 't-sub' }, shortSub(state, t)),
      ]),
    ]),
  ]);
}

export function boardScreen(state, actions) {
  const p = currentPlayer(state);
  const design = p.missionId ? checkDesign(p) : { ok: false };
  const rolling = state.lastRoll != null && state.lastRoll !== lastRollSeen && p.rolled;
  if (p.rolled) lastRollSeen = state.lastRoll;
  const simple = simpleUi(state, p);

  // Peão: de onde saiu no desenho anterior (só anima quando o mesmo jogador andou agora).
  const from = lastPositions[p.id];
  const walked = from != null && from !== p.position && p.rolled && !state.dice;
  state.players.forEach((pl) => { lastPositions[pl.id] = pl.position; });

  // Com os 2 dados na mesa, as duas casas-alvo ficam marcadas no tabuleiro ("DADO +N").
  const targetMap = new Map();
  if (state.dice) state.dice.forEach((d) => targetMap.set((p.position + d) % TILES.length, d));

  // Prédio recém-construído: a casa ganha a animação de "subir" uma vez.
  const lotIds = Object.keys(state.lots).map(Number);
  freshLots.clear();
  if (knownLots) lotIds.filter((id) => !knownLots.has(id)).forEach((id) => freshLots.add(id));
  knownLots = new Set(lotIds);
  const tiles = TILES.map((t, i) => boardTile(state, t, i, p, simple, targetMap.get(t.id)));

  // Abas da lateral: no começo só a missão e o diário; o resto aparece quando passa a fazer sentido.
  const showLadder = !simple;
  const rivalFlying = state.players.some((r) => r.id !== p.id && r.flight); // lançamento é público
  const showRivals = !simple || Object.keys(p.intel).length > 0 || state.round > 3 || rivalFlying;
  // Faixa de prédios sob o tabuleiro: sempre à vista; na interface enxuta só depois do 1º prédio.
  const showStrip = !simple || Object.values(p.buildings).some(Boolean);
  const deciding = Boolean(state.pendingDilemma || state.pendingTile);

  const screen = el('section', { class: 'screen board-screen' }, [
    hud(state, p, 'board', actions),
    guideCard(state, 'board'),
    el('div', { class: 'board-layout' }, [
      el('div', { class: 'board-gadget-wrap' }, [
        sinceCard(state),
        el('div', { class: 'board-gadget' }, [
          gadgetTopBar(state, p),
          // .gameboard: a faixa de prédios é irmã do tabuleiro, logo depois dele (test/year-strip.test.mjs)
          el('div', { class: 'gadget-screen gameboard' }, [
            boardMapLayer(state, p),
            el('div', { class: 'ring ring-16', style: RING_STYLE }, [...tiles, centerPanel(state, p, actions, rolling)]),
          ]),
          showStrip ? agencyStrip(state, p, actions) : null,
        ]),
      ]),
      el('div', { class: 'side-stack' }, [
        missionPanel(state, p, simple),
        showLadder ? ladderPanel(state, p) : null,
        showRivals ? rivalsPanel(state, p) : null,
        logPanel(state, p),
      ]),
    ]),
    turnDock(state, p, design, actions, simple),
  ]);

  // Depois de montar a tela no navegador (main.js): peão andando e o miolo à vista quando há decisão.
  screen.afterMount = () => {
    const center = document.querySelector('.gb-center');
    if (walked) {
      const steps = (p.position - from + TILES.length) % TILES.length;
      walkPawn({ playerId: p.id, from, steps, total: TILES.length }).then(() => {
        if (deciding || state.outcome) scrollIntoViewIfNeeded(center);
      });
    } else if (deciding || state.dice) {
      scrollIntoViewIfNeeded(center);
    }
  };
  return screen;
}
