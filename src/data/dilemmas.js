// Cartas de dilema (IDEIA.md v3 seção 7): a casa de evento sorteia uma carta com ESCOLHA, de acordo
// com a situação do jogador. Com a nave em voo, a casa vira um imprevisto na próxima etapa do voo
// (data/events.js). Em solo, valem as cartas abaixo.
// ATENÇÃO: efeitos FICTÍCIOS para balanceamento. Situações históricas só como inspiração.
//
// when: 'idle' (sem peças na oficina), 'building' (montando a nave) ou 'any'.
// effect: funds, tech, discount (%), shield, launchRisk (risco extra na próxima subida),
//         rumor (boato sobre um rival), gamble ({ chance, win: effect, lose: effect }).

import { localizeList, localizeOptions } from '../i18n/localize.js';

// Título e texto em i18n (dilemma.<id>.title/text); as opções em dilemma.<id>.opt.<i>.label/lesson.
// Aqui ficam só ids, a condição `when` e os efeitos.
export const DILEMMAS = [
  {
    id: 'congress',
    when: 'any',
    options: [
      { effect: { funds: 20, tech: -1 } },
      { effect: { funds: -8, tech: 1 } },
    ],
  },
  {
    id: 'scientists',
    when: 'any',
    options: [
      { effect: { funds: -12, tech: 2 } },
      { effect: { funds: 5 } },
    ],
  },
  {
    id: 'rumor',
    when: 'any',
    options: [
      { effect: { funds: -5, rumor: true } },
      { effect: { funds: 3 } },
    ],
  },
  {
    id: 'public_test',
    when: 'any',
    options: [
      { effect: { gamble: { chance: 0.6, win: { funds: 15, shield: 1 }, lose: { funds: -10 } } } },
      { effect: { shield: 1, funds: -6 } },
    ],
  },
  {
    id: 'supplier_delay',
    when: 'building',
    options: [
      { effect: { discount: 20 } },
      { effect: { funds: -8, shield: 1 } },
    ],
  },
  {
    id: 'design_flaw',
    when: 'building',
    options: [
      { effect: { funds: -10, shield: 1 } },
      { effect: { launchRisk: 0.12 } },
    ],
  },
  {
    id: 'budget_freeze',
    when: 'idle',
    options: [
      { effect: { funds: 12, discount: 10 } },
      { effect: { funds: -5, tech: 1 } },
    ],
  },
];

localizeList('dilemma', DILEMMAS, ['title', 'text']);
localizeOptions('dilemma', DILEMMAS);

// Cartas válidas para a situação do jogador (sempre existe pelo menos uma 'any').
export function dilemmasFor(player) {
  const building = player.spacecraft.instruments.length + player.spacecraft.parts.length > 0;
  return DILEMMAS.filter((d) => d.when === 'any' || d.when === (building ? 'building' : 'idle'));
}

export function pickDilemma(player, rng = Math.random) {
  const list = dilemmasFor(player);
  return list[Math.floor(rng() * list.length)];
}
