// Tela de troca (IDEIA.md v3 seção 9): no mesmo computador, esconde o estado de cada agência entre turnos.
import { el, button, avatar, sideBadge } from './components.js';
import { roundLine } from './summary.js';
import { currentPlayer } from '../sim/state.js';
import { yearOf, isNewYear } from '../data/history.js';

export function handoffScreen(state, actions) {
  const p = currentPlayer(state);
  return el('section', { class: 'screen handoff' }, [
    el('div', { class: 'panel handoff-card' }, [
      el('p', { class: 'eyebrow' }, `${yearOf(state.round)}${isNewYear(state.round) ? ' · Ano novo' : ''}`),
      avatar(p, 64),
      el('h1', {}, `Vez de ${p.name}`),
      el('p', { class: 'chip' }, sideBadge(p)),
      el('p', { class: 'hint' }, roundLine(state)),
      el('p', { class: 'hint' }, 'Passe o dispositivo. As outras agências não devem olhar: o estado de cada uma é secreto. Ao começar, você verá o que mudou desde o seu último turno.'),
      button('Sou eu: começar meu turno', () => actions.go('board'), { class: 'primary' }),
    ]),
  ]);
}
