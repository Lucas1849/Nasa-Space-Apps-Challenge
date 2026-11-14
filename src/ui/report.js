// Relatório da missão: sucesso, falha ou aborto, pontuação e, principalmente, o PORQUÊ.
// Mostra cada etapa do voo com o risco e a decisão, os dados de falha (passo Verify) e,
// no sucesso, o cartão "Na história real".
import { el, button, hud, checklist, stageTrack } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { currentPlayer } from '../sim/state.js';
import { pct } from '../sim/flight.js';
import { MISSIONS } from '../data/missions.js';
import { REAL_HISTORY } from '../data/history.js';

function stageLog(stages) {
  return el('ol', { class: 'stage-log' }, stages.map((s) => el('li', { class: s.success ? 'ok' : 'bad' }, [
    el('strong', {}, `${s.success ? '✓' : '✕'} ${s.name} · risco ${pct(s.risk)}${s.usedShield ? ' · salva pela proteção 🛡️' : ''}`),
    s.eventTitle ? el('small', {}, `Imprevisto: ${s.eventTitle}. Decisão: "${s.choice}".`) : null,
    el('small', { class: 'hint' }, s.riskText),
    s.lesson ? el('small', { class: 'hint' }, `💡 ${s.lesson}`) : null,
  ])));
}

export function reportScreen(state, actions) {
  const p = currentPlayer(state);
  const r = p.lastResult;
  const mission = MISSIONS[r.missionId];
  const failed = (r.checks || []).filter((c) => !c.ok);
  const history = REAL_HISTORY[r.missionId];
  const craftView = r.craft ? { ...p, missionId: r.missionId, spacecraft: r.craft } : p;
  const title = r.success ? 'Missão cumprida' : r.aborted ? 'Missão abortada' : 'Missão falhou';

  return el('section', { class: `screen report ${r.success ? 'success' : 'failure'}` }, [
    hud(state, p, 'report'),
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'stamp' }, r.success ? '✓' : '✕'),
      el('div', {}, [
        el('p', { class: 'eyebrow' }, `Relatório de missão · ${mission.name}`),
        el('h1', {}, title),
        el('p', { class: 'hint' }, r.success
          ? `${r.scienceDelivered} de ciência entregue.${r.record ? ' 🏆 Primeira agência do mundo a cumprir esta missão!' : ''}`
          : r.aborted ? 'A nave voltou, mas o lançamento e o tempo se perderam.' : 'Cada falha ensina algo: veja os dados de falha abaixo.'),
      ]),
      el('div', { class: 'score' }, [el('div', { class: 'big' }, r.score), el('div', { class: 'label' }, 'pontos')]),
    ]),
    el('div', { class: 'report-grid' }, [
      el('div', {}, [
        el('h2', {}, 'Por quê'),
        el('ul', { class: 'reasons' }, r.reasons.map((t) => el('li', {}, t))),
        r.failureLesson ? el('div', { class: 'panel lesson' }, [el('strong', {}, '🧪 Dados de falha'), el('p', {}, r.failureLesson)]) : null,
        r.stages?.length ? el('div', {}, [el('h2', {}, 'O voo, etapa por etapa'), stageLog(r.stages)]) : null,
        failed.length ? el('div', {}, [
          el('h2', {}, 'O que mudaria o resultado'),
          el('ul', { class: 'reasons' }, failed.map((c) => el('li', {}, c.text))),
        ]) : null,
        r.success && history ? el('div', { class: 'panel lesson history' }, [
          el('strong', {}, `📜 Na história real (${history.year})`),
          el('p', {}, history.text),
          state.sandbox ? null : el('p', { class: 'hint' }, `Você cumpriu em ${p.completed[p.completed.length - 1]?.year}. ${compareYear(p.completed[p.completed.length - 1]?.year, history.year)}`),
          el('a', { href: history.source, target: '_blank', rel: 'noopener' }, 'Fonte: NASA History'),
        ]) : null,
      ]),
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(craftView), el('span', { class: 'caption' }, r.success ? 'sua espaçonave, agora em operação' : 'a espaçonave deste voo')]),
        r.stages?.length ? el('div', { class: 'panel', style: 'margin-top:12px' }, [stageTrack(r.stages.map((s) => s.stageId), r.stages, -1)]) : null,
        r.checks?.length ? el('div', { class: 'panel', style: 'margin-top:12px' }, [el('h3', { style: 'margin-top:0' }, 'Checagem completa'), checklist(r.checks)]) : null,
      ]),
    ]),
    el('p', { class: 'hint' }, r.success
      ? 'Pontuação = ciência entregue ×10 + verba poupada + margem de massa não usada. Projetos enxutos pontuam mais. Escolha a próxima missão no tabuleiro.'
      : 'Peças que voltaram de um voo abortado valem metade na revenda.'),
    el('div', { class: 'row' }, [
      button(state.sandbox ? '🔧 Voltar à oficina' : 'Passar a vez →', () => actions.endTurn(), { class: 'primary' }),
      state.sandbox ? null : button('🔧 Oficina', () => actions.go('workshop')),
      button('Nova partida', () => actions.newGame(), { class: 'ghost' }),
    ]),
  ]);
}

function compareYear(mine, real) {
  if (!mine) return '';
  if (mine < real) return `${real - mine} ano(s) antes da história real.`;
  if (mine > real) return `${mine - real} ano(s) depois da história real.`;
  return 'No mesmo ano da história real.';
}
