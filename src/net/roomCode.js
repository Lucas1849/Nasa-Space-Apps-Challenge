// Código curto de sala (ver docs/PLANO-SALAS.md, Fase 1). Em vez do UUID do PeerJS,
// registramos o host com um ID próprio "smdg-<CODIGO>"; o link vira ?sala=A3F9KQ e o
// código dá para ditar em voz alta. Módulo puro, sem DOM (testado em node --test).

// Alfabeto sem caracteres ambíguos (sem 0/O e 1/I/L): ninguém erra ao digitar.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
// Prefixo no ID do peer: evita colisão com outros usuários do broker público do PeerJS.
export const PEER_PREFIX = 'smdg-';

// `rng` injetável para teste, como no resto do projeto (board.js).
export function newCode(rng = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

export function peerIdFor(code) {
  return PEER_PREFIX + code;
}

// Aceita o que o jogador colar: o link inteiro (?sala=...), o código em qualquer caixa,
// com espaços ou hífens. Devolve o código normalizado, ou null se não sobrar nada válido.
export function normalizeCode(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  if (text.includes('sala=')) {
    try {
      text = new URL(text, 'http://x').searchParams.get('sala') || '';
    } catch {
      // segue com o texto cru; a limpeza abaixo resolve
    }
  }
  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length > 0 ? code : null;
}
