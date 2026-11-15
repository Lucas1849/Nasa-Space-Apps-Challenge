// Resumos para o jogador: "Resumo do turno" (ao passar a vez) e "Desde o seu último turno"
// (no começo da vez seguinte). Só observa o estado: tira uma foto da agência no início e no fim
// de cada turno e compara. Respeita o rival escondido: só mostra entradas públicas do diário
// ou do próprio jogador.
import { el, button, avatar } from './components.js';
import { icon } from './icons.js';
import { nextStep } from './guide.js';
import { guideOn } from './prefs.js';
import { currentPlayer } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { ladderProgress } from '../sim/progress.js';
import { MISSIONS } from '../data/missions.js';
import { STAGES } from '../data/stages.js';
import { yearOf, isNewYear, ROUNDS_PER_YEAR, END_YEAR } from '../data/history.js';

let tracker = freshTracker();
function freshTracker() {
  return { key: null, starts: {}, ends: {}, since: {} };
}

export function resetSummaries() {
  tracker = freshTracker();
}

function snapshot(state, p) {
  return {
    funds: p.funds,
    tech: p.tech,
    shields: p.shields,
    steps: ladderProgress(p).steps,
    logHead: state.log[0] || null,
    year: yearOf(state.round),
  };
}

// Entradas do diário desde `head` (em ordem cronológica), visíveis para `viewerId`.
function logSince(state, head, viewerId) {
  let idx = head ? state.log.indexOf(head) : state.log.length;
  if (idx === -1) idx = Math.min(state.log.length, 10); // o diário é limitado: mostra as mais recentes
  return state.log.slice(0, idx).filter((l) => l.who == null || l.who === viewerId).map((l) => l.text).reverse();
}

function deltas(from, to) {
  return [
    { key: 'funds', label: 'Verba', icon: 'coins', value: to.funds - from.funds },
    { key: 'tech', label: 'Tecnologia', icon: 'chip', value: to.tech - from.tech },
    { key: 'shields', label: 'Proteções', icon: 'shield', value: to.shields - from.shields },
    { key: 'steps', label: 'Degraus', icon: 'ladder', value: to.steps - from.steps },
  ].filter((d) => d.value !== 0);
}

// Chamado a cada render: detecta o começo de um turno de jogador humano e tira a foto inicial.
export function trackTurn(state) {
  if (state.sandbox || !state.players.length || state.gameOver) return;
  const p = currentPlayer(state);
  if (!p || p.bot) return;
  const key = `${state.round}:${state.turn}`;
  if (tracker.key === key) return;
  tracker.key = key;
  const now = snapshot(state, p);
  const end = tracker.ends[p.id];
  tracker.since[p.id] = end
    ? { changes: deltas(end, now), entries: logSince(state, end.logHead, p.id) }
    : { changes: [], entries: logSince(state, null, p.id), first: true };
  tracker.starts[p.id] = now;
}

// Chamado logo antes de passar a vez: guarda a foto final para o próximo "desde o seu último turno".
export function markTurnEnd(state) {
  const p = currentPlayer(state);
  if (p && !p.bot) tracker.ends[p.id] = snapshot(state, p);
}

function changeChips(changes) {
  if (!changes.length) return el('p', { class: 'hint' }, 'Nenhuma mudança na verba, na tecnologia ou nos degraus.');
  return el('div', { class: 'delta-row' }, changes.map((d) => el('span', { class: `delta ${d.value > 0 ? 'up' : 'down'}` }, [
    icon(d.icon, { size: 16 }), `${d.label} `, el('strong', { class: 'num' }, `${d.value > 0 ? '+' : ''}${d.value}`),
  ])));
}

// Onde a agência está agora: degrau, nave e o que falta.
function statusLines(state, p) {
  const prog = ladderProgress(p);
  const lines = [];
  lines.push({ icon: 'ladder', text: prog.done ? 'Escada completa.' : `Degrau ${prog.steps + 1} de ${prog.total}: ${MISSIONS[prog.current]?.name ?? ''}.` });
  if (p.flight) {
    const f = p.flight;
    lines.push({ icon: 'satellite', text: `Nave em voo (${MISSIONS[f.missionId].name}). Próxima etapa: ${STAGES[f.plan[f.stageIndex]].name}, ${f.stageIndex + 1} de ${f.plan.length}.` });
  }
  if (p.missionId && !p.flight) {
    const design = checkDesign(p);
    const missing = design.checks.filter((c) => !c.ok && c.hard).length;
    lines.push(design.ok
      ? { icon: 'rocket', text: 'Nave pronta para lançar.' }
      : { icon: 'wrench', text: `Nave em montagem: ${missing} pendência(s) na oficina.` });
  }
  return el('ul', { class: 'status-lines' }, lines.map((l) => el('li', {}, [icon(l.icon, { size: 16 }), l.text])));
}

