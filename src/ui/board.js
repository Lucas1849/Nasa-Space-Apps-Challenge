// Tela do tabuleiro: planta de engenharia (cianotipia) + tabuleiro estilo Monopoly
// (caminhos conectados, faixas de propriedade, cantos especiais, ilustrações vetoriais em cada casa
// e baralhos de cartas no tapete central), mantendo 100% da mecânica e dos testes.
// Orientações (ui/guide.js) dizem o próximo passo e destacam o botão recomendado; o "desde o seu último
// turno" vem de ui/summary.js e o retorno imediato (outcomeCard) e a faixa de prédios, de ui/components.js.
import {
  el, button, hud, milestoneTrack, logPanel, ladderPanel, rivalsPanel, agencyStrip, sideBadge, sidePanel, MISSION_ICONS, simpleUi, outcomeCard,
} from './components.js';
import { icon } from './icons.js';
import { dieSvg, TILE_ART, BUILDING_ART, ORBIT_ART } from './boardArt.js';
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

const TILE_ICONS = { start: 'flag', funds: 'coins', event: 'card', tech: 'flask', shop: 'cart', workshop: 'wrench', lot: 'crane', spy: 'eye', repair: 'wrench', catchup: 'lifebuoy' };
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
let lastDiceKey = null;     // último par de dados já mostrado (para girar só os recém-rolados)
const lastPositions = {};   // casa de cada jogador no desenho anterior (o peão anda a partir dela)

// Nome curto na casa: o que vem antes dos dois-pontos ("Discurso", "Crise diplomática"); o completo fica no balão.
const shortName = (t) => t.label.split(':')[0];

