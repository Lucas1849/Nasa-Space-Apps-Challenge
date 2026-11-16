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
import { t } from '../i18n/index.js';

function stageLog(stages) {
  return el('ol', { class: 'stage-log' }, stages.map((s) => el('li', { class: s.success ? 'ok' : 'bad' }, [
    el('strong', { class: 'with-icon' }, [icon(s.success ? 'check' : 'x', { size: 16 }), t('rep.stageRisk', { name: s.name, pct: pct(s.risk), shield: s.usedShield ? t('rep.savedByShield') : '' })]),
    s.eventTitle ? el('small', {}, t('rep.mishapDecision', { title: s.eventTitle, choice: s.choice })) : null,
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
  const title = r.success ? t('rep.success') : t('rep.failed');

  return el('section', { class: `screen report ${r.success ? 'success' : 'failure'}` }, [
    hud(state, p, 'report', actions),
    guideCard(state, 'report'),
    // Cabeçalho: selo do resultado, título, etapas do voo numa linha e a pontuação ao lado.
    el('div', { class: 'panel report-head' }, [
      el('span', { class: 'result-seal', 'aria-hidden': 'true' }, icon(r.success ? 'check' : 'x', { size: 26 })),
      el('div', { class: 'report-head-text' }, [
        el('p', { class: 'eyebrow' }, t('rep.eyebrow', { name: mission.name })),
        el('h1', {}, title),
        el('p', { class: 'hint' }, r.success
          ? t('rep.scienceDelivered', { n: r.scienceDelivered, record: r.record ? t('rep.record') : '' })
          : t('rep.failHint')),
        r.stages?.length ? stageTrack(r.stages.map((x) => x.stageId), r.stages, -1) : null,
      ]),
      el('div', { class: 'score' }, [el('div', { class: 'big' }, r.score), el('div', { class: 'label' }, t('rep.points'))]),
    ]),
    el('div', { class: 'report-grid' }, [
      el('div', {}, [
        el('h2', {}, t('rep.why')),
        el('ul', { class: 'reasons' }, r.reasons.map((reason) => el('li', {}, reason))),
        r.learning ? el('div', { class: 'panel lesson' }, [panelTitle('eye', t('rep.learned')), el('p', {}, r.learning)]) : null,
        r.consolation ? el('div', { class: 'panel lesson' }, [panelTitle('medal', t('rep.consolationT')), el('p', {}, r.consolation)]) : null,
        r.failureLesson ? el('div', { class: 'panel lesson' }, [panelTitle('testTube', t('rep.failureData')), el('p', {}, r.failureLesson)]) : null,
        r.stepBonus ? el('div', { class: 'panel lesson' }, [
          panelTitle('ladder', t('rep.stepDone', { n: r.stepBonus.bonus })),
          el('p', {}, r.stepBonus.first ? t('rep.stepFirst') : t('rep.stepLater')),
        ]) : null,
        r.stages?.length ? el('div', {}, [el('h2', {}, t('rep.flightByStage')), stageLog(r.stages)]) : null,
        failed.length ? el('div', {}, [
          el('h2', {}, t('rep.whatWouldChange')),
          el('ul', { class: 'reasons' }, failed.map((c) => el('li', {}, c.text))),
        ]) : null,
        r.success && history ? el('div', { class: 'panel lesson history' }, [
          panelTitle('scroll', t('rep.realHistory', { year: history.year })),
          el('p', {}, history.text),
          state.sandbox || !p.side ? null : el('p', { class: 'hint' }, t('rep.youDid', { year: r.year, rest: history.sides[p.side] ? t('rep.yourSideReal', { real: history.sides[p.side], cmp: compareYear(r.year, history.sides[p.side]) }) : t('rep.sideNever') })),
          el('a', { href: history.source, target: '_blank', rel: 'noopener' }, t('rep.source')),
        ]) : null,
      ]),
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(craftView), el('span', { class: 'caption' }, r.success ? t('rep.craftOp') : t('rep.craftThis'))]),
        // Checagem: só o que falhou (ou ficou desconhecido) aberto; o que deu certo fica recolhido.
        r.checks?.length ? el('div', { class: 'panel report-checks' }, [el('h3', {}, t('rep.fullCheck')), compactChecks(r.checks)]) : null,
      ]),
    ]),
    // Barra fixa embaixo (como o Lançar da oficina): a próxima ação nunca fica fora da tela.
    el('div', { class: 'launch-dock report-dock', role: 'region', 'aria-label': t('rep.nextStep') }, [
      el('p', { class: 'dock-status' }, r.success ? t('rep.scoreNote') : t('rep.lostNote')),
      el('div', { class: 'row dock-buttons' }, [
      button(state.sandbox ? [icon('wrench', { size: 18 }), t('rep.backWorkshop')] : [t('board.endTurn'), icon('arrowRight', { size: 18 })], () => actions.endTurn(), { class: `primary ${hl(state, 'report', 'end')}` }),
      state.sandbox ? null : button([icon('wrench', { size: 18 }), t('step.workshop')], () => actions.go('workshop')),
      button([icon('refresh', { size: 18 }), t('ws.newGame')], () => actions.newGame(), { class: 'ghost' }),
    ]),
    ]),
  ]);
}

function compactChecks(checks) {
  const open = checks.filter((c) => c.hidden || !c.ok);
  const done = checks.filter((c) => !c.hidden && c.ok);
  return el('div', { class: 'checks-compact' }, [
    open.length ? checklist(open) : el('p', { class: 'all-ok' }, [icon('check', { size: 16 }), t('rep.allOk')]),
    done.length ? el('details', { class: 'checks-ok' }, [el('summary', {}, t('rep.itemsOk', { n: done.length })), checklist(done)]) : null,
  ]);
}

function compareYear(mine, real) {
  if (!mine) return '';
  if (mine < real) return t('rep.yearsBefore', { n: real - mine });
  if (mine > real) return t('rep.yearsAfter', { n: mine - real });
  return t('rep.sameYear');
}
