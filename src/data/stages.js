// Etapas do voo por destino (proposta do Henrique, IDEIA.md seção 13.4).
// A subida acontece no turno do lançamento. Cada etapa seguinte acontece num turno depois,
// então destinos distantes ficam mais tempo em voo, com mais eventos e mais risco.
// ATENÇÃO: riscos FICTÍCIOS para balanceamento.
//
// system = subsistema testado na etapa. Uma falha gera "dados de falha" desse sistema,
//          que reduzem o risco dele na próxima tentativa (passo Verify do ciclo da NASA).
// guaranteedEvent = sempre tem imprevisto nessa etapa (pontos-chave do voo nunca ficam vazios).
// consolation = missão de consolação (IDEIA-v3 seção 7): se a etapa falha, a nave ainda cumpre um
//               objetivo menor e dá crédito parcial. Não existe "abortar".

export const STAGES = {
  ascent: { id: 'ascent', name: 'Subida', system: 'launch', baseRisk: 0.08, icon: '🚀', text: 'O foguete atravessa a atmosfera com a carga no topo.' },
  orbit_insertion: { id: 'orbit_insertion', name: 'Entrada em órbita', system: 'power', baseRisk: 0.05, icon: '🛰️', text: 'A espaçonave abre os painéis e liga os sistemas.',
    consolation: 'A nave ficou numa órbita baixa demais, mas transmitiu dados de engenharia por alguns dias antes de reentrar.' },
  transfer: { id: 'transfer', name: 'Transferência', system: 'power', baseRisk: 0.07, icon: '🌀', text: 'Longa viagem até o destino, dependendo de energia o tempo todo.',
    consolation: 'A nave ficou presa em órbita da Terra, mas testou os sistemas por semanas: dados preciosos para a próxima.' },
  geo_arrival: { id: 'geo_arrival', name: 'Chegada à GEO', system: 'comms', baseRisk: 0.06, icon: '📡', text: 'A 36 mil km de altura, o sinal precisa chegar firme à Terra.', guaranteedEvent: true,
    consolation: 'A nave parou numa órbita alta errada, mas mediu a radiação dos cinturões de Van Allen.' },
  lunar_arrival: { id: 'lunar_arrival', name: 'Chegada à Lua', system: 'comms', baseRisk: 0.10, icon: '🌙', text: 'Entrar em órbita lunar e falar com a Terra a 384 mil km.', guaranteedEvent: true,
    consolation: 'A nave não entrou em órbita lunar, mas fez um sobrevoo e mandou fotos de perto da Lua.' },
  crew_return: { id: 'crew_return', name: 'Retorno da tripulação', system: 'life', baseRisk: 0.10, icon: '🪂', text: 'Trazer a tripulação viva de volta à Terra.', guaranteedEvent: true,
    consolation: 'A cápsula fez um pouso de emergência longe da área prevista. A tripulação foi resgatada, mas a missão não conta.' },
};

export const CONSOLATION_FUNDS = 8; // crédito parcial em verba (+1 de tecnologia, como toda falha)

// Plano de voo por órbita de destino. Missões podem somar etapas (ex.: retorno da tripulação).
export const FLIGHT_PLANS = {
  leo: ['ascent', 'orbit_insertion'],
  geo: ['ascent', 'transfer', 'geo_arrival'],
  moon: ['ascent', 'transfer', 'lunar_arrival'],
};

export const SYSTEM_NAMES = { launch: 'lançamento', power: 'energia', comms: 'comunicação', life: 'suporte de vida' };

export const FAILURE_DATA_BONUS = 0.05; // cada falha anterior no mesmo sistema tira 5% de risco
export const MAX_FAILURE_DATA = 3;      // no máximo −15%
export const MIN_RISK = 0.02;           // nada no espaço tem risco zero
export const MAX_RISK = 0.9;
export const STAGE_BONUS = 4;           // verba por etapa superada (etapas contam, mesmo se falhar depois)
export const REVIEW_COST = 10;          // "gastar a reserva": pagar revisão extra antes da etapa
export const REVIEW_RISK_CUT = 0.08;
