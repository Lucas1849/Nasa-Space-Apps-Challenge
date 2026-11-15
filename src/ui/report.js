// Relatório da missão: sucesso ou falha (com missão de consolação), pontuação e, principalmente, o PORQUÊ.
// Mostra cada etapa do voo com o risco e a decisão, os dados de falha (passo Verify) e,
// no sucesso, o cartão "Na história real".
import { el, button, hud, checklist, stageTrack, panelTitle } from './components.js';
import { icon } from './icons.js';
import { guideCard, hl } from './guide.js';
import { spacecraftSvg } from './spacecraft.js';
import { currentPlayer } from '../sim/state.js';
import { pct } from '../sim/flight.js';
import { MISSIONS } from '../data/missions.js';
import { REAL_HISTORY } from '../data/history.js';

function stageLog(stages) {
  return el('ol', { class: 'stage-log' }, stages.map((s) => el('li', { class: s.success ? 'ok' : 'bad' }, [
    el('strong', { class: 'with-icon' }, [icon(s.success ? 'check' : 'x', { size: 16 }), `${s.name}: risco de ${pct(s.risk)}${s.usedShield ? ', salva pela proteção' : ''}`]),
    s.eventTitle ? el('small', {}, `Imprevisto: ${s.eventTitle}. Decisão: "${s.choice}".`) : null,
    el('small', { class: 'hint' }, s.riskText),
    s.lesson ? el('small', { class: 'hint with-icon' }, [icon('bulb', { size: 14 }), s.lesson]) : null,
  ])));
}

export function reportScreen(state, actions) {
  const p = currentPlayer(state);
  const r = p.lastResult;
  const mission = MISSIONS[r.missionId];
  const failed = (r.checks || []).filter((c) => !c.ok);
  const history = REAL_HISTORY[r.missionId];
  const craftView = r.craft ? { ...p, missionId: r.missionId, spacecraft: r.craft } : p;
  const title = r.success ? 'Missão cumprida' : 'Missão falhou';

  return el('section', { class: `screen report ${r.success ? 'success' : 'failure'}` }, [
    hud(state, p, 'report', actions),
    guideCard(state, 'report'),
    // Cabeçalho: selo do resultado, título, etapas do voo numa linha e a pontuação ao lado.
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'result-seal', 'aria-hidden': 'true' }, icon(r.success ? 'check' : 'x', { size: 26 })),
      el('div', { class: 'report-head-text' }, [
        el('p', { class: 'eyebrow' }, `Relatório da missão ${mission.name}`),
        el('h1', {}, title),
        el('p', { class: 'hint' }, r.success
          ? `${r.scienceDelivered} de ciência entregue.${r.record ? ' Recorde: primeira agência do mundo a cumprir esta missão.' : ''}`
          : 'Cada falha ensina algo: veja os dados de falha abaixo.'),
        r.stages?.length ? stageTrack(r.stages.map((x) => x.stageId), r.stages, -1) : null,
      ]),
      el('div', { class: 'score' }, [el('div', { class: 'big' }, r.score), el('div', { class: 'label' }, 'pontos')]),
    ]),
    el('div', { class: 'report-grid' }, [
      el('div', {}, [
        el('h2', {}, 'Por quê'),
        el('ul', { class: 'reasons' }, r.reasons.map((t) => el('li', {}, t))),
        r.learning ? el('div', { class: 'panel lesson' }, [panelTitle('eye', 'Requisito descoberto'), el('p', {}, r.learning)]) : null,
        r.consolation ? el('div', { class: 'panel lesson' }, [panelTitle('medal', 'Missão de consolação'), el('p', {}, r.consolation)]) : null,
        r.failureLesson ? el('div', { class: 'panel lesson' }, [panelTitle('testTube', 'Dados de falha'), el('p', {}, r.failureLesson)]) : null,
        r.stepBonus ? el('div', { class: 'panel lesson' }, [
          panelTitle('ladder', `Degrau cumprido: +${r.stepBonus.bonus} de verba`),
          el('p', {}, r.stepBonus.first ? 'Você foi a primeira agência do seu lado a cumprir este degrau.' : 'Outra agência do seu lado chegou antes, por isso o bônus é menor.'),
        ]) : null,
        r.stages?.length ? el('div', {}, [el('h2', {}, 'O voo, etapa por etapa'), stageLog(r.stages)]) : null,
        failed.length ? el('div', {}, [
          el('h2', {}, 'O que mudaria o resultado'),
          el('ul', { class: 'reasons' }, failed.map((c) => el('li', {}, c.text))),
        ]) : null,
        r.success && history ? el('div', { class: 'panel lesson history' }, [
          panelTitle('scroll', `Na história real (${history.year})`),
          el('p', {}, history.text),
          state.sandbox || !p.side ? null : el('p', { class: 'hint' }, `Você cumpriu em ${r.year}. ${history.sides[p.side] ? `Seu lado, na história real: ${history.sides[p.side]}. ${compareYear(r.year, history.sides[p.side])}` : 'Na história real, seu lado nunca cumpriu esta missão.'}`),
          el('a', { href: history.source, target: '_blank', rel: 'noopener' }, 'Fonte: NASA History'),
        ]) : null,
      ]),
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(craftView), el('span', { class: 'caption' }, r.success ? 'sua espaçonave, agora em operação' : 'a espaçonave deste voo')]),
        // Checagem: só o que falhou (ou ficou desconhecido) aberto; o que deu certo fica recolhido.
        r.checks?.length ? el('div', { class: 'panel report-checks' }, [el('h3', {}, 'Checagem completa'), compactChecks(r.checks)]) : null,
      ]),
    ]),
    // Barra fixa embaixo (como o Lançar da oficina): a próxima ação nunca fica fora da tela.
    el('div', { class: 'launch-dock report-dock', role: 'region', 'aria-label': 'Próximo passo' }, [
      el('p', { class: 'dock-status' }, r.success
        ? 'Pontuação = ciência ×10 + verba poupada + margem de massa. Projetos enxutos pontuam mais.'
        : 'A nave foi perdida. Tecnologia, prédios e dados de falha continuam com você.'),
      el('div', { class: 'row dock-buttons' }, [
      button(state.sandbox ? [icon('wrench', { size: 18 }), 'Voltar à oficina'] : ['Passar a vez', icon('arrowRight', { size: 18 })], () => actions.endTurn(), { class: `primary ${hl(state, 'report', 'end')}` }),
      state.sandbox ? null : button([icon('wrench', { size: 18 }), 'Oficina'], () => actions.go('workshop')),
      button([icon('refresh', { size: 18 }), 'Nova partida'], () => actions.newGame(), { class: 'ghost' }),
    ]),
    ]),
  ]);
}

function compactChecks(checks) {
  const open = checks.filter((c) => c.hidden || !c.ok);
  const done = checks.filter((c) => !c.hidden && c.ok);
  return el('div', { class: 'checks-compact' }, [
    open.length ? checklist(open) : el('p', { class: 'all-ok' }, [icon('check', { size: 16 }), 'Tudo certo no projeto.']),
    done.length ? el('details', { class: 'checks-ok' }, [el('summary', {}, `${done.length} ${done.length === 1 ? 'item ok' : 'itens ok'}`), checklist(done)]) : null,
  ]);
}

function compareYear(mine, real) {
  if (!mine) return '';
  if (mine < real) return `${real - mine} ano(s) antes da história real.`;
  if (mine > real) return `${mine - real} ano(s) depois da história real.`;
  return 'No mesmo ano da história real.';
}
