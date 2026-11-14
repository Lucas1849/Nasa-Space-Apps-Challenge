// Fim da partida: vencedor pela carta (ou pelo maior progresso em 1969), ranking e comparação com a história.
import { el, button, avatar, progressBar } from './components.js';
import { MISSIONS } from '../data/missions.js';
import { OBJECTIVES, objectiveProgress } from '../data/objectives.js';
import { REAL_HISTORY, EPILOGUE, yearOf } from '../data/history.js';

export function gameoverScreen(state, actions) {
  const ranked = [...state.players].sort((a, b) => {
    const wa = state.winners.includes(a.id) ? 1 : 0;
    const wb = state.winners.includes(b.id) ? 1 : 0;
    return wb - wa || objectiveProgress(b, state).pct - objectiveProgress(a, state).pct;
  });
  const names = state.winners.map((id) => state.players[id].name).join(' e ');
  const solo = state.players.length === 1;

  return el('section', { class: 'screen gameover' }, [
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'stamp' }, '🏆'),
      el('div', {}, [
        el('p', { class: 'eyebrow' }, `Fim da corrida · ${yearOf(state.round)}`),
        el('h1', {}, solo
          ? (state.endReason === 'objective' ? `${names} cumpriu a carta!` : 'O tempo acabou')
          : `${names} ${state.winners.length > 1 ? 'venceram' : 'venceu'}`),
        el('p', { class: 'hint' }, state.endReason === 'objective'
          ? 'A carta de vitória foi cumprida. A rodada terminou para todos jogarem o mesmo número de turnos.'
          : 'Ninguém cumpriu a carta até 1969. Vence quem chegou mais perto dela.'),
      ]),
    ]),
    el('h2', {}, 'Classificação'),
    el('div', { class: 'panel race' }, ranked.map((p) => {
      const card = OBJECTIVES[p.objectiveId];
      const prog = objectiveProgress(p, state);
      return el('div', { class: 'race-row' }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [
          avatar(p, 26), el('strong', {}, p.name), state.winners.includes(p.id) ? '🏆' : null,
          el('span', { class: 'chip small' }, `${card.icon} ${card.name}`),
          el('span', { class: 'spacer' }),
          el('span', { class: 'num' }, `${Math.round(prog.pct * 100)}%`),
        ]),
        progressBar(prog.pct, prog.done ? 'done' : 'ok'),
        el('small', { class: 'hint' }, `${card.goal} (${prog.value}/${prog.target}) · ${p.completed.length} missão(ões) cumprida(s) · ${p.launches} lançamento(s)`),
      ]);
    })),
    el('h2', {}, 'Você × a história real'),
    el('ul', { class: 'reasons' }, state.players.flatMap((p) => p.completed.map((c) => {
      const real = REAL_HISTORY[c.missionId].year;
      const diff = c.year - real;
      return el('li', {}, `${p.name}: ${MISSIONS[c.missionId].name} em ${c.year} (história real: ${real}, ${diff === 0 ? 'mesmo ano' : diff < 0 ? `${-diff} ano(s) antes` : `${diff} ano(s) depois`}).`);
    }))),
    el('p', { class: 'hint' }, state.players.some((p) => p.completed.length) ? '' : 'Nenhuma missão cumprida nesta partida.'),
    el('div', { class: 'panel lesson' }, [el('strong', {}, '🤝 Epílogo'), el('p', {}, EPILOGUE)]),
    el('div', { class: 'row' }, [button('Nova partida', () => actions.newGame(), { class: 'primary' })]),
  ]);
}