function shortSub(state, t) {
  switch (t.type) {
    case 'funds': return `${t.funds > 0 ? '+' : ''}${t.funds} verba`;
    case 'start': return `+${t.funds} ao passar`;
    case 'event': return 'sorteio';
    case 'tech': return `+${t.tech} tecnologia`;
    case 'shop': return 'blueprints';
    case 'workshop': return 'montar e lançar';
    case 'spy': return 'ver um rival';
    case 'repair': return '+1 proteção';
    case 'catchup': return `+${t.funds} se atrás`;
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
    case 'shop': return 'escolha blueprints e pague (a 1ª é de graça)';
    case 'workshop': return 'aqui você compra, vende e lança a nave';
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

// Ilustração vetorial estilo jogo de tabuleiro (Monopoly espacial) para cada casa
function tileBoardArt(state, t, targetDice) {
  const lot = state.lots[t.id];
  const isCorner = CORNER_IDS.has(t.id);
  const dir = STEP_DIRS[t.id];
  const num = String(t.id).padStart(2, '0');
  // Faixa do topo: o tipo real da casa (o mesmo que decide o efeito), nunca um rótulo de enfeite.
  const BAND = { start: 'PARTIDA', event: 'DILEMA', tech: 'PESQUISA', shop: 'FORNECEDOR', workshop: 'OFICINA', spy: 'ESPIÃO', repair: 'REPAROS', catchup: 'APOIO' };
  let bandTitle = BAND[t.type] || `CASA ${num}`;
  if (t.type === 'funds') bandTitle = t.funds > 0 ? 'VERBA' : 'CRISE';
  else if (t.type === 'lot') {
    if (lot) {
      const lvl = state.players[lot.ownerId].buildings[lot.buildingId] || 1;
      bandTitle = `${'★'.repeat(lvl)} NV.${lvl}`;
    } else bandTitle = 'TERRENO';
  }

  // Ícone de traço único (ui/boardArt.js), na cor da tinta da planta. Terreno com prédio mostra o prédio.
  const art = lot ? BUILDING_ART[lot.buildingId] : TILE_ART[t.type === 'funds' && t.funds < 0 ? 'crisis' : t.type] || '';

  const targetBadge = targetDice
    ? `<span class="t-target-pill">DADO +${targetDice}</span>`
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
      <span class="t-art-ink">${art}</span>
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
  if (isLauncherId(id)) return `Foguete: carga ${it.maxMass}, lançar custa ${it.cost}, alcança ${it.reach.join(', ')}. Exige tecnologia ${it.minTech}.`;
  const gains = [it.powerGen && `+${it.powerGen} energia`, it.commsRate && `+${it.commsRate} comunicação`, it.science && `+${it.science} ciência`, it.lifetimeBonus && `+${it.lifetimeBonus} ano(s)`, it.lifeSupport && 'suporte de vida'].filter(Boolean);
  const costs = [`${it.mass} massa`, it.power && `${it.power} energia`, it.dataRate && `${it.dataRate} dados`, `peça custa ${it.cost}`].filter(Boolean);
  return `Ganha: ${gains.join(', ') || 'nada'}. Custa: ${costs.join(', ')}. Exige tecnologia ${it.minTech}.`;
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
    if (!options.length) return el('p', { class: 'hint' }, 'Você já tem todos os prédios. Suba o nível no painel da agência.');
    return el('div', { class: cls }, [
      el('strong', { class: 'decision-title' }, [icon('crane', { size: 18 }), `Terreno livre: construir por ${upgradeCost(0)}?`]),
      el('div', { class: 'row wrap', style: 'justify-content:center' }, [
        ...options.map((b) => button([icon(b.icon, { size: 16 }), b.name], () => actions.buildOnLot(b.id), { class: 'small', disabled: p.funds < upgradeCost(0), title: b.effect })),
        button('Seguir sem construir', () => actions.skipTile(), { class: 'small ghost' }),
      ]),
    ]);
  }
  if (pending.kind === 'supplier') {
    const first = !p.freeBlueprintUsed;
    return deckCard('shop', 'Fornecedor: escolha uma blueprint', first
      ? 'A primeira blueprint é de graça. Ela é o projeto da peça (paga uma vez); a peça em si você compra na oficina.'
      : 'A blueprint é o projeto da peça: paga uma vez, vale para sempre. A peça em si você compra na oficina.', [
      ...pending.offers.map((id) => {
        const price = blueprintCostFor(p, id);
        return button([el('span', {}, itemOf(id).name), el('span', { class: 'gb-price' }, price ? `${price}` : 'grátis')], () => actions.buyBlueprint(id), { class: 'gb-btn', disabled: p.funds < price, title: `${offerInfo(id)} Blueprint: ${price || 'grátis'} (preço normal ${blueprintPrice(id)}).` });
      }),
      button('Seguir', () => actions.skipTile(), { class: 'gb-btn ghost' }),
    ], cls);
  }
  if (pending.kind === 'spy') {
    const rivals = state.players.filter((r) => r.id !== p.id);
    return deckCard('spy', 'Espionagem: observar ou sabotar?', `Observar (${SPY_COST}) mostra degraus, missão e quanto a nave do rival está pronta. Sabotar (${SABOTAGE_COST}) atrapalha o rival: contra uma agência, uma interferência na telemetria da etapa final do voo; contra a agência rival do solo, atrasa o degrau dela em 1 ano. Uma ação de espião por ano.`, [
      ...rivals.map((r) => button([`Observar ${r.name}, `, ...[].concat(sideBadge(r))], () => actions.spyOn(r.id), { class: 'gb-btn', disabled: p.funds < SPY_COST })),
      ...rivals.map((r) => button([`Sabotar ${r.name}, `, ...[].concat(sideBadge(r))], () => actions.sabotage(r.id), { class: 'gb-btn', disabled: p.funds < SABOTAGE_COST || Boolean(r.interference), title: r.bot ? 'Atrasa o próximo degrau dele em 1 ano.' : 'Arma uma interferência na etapa final do voo dele.' })),
      button('Seguir sem espionar', () => actions.skipTile(), { class: 'gb-btn ghost' }),
    ], cls);
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

// Monte de cartas de dilema no tapete central. Só aparece com o centro livre (sem decisão nem resultado),
// para não disputar espaço com o que o jogador precisa ler.
function dilemmaDeck(state, p) {
  if (state.pendingDilemma || state.pendingTile || (state.outcome && state.outcome.playerId === p.id)) return null;
  return el('div', { class: 'center-court-decks', 'aria-hidden': 'true' }, [
    el('div', { class: 'court-deck deck-dilemma' }, [el('span', { class: 'deck-icon' }, '?'), el('span', { class: 'deck-label' }, 'DILEMAS')]),
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
    const preview = (d, on) => () => {
      const tile = document.querySelector(`[data-tile="${(p.position + d) % TILES.length}"]`);
      if (tile) tile.classList.toggle('tile-preview', on);
    };
    return el('div', { class: 'dice-choice gb-dice' }, [
      el('div', { class: 'gb-dice-row' }, state.dice.map((d, i) => {
        const b = button([el('span', { class: `gb-die ${fresh ? 'tumble' : ''}`, style: `--i:${i}`, html: dieSvg(d) }), el('span', {}, `andar ${d}`)],
          () => actions.moveBy(i), { class: `gb-die-btn ${hl(state, 'board', 'die')}`, title: `Andar ${d} casa${d > 1 ? 's' : ''}` });
        b.addEventListener('mouseenter', preview(d, true));
        b.addEventListener('mouseleave', preview(d, false));
        b.addEventListener('focus', preview(d, true));
        b.addEventListener('blur', preview(d, false));
        return b;
      })),
      el('span', { class: 'label' }, 'Escolha um dado: veja onde cada um para'),
    ]);
  }
  if (!p.rolled) {
    return el('div', { class: 'dice-choice gb-dice' }, [
      button([el('span', { class: 'gb-die idle', html: dieSvg(0) }), el('span', { class: 'gb-die idle', html: dieSvg(0) })],
        () => actions.rollDice(), { class: 'gb-die-btn pair', title: 'Rolar 2 dados' }),
      el('span', { class: 'label' }, `Vez de ${p.name}: clique nos dados`),
    ]);
  }
  return el('div', { class: 'dice-choice gb-dice' }, [
    el('span', { class: `gb-die ${rolling ? 'landed' : ''}`, html: dieSvg(state.lastRoll) }),
    el('span', { class: 'label' }, `${p.name} andou ${state.lastRoll} casa${state.lastRoll > 1 ? 's' : ''}`),
  ]);
}

// Centro do anel: faixa de situação, dados e as decisões da casa.
function centerPanel(state, p, actions, rolling) {
  const activeTile = TILES[p.position];
  const bannerText = state.dice
    ? 'ESCOLHA UM DADO PARA AVANÇAR'
    : !p.rolled
      ? `VEZ DE ${p.name.toUpperCase()} · ROLE OS DADOS`
      : `CASA ${String(p.position).padStart(2, '0')} · ${activeTile.label.toUpperCase()}`;
  return el('div', { class: 'panel ring-center gb-center' }, [
    el('span', { class: 'center-orbits', 'aria-hidden': 'true', html: ORBIT_ART }),
    dilemmaDeck(state, p),
    el('div', { class: 'gadget-banner', 'aria-hidden': 'true' }, [el('div', { class: 'gadget-banner-plate' }, bannerText)]),
    diceView(state, p, actions, rolling),
    dilemmaDecision(state, actions),
    tileDecision(state, p, actions),
    outcomeCard(state, p),
  ]);
}

// Bloco da missão atual (lateral), conforme a situação da nave.
function missionPanel(state, p, simple = false) {
  if (p.flight) {
    const f = p.flight;
    const next = STAGES[f.plan[f.stageIndex]];
    const event = f.tileEvent ? FLIGHT_EVENTS[f.tileEvent] : null;
    return sidePanel('mission', 'satellite', `Em voo: ${MISSIONS[f.missionId].name}`, [
      el('p', { class: 'hint' }, `Próxima etapa: ${next.name} (${f.stageIndex + 1} de ${f.plan.length}).${event ? ` Imprevisto vindo do tabuleiro: ${event.title}.` : ''}`),
      p.flightAdvanced ? el('p', { class: 'hint' }, 'O voo já avançou neste turno.')
        : el('p', { class: 'hint' }, !p.rolled ? 'Role os dados antes: uma casa de evento pode trazer um imprevisto para o voo.' : 'Avance o voo pela barra de baixo.'),
      el('p', { class: 'hint' }, 'A próxima nave só pode ser montada quando esta cumprir a missão.'),
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

// Passo a passo do turno, sempre visível na barra fixa: o que já foi feito e o que falta.
function turnSteps(state, p, design) {
  const moved = p.rolled && !state.dice;
  const tileDone = moved && !state.pendingTile && !state.pendingDilemma;
  const shipDone = p.flight ? p.flightAdvanced : p.launchedThisTurn || !p.missionId;
  const steps = [
    { label: 'Rolar e andar', done: moved },
    { label: 'Resolver a casa', done: tileDone },
    { label: p.flight ? 'Avançar o voo' : design.ok ? 'Lançar (opcional)' : 'Montar a nave (casa de Oficina)', done: shipDone, optional: !p.flight },
    { label: 'Passar a vez', done: false },
  ];
  const current = steps.findIndex((s) => !s.done && !(s.optional && tileDone));
  return el('ol', { class: 'turn-steps', 'aria-label': 'Etapas do turno' }, steps.map((s, i) =>
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
  const launchTitle = p.flight ? 'Você já tem uma nave em voo.'
    : !p.rolled ? 'Ande no tabuleiro antes de lançar.'
      : !inShop ? 'Só dá para lançar parado numa casa de Oficina do tabuleiro.'
      : design.ok ? 'Projeto pronto e verba suficiente.' : 'Resolva as pendências na oficina antes de lançar.';
  const mustAdvance = p.flight && !p.flightAdvanced;
  const deciding = Boolean(state.pendingDilemma || state.pendingTile);
  const blocked = !p.rolled || mustAdvance || Boolean(state.pendingDilemma);
  const blockedReason = !p.rolled ? 'Role os dados para poder passar a vez.'
    : state.pendingDilemma ? 'Resolva a carta de dilema para poder passar a vez.'
      : mustAdvance ? 'Avance o voo para poder passar a vez.' : '';

  let main = [];
  let note = null;
  if (state.dice) {
    main = state.dice.map((d, i) => button([el('span', { class: 'dock-die', html: dieSvg(d) }), `Andar ${d}`], () => actions.moveBy(i), { class: `primary reveal ${hl(state, 'board', 'die')}` }));
    note = 'Escolha um dos dados';
  } else if (!p.rolled) {
    main = [button([icon('die', { size: 18 }), 'Rolar 2 dados'], () => actions.rollDice(), { class: `primary ${hl(state, 'board', 'roll')}` })];
  } else if (deciding) {
    note = 'Decida a carta no meio do tabuleiro';
  }

  // A Oficina fica SEMPRE na barra: dá para planejar a nave antes de rolar (só o lançamento exige andar).
  // Com a nave em voo ela fecha.
  const showWorkshop = !p.flight;
  const early = showWorkshop && !(p.rolled && !state.dice)
    ? button([icon('wrench', { size: 18 }), 'Oficina'], () => actions.go('workshop'), { class: `ghost ${hl(state, 'board', 'workshop')}`, title: inShop ? 'Montar a nave: peças, foguete e o que falta para lançar.' : 'Planejar a nave: ver peças e risco. Para comprar e lançar, pare numa casa de Oficina.' })
    : null;

  // Depois de andar: oficina, voo, lançar e passar a vez (interface enxuta: um passo de cada vez).
  const after = [];
  if (p.rolled && !state.dice) {
    const showLaunch = !simple || design.ok || p.launchedThisTurn;
    // Só UMA ação cheia por vez: a oficina se a nave não fecha, o Lançar se fecha, e o Passar a vez quando
    // não sobrou nada recomendado (voo avançado, lançou ou a escada acabou).
    const turnDone = !blocked && !deciding && (p.flight ? p.flightAdvanced : p.launchedThisTurn || !p.missionId);
    if (mustAdvance) after.push(button([icon('satellite', { size: 18 }), 'Avançar o voo'], () => actions.advanceFlight(), { class: `primary ${hl(state, 'board', 'advance')}` }));
    if (showWorkshop) after.push(button([icon('wrench', { size: 18 }), 'Oficina'], () => actions.go('workshop'), { class: `${!design.ok && !p.launchedThisTurn ? 'primary' : ''} ${hl(state, 'board', 'workshop')}` }));
    if (showLaunch && !p.flight) after.push(button([icon('rocket', { size: 18 }), 'Lançar'], () => actions.launch(), { disabled: !canLaunch, title: launchTitle, class: `${canLaunch ? 'primary launch-ready' : ''} ${hl(state, 'board', 'launch')}` }));
    after.push(button(['Passar a vez', icon('arrowRight', { size: 18 })], () => actions.endTurn(), { disabled: blocked, class: `${turnDone ? 'primary' : 'ghost'} ${hl(state, 'board', 'end')}`, title: blockedReason }));
  }

  return el('div', { class: 'turn-dock', role: 'region', 'aria-label': 'Ações do turno' }, [
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
      el('div', { class: 'gadget-lcd-screen' }, `${yearOf(state.round)} · RODADA ${roundInYear}/${ROUNDS_PER_YEAR}`),
    ]),
    el('span', { class: 'g-chip coral' }, `CASA ${String(p.position).padStart(2, '0')} · ${TILES[p.position].label.toUpperCase()}`),
  ]);
}

// Peão de cada agência: um foguete na cor do jogador (os mesmos tons dos avatares do topo), com contorno
// branco para aparecer sobre a casa. Com a nave em voo (lançar é público) o foguete ganha a chama acesa.
const PAWN_COLORS = ['#6ea6ee', '#f0cf7a', '#4cc49a', '#f08a5c'];
function rocketPawnSvg(color, flying) {
  return `<svg viewBox="0 0 20 30" aria-hidden="true" focusable="false">
    ${flying ? '<path d="M7.2 23.5 10 29.5l2.8-6z" fill="#ffc857" stroke="#10213d" stroke-width="0.8"/>' : ''}
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
    class: `tile tile-${t.type} ${neg ? 'tile-neg' : ''} ${isCorner ? 'tile-corner' : ''} ${targetDice ? 'tile-target' : ''} ${current.position === t.id ? 'active' : ''} ${lot ? `owned o${lot.ownerId % 4}` : ''}`,
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
      lot ? el('span', { class: 't-icon' }, icon(tileIcon(state, t), { size: 16 })) : null,
      el('div', { class: 't-body', lang: 'pt-BR' }, [
        el('div', { class: 't-label' }, shortName(t)),
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
