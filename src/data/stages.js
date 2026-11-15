// Etapas do voo por destino (proposta do Henrique, IDEIA.md seção 13.4).
// A subida acontece no turno do lançamento. Cada etapa seguinte acontece num turno depois,
// então destinos distantes ficam mais tempo em voo, com mais eventos e mais risco.
// ATENÇÃO: riscos FICTÍCIOS para balanceamento.
//
// system = subsistema testado na etapa. Uma falha gera "dados de falha" desse sistema,
//          que reduzem o risco dele na próxima tentativa (passo Verify do ciclo da NASA).
// guaranteedEvent = sempre tem imprevisto nessa etapa (pontos-chave do voo nunca ficam vazios).
// consolation = missão de consolação (IDEIA.md v3 seção 7): se a etapa falha, a nave ainda cumpre um
//               objetivo menor e dá crédito parcial. Não existe "abortar".
import { t } from '../i18n/index.js';
import { localize } from '../i18n/localize.js';

export const STAGES = {
  ascent: { id: 'ascent', system: 'launch', baseRisk: 0.08, icon: 'rocket' },
  orbit_insertion: { id: 'orbit_insertion', system: 'power', baseRisk: 0.05, icon: 'satellite', consolation: true },
  transfer: { id: 'transfer', system: 'power', baseRisk: 0.07, icon: 'orbit', consolation: true },
  geo_arrival: { id: 'geo_arrival', system: 'comms', baseRisk: 0.06, icon: 'dish', guaranteedEvent: true, consolation: true },
  lunar_arrival: { id: 'lunar_arrival', system: 'comms', baseRisk: 0.10, icon: 'moon', guaranteedEvent: true, consolation: true },
  crew_return: { id: 'crew_return', system: 'life', baseRisk: 0.10, icon: 'parachute', guaranteedEvent: true, consolation: true },
};
// Nome, texto e consolação (onde existe) em i18n (stage.<id>.name/text/consolation).
for (const s of Object.values(STAGES)) {
  localize('stage', { [s.id]: s }, s.consolation ? ['name', 'text', 'consolation'] : ['name', 'text']);
}

export const CONSOLATION_FUNDS = 8; // crédito parcial em verba (+1 de tecnologia, como toda falha)

// Plano de voo por órbita de destino. Missões podem somar etapas (ex.: retorno da tripulação).
export const FLIGHT_PLANS = {
  leo: ['ascent', 'orbit_insertion'],
  geo: ['ascent', 'transfer', 'geo_arrival'],
  moon: ['ascent', 'transfer', 'lunar_arrival'],
};

// Nomes dos subsistemas em i18n (system.launch/power/comms/life). Getters para trocar com o idioma.
export const SYSTEM_NAMES = {};
for (const k of ['launch', 'power', 'comms', 'life']) {
  Object.defineProperty(SYSTEM_NAMES, k, { enumerable: true, get() { return t(`system.${k}`); } });
}

export const FAILURE_DATA_BONUS = 0.05; // cada falha anterior no mesmo sistema tira 5% de risco
export const MAX_FAILURE_DATA = 3;      // no máximo −15%
export const MIN_RISK = 0.02;           // nada no espaço tem risco zero
export const MAX_RISK = 0.9;
export const STAGE_BONUS = 4;           // verba por etapa superada (etapas contam, mesmo se falhar depois)
export const REVIEW_COST = 10;          // "gastar a reserva": pagar revisão extra antes da etapa
export const REVIEW_RISK_CUT = 0.08;
