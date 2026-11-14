// Relatório da missão: sucesso ou falha, pontuação e, principalmente, o PORQUÊ.
import { el, button } from './components.js';
import { currentPlayer } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';

export function reportScreen(state, actions) {
  const p = currentPlayer(state);
  const r = p.lastResult;
  const mission = MISSIONS[p.missionId];

  return el('section', { class: `screen report ${r.success ? 'success' : 'failure'}` }, [
    el('h1', {}, r.success ? '✅ Missão cumprida!' : '❌ Missão falhou'),
    el('p', {}, [`${p.name} — `, el('strong', {}, mission.name), ` · Pontuação: ${r.score}`]),
    el('h2', {}, 'Por quê'),
    el('ul', { class: 'reasons' }, r.reasons.map((t) => el('li', {}, t))),
    el('h2', {}, 'Checagem completa'),
    el('ul', { class: 'checklist' }, r.checks.map((c) => el('li', { class: c.ok ? 'ok' : 'bad' }, `${c.ok ? '✔' : '✖'} ${c.text}`))),
    el('p', { class: 'hint' }, r.success
      ? 'Pontuação = ciência entregue ×10 + verba poupada + margem de massa não usada. Projetos enxutos pontuam mais.'
      : 'Você pode ajustar o projeto na oficina e lançar de novo. Peças vendidas após um lançamento valem metade.'),
    el('div', { class: 'row' }, [
      button('Passar a vez', () => actions.endTurn(), { class: 'primary' }),
      button('🔧 Ajustar na oficina', () => actions.go('workshop')),
      button('Nova partida', () => actions.newGame()),
    ]),
  ]);
}
