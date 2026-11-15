// Tela do tabuleiro: um tabuleiro "impresso" de 16 casas (papel, tinta, arte própria em ui/boardArt.js),
// com os dados e as decisões no miolo, e ao lado a missão, a escada, os rivais e o diário.
// Orientações (ui/guide.js) dizem o próximo passo e destacam o botão recomendado; o resumo do turno
// e o "desde o seu último turno" vêm de ui/summary.js.
//
// UX (15/11): todas as ações do turno ficam numa BARRA FIXA no rodapé (turnDock), sempre à vista, na
// ordem do turno. Antes, "Rolar 2 dados" e "Lançar" ficavam abaixo da dobra e a página pulava.
// Animações que explicam o que mudou: dados rolando, peão andando casa a casa (afterMount).
import {
  el, button, hud, milestoneTrack, logPanel, ladderPanel, rivalsPanel, agencyStrip, sideBadge, sidePanel, MISSION_ICONS, simpleUi, outcomeCard,
} from './components.js';
import { icon } from './icons.js';
import { TILE_ART, BUILDING_ART, ORBIT_ART, PRINT_COLORS, pawnSvg, dieSvg } from './boardArt.js';
import { guideCard, hl } from './guide.js';
import { sinceCard } from './summary.js';
import { walkPawn, scrollIntoViewIfNeeded } from './motion.js';
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
import { yearOf, START_YEAR, END_YEAR } from '../data/history.js';

// Anel 6×6 (20 casas) no sentido horário a partir do canto superior esquerdo (o miolo 4×4 fica para os dados).
// As casas 0, 5, 10 e 15 caem nos cantos, que são maiores, como num tabuleiro de verdade.
const RING_POS = [
  '1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '2/6', '3/6', '4/6', '5/6', '6/6',
  '6/5', '6/4', '6/3', '6/2', '6/1', '5/1', '4/1', '3/1', '2/1',
];
const CORNERS = new Set([0, 5, 10, 15]);
const KIND = {
  start: 'Largada', lot: 'Terreno', funds: 'Verba', event: 'Evento', spy: 'Espionagem',
  tech: 'Ciência', shop: 'Fornecedor', workshop: 'Oficina', repair: 'Reparos', catchup: 'Recuperação',
};

// Memória da animação entre um desenho e outro (a tela é redesenhada inteira a cada clique).
let lastRollSeen = null;
let lastDiceKey = null;
const lastPositions = {};

const isCrisis = (t) => t.type === 'funds' && t.funds < 0;
const shortName = (t) => t.label.split(':')[0];

// Legenda curta da casa para a interface enxuta do começo. O que decide a escolha do dado (quanto dá)
// continua; o texto longo vai só para o balão (title), que sempre tem a legenda completa.
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

function tileArt(state, t) {
  if (t.type === 'lot' && state.lots[t.id]) return BUILDING_ART[state.lots[t.id].buildingId];
  if (isCrisis(t)) return TILE_ART.crisis;
  return TILE_ART[t.type];
}

// Exportado para a tela de espectador (ui/spectate.js) reaproveitar o mesmo tabuleiro.
export function boardTile(state, t, i, current, simple) {
  const [r, c] = RING_POS[i].split('/');
  const lot = state.lots[t.id];
  const here = state.players.filter((pl) => !pl.bot && pl.position === t.id);
  const cls = [
    'gb-tile', `gb-${isCrisis(t) ? 'crisis' : t.type}`,
    CORNERS.has(i) ? 'corner' : '',
    current.position === t.id ? 'here' : '',
    lot ? 'owned' : '',
  ].filter(Boolean).join(' ');
  const style = `grid-row:${r};grid-column:${c};${lot ? `--owner:${PRINT_COLORS[lot.ownerId % 4]};` : ''}`;
  const name = lot ? BUILDINGS[lot.buildingId].name : shortName(t);
  return el('div', { class: cls, style, 'data-tile': String(t.id), title: `${t.label}: ${tileSub(state, t)}` }, [
    CORNERS.has(i) ? null : el('div', { class: 'gb-band' }),
    el('div', { class: 'gb-kind' }, isCrisis(t) ? 'Crise' : KIND[t.type]),
    el('span', { class: 'gb-art', html: tileArt(state, t) }),
    el('div', { class: 'gb-name' }, name),
    el('div', { class: 't-sub' }, simple ? shortSub(state, t) : tileSub(state, t)),
    here.length ? el('div', { class: 'gb-pawns' }, here.map((pl) =>
      el('span', {
        class: `gb-pawn${pl.flight ? ' in-flight' : ''}`, 'data-pid': String(pl.id),
        title: pl.flight ? `${pl.name}: nave em voo` : pl.name, // lançar é público: todos veem quem está com a nave no ar
        html: pawnSvg(PRINT_COLORS[pl.id % 4], pl.name[0].toUpperCase()),
      }, pl.flight ? [el('i', { class: 'gb-flight', 'aria-label': 'em voo' }, icon('rocket', { size: 10 }))] : []))) : null,
  ]);
}

// Cartão de decisão impresso (dilema, terreno, prédio do rival, espião).
function deckCard(kind, title, text, buttons, extraClass = '') {
  return el('div', { class: `gb-card gb-card-${kind} ${extraClass}` }, [
    el('div', { class: 'gb-card-head' }, [el('span', {}, title)]),
    text ? el('p', {}, text) : null,
    el('div', { class: 'gb-card-actions' }, buttons),
  ]);
}

