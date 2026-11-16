// Eventos de voo: acontecem entre o lançamento e o relatório e exigem uma decisão.
// Inspirado em como missões reais lidam com imprevistos (tempestade solar, detritos, corte de verba).
// Cada opção tem consequência; a "lição" explica o porquê no relatório.
// ATENÇÃO: probabilidades e penalidades FICTÍCIAS para balanceamento.
//
// Efeitos possíveis em `effect`:
//   sciencePenalty  fração da ciência perdida (0.25 = perde 25%)
//   failChance      chance EXTRA de falha total (soma à chance base da simulação)
//   funds           verba ganha/perdida na hora
//   lifetimeDelta   anos a mais/menos de vida útil
//   needsPart       se o jogador tiver essa peça, o efeito vira `effectWithPart`

import { localize, localizeOptions } from '../i18n/localize.js';

// Título e texto em i18n (event.<id>.title/text); as opções em event.<id>.opt.<i>.label/lesson.
// Aqui ficam só ids, efeitos e peças exigidas.
export const FLIGHT_EVENTS = {
  solar_storm: {
    id: 'solar_storm',
    options: [
      { effect: { sciencePenalty: 0.25 } },
      { effect: { failChance: 0.35 } },
    ],
  },
  debris: {
    id: 'debris',
    options: [
      { effect: { lifetimeDelta: -1 } },
      { effect: { failChance: 0.3 } },
    ],
  },
  budget_cut: {
    id: 'budget_cut',
    options: [
      { effect: { funds: -15 } },
      { effect: { lifetimeDelta: -2 } },
    ],
  },
  antenna_stuck: {
    id: 'antenna_stuck',
    options: [
      {
        needsPart: ['antenna_basic', 'antenna_dish'],
        needsCount: 2,
        effectWithPart: { sciencePenalty: 0 },
        effect: { sciencePenalty: 0.5 },
      },
      { effect: { failChance: 0.2 } },
    ],
  },
};

// Evento que NÃO entra no sorteio: só chega pela ação do espião rival (sim/actions.js, sabotage).
// Entregue na etapa final do voo. ATENÇÃO: números FICTÍCIOS para balanceamento.
FLIGHT_EVENTS.interference = {
  id: 'interference',
  armed: true, // fora do sorteio comum
  options: [
    { effect: { failChance: 0.15 } },
    { effect: { funds: -15, failChance: 0.03 } },
  ],
};

localize('event', FLIGHT_EVENTS, ['title', 'text']);
localizeOptions('event', Object.values(FLIGHT_EVENTS));

// Escolhe um evento aleatório. `rng` injetável para testes.
export function pickEvent(rng = Math.random) {
  const list = Object.values(FLIGHT_EVENTS).filter((e) => !e.armed);
  return list[Math.floor(rng() * list.length)];
}

// Resolve o efeito de uma opção para um jogador (considera peça reserva, se exigida).
export function resolveOption(option, player) {
  if (option.needsPart) {
    const all = [...player.spacecraft.parts, ...player.spacecraft.instruments];
    const count = all.filter((id) => option.needsPart.includes(id)).length;
    if (count >= (option.needsCount || 1)) return option.effectWithPart;
  }
  return option.effect;
}
