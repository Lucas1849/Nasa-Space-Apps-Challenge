// Mapa de telas. Cada tela é uma função (state, actions) => elemento DOM.
// Ciclo (ver IDEIA.md): setup -> tabuleiro <-> oficina -> lançamento -> voo (decisão) -> relatório -> tabuleiro...
import { setupScreen } from './setup.js';
import { boardScreen } from './board.js';
import { workshopScreen } from './workshop.js';
import { flightScreen } from './flight.js';
import { reportScreen } from './report.js';

export const SCREENS = {
  setup: setupScreen,
  board: boardScreen,
  workshop: workshopScreen,
  flight: flightScreen,
  report: reportScreen,
};
