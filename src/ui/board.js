// Tela do tabuleiro: anel de 8 casas com o dado no centro, milestones e diário.
import { el, button, hud, milestoneTrack, logPanel, avatar, DIE_FACES } from './components.js';
import { TILES } from '../board/board.js';
import { currentPlayer } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';

const TILE_ICONS = { start: '🏁', funds: '💰', event: '❓', tax: '📉', catchup: '🤝' };
// Posições no grid 3×3, sentido horário a partir do canto superior esquerdo (centro fica livre).
const RING_POS = ['1/1', '1/2', '1/3', '2/3', '3/3', '3/2', '3/1', '2/1'];
let lastRollSeen = null;

export function boardScreen(state, actions) {
  const p = currentPlayer(state);
  const design = checkDesign(p);
  const rolling = state.lastRoll != null && state.lastRoll !== lastRollSeen;
  lastRollSeen = state.lastRoll;

  const tiles = TILES.map((t, i) => {
    const [r, c] = RING_POS[i].split('/');
    const sub = t.type === 'event' ? 'sorte ou azar' : t.type === 'catchup' ? `+${t.funds} se estiver atrás` : t.funds ? `${t.funds > 0 ? '+' : ''}${t.funds} verba` : '';
    return el('div', { class: `tile tile-${t.type} ${p.position === t.id ? 'active' : ''}`, style: `grid-row:${r};grid-column:${c}` }, [
      el('div', { class: 'pawns' }, state.players.filter((pl) => pl.position === t.id).map((pl) => el('span', { class: `pawn c${pl.id % 4}`, title: pl.name }, pl.name[0].toUpperCase()))),
      el('span', { class: 't-icon' }, TILE_ICONS[t.type]),
      el('div', {}, [el('div', { class: 't-label' }, t.label), el('div', { class: 't-sub' }, sub)]),
    ]);
  });

  const center = el('div', { class: 'panel ring-center' }, [
    el('span', { class: 'label' }, p.rolled ? `tirou ${state.lastRoll}` : 'sua vez'),
    el('span', { class: `die ${rolling ? 'rolling' : ''}` }, state.lastRoll ? DIE_FACES[state.lastRoll - 1] : '🎲'),
    button(p.rolled ? 'Dado jogado' : 'Jogar o dado', () => actions.rollAndMove(), { disabled: Boolean(p.rolled), class: 'primary' }),
  ]);

  return el('section', { class: 'screen board-screen' }, [
    hud(state, p, 'board'),
    state.winner !== null ? el('p', { class: 'banner' }, `🏆 ${state.players[state.winner].name} já cumpriu a missão! Os outros podem continuar tentando.`) : null,
    el('div', { class: 'board-layout' }, [
      el('div', {}, [
        el('div', { class: 'ring' }, [...tiles, center]),
        el('div', { class: 'row' }, [
          button('🔧 Ir à oficina', () => actions.go('workshop')),
          button('🚀 Lançar', () => actions.launch(), { disabled: !design.ok, title: design.ok ? 'Projeto pronto e verba suficiente.' : 'Resolva as pendências na oficina antes de lançar.' }),
          button('Passar a vez →', () => actions.endTurn(), { disabled: !p.rolled, class: 'ghost' }),
        ]),
      ]),
      el('div', { style: 'display:grid;gap:12px' }, [
        el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, '🎯 Milestones da missão'), milestoneTrack(p)]),
        state.players.length > 1 ? el('div', { class: 'panel' }, [
          el('h3', { style: 'margin-top:0' }, '👥 Jogadores'),
          ...state.players.map((pl) => el('div', { class: 'row', style: 'margin:6px 0' }, [avatar(pl, 26), el('span', {}, pl.name), el('span', { class: 'chip' }, `💰 ${pl.funds}`), el('span', { class: 'chip' }, `${pl.milestones.length}/3 ✓`), pl.won ? '🏆' : null])),
        ]) : null,
        logPanel(state),
      ]),
    ]),
  ]);
}
