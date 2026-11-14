// Camada do TABULEIRO: o jogador anda e ganha verba (estilo Banco Imobiliário).
// O tabuleiro é só o jeito de conseguir recursos; o centro do jogo é a oficina (src/ui/workshop.js).
// Funções puras, sem DOM. Recebem `rng` para os testes serem determinísticos.
// ATENÇÃO: valores FICTÍCIOS para balanceamento.

export const TILES = [
  { id: 0, type: 'start', label: 'Largada', funds: 10 },
  { id: 1, type: 'funds', label: 'Verba do governo', funds: 15 },
  { id: 2, type: 'event', label: 'Evento' },
  { id: 3, type: 'funds', label: 'Patrocínio', funds: 10 },
  { id: 4, type: 'tax', label: 'Corte de orçamento', funds: -10 },
  { id: 5, type: 'funds', label: 'Prêmio científico', funds: 20 },
  { id: 6, type: 'event', label: 'Evento' },
  { id: 7, type: 'catchup', label: 'Apoio ao atrasado', funds: 25 },
];

// Eventos aleatórios da casa "Evento". Compensação para quem está atrás entra na casa 'catchup'.
export const EVENTS = [
  { id: 'grant', text: 'Verba extra de pesquisa.', funds: 15 },
  { id: 'delay', text: 'Atraso no fornecedor: custo extra.', funds: -8 },
  { id: 'spinoff', text: 'Tecnologia reaproveitada: desconto de 10% na próxima compra.', discount: 10 },
  { id: 'shield', text: 'Teste bem-sucedido: proteção contra uma falha.', shield: 1 },
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
    case 'tax':
      p.funds += tile.funds;
      messages.push(`${tile.label}: ${tile.funds >= 0 ? '+' : ''}${tile.funds} de verba.`);
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
      messages.push(`Evento: ${ev.text}`);
      break;
    }
  }

  p.funds = Math.max(0, p.funds);
  delete p.passedStart;
  return { player: p, messages };
}
