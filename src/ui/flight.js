// Tela de voo: um imprevisto aconteceu e o jogador precisa decidir.
// Cada opção mostra a consequência antes da escolha (toda decisão tem efeito visível).
import { el, button } from './components.js';
import { FLIGHT_EVENTS, resolveOption } from '../data/events.js';
import { currentPlayer } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';

function describeEffect(effect = {}) {
  const parts = [];
  if (effect.sciencePenalty) parts.push(`perde ${effect.sciencePenalty * 100}% da ciência`);
  if (effect.sciencePenalty === 0) parts.push('sem perda (há reserva a bordo)');
  if (effect.failChance) parts.push(`+${effect.failChance * 100}% de chance de perder a missão`);
  if (effect.funds) parts.push(`${effect.funds} de verba`);
  if (effect.lifetimeDelta) parts.push(`${effect.lifetimeDelta} ano(s) de vida útil`);
  return parts.length ? parts.join(' · ') : 'sem efeito';
}

export function flightScreen(state, actions) {
  const p = currentPlayer(state);
  const event = FLIGHT_EVENTS[state.pendingFlight.eventId];
  const mission = MISSIONS[p.missionId];

  return el('section', { class: 'screen flight' }, [
    el('p', { class: 'eyebrow' }, `🚀 ${p.name} · ${mission.name} · em voo`),
    el('h1', {}, `⚠️ ${event.title}`),
    el('p', { class: 'event-text' }, event.text),
    el('h2', {}, 'O que você faz?'),
    el('div', { class: 'options' }, event.options.map((opt, i) => {
      const effect = resolveOption(opt, p);
      return el('div', { class: 'card option' }, [
        el('strong', {}, opt.label),
        el('div', { class: 'card-stats' }, `Consequência: ${describeEffect(effect)}`),
        button('Escolher', () => actions.resolveFlight(i), { class: 'primary' }),
      ]);
    })),
    el('p', { class: 'hint' }, 'Missões reais enfrentam imprevistos assim. A escolha certa depende do que você colocou a bordo.'),
  ]);
}
