// Resumo para o jogador: "Desde o seu último turno" (no começo da vez seguinte). O que acabou de
// acontecer aparece na hora, no cartão de resultado do tabuleiro (ui/board.js), e passar a vez não
// pede confirmação. Só observa o estado: tira uma foto da agência no início e no fim de cada turno
// e compara. Respeita o rival escondido: só mostra entradas públicas do diário ou do próprio jogador.
import { el } from './components.js';
import { icon } from './icons.js';
import { currentPlayer } from '../sim/state.js';
import { ladderProgress } from '../sim/progress.js';
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
