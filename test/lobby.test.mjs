// Regras do lobby online (src/net/lobby.js): ocupar, liberar e remover vagas; início da partida.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession, claimSlot, releaseSlot, removeSlot, canStart, assignmentsFor, turnBlockError, MIN_SLOTS,
} from '../src/net/lobby.js';

test('createSession: cria as vagas pedidas, entre 2 e 4, todas livres', () => {
  assert.equal(createSession('AAAAAA', 3).slots.length, 3);
  assert.equal(createSession('AAAAAA', 1).slots.length, MIN_SLOTS); // nunca menos que o mínimo
  assert.equal(createSession('AAAAAA', 9).slots.length, 4);
  assert.ok(createSession('AAAAAA', 2).slots.every((s) => s === null));
});

test('claimSlot: ocupa vaga livre com o nome limpo', () => {
  const s0 = createSession('AAAAAA', 2);
  const { session } = claimSlot(s0, 'peer-1', 0, '  NASA Jr.  ');
  assert.deepEqual(session.slots[0], { peerId: 'peer-1', name: 'NASA Jr.' });
  assert.equal(s0.slots[0], null); // imutável: a sessão original não muda
});

test('claimSlot: não ocupa vaga alheia nem aceita nome vazio', () => {
  const { session } = claimSlot(createSession('AAAAAA', 2), 'peer-1', 0, 'Alfa');
  assert.ok(claimSlot(session, 'peer-2', 0, 'Beta').error);
  assert.ok(claimSlot(session, 'peer-2', 1, '   ').error);
  assert.ok(claimSlot(session, 'peer-2', 7, 'Beta').error); // vaga inexistente
});

test('claimSlot: renomear a própria vaga e trocar de vaga (libera a antiga)', () => {
  let { session } = claimSlot(createSession('AAAAAA', 3), 'peer-1', 0, 'Alfa');
  ({ session } = claimSlot(session, 'peer-1', 0, 'Alfa 2')); // renomeia
  assert.equal(session.slots[0].name, 'Alfa 2');
  ({ session } = claimSlot(session, 'peer-1', 2, 'Alfa 2')); // muda de cadeira
  assert.equal(session.slots[0], null);
  assert.equal(session.slots[2].peerId, 'peer-1');
});

test('releaseSlot: libera a vaga de quem saiu; sem vaga, não faz nada', () => {
  let { session } = claimSlot(createSession('AAAAAA', 2), 'peer-1', 0, 'Alfa');
  ({ session } = releaseSlot(session, 'peer-1'));
  assert.equal(session.slots[0], null);
  ({ session } = releaseSlot(session, 'peer-x'));
  assert.ok(session.slots.every((s) => s === null));
});

test('removeSlot: host encolhe a sala tirando vaga vazia, nunca abaixo do mínimo', () => {
  let { session } = claimSlot(createSession('AAAAAA', 3), 'peer-1', 0, 'Alfa');
  assert.ok(removeSlot(session, 0).error);            // ocupada: não remove
  ({ session } = removeSlot(session, 2));             // vazia: remove
  assert.equal(session.slots.length, 2);
  assert.ok(removeSlot(session, 1).error);            // já está no mínimo
});

test('canStart: só com todas as vagas ocupadas, e nunca depois de começar', () => {
  let { session } = claimSlot(createSession('AAAAAA', 2), 'peer-1', 0, 'Alfa');
  assert.equal(canStart(session), false);
  ({ session } = claimSlot(session, 'peer-2', 1, 'Beta'));
  assert.equal(canStart(session), true);
  assert.equal(canStart({ ...session, started: true }), false);
});

test('depois de começar, ninguém mais mexe nas vagas', () => {
  let { session } = claimSlot(createSession('AAAAAA', 2), 'peer-1', 0, 'Alfa');
  ({ session } = claimSlot(session, 'peer-2', 1, 'Beta'));
  const started = { ...session, started: true };
  assert.ok(claimSlot(started, 'peer-3', 0, 'Gama').error);
  assert.ok(removeSlot(started, 0).error);
});

test('turnBlockError: só a agência da vez age; sem vaga, nunca', () => {
  assert.equal(turnBlockError(0, 0), null);                       // minha vez: pode
  assert.ok(turnBlockError(1, 0));                                // vez de outro: bloqueia
  assert.ok(turnBlockError(undefined, 0));                        // peer sem vaga: bloqueia
  assert.ok(turnBlockError(null, 0));
});

test('assignmentsFor: a ordem das vagas é a ordem das agências no jogo', () => {
  let { session } = claimSlot(createSession('AAAAAA', 3), 'peer-b', 1, 'Beta');
  ({ session } = claimSlot(session, 'peer-a', 0, 'Alfa'));
  ({ session } = claimSlot(session, 'peer-c', 2, 'Gama'));
  assert.deepEqual(assignmentsFor(session), { 'peer-a': 0, 'peer-b': 1, 'peer-c': 2 });
});
