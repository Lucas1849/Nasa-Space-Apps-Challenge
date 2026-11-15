// Ajudantes de teste para não depender do número das casas (o tabuleiro já mudou de tamanho uma vez).
import { TILES } from '../src/board/board.js';
import { currentPlayer } from '../src/sim/state.js';

// id da n-ésima casa de um tipo (0 = a primeira)
export const tileOf = (type, nth = 0) => TILES.filter((t) => t.type === type)[nth].id;
// passos do dado de `from` até a primeira casa do tipo (de 1 a 6; falha se não couber num dado)
export function stepsTo(type, from = 0) {
  const steps = (tileOf(type) - from + TILES.length) % TILES.length;
  if (steps < 1 || steps > 6) throw new Error(`a casa ${type} não está a 1..6 passos de ${from}`);
  return steps;
}
// coloca o peão do jogador da vez numa casa do tipo, sem andar (para testar o que se faz ali)
export function standOn(state, type, nth = 0) {
  currentPlayer(state).position = tileOf(type, nth);
  return state;
}
