// Prédios da agência (IDEIA.md seção 5). Constrói ao cair num terreno livre; depois sobe o nível
// de qualquer lugar, sem precisar de outra casa. Rival que cai no terreno pode pagar para usar o prédio.
// ATENÇÃO: custos e efeitos FICTÍCIOS para balanceamento.
//
// perLevel = efeito por nível. useEffect = o que o rival ganha ao pagar a taxa de uso (uma vez).
import { localize } from '../i18n/localize.js';

export const MAX_LEVEL = 3;
export const BUILD_COST = 15;          // nível 1
export const UPGRADE_COST_STEP = 15;   // nível 2 custa 30, nível 3 custa 45 (custo sobe para frear bola de neve)
export const CATCHUP_UPGRADE_DISCOUNT = 0.5; // quem está em último paga metade no upgrade
export const USE_FEE = 6;              // taxa paga ao dono para usar o prédio dele

// Nome, efeito e texto de uso em i18n (building.<id>.name/effect/useText). Aqui ficam ids, ícones e números.
export const BUILDINGS = localize('building', {
  lab: { id: 'lab', icon: 'flask', useEffect: { tech: 1 } },
  factory: { id: 'factory', icon: 'factory', useEffect: { discount: 20 } },
  control: { id: 'control', icon: 'console', useEffect: { shield: 1 } },
  sponsor: { id: 'sponsor', icon: 'briefcase', useEffect: { funds: 8 } },
}, ['name', 'effect', 'useText']);

export const upgradeCost = (level) => (level === 0 ? BUILD_COST : UPGRADE_COST_STEP * (level + 1));
