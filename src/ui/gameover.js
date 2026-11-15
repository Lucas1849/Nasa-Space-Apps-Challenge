// Fim da partida: o estado de todos é revelado. Vencedor pela escada (ou pelo maior progresso em 1969),
// classificação e comparação com a história real de cada lado.
import { el, button, avatar, progressBar, sideLabel, sideBadge, panelTitle } from './components.js';
import { icon } from './icons.js';
import { ladderProgress } from '../sim/progress.js';
import { MISSIONS } from '../data/missions.js';
import { REAL_HISTORY, yearOf } from '../data/history.js';
import { t } from '../i18n/index.js';

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
      el('span', { class: 'stamp' }, icon('trophy', { size: 150 })),
      el('div', {}, [
        el('p', { class: 'eyebrow' }, t('go.eyebrow', { year: yearOf(state.round) })),
        el('h1', {}, t(state.winners.length > 1 ? 'go.wonMany' : 'go.won', { names })),
        el('p', { class: 'hint' }, state.endReason === 'ladder'
          ? t('go.ladderHint')
          : t('go.timeHint', { year: yearOf(state.round) })),
        !humanWon && state.players.some((p) => p.bot) ? el('p', { class: 'hint' }, t('go.botWonHint')) : null,
      ]),
    ]),
    el('h2', {}, t('go.ranking')),
    el('div', { class: 'panel race' }, ranked.map((p) => {
      const prog = ladderProgress(p);
      return el('div', { class: 'race-row' }, [
        el('div', { class: 'row', style: 'margin:0;gap:8px' }, [
          avatar(p, 26), el('strong', {}, p.name), state.winners.includes(p.id) ? icon('trophy', { size: 18, label: 'Vencedor', className: 'winner' }) : null,
          el('span', { class: 'chip small' }, sideBadge(p)),
          el('span', { class: 'spacer' }),
          el('span', { class: 'num' }, t('go.steps', { steps: prog.steps, total: prog.total })),
        ]),
        progressBar(prog.pct, prog.done ? 'done' : 'ok'),
        el('small', { class: 'hint' }, p.bot
          ? t('go.botRow')
          : t('go.humanRow', { n: p.launches, tech: p.tech, sci: p.completed.reduce((s, c) => s + c.science, 0) })),
      ]);
    })),
    el('h2', {}, t('go.vsHistory')),
    el('ul', { class: 'reasons' }, state.players.filter((p) => !p.bot).flatMap((p) => p.completed.map((c) => {
      const real = REAL_HISTORY[c.missionId].sides[p.side];
      if (real == null) return el('li', {}, t('go.rowNever', { name: p.name, mission: MISSIONS[c.missionId].name, year: c.year, side: sideLabel(p) }));
      const diff = c.year - real;
      const cmp = diff === 0 ? t('go.same') : diff < 0 ? t('go.before', { n: -diff }) : t('go.after', { n: diff });
      return el('li', {}, t('go.row', { name: p.name, mission: MISSIONS[c.missionId].name, year: c.year, side: sideLabel(p), real, cmp }));
    }))),
    state.players.some((p) => !p.bot && p.completed.length) ? null : el('p', { class: 'hint' }, t('go.none')),
    el('div', { class: 'panel lesson' }, [panelTitle('coop', t('go.epilogue')), el('p', {}, t('history.epilogue'))]),
    el('div', { class: 'row' }, [button([icon('refresh', { size: 18 }), t('ws.newGame')], () => actions.newGame(), { class: 'primary' })]),
  ]);
}
