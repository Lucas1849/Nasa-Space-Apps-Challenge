// Tela do tabuleiro: anel de 16 casas com o dado no centro, decisão de terreno, corrida visível e diário.
import {
  el, button, hud, milestoneTrack, logPanel, DIE_FACES,
  raceTable, recordsPanel, missionPicker, agencyPanel,
} from './components.js';
import { TILES } from '../board/board.js';
import { currentPlayer } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { useFeeFor } from '../sim/actions.js';
import { MISSIONS } from '../data/missions.js';
import { BUILDINGS, upgradeCost } from '../data/buildings.js';
import { FLIGHT_EVENTS } from '../data/events.js';
import { STAGES } from '../data/stages.js';

const TILE_ICONS = { start: '🏁', funds: '💰', event: '❓', tech: '🔬', shop: '🛒', lot: '🏗️', hazard: '⚠️', repair: '🔧', catchup: '🤝' };
const HAZARD_ICONS = { solar_storm: '🌞', debris: '☄️', antenna_stuck: '📡' };
// Anel 5×5 no sentido horário a partir do canto superior esquerdo (o miolo 3×3 fica para o dado).
const RING_POS = ['1/1', '1/2', '1/3', '1/4', '1/5', '2/5', '3/5', '4/5', '5/5', '5/4', '5/3', '5/2', '5/1', '4/1', '3/1', '2/1'];
let lastRollSeen = null;

function tileSub(state, t) {
  switch (t.type) {
    case 'funds': return `${t.funds > 0 ? '+' : ''}${t.funds} verba`;
    case 'start': return `+${t.funds} ao passar`;
    case 'event': return 'sorte ou azar · em voo: imprevisto';
    case 'tech': return `+${t.tech} tecnologia`;
    case 'shop': return `−${t.discount}% na próxima compra`;
    case 'hazard': return `em voo: ${FLIGHT_EVENTS[t.flightEvent].title.toLowerCase()}`;
    case 'repair': return '+1 proteção';
    case 'catchup': return `+${t.funds} se estiver atrás`;
    case 'lot': {
      const lot = state.lots[t.id];
      if (!lot) return `construir: ${upgradeCost(0)}`;
      const owner = state.players[lot.ownerId];
      return `${owner.name} · nível ${owner.buildings[lot.buildingId]}`;
    }
    default: return '';
  }
}

function tileIcon(state, t) {
  if (t.type === 'lot' && state.lots[t.id]) return BUILDINGS[state.lots[t.id].buildingId].icon;
  if (t.type === 'hazard') return HAZARD_ICONS[t.flightEvent] || TILE_ICONS.hazard;
  if (t.type === 'funds' && t.funds < 0) return '📉';
  return TILE_ICONS[t.type];
}

// Decisão do terreno onde o jogador parou: construir, usar o prédio do rival ou seguir.
function tileDecision(state, p, actions) {
  const pending = state.pendingTile;
  if (!pending) return null;
  if (pending.kind === 'build') {
    const options = Object.values(BUILDINGS).filter((b) => !p.buildings[b.id]);
    if (!options.length) return el('p', { class: 'hint' }, 'Você já tem todos os prédios. Suba o nível no painel da agência.');
    return el('div', { class: 'tile-decision' }, [
      el('strong', {}, `🏗️ Terreno livre: construir por ${upgradeCost(0)}?`),
      el('div', { class: 'row wrap', style: 'justify-content:center' }, [
        ...options.map((b) => button(`${b.icon} ${b.name}`, () => actions.buildOnLot(b.id), { class: 'small', disabled: p.funds < upgradeCost(0), title: b.effect })),
        button('Seguir', () => actions.skipTile(), { class: 'small ghost' }),
      ]),
    ]);
  }
  const lot = state.lots[pending.tileId];
  const owner = state.players[lot.ownerId];
  const b = BUILDINGS[lot.buildingId];
  const fee = useFeeFor(owner.buildings[lot.buildingId]);
  return el('div', { class: 'tile-decision' }, [
    el('strong', {}, `${b.icon} ${b.name} de ${owner.name}`),
    el('small', { class: 'hint' }, `Pague ${fee} a ${owner.name} e ganhe ${b.useText}. Os dois saem ganhando, mas você ajuda um rival.`),
    el('div', { class: 'row', style: 'justify-content:center' }, [
      button(`Usar (${fee})`, () => actions.useRivalBuilding(), { class: 'small', disabled: p.funds < fee }),
      button('Seguir', () => actions.skipTile(), { class: 'small ghost' }),
    ]),
  ]);
}

