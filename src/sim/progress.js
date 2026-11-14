// Progresso de cada agência na escada do próprio lado (IDEIA.md v3 seções 2 e 11).
// Função pura. Usada para o fim da partida, o desempate e o apoio a quem está atrás.
import { ladderOf } from '../data/sides.js';
import { flightPlan } from './flight.js';

// Degraus cumpridos + metade da fração do melhor voo no degrau atual (etapas contam no desempate).
export function ladderProgress(player) {
  const ladder = ladderOf(player);
  const steps = Math.min(player.step || 0, ladder.length);
  const current = ladder[steps];
  const partial = current ? ((player.bestStage?.[current] || 0) / flightPlan(current).length) / 2 : 0;
  return {
    steps,
    total: ladder.length,
    current: current || null,
    pct: ladder.length ? Math.min(1, (steps + partial) / ladder.length) : 0,
    done: ladder.length > 0 && steps >= ladder.length,
  };
}
