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

export const FLIGHT_EVENTS = {
  solar_storm: {
    id: 'solar_storm',
    title: 'Tempestade solar',
    text: 'O Sol lançou uma rajada de partículas carregadas na direção da sua espaçonave. A eletrônica pode ser danificada.',
    options: [
      {
        label: 'Desligar os instrumentos até passar (modo seguro)',
        effect: { sciencePenalty: 0.25 },
        lesson: 'Entrar em "modo seguro" custa dias de ciência, mas protege a eletrônica. Missões reais fazem isso com frequência.',
      },
      {
        label: 'Manter tudo ligado e torcer',
        effect: { failChance: 0.35 },
        lesson: 'Partículas de alta energia podem travar computadores e queimar circuitos. Sem blindagem, o risco de perder a missão é alto.',
      },
    ],
  },
  debris: {
    id: 'debris',
    title: 'Alerta de detrito espacial',
    text: 'O rastreamento em solo prevê uma passagem próxima de um fragmento de foguete antigo.',
    options: [
      {
        label: 'Fazer manobra de desvio (gasta propelente)',
        effect: { lifetimeDelta: -1 },
        lesson: 'Cada manobra gasta propelente que faria a manutenção da órbita mais tarde, encurtando a vida útil. Por isso missões carregam margem de combustível.',
      },
      {
        label: 'Manter a órbita (a chance de colisão é pequena)',
        effect: { failChance: 0.3 },
        lesson: 'Mesmo pequena, uma colisão a milhares de km/h destrói a espaçonave. Operadores reais manobram quando o risco passa de 1 em 10.000.',
      },
    ],
  },
  budget_cut: {
    id: 'budget_cut',
    title: 'Corte no orçamento de operações',
    text: 'O governo reduziu a verba de operações. Manter a equipe de solo trabalhando vai custar do seu caixa.',
    options: [
      {
        label: 'Pagar 15 de verba para manter as operações',
        effect: { funds: -15 },
        lesson: 'Operar uma missão custa todo ano: estações de solo, equipe e análise de dados. Esse custo entra no orçamento desde o projeto.',
      },
      {
        label: 'Reduzir a equipe e encerrar a missão mais cedo',
        effect: { lifetimeDelta: -2 },
        lesson: 'Encurtar a missão economiza dinheiro, mas pode deixar de cumprir o tempo mínimo que a ciência exigia.',
      },
    ],
  },
  antenna_stuck: {
    id: 'antenna_stuck',
    title: 'Antena principal travou',
    text: 'A antena não abriu completamente após o lançamento. A comunicação ficou limitada.',
    options: [
      {
        label: 'Usar a antena reserva, se houver',
        needsPart: ['antenna_basic', 'antenna_dish'],
        needsCount: 2,
        effectWithPart: { sciencePenalty: 0 },
        effect: { sciencePenalty: 0.5 },
        lesson: 'Redundância (duas antenas) salva a missão. Sem reserva, metade dos dados científicos nunca chega à Terra. Foi o que aconteceu com a sonda Galileo.',
      },
      {
        label: 'Tentar reabrir com ciclos de aquecimento e giro',
        effect: { failChance: 0.2 },
        lesson: 'Tentativas de destravar mecanismos no espaço são arriscadas e consomem energia e tempo, sem garantia.',
      },
    ],
  },
};

// Evento que NÃO entra no sorteio: só chega pela ação do espião rival (sim/actions.js, sabotage).
// Entregue na etapa final do voo. ATENÇÃO: números FICTÍCIOS para balanceamento.
FLIGHT_EVENTS.interference = {
  id: 'interference',
  title: 'Interferência na telemetria',
  text: 'Na etapa final, o sinal da nave começa a falhar de um jeito que não parece natural: há suspeita de que uma agência rival interferiu na sua telemetria.',
  armed: true, // fora do sorteio comum
  options: [
    {
      label: 'Reenviar os comandos em modo manual (sem custo)',
      effect: { failChance: 0.15 },
      lesson: 'Sem um canal limpo, o controle de missão precisa refazer comandos à mão e perde margem. Funciona, mas com mais chance de erro.',
    },
    {
      label: 'Trocar para a rede de estações de reserva (15 de verba)',
      effect: { funds: -15, failChance: 0.03 },
      lesson: 'Ter um canal alternativo custa caro, mas isola a interferência. Missões reais mantêm redes redundantes de estações de solo por isso.',
    },
  ],
};

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
