// Tela de voo: uma etapa por turno. Mostra o imprevisto (vindo da casa do tabuleiro ou garantido
// nos pontos-chave) e, em cada opção, o risco calculado e o porquê ANTES da escolha.
// Depois da escolha, mostra o resultado da etapa.
import { el, button, hud, stageTrack } from './components.js';
import { icon } from './icons.js';
import { guideCard, hl } from './guide.js';
import { currentPlayer } from '../sim/state.js';
import { stageOptions, describeRisk, pct } from '../sim/flight.js';
import { FLIGHT_EVENTS } from '../data/events.js';
import { MISSIONS } from '../data/missions.js';
import { STAGES } from '../data/stages.js';

const EVENT_ICONS = { solar_storm: 'sun', debris: 'comet', budget_cut: 'scissors', antenna_stuck: 'dish' };

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
    el('span', { class: 'alarm' }, icon(event ? EVENT_ICONS[event.id] || 'alert' : stage.icon, { size: 64 })),
    el('p', { class: 'eyebrow' }, `Etapa ${p.flight.stageIndex + 1} de ${p.flight.plan.length}: ${stage.name}`),
    el('h1', {}, event ? event.title : `${stage.name}: tudo nominal`),
    el('p', { class: 'event-text' }, event ? event.text : `${stage.text} Nenhum imprevisto à vista, mas o risco existe.`),
    el('div', { class: 'options' }, options.map((opt, i) => {
      const effectText = describeEffect(opt.effect);
      return el('div', { class: `card option ${opt.disabled ? 'disabled' : ''}`, onclick: opt.disabled ? null : () => actions.chooseStageOption(i) }, [
        el('strong', {}, opt.label),
        el('span', { class: 'risk-big' }, `risco ${pct(opt.risk.total)}`),
        el('small', { class: 'consequence' }, describeRisk(opt.risk)),
        effectText ? el('small', { class: 'consequence' }, `Efeito: ${effectText}`) : null,
        button('Escolher esta opção', (e) => { e.stopPropagation(); actions.chooseStageOption(i); }, { class: 'primary small', disabled: opt.disabled }),
      ]);
    })),
    el('p', { class: 'hint', style: 'margin-top:18px' }, 'O risco vem da sua nave: margem de massa e energia, antenas e bateria reservas, dados de falha e o Controle de missão. Uma proteção salva a etapa se ela falhar. Se falhar, a nave ainda tenta uma missão de consolação.'),
  ];
}

function resultView(state, p, actions) {
  const rec = p.flight.last;
  const next = STAGES[p.flight.plan[p.flight.stageIndex]];
  return [
    el('span', { class: 'alarm calm' }, icon('check', { size: 64 })),
    el('p', { class: 'eyebrow' }, `Etapa superada. O risco era de ${pct(rec.risk)}.`),
    el('h1', { class: 'ok' }, `${rec.name}: sucesso`),
    rec.usedShield ? el('p', { class: 'event-text' }, 'Algo falhou, mas a proteção salvou a etapa.') : null,
    rec.eventTitle ? el('p', { class: 'event-text' }, `Imprevisto: ${rec.eventTitle}. Você escolheu: "${rec.choice}".`) : null,
    rec.lesson ? el('p', { class: 'hint with-icon' }, [icon('bulb', { size: 16 }), rec.lesson]) : null,
    rec.bonus ? el('p', { class: 'hint' }, `+${rec.bonus} de verba: cada etapa superada rende prestígio.`) : null,
    el('p', { class: 'event-text' }, `Próxima etapa: ${next.name}${state.sandbox ? '.' : ', no seu próximo turno.'}`),
    el('div', { class: 'row', style: 'justify-content:center' }, state.sandbox
      ? [button(['Próxima etapa', icon('arrowRight', { size: 18 })], () => actions.advanceFlight(), { class: `primary ${hl(state, 'flight', 'next')}` })]
      : [
        button(['Passar a vez', icon('arrowRight', { size: 18 })], () => actions.endTurn(), { class: `primary ${hl(state, 'flight', 'end')}` }),
        button([icon('arrowLeft', { size: 18 }), 'Voltar ao tabuleiro'], () => actions.go('board'), { class: 'ghost' }),
      ]),
  ];
}

export function flightScreen(state, actions) {
  const p = currentPlayer(state);
  if (!p.flight) {
    return el('section', { class: 'screen' }, [hud(state, p, 'flight', actions), el('p', { class: 'hint' }, 'Nenhuma nave em voo.'), button('Voltar', () => actions.go(state.sandbox ? 'workshop' : 'board'))]);
  }
  const f = p.flight;
  return el('section', { class: 'screen' }, [
    hud(state, p, 'flight', actions),
    guideCard(state, 'flight'),
    el('div', { class: 'flight' }, [
      el('p', { class: 'eyebrow' }, `Missão ${MISSIONS[f.missionId].name}`),
      stageTrack(f.plan, f.stages, f.stageIndex),
      ...(f.pending ? decisionView(state, p, actions) : resultView(state, p, actions)),
    ]),
  ]);
}
