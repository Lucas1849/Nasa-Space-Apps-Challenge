// Lobby da sala online (ver docs/PLANO-SALAS.md, Fase 0/3): as vagas de agência que os
// jogadores ocupam antes da partida começar. Módulo puro, sem DOM e sem rede — o host é
// o único que altera a sessão (mesmo padrão autoritativo do state do jogo); aqui ficam
// só as regras, testadas em node --test (test/lobby.test.mjs).
//
// Sessão: { code, slots: [{ peerId, name } | null, ...], started }
// Toda função devolve { session } com um objeto NOVO, ou { error } com o motivo em
// português (vira toast para quem tentou).

import { t } from '../i18n/index.js';

export const MIN_SLOTS = 2;
export const MAX_SLOTS = 4;
export const MAX_NAME_LENGTH = 20; // mesmo limite do input de nome do hot-seat (setup.js)

export function createSession(code, count) {
  const size = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, count));
  return { code, slots: Array.from({ length: size }, () => null), started: false };
}

function cleanName(name) {
  return String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
}

// Ocupa (ou troca para) a vaga `slot`. Regras: vaga existe; está livre ou já é do
// próprio peer (renomear); nome obrigatório. Quem já tinha outra vaga é movido — a
// antiga é liberada, como trocar de cadeira na mesa.
export function claimSlot(session, peerId, slot, name) {
  if (session.started) return { error: t('net.started') };
  const target = session.slots[slot];
  if (target === undefined) return { error: t('net.noSlot') };
  if (target && target.peerId !== peerId) return { error: t('net.slotTaken') };
  const cleaned = cleanName(name);
  if (!cleaned) return { error: t('net.nameRequired') };
  const slots = session.slots.map((s, i) => {
    if (i === slot) return { peerId, name: cleaned };
    return s?.peerId === peerId ? null : s; // libera a vaga antiga de quem se moveu
  });
  return { session: { ...session, slots } };
}

// Libera a vaga do peer (saiu da sala ou desistiu da vaga). Sem erro se não tinha vaga.
export function releaseSlot(session, peerId) {
  const slots = session.slots.map((s) => (s?.peerId === peerId ? null : s));
  return { session: { ...session, slots } };
}

// Host remove uma vaga VAZIA (alguém desistiu de vir): a sala encolhe, mínimo de 2.
export function removeSlot(session, slot) {
  if (session.started) return { error: t('net.started') };
  if (session.slots[slot] === undefined) return { error: t('net.noSlot') };
  if (session.slots[slot] !== null) return { error: t('net.removeFree') };
  if (session.slots.length <= MIN_SLOTS) return { error: `A sala precisa de pelo menos ${MIN_SLOTS} vagas.` };
  return { session: { ...session, slots: session.slots.filter((_, i) => i !== slot) } };
}

// A partida só começa com TODAS as vagas ocupadas (requisito R4 do PLANO-SALAS.md).
export function canStart(session) {
  return !session.started && session.slots.length >= MIN_SLOTS && session.slots.every(Boolean);
}

// Mapa peerId -> índice do jogador no startGame (a ordem das vagas é a ordem das agências).
export function assignmentsFor(session) {
  const map = {};
  session.slots.forEach((s, i) => { if (s) map[s.peerId] = i; });
  return map;
}

// Trava de turno (Fase 4 do PLANO-SALAS.md): só a agência da vez pode agir.
// Devolve o motivo (vira toast) ou null se pode agir. `playerId` undefined = peer sem vaga.
export function turnBlockError(playerId, turn) {
  if (playerId === turn) return null;
  return playerId == null ? t('net.noSeat') : t('net.notYourTurn');
}
