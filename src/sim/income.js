// Renda do Ano novo (a cada 3 rodadas): verba e tecnologia que a agência recebe. Uma conta só, usada pelo
// jogo (sim/actions.js, startTurn) e pela previsão do HUD (ui/components.js), para os dois nunca divergirem.
// Funções puras, sem DOM.
import { YEARLY_BUDGET, TECH_PER_YEAR, TECH_EVERY_YEARS, SPONSOR_FUNDS_PER_LEVEL } from './state.js';
import { SIDES } from '../data/sides.js';
import { START_YEAR } from '../data/history.js';

// A pesquisa básica rende no 1º ano (para dar para comprar a primeira peça) e depois de 2 em 2 anos.
// O Laboratório rende todo ano, por isso é ele que faz a tecnologia andar.
export const isTechYear = (year) => (year - START_YEAR) % TECH_EVERY_YEARS === 0;

// Devolve o total e de onde veio cada parte (para a animação e o balão explicarem a origem).
//   funds = orçamento + bônus do lado + Patrocinador;  tech = base + Laboratório.
// `year` (opcional): o ano do Ano novo. Sem ele, conta como ano de pesquisa básica.
export function yearlyIncome(player, year = null) {
  const side = SIDES[player.side];
  const buildings = player.buildings || {};
  const parts = {
    base: YEARLY_BUDGET,
    side: side ? side.yearlyBonus : 0,
    sponsor: SPONSOR_FUNDS_PER_LEVEL * (buildings.sponsor || 0),
  };
  const techParts = { base: year == null || isTechYear(year) ? TECH_PER_YEAR : 0, lab: buildings.lab || 0 };
  return {
    funds: parts.base + parts.side + parts.sponsor,
    tech: techParts.base + techParts.lab,
    parts,
    techParts,
  };
}
