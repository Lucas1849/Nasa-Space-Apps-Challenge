// Tela do tabuleiro: casas, jogador da vez, dado, atalhos para a oficina e o lançamento.
import { el, button, milestoneTrack, logPanel } from './components.js';
import { TILES } from '../board/board.js';
import { MISSIONS } from '../data/missions.js';
import { currentPlayer } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';

export function boardScreen(state, actions) {
  const p = currentPlayer(state);
  const mission = MISSIONS[p.missionId];
  const design = checkDesign(p);

  const tiles = el('div', { class: 'board' }, TILES.map((t) =>
    el('div', { class: `tile tile-${t.type}` }, [
      el('div', { class: 'tile-label' }, t.label),
      el('div', { class: 'tile-pawns' }, state.players.filter((pl) => pl.position === t.id).map((pl) =>
        el('span', { class: `pawn pawn-${pl.id}`, title: pl.name }, pl.name[0].toUpperCase()))),
    ])));

  const roll = button('🎲 Jogar o dado', () => actions.rollAndMove(), { disabled: Boolean(p.rolled), class: 'primary' });
  const workshop = button('🔧 Ir à oficina', () => actions.go('workshop'));
  const launchBtn = button('🚀 Lançar', () => actions.launch(), {
    disabled: !design.ok,
    title: design.ok ? 'Projeto pronto e verba suficiente.' : 'Resolva as pendências na oficina antes de lançar.',
  });
  const end = button('Passar a vez', () => actions.endTurn(), { disabled: !p.rolled });

  return el('section', { class: 'screen board-screen' }, [
    el('header', { class: 'turn-header' }, [
      el('h1', {}, `Vez de ${p.name}`),
      el('p', {}, [`Missão: `, el('strong', {}, mission.name), ` · Verba: ${p.funds} · Rodada ${state.round}`]),
    ]),
    state.winner !== null ? el('p', { class: 'banner' }, `${state.players[state.winner].name} já cumpriu a missão! Os outros podem continuar tentando.`) : null,
    tiles,
    el('div', { class: 'row' }, [roll, workshop, launchBtn, end]),
    el('h3', {}, 'Milestones da sua missão'),
    milestoneTrack(p),
    logPanel(state),
  ]);
}
