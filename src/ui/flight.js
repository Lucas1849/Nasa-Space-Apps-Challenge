// Tela de voo: um imprevisto aconteceu e o jogador precisa decidir.
// Cada opção mostra a consequência antes da escolha (toda decisão tem efeito visível).
import { el, button, hud } from './components.js';
import { FLIGHT_EVENTS, resolveOption } from '../data/events.js';
import { currentPlayer } from '../sim/state.js';

const EVENT_ICONS = { solar_storm: '🌞', debris: '☄️', budget_cut: '💸', antenna_stuck: '📡' };

function describeEffect(effect = {}) {
  const parts = [];
  if (effect.sciencePenalty) parts.push(`−${effect.sciencePenalty * 100}% ciência`);
  if (effect.sciencePenalty === 0) parts.push('sem perda: há reserva a bordo');
  if (effect.failChance) parts.push(`+${effect.failChance * 100}% risco de perder a missão`);
  if (effect.funds) parts.push(`${effect.funds} verba`);
  if (effect.lifetimeDelta) parts.push(`${effect.lifetimeDelta} ano(s) de vida útil`);
  return parts.length ? parts.join(' · ') : 'sem efeito';
}

export function flightScreen(state, actions) {
  const p = currentPlayer(state);
  const event = FLIGHT_EVENTS[state.pendingFlight.eventId];

  return el('section', { class: 'screen' }, [
    hud(state, p, 'flight'),
    el('div', { class: 'flight' }, [
      el('span', { class: 'alarm' }, EVENT_ICONS[event.id] || '⚠️'),
      el('p', { class: 'eyebrow' }, 'Em voo · alerta do controle da missão'),
      el('h1', {}, event.title),
      el('p', { class: 'event-text' }, event.text),
      el('div', { class: 'options' }, event.options.map((opt, i) => {
        const effect = resolveOption(opt, p);
        const card = el('div', { class: 'card option', onclick: () => actions.resolveFlight(i) }, [
          el('strong', {}, opt.label),
          el('span', { class: 'consequence' }, `→ ${describeEffect(effect)}`),
          button('Escolher', (e) => { e.stopPropagation(); actions.resolveFlight(i); }, { class: 'primary small' }),
        ]);
        return card;
      })),
      el('p', { class: 'hint', style: 'margin-top:18px' }, 'Missões reais enfrentam imprevistos assim. A escolha certa depende do que você colocou a bordo.'),
    ]),
  ]);
}
