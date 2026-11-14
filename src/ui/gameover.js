// Fim da partida: o estado de todos é revelado. Vencedor pela escada (ou pelo maior progresso em 1969),
// classificação e comparação com a história real de cada lado.
import { el, button, avatar, progressBar, sideLabel } from './components.js';
import { ladderProgress } from '../sim/progress.js';
import { MISSIONS } from '../data/missions.js';
import { REAL_HISTORY, EPILOGUE, yearOf } from '../data/history.js';

export function gameoverScreen(state, actions) {
  const ranked = [...state.players].sort((a, b) => {
    const wa = state.winners.includes(a.id) ? 1 : 0;
    const wb = state.winners.includes(b.id) ? 1 : 0;
    return wb - wa || ladderProgress(b).pct - ladderProgress(a).pct;
  });
  const names = state.winners.map((id) => state.players[id].name).join(' e ');
  const humanWon = state.winners.some((id) => !state.players[id].bot);

  return el('section', { class: 'screen gameover' }, [
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'stamp' }, '🏆'),
      el('div', {}, [
        el('p', { class: 'eyebrow' }, `Fim da corrida · ${yearOf(state.round)}`),
        el('h1', {}, `${names} ${state.winners.length > 1 ? 'venceram' : 'venceu'}`),
        el('p', { class: 'hint' }, state.endReason === 'ladder'
          ? 'Uma escada foi completada. A rodada terminou para todos jogarem o mesmo número de turnos, e agora o estado de todos é revelado.'
          : `Ninguém completou a escada até ${yearOf(state.round)}. Vence quem subiu mais degraus.`),
        !humanWon && state.players.some((p) => p.bot) ? el('p', { class: 'hint' }, 'A história real chegou antes. Tente lançar mais cedo, ou investir em tecnologia para errar menos.') : null,
      ]),
    ]),
    el('h2', {}, 'Classificação'),
    el('div', { class: 'panel race' }, ranked.map((p) => {
      const prog = ladderProgress(p);
      return el('div', { class: 'race-row' }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [
          avatar(p, 26), el('strong', {}, p.name), state.winners.includes(p.id) ? '🏆' : null,
          el('span', { class: 'chip small' }, sideLabel(p)),
          el('span', { class: 'spacer' }),
          el('span', { class: 'num' }, `${prog.steps}/${prog.total} degraus`),
        ]),
        progressBar(prog.pct, prog.done ? 'done' : 'ok'),
        el('small', { class: 'hint' }, p.bot
          ? 'Bot histórico: seguiu o calendário real com variação.'
          : `${p.launches} lançamento(s) · tecnologia ${p.tech} · ${p.completed.reduce((s, c) => s + c.science, 0)} de ciência entregue`),
      ]);
    })),
    el('h2', {}, 'Você × a história real'),
    el('ul', { class: 'reasons' }, state.players.filter((p) => !p.bot).flatMap((p) => p.completed.map((c) => {
      const real = REAL_HISTORY[c.missionId].sides[p.side];
      if (real == null) return el('li', {}, `${p.name}: ${MISSIONS[c.missionId].name} em ${c.year}. Na história real, ${sideLabel(p)} nunca cumpriu esta missão.`);
      const diff = c.year - real;
      return el('li', {}, `${p.name}: ${MISSIONS[c.missionId].name} em ${c.year} (${sideLabel(p)} na história real: ${real}, ${diff === 0 ? 'mesmo ano' : diff < 0 ? `${-diff} ano(s) antes` : `${diff} ano(s) depois`}).`);
    }))),
    state.players.some((p) => !p.bot && p.completed.length) ? null : el('p', { class: 'hint' }, 'Nenhum degrau cumprido nesta partida.'),
    el('div', { class: 'panel lesson' }, [el('strong', {}, '🤝 Epílogo'), el('p', {}, EPILOGUE)]),
    el('div', { class: 'row' }, [button('Nova partida', () => actions.newGame(), { class: 'primary' })]),
  ]);
}