// Bloco "o que fazer agora" (fase 2 do turno), conforme a situação da nave.
function missionPanel(state, p, actions) {
  if (p.flight) {
    const f = p.flight;
    const next = STAGES[f.plan[f.stageIndex]];
    const event = f.tileEvent ? FLIGHT_EVENTS[f.tileEvent] : null;
    return el('div', { class: 'panel' }, [
      el('h3', { style: 'margin-top:0' }, `🛰️ Em voo: ${MISSIONS[f.missionId].name}`),
      el('p', { class: 'hint' }, `Próxima etapa: ${next.icon} ${next.name} (${f.stageIndex + 1}/${f.plan.length}).${event ? ` Imprevisto vindo da casa: ${event.title}.` : ''}`),
      p.flightAdvanced
        ? el('p', { class: 'hint' }, 'O voo já avançou neste turno.')
        : button('🛰️ Avançar o voo', () => actions.advanceFlight(), { class: 'primary', disabled: !p.rolled, title: p.rolled ? '' : 'Jogue o dado primeiro: a casa pode trazer um imprevisto.' }),
      el('p', { class: 'hint' }, 'Enquanto a nave voa, você já pode montar a próxima na oficina.'),
    ]);
  }
  if (!p.missionId) {
    return el('div', { class: 'panel' }, [
      el('h3', { style: 'margin-top:0' }, '🎯 Escolha sua próxima missão'),
      missionPicker(state, p, actions),
    ]);
  }
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, `🎯 ${MISSIONS[p.missionId].name}: degraus`),
    milestoneTrack(p),
    el('details', { class: 'swap' }, [el('summary', {}, 'Trocar de missão'), missionPicker(state, p, actions)]),
  ]);
}

export function boardScreen(state, actions) {
  const p = currentPlayer(state);
  const design = checkDesign(p);
  const rolling = state.lastRoll != null && state.lastRoll !== lastRollSeen;
  lastRollSeen = state.lastRoll;

  const tiles = TILES.map((t, i) => {
    const [r, c] = RING_POS[i].split('/');
    const lot = state.lots[t.id];
    return el('div', { class: `tile tile-${t.type} ${p.position === t.id ? 'active' : ''} ${lot ? `owned o${lot.ownerId % 4}` : ''}`, style: `grid-row:${r};grid-column:${c}`, title: t.label }, [
      el('div', { class: 'pawns' }, state.players.filter((pl) => pl.position === t.id).map((pl) => el('span', { class: `pawn c${pl.id % 4}`, title: pl.name }, pl.name[0].toUpperCase()))),
      el('span', { class: 't-icon' }, tileIcon(state, t)),
      el('div', {}, [el('div', { class: 't-label' }, t.label), el('div', { class: 't-sub' }, tileSub(state, t))]),
    ]);
  });

  const center = el('div', { class: 'panel ring-center' }, [
    el('span', { class: 'label' }, p.rolled ? `${p.name} tirou ${state.lastRoll}` : `vez de ${p.name}`),
    el('span', { class: `die ${rolling ? 'rolling' : ''}` }, p.rolled && state.lastRoll ? DIE_FACES[state.lastRoll - 1] : '🎲'),
    p.rolled ? null : button('Jogar o dado', () => actions.rollAndMove(), { class: 'primary' }),
    tileDecision(state, p, actions),
  ]);

  const canLaunch = design.ok && p.missionId && !p.flight && p.rolled && !p.launchedThisTurn;
  const launchTitle = p.flight ? 'Você já tem uma nave em voo.'
    : !p.missionId ? 'Escolha uma missão.'
      : !p.rolled ? 'Jogue o dado antes de lançar.'
        : design.ok ? 'Projeto pronto e verba suficiente.' : 'Resolva as pendências na oficina antes de lançar.';
  const mustAdvance = p.flight && !p.flightAdvanced;

  return el('section', { class: 'screen board-screen' }, [
    hud(state, p, 'board'),
    el('div', { class: 'board-layout' }, [
      el('div', {}, [
        el('div', { class: 'ring ring-16' }, [...tiles, center]),
        el('div', { class: 'row' }, [
          button('🔧 Oficina', () => actions.go('workshop')),
          button('🚀 Lançar', () => actions.launch(), { disabled: !canLaunch, title: launchTitle }),
          button('Passar a vez →', () => actions.endTurn(), { disabled: !p.rolled || mustAdvance, class: 'ghost', title: mustAdvance ? 'Avance o voo antes de passar a vez.' : '' }),
        ]),
        el('p', { class: 'hint' }, 'Turno: 1) jogue o dado · 2) monte e lance, ou avance o voo · 3) passe a vez. Esperar rende tecnologia e verba, mas os rivais avançam.'),
      ]),
      el('div', { class: 'side-stack' }, [
        missionPanel(state, p, actions),
        raceTable(state),
        recordsPanel(state),
        agencyPanel(state, p, actions),
        logPanel(state),
      ]),
    ]),
  ]);
}
