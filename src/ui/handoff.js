// Tela de troca (IDEIA.md v3 seção 9): no mesmo computador, esconde o estado de cada agência entre turnos.
import { el, button, avatar, sideBadge } from './components.js';
import { roundLine } from './summary.js';
import { currentPlayer } from '../sim/state.js';
import { yearOf, isNewYear } from '../data/history.js';
import { t } from '../i18n/index.js';

export function handoffScreen(state, actions) {
  const p = currentPlayer(state);
  return el('section', { class: 'screen handoff' }, [
    el('div', { class: 'panel handoff-card' }, [
      el('p', { class: 'eyebrow' }, `${yearOf(state.round)}${isNewYear(state.round) ? t('ho.newYear') : ''}`),
      avatar(p, 64),
      el('h1', {}, t('common.turnOf', { name: p.name })),
      el('p', { class: 'chip' }, sideBadge(p)),
      el('p', { class: 'hint' }, roundLine(state)),
      el('p', { class: 'hint' }, t('ho.pass')),
      button(t('ho.startMyTurn'), () => actions.go('board'), { class: 'primary' }),
    ]),
  ]);
}
