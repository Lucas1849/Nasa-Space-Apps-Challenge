// Código curto de sala (src/net/roomCode.js): geração e normalização do que o jogador cola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCode, normalizeCode, peerIdFor, CODE_ALPHABET, CODE_LENGTH, PEER_PREFIX } from '../src/net/roomCode.js';

test('newCode: 6 caracteres, só do alfabeto sem ambiguidade', () => {
  for (let i = 0; i < 50; i += 1) {
    const code = newCode();
    assert.equal(code.length, CODE_LENGTH);
    for (const ch of code) assert.ok(CODE_ALPHABET.includes(ch), `caractere fora do alfabeto: ${ch}`);
  }
  // Nunca gera os caracteres ambíguos
  assert.ok(!CODE_ALPHABET.includes('0') && !CODE_ALPHABET.includes('O'));
  assert.ok(!CODE_ALPHABET.includes('1') && !CODE_ALPHABET.includes('I') && !CODE_ALPHABET.includes('L'));
});

test('newCode: determinístico com rng injetado', () => {
  const rng = () => 0; // sempre o primeiro caractere
  assert.equal(newCode(rng), 'A'.repeat(CODE_LENGTH));
});

test('peerIdFor: prefixo para não colidir com outros usuários do broker', () => {
  assert.equal(peerIdFor('A3F9KQ'), `${PEER_PREFIX}A3F9KQ`);
});

test('normalizeCode: aceita código digitado em qualquer caixa e com sobras', () => {
  assert.equal(normalizeCode('a3f9kq'), 'A3F9KQ');
  assert.equal(normalizeCode('  A3F-9KQ  '), 'A3F9KQ');
});

test('normalizeCode: aceita o link inteiro colado', () => {
  assert.equal(normalizeCode('https://exemplo.dev/jogo/?sala=A3F9KQ'), 'A3F9KQ');
  assert.equal(normalizeCode('http://localhost:8000/?sala=a3f9kq&x=1'), 'A3F9KQ');
});

test('normalizeCode: vazio ou sem nada aproveitável vira null', () => {
  assert.equal(normalizeCode(''), null);
  assert.equal(normalizeCode(null), null);
  assert.equal(normalizeCode('   ---   '), null);
});