function entriesList(entries, empty) {
  if (!entries.length) return el('p', { class: 'hint' }, empty);
  return el('ol', { class: 'summary-log' }, entries.map((t) => el('li', {}, t)));
}

// Texto da rodada: ano, rodada dentro do ano e tempo que resta até 1969.
export function roundLine(state) {
  const year = yearOf(state.round);
  const inYear = ((state.round - 1) % ROUNDS_PER_YEAR) + 1;
  const yearsLeft = END_YEAR - year;
  return `${year}, rodada ${inYear} de ${ROUNDS_PER_YEAR} · ${yearsLeft > 0 ? `faltam ${yearsLeft} ano(s) até ${END_YEAR}` : `último ano da corrida`}`;
}

// Modal "Resumo do turno", aberto pelo botão Passar a vez.
export function turnSummaryModal(state, actions) {
  const p = currentPlayer(state);
  const start = tracker.starts[p.id] || snapshot(state, p);
  const now = snapshot(state, p);
  const entries = logSince(state, start.logHead, p.id);
  const humans = state.players.filter((x) => !x.bot).length;
  const next = guideOn() ? nextStep(state, 'board') : null;
  const tip = !p.flight && p.missionId && !checkDesign(p).ok
    ? 'No próximo turno, continue montando a nave na oficina.'
    : p.flight ? 'No próximo turno, avance o voo para a etapa seguinte.'
      : next?.target === 'launch' ? 'Sua nave está pronta: no próximo turno você pode lançar.' : null;

  return el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === e.currentTarget) actions.closeModal(); } }, [
    el('div', { class: 'modal panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'turn-summary-title' }, [
      el('div', { class: 'modal-head' }, [
        avatar(p, 40),
        el('div', {}, [
          el('h2', { id: 'turn-summary-title', class: 'modal-title' }, 'Resumo do seu turno'),
          el('p', { class: 'hint' }, `${p.name} · ${roundLine(state)}`),
        ]),
      ]),
      el('h3', {}, 'O que mudou'),
      changeChips(deltas(start, now)),
      el('h3', {}, 'O que aconteceu'),
      entriesList(entries, 'Nada registrado neste turno.'),
      el('h3', {}, 'Onde sua agência está'),
      statusLines(state, p),
      tip ? el('p', { class: 'tip-line' }, [icon('bulb', { size: 16 }), tip]) : null,
      el('div', { class: 'row modal-actions' }, [
        button([icon('arrowRight'), 'Passar a vez'], () => actions.confirmEndTurn(), { class: 'primary' }),
        button('Continuar meu turno', () => actions.closeModal(), { class: 'ghost' }),
      ]),
      humans > 1 ? el('p', { class: 'hint' }, 'Depois, passe o dispositivo para a próxima agência. O resumo some antes que ela veja.') : null,
    ]),
  ]);
}

// Cartão "Desde o seu último turno", no tabuleiro, até o jogador rolar os dados.
export function sinceCard(state) {
  const p = currentPlayer(state);
  const since = tracker.since[p.id];
  if (!since || p.rolled) return null;
  const newYear = isNewYear(state.round);
  if (since.first) {
    return el('div', { class: 'panel since-card' }, [
      el('div', { class: 'since-head' }, [icon('flag', { size: 20 }), el('strong', {}, `Primeiro turno de ${p.name}`)]),
      el('p', { class: 'hint' }, `${roundLine(state)}. Sua missão é subir a escada do seu lado antes dos rivais.`),
    ]);
  }
  return el('div', { class: 'panel since-card' }, [
    el('div', { class: 'since-head' }, [icon('list', { size: 20 }), el('strong', {}, 'Desde o seu último turno')]),
    el('p', { class: 'hint' }, roundLine(state)),
    newYear ? el('p', { class: 'new-year' }, [icon('calendar', { size: 16 }), `Ano novo: ${yearOf(state.round)}. Orçamento e tecnologia do ano entraram.`]) : null,
    changeChips(since.changes),
    since.entries.length ? entriesList(since.entries, '') : null,
  ]);
}
