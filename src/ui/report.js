// Relatório da missão: sucesso ou falha, pontuação e, principalmente, o PORQUÊ.
// Inclui a decisão tomada em voo, sua lição, e o que mudaria o resultado.
import { el, button, hud, checklist } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { currentPlayer } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';

export function reportScreen(state, actions) {
  const p = currentPlayer(state);
  const r = p.lastResult;
  const mission = MISSIONS[p.missionId];
  const failed = r.checks.filter((c) => !c.ok);

  return el('section', { class: `screen report ${r.success ? 'success' : 'failure'}` }, [
    hud(state, p, 'report'),
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'stamp' }, r.success ? '✓' : '✕'),
      el('div', {}, [
        el('p', { class: 'eyebrow' }, `Relatório de missão · ${mission.name}`),
        el('h1', {}, r.success ? 'Missão cumprida' : 'Missão falhou'),
        el('p', { class: 'hint' }, r.success
          ? `${r.scienceDelivered} de ciência entregue. ${state.winner === p.id && p.milestones.length === 3 ? 'Você cumpriu sua missão!' : ''}`
          : 'Ajuste o projeto na oficina e tente de novo. Cada falha ensina algo.'),
      ]),
      el('div', { class: 'score' }, [el('div', { class: 'big' }, r.score), el('div', { class: 'label' }, 'pontos')]),
    ]),
    el('div', { class: 'report-grid' }, [
      el('div', {}, [
        el('h2', {}, 'Por quê'),
        el('ul', { class: 'reasons' }, r.reasons.map((t) => el('li', {}, t))),
        r.flight ? el('div', { class: 'panel lesson' }, [
          el('strong', {}, `Em voo: ${r.flight.event.title}`),
          el('p', {}, `Você escolheu: "${r.flight.option.label}".`),
          el('p', { class: 'hint' }, `💡 ${r.flight.option.lesson}`),
        ]) : null,
        failed.length ? el('div', {}, [
          el('h2', {}, 'O que mudaria o resultado'),
          el('ul', { class: 'reasons' }, failed.map((c) => el('li', {}, c.text))),
        ]) : null,
      ]),
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(p), el('span', { class: 'caption' }, 'sua espaçonave')]),
        el('div', { class: 'panel', style: 'margin-top:12px' }, [el('h3', { style: 'margin-top:0' }, 'Checagem completa'), checklist(r.checks)]),
      ]),
    ]),
    el('p', { class: 'hint' }, r.success
      ? 'Pontuação = ciência entregue ×10 + verba poupada + margem de massa não usada. Projetos enxutos pontuam mais.'
      : 'Peças vendidas após um lançamento valem metade.'),
    el('div', { class: 'row' }, [
      button(state.sandbox ? '🔧 Voltar à oficina' : 'Passar a vez →', () => actions.endTurn(), { class: 'primary' }),
      state.sandbox ? null : button('🔧 Ajustar na oficina', () => actions.go('workshop')),
      button('Nova partida', () => actions.newGame(), { class: 'ghost' }),
    ]),
  ]);
}
