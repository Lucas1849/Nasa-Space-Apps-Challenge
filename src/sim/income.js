// Renda do Ano novo (a cada 3 rodadas): verba e tecnologia que a agência recebe. Uma conta só, usada pelo
// jogo (sim/actions.js, startTurn) e pela previsão do HUD (ui/components.js), para os dois nunca divergirem.
// Funções puras, sem DOM.
import { YEARLY_BUDGET, TECH_PER_YEAR, SPONSOR_FUNDS_PER_LEVEL } from './state.js';
import { SIDES } from '../data/sides.js';

// Devolve o total e de onde veio cada parte (para a animação e o balão explicarem a origem).
//   funds = orçamento + bônus do lado + Patrocinador;  tech = base + Laboratório.
export function yearlyIncome(player) {
  const side = SIDES[player.side];
  const buildings = player.buildings || {};
  const parts = {
    base: YEARLY_BUDGET,
    side: side ? side.yearlyBonus : 0,
    sponsor: SPONSOR_FUNDS_PER_LEVEL * (buildings.sponsor || 0),
  };
  const techParts = { base: TECH_PER_YEAR, lab: buildings.lab || 0 };
  return {
    funds: parts.base + parts.side + parts.sponsor,
    tech: techParts.base + techParts.lab,
    parts,
    techParts,
  };
}