// O que uma oferta do fornecedor dá e custa, em uma linha para o balão.
function offerInfo(id) {
  const it = itemOf(id);
  if (isLauncherId(id)) return `Foguete: carga ${it.maxMass}, lançar custa ${it.cost}, alcança ${it.reach.join(', ')}. Exige tecnologia ${it.minTech}.`;
  const gains = [it.powerGen && `+${it.powerGen} energia`, it.commsRate && `+${it.commsRate} comunicação`, it.science && `+${it.science} ciência`, it.lifetimeBonus && `+${it.lifetimeBonus} ano(s)`, it.lifeSupport && 'suporte de vida'].filter(Boolean);
  const costs = [`${it.mass} massa`, it.power && `${it.power} energia`, it.dataRate && `${it.dataRate} dados`, `peça custa ${it.cost}`].filter(Boolean);
  return `Ganha: ${gains.join(', ') || 'nada'}. Custa: ${costs.join(', ')}. Exige tecnologia ${it.minTech}.`;
}

// Carta de dilema: sempre uma escolha, conforme a situação do jogador.
function dilemmaDecision(state, actions) {
  const card = DILEMMAS.find((d) => d.id === state.pendingDilemma?.id);
  if (!card) return null;
  return deckCard('event', card.title, card.text,
    card.options.map((o, i) => button(o.label, () => actions.chooseDilemma(i), { class: 'gb-btn' })),
    `deal ${hl(state, 'board', 'dilemma')}`);
}

// Decisão da casa onde o jogador parou: construir, usar o prédio do rival ou espionar.
function tileDecision(state, p, actions) {
  const pending = state.pendingTile;
  if (!pending) return null;
  const cls = `deal ${hl(state, 'board', 'tile')}`;
  if (pending.kind === 'build') {
    const options = Object.values(BUILDINGS).filter((b) => !p.buildings[b.id]);
    const skip = button('Seguir sem construir', () => actions.skipTile(), { class: 'gb-btn ghost' });
    if (!options.length) return deckCard('lot', 'Terreno livre', 'Você já tem todos os prédios. Suba o nível no painel da agência.', [skip], cls);
    return deckCard('lot', `Terreno livre: construir por ${upgradeCost(0)}?`, 'Um prédio dá vantagem até o fim da partida. Passe o mouse para ver o efeito.', [
      ...options.map((b) => button([el('span', { class: 'gb-btn-art', html: BUILDING_ART[b.id] }), b.name], () => actions.buildOnLot(b.id), { class: 'gb-btn', disabled: p.funds < upgradeCost(0), title: b.effect })),
      skip,
    ], cls);
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
  return deckCard('lot', `${b.name} de ${owner.name}`, `Pague ${fee} a ${owner.name} e ganhe ${b.useText}. Os dois saem ganhando, mas você ajuda um rival.`, [
    button(`Usar por ${fee}`, () => actions.useRivalBuilding(), { class: 'gb-btn primary', disabled: p.funds < fee }),
    button('Seguir', () => actions.skipTile(), { class: 'gb-btn ghost' }),
  ], cls);
}

// Dados do miolo. Recém-rolados, entram girando (CSS .tumble) e só depois mostram o número.
function diceView(state, p, actions, rolling) {
  if (state.dice) {
    const key = `${state.round}:${state.turn}:${state.dice.join(',')}`;
    const fresh = key !== lastDiceKey;
    lastDiceKey = key;
    return el('div', { class: 'gb-dice' }, [
      el('div', { class: 'gb-dice-row' }, state.dice.map((d, i) =>
        button([el('span', { class: `gb-die ${fresh ? 'tumble' : ''}`, style: `--i:${i}`, html: dieSvg(d) }), el('span', {}, `andar ${d}`)],
          () => actions.moveBy(i), { class: 'gb-die-btn', title: `Andar ${d} casa${d > 1 ? 's' : ''}` }))),
      el('span', { class: 'gb-caption' }, 'Escolha um dado: veja onde cada um para'),
    ]);
  }
  if (!p.rolled) {
    return el('div', { class: 'gb-dice' }, [
      button([el('span', { class: 'gb-die idle', html: dieSvg(0) }), el('span', { class: 'gb-die idle', html: dieSvg(0) })],
        () => actions.rollDice(), { class: 'gb-die-btn pair', title: 'Rolar 2 dados' }),
      el('span', { class: 'gb-caption' }, `Vez de ${p.name}`),
    ]);
  }
  return el('div', { class: 'gb-dice' }, [
    el('span', { class: `gb-die ${rolling ? 'landed' : ''}`, html: dieSvg(state.lastRoll) }),
    el('span', { class: 'gb-caption' }, `${p.name} andou ${state.lastRoll} casa${state.lastRoll > 1 ? 's' : ''}`),
  ]);
}

// Miolo do tabuleiro: título como arte de caixa, órbitas ao fundo, dados, decisões e o resultado da casa.
function centerPanel(state, p, actions, rolling) {
  return el('div', { class: 'gb-center' }, [
    el('span', { class: 'gb-orbit', html: ORBIT_ART }),
    el('div', { class: 'gb-title' }, [
      el('small', {}, 'Space Mission Design Game'),
      el('strong', {}, 'Corrida Espacial'),
      el('span', {}, [`${START_YEAR}`, el('b', {}, ` ${yearOf(state.round)} `), `${END_YEAR}`]),
    ]),
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
    el('li', { class: s.done ? 'done' : i === current ? 'now' : '' }, [
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
  // Antes ela só aparecia depois de rolar, e o jogador não a encontrava. Com a nave em voo ela fecha.
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

  const tiles = TILES.map((t, i) => boardTile(state, t, i, p, simple));

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
      el('div', {}, [
        sinceCard(state),
        el('div', { class: 'gameboard' }, [...tiles, centerPanel(state, p, actions, rolling)]),
        showStrip ? agencyStrip(state, p, actions) : null,
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
