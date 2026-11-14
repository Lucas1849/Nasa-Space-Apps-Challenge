// Cartas de dilema (IDEIA.md v3 seção 7): a casa de evento sorteia uma carta com ESCOLHA, de acordo
// com a situação do jogador. Com a nave em voo, a casa vira um imprevisto na próxima etapa do voo
// (data/events.js). Em solo, valem as cartas abaixo.
// ATENÇÃO: efeitos FICTÍCIOS para balanceamento. Situações históricas só como inspiração.
//
// when: 'idle' (sem peças na oficina), 'building' (montando a nave) ou 'any'.
// effect: funds, tech, discount (%), shield, launchRisk (risco extra na próxima subida),
//         rumor (boato sobre um rival), gamble ({ chance, win: effect, lose: effect }).

export const DILEMMAS = [
  {
    id: 'congress',
    when: 'any',
    title: 'O Congresso quer resultados',
    text: 'Os políticos cobram um resultado visível. Cortar a pesquisa libera dinheiro agora.',
    options: [
      { label: 'Cortar o laboratório e mostrar números', effect: { funds: 20, tech: -1 }, lesson: 'Cortar pesquisa resolve o caixa hoje e atrasa as peças melhores de amanhã.' },
      { label: 'Defender a ciência no Congresso', effect: { funds: -8, tech: 1 }, lesson: 'Investir em pesquisa custa agora e rende tecnologia.' },
    ],
  },
  {
    id: 'scientists',
    when: 'any',
    title: 'Cientistas estrangeiros querem se juntar à agência',
    text: 'Uma equipe experiente pede para trabalhar com vocês, mas exige laboratório e salários.',
    options: [
      { label: 'Contratar a equipe', effect: { funds: -12, tech: 2 }, lesson: 'Gente experiente encurta anos de pesquisa.' },
      { label: 'Agradecer e recusar', effect: { funds: 5 }, lesson: 'Economizar agora pode deixar a agência para trás depois.' },
    ],
  },
  {
    id: 'rumor',
    when: 'any',
    title: 'Boato na imprensa',
    text: 'Um jornal diz saber o que a agência rival está fazendo. A fonte é duvidosa.',
    options: [
      { label: 'Pagar um analista para investigar (5)', effect: { funds: -5, rumor: true }, lesson: 'Informação sobre o rival ajuda a decidir quando lançar, mas boatos podem estar errados.' },
      { label: 'Ignorar e seguir o plano', effect: { funds: 3 }, lesson: 'Sem informação, a dúvida sobre o tempo que resta continua.' },
    ],
  },
  {
    id: 'public_test',
    when: 'any',
    title: 'Teste público de motor',
    text: 'A imprensa quer assistir ao teste de um motor novo. Se der certo, vira propaganda; se der errado, vexame.',
    options: [
      { label: 'Fazer o teste ao vivo', effect: { gamble: { chance: 0.6, win: { funds: 15, shield: 1 }, lose: { funds: -10 } } }, lesson: 'Testes em solo pegam defeitos antes do voo, mas custam caro quando falham.' },
      { label: 'Testar em segredo', effect: { shield: 1, funds: -6 }, lesson: 'Testes discretos dão confiança sem risco de imagem, mas não trazem verba.' },
    ],
  },
  {
    id: 'supplier_delay',
    when: 'building',
    title: 'O fornecedor atrasou uma peça',
    text: 'A peça que você precisa vai demorar. Dá para esperar ou trocar de fornecedor.',
    options: [
      { label: 'Esperar o fornecedor (desconto pelo atraso)', effect: { discount: 20 }, lesson: 'Paciência sai mais barato, mas o tempo também é um recurso.' },
      { label: 'Trocar por um fornecedor testado (8)', effect: { funds: -8, shield: 1 }, lesson: 'Peça já testada custa mais e reduz a chance de falha.' },
    ],
  },
  {
    id: 'design_flaw',
    when: 'building',
    title: 'Engenheiros acharam um defeito no projeto',
    text: 'Uma revisão encontrou uma solda suspeita na estrutura. Refazer custa tempo e dinheiro.',
    options: [
      { label: 'Refazer a peça (10)', effect: { funds: -10, shield: 1 }, lesson: 'Revisões de projeto existem para pegar falhas antes do lançamento.' },
      { label: 'Lançar assim mesmo', effect: { launchRisk: 0.12 }, lesson: 'Ignorar um defeito conhecido aumenta o risco da subida.' },
    ],
  },
  {
    id: 'budget_freeze',
    when: 'idle',
    title: 'Orçamento congelado',
    text: 'Sem nave em construção, o governo ameaça congelar a verba da agência.',
    options: [
      { label: 'Prometer um lançamento em breve', effect: { funds: 12, discount: 10 }, lesson: 'Compromissos públicos trazem verba e pressão para lançar.' },
      { label: 'Aceitar o corte e estudar mais', effect: { funds: -5, tech: 1 }, lesson: 'Um ano mais magro pode virar um projeto mais maduro.' },
    ],
  },
];

// Cartas válidas para a situação do jogador (sempre existe pelo menos uma 'any').
export function dilemmasFor(player) {
  const building = player.spacecraft.instruments.length + player.spacecraft.parts.length > 0;
  return DILEMMAS.filter((d) => d.when === 'any' || d.when === (building ? 'building' : 'idle'));
}

export function pickDilemma(player, rng = Math.random) {
  const list = dilemmasFor(player);
  return list[Math.floor(rng() * list.length)];
}
