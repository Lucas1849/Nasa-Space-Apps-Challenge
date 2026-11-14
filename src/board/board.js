// Camada do TABULEIRO: o jogador anda, consegue recursos e toma decisões (estilo Banco Imobiliário).
// O tabuleiro alimenta a engenharia: verba, tecnologia, desconto, proteção e prédios.
// Com a nave em voo, as casas de risco viram imprevistos na etapa do voo (IDEIA.md seção 7).
// Funções puras, sem DOM. Recebem `rng` para os testes serem determinísticos.
// ATENÇÃO: valores FICTÍCIOS para balanceamento. Casas de dinheiro são fracas de propósito.
//
// Tipos de casa:
//   start    largada (volta completa dá verba)
//   funds    verba (positiva ou negativa)
//   event    sorte ou azar em solo; em voo, imprevisto aleatório
//   tech     ajuda internacional: +tecnologia
//   shop     feira de fornecedores: desconto na próxima compra
//   lot      terreno: construir prédio ou usar o prédio do rival (decisão do jogador)
//   hazard   risco espacial: em voo dispara o evento `flightEvent`; em solo, nada
//   repair   oficina de reparos: +1 proteção contra falha
//   catchup  apoio a quem está em último

export const TILES = [
  { id: 0, type: 'start', label: 'Largada', funds: 10 },
  { id: 1, type: 'lot', label: 'Terreno livre' },
  { id: 2, type: 'funds', label: 'Discurso presidencial: espaço vira prioridade', funds: 12 },
  { id: 3, type: 'hazard', label: 'Clima espacial', flightEvent: 'solar_storm' },
  { id: 4, type: 'event', label: 'Sorte ou azar' },
  { id: 5, type: 'lot', label: 'Terreno livre' },
  { id: 6, type: 'tech', label: 'Ano Geofísico Internacional: cooperação científica', tech: 1 },
  { id: 7, type: 'hazard', label: 'Detritos em órbita', flightEvent: 'debris' },
  { id: 8, type: 'catchup', label: 'Apoio ao atrasado', funds: 20 },
  { id: 9, type: 'lot', label: 'Terreno livre' },
  { id: 10, type: 'shop', label: 'Feira de fornecedores', discount: 15 },
  { id: 11, type: 'hazard', label: 'Perda de sinal', flightEvent: 'antenna_stuck' },
  { id: 12, type: 'event', label: 'Sorte ou azar' },
  { id: 13, type: 'lot', label: 'Terreno livre' },
  { id: 14, type: 'funds', label: 'Crise diplomática: verba desviada', funds: -10 },
  { id: 15, type: 'repair', label: 'Oficina de reparos', shield: 1 },
];

// Eventos em solo da casa "Sorte ou azar". Textos com cara de época, mecânica simples.
export const EVENTS = [
  { id: 'grant', text: 'Verba extra de pesquisa aprovada.', funds: 12 },
  { id: 'engine_test', text: 'Teste de motor falha na plataforma: custo extra.', funds: -8 },
  { id: 'spinoff', text: 'Tecnologia reaproveitada: desconto de 10% na próxima compra.', discount: 10 },
  { id: 'shield', text: 'Teste em solo bem-sucedido: proteção contra uma falha.', shield: 1 },
  { id: 'scientists', text: 'Cientistas estrangeiros se juntam à agência: +1 de tecnologia.', tech: 1 },
];

export function rollDie(rng = Math.random) {
  return 1 + Math.floor(rng() * 6);
}

// Move o jogador e devolve nova posição + se passou pela largada.
export function movePlayer(player, steps) {
  const raw = player.position + steps;
  const position = raw % TILES.length;
  const passedStart = raw >= TILES.length;
  return { ...player, position, passedStart };
}

// Aplica o efeito da casa onde o jogador parou. Devolve { player, messages[] }.
// `isLast` = jogador com menos progresso (recebe o apoio da casa 'catchup').
// Casas 'lot' e 'hazard' não mudam o jogador aqui: a decisão (prédio) e o evento de voo
// ficam em sim/actions.js, que conhece o estado inteiro.
export function applyTile(player, tile, { rng = Math.random, isLast = false } = {}) {
  const messages = [];
  let p = { ...player };

  if (p.passedStart && tile.type !== 'start') {
    p.funds += TILES[0].funds;
    messages.push(`Passou pela largada: +${TILES[0].funds} de verba.`);
  }

  switch (tile.type) {
    case 'start':
    case 'funds':
      p.funds += tile.funds;
      messages.push(`${tile.label}: ${tile.funds >= 0 ? '+' : ''}${tile.funds} de verba.`);
      break;
    case 'tech':
      p.tech = (p.tech || 0) + tile.tech;
      messages.push(`${tile.label}: +${tile.tech} de tecnologia.`);
      break;
    case 'shop':
      p.discount = Math.max(p.discount || 0, tile.discount);
      messages.push(`${tile.label}: ${tile.discount}% de desconto na próxima compra.`);
      break;
    case 'repair':
      p.shields = (p.shields || 0) + tile.shield;
      messages.push(`${tile.label}: +${tile.shield} proteção contra falha.`);
      break;
    case 'catchup':
      if (isLast) {
        p.funds += tile.funds;
        messages.push(`${tile.label}: você está atrás, +${tile.funds} de verba.`);
      } else {
        messages.push(`${tile.label}: só vale para quem está atrás.`);
      }
      break;
    case 'event': {
      const ev = EVENTS[Math.floor(rng() * EVENTS.length)];
      if (ev.funds) p.funds += ev.funds;
      if (ev.discount) p.discount = Math.max(p.discount || 0, ev.discount);
      if (ev.shield) p.shields = (p.shields || 0) + ev.shield;
      if (ev.tech) p.tech = (p.tech || 0) + ev.tech;
      messages.push(`Sorte ou azar: ${ev.text}`);
      break;
    }
    default:
      break;
  }

  p.funds = Math.max(0, p.funds);
  delete p.passedStart;
  return { player: p, messages };
}
