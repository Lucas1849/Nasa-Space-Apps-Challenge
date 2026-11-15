// Tela de espera do modo online (Fase 4 do PLANO-SALAS.md): fora da sua vez, você não
// vê o tabuleiro de ninguém — só quem está jogando agora e a sua agência. A tela troca
// sozinha quando o estado do host chega com a sua vez. Não entra em SCREENS: é um
// override do render em main.js, só quando há partida online e a vez é de outro.
import { el, avatar, sideBadge } from './components.js';
import { currentPlayer } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';
import { yearOf } from '../data/history.js';

export function waitScreen(state, myPlayerId) {
  const current = currentPlayer(state);
  const me = state.players[myPlayerId] ?? null;
  return el('section', { class: 'screen handoff' }, [
    el('div', { class: 'panel handoff-card' }, [
      el('p', { class: 'eyebrow' }, `${yearOf(state.round)} · partida online`),
      avatar(current, 64),
      el('h1', {}, `Vez de ${current.name}`),
      el('p', { class: 'chip' }, sideBadge(current)),
      me && el('p', { class: 'hint' }, `Sua agência: ${me.name} · degrau ${me.step + 1}: ${MISSIONS[me.missionId]?.name ?? '—'}`),
      el('p', { class: 'hint' }, 'Aguarde a sua vez — a tela atualiza sozinha. As decisões de cada agência são secretas.'),
    ]),
  ]);
}
