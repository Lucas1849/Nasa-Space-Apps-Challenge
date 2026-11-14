// Tela de voo: uma etapa por turno. Mostra o imprevisto (vindo da casa do tabuleiro ou garantido
// nos pontos-chave) e, em cada opção, o risco calculado e o porquê ANTES da escolha.
// Depois da escolha, mostra o resultado da etapa.
import { el, button, hud, stageTrack } from './components.js';
import { currentPlayer } from '../sim/state.js';
import { stageOptions, describeRisk, pct } from '../sim/flight.js';
import { FLIGHT_EVENTS } from '../data/events.js';
import { MISSIONS } from '../data/missions.js';
import { STAGES } from '../data/stages.js';

const EVENT_ICONS = { solar_storm: '🌞', debris: '☄️', budget_cut: '💸', antenna_stuck: '📡' };

function describeEffect(effect = {}) {
  const parts = [];
  if (effect.sciencePenalty) parts.push(`−${effect.sciencePenalty * 100}% ciência`);
  if (effect.sciencePenalty === 0) parts.push('sem perda: há reserva a bordo');
  if (effect.funds) parts.push(`${effect.funds} verba`);
  if (effect.lifetimeDelta) parts.push(`${effect.lifetimeDelta} ano(s) de vida útil`);
  return parts.join(' · ');
}

function decisionView(state, p, actions) {
  const { stageId, eventId } = p.flight.pending;
  const stage = STAGES[stageId];
  const event = eventId ? FLIGHT_EVENTS[eventId] : null;
  const options = stageOptions(p, p.flight.pending);
  return [
    el('span', { class: 'alarm' }, event ? EVENT_ICONS[event.id] || '⚠️' : stage.icon),
    el('p', { class: 'eyebrow' }, `Etapa ${p.flight.stageIndex + 1}/${p.flight.plan.length} · ${stage.name}`),
    el('h1', {}, event ? event.title : `${stage.name}: tudo nominal`),
    el('p', { class: 'event-text' }, event ? event.text : `${stage.text} Nenhum imprevisto à vista, mas o risco existe.`),
    el('div', { class: 'options' }, options.map((opt, i) => {
      const effectText = describeEffect(opt.effect);
      return el('div', { class: `card option ${opt.kind === 'abort' ? 'abort' : ''} ${opt.disabled ? 'disabled' : ''}`, onclick: opt.disabled ? null : () => actions.chooseStageOption(i) }, [
        el('strong', {}, opt.label),
        opt.risk ? el('span', { class: 'risk-big' }, `risco ${pct(opt.risk.total)}`) : el('span', { class: 'risk-big safe' }, 'sem risco'),
        opt.risk ? el('small', { class: 'consequence' }, describeRisk(opt.risk)) : null,
        effectText ? el('small', { class: 'consequence' }, `→ ${effectText}`) : null,
        opt.kind === 'abort' ? el('small', { class: 'hint' }, opt.lesson) : null,
        button('Escolher', (e) => { e.stopPropagation(); actions.chooseStageOption(i); }, { class: `${opt.kind === 'abort' ? 'ghost' : 'primary'} small`, disabled: opt.disabled }),
      ]);
    })),
    el('p', { class: 'hint', style: 'margin-top:18px' }, 'O risco vem da sua nave: margem de massa e energia, antenas e bateria reservas, dados de falha e o Controle de missão. Uma proteção 🛡️ salva a etapa se ela falhar.'),
  ];
}

function resultView(state, p, actions) {
  const rec = p.flight.last;
  const next = STAGES[p.flight.plan[p.flight.stageIndex]];
  return [
    el('span', { class: 'alarm calm' }, '✅'),
    el('p', { class: 'eyebrow' }, `Etapa superada · risco era ${pct(rec.risk)}`),
    el('h1', { class: 'ok' }, `${rec.name}: sucesso`),
    rec.usedShield ? el('p', { class: 'event-text' }, 'Algo falhou, mas a proteção 🛡️ salvou a etapa.') : null,
    rec.eventTitle ? el('p', { class: 'event-text' }, `Imprevisto: ${rec.eventTitle}. Você escolheu: "${rec.choice}".`) : null,
    rec.lesson ? el('p', { class: 'hint' }, `💡 ${rec.lesson}`) : null,
    rec.bonus ? el('p', { class: 'hint' }, `+${rec.bonus} de verba: cada etapa superada rende prestígio.`) : null,
    el('p', { class: 'event-text' }, `Próxima etapa: ${next.icon} ${next.name}${state.sandbox ? '.' : ', no seu próximo turno.'}`),
    el('div', { class: 'row', style: 'justify-content:center' }, state.sandbox
      ? [button('Próxima etapa →', () => actions.advanceFlight(), { class: 'primary' })]
      : [
        button('Passar a vez →', () => actions.endTurn(), { class: 'primary' }),
        button('🔧 Montar a próxima nave', () => actions.go('workshop')),
        button('← Tabuleiro', () => actions.go('board'), { class: 'ghost' }),
      ]),
  ];
}

export function flightScreen(state, actions) {
  const p = currentPlayer(state);
  if (!p.flight) {
    return el('section', { class: 'screen' }, [hud(state, p, 'flight'), el('p', { class: 'hint' }, 'Nenhuma nave em voo.'), button('← Voltar', () => actions.go(state.sandbox ? 'workshop' : 'board'))]);
  }
  const f = p.flight;
  return el('section', { class: 'screen' }, [
    hud(state, p, 'flight'),
    el('div', { class: 'flight' }, [
      el('p', { class: 'eyebrow' }, `Missão ${MISSIONS[f.missionId].name}`),
      stageTrack(f.plan, f.stages, f.stageIndex),
      ...(f.pending ? decisionView(state, p, actions) : resultView(state, p, actions)),
    ]),
  ]);
}
