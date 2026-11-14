// Mapa de telas. Cada tela é uma função (state, actions) => elemento DOM.
// Ciclo (IDEIA.md v3): setup -> troca -> tabuleiro <-> oficina -> voo (uma etapa por turno) -> relatório -> ... -> fim
import { setupScreen } from './setup.js';
import { handoffScreen } from './handoff.js';
import { boardScreen } from './board.js';
import { workshopScreen } from './workshop.js';
import { flightScreen } from './flight.js';
import { reportScreen } from './report.js';
import { gameoverScreen } from './gameover.js';

export const SCREENS = {
  setup: setupScreen,
  handoff: handoffScreen,
  board: boardScreen,
  workshop: workshopScreen,
  flight: flightScreen,
  report: reportScreen,
  gameover: gameoverScreen,
};
