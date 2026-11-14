// Camada do TABULEIRO (IDEIA.md v3 seção 4): o jogador rola 2 dados, escolhe um, anda e decide.
// O tabuleiro alimenta a engenharia: verba, tecnologia, desconto, proteção, prédios e informação.
// Funções puras, sem DOM. Recebem `rng` para os testes serem determinísticos.
// ATENÇÃO: valores FICTÍCIOS para balanceamento. Casas de dinheiro são fracas de propósito.
//
// Tipos de casa:
//   start    largada (volta completa dá verba)
//   funds    verba (positiva ou negativa)
//   event    carta de dilema (em solo) ou imprevisto na próxima etapa (com a nave em voo)
//   tech     cooperação científica: +tecnologia
//   shop     feira de fornecedores: desconto na próxima compra
//   lot      terreno: construir prédio ou usar o prédio do rival
//   spy      espionagem: paga para ver o estado de um rival (uma vez por ano)
//   repair   oficina de reparos: +1 proteção contra falha
//   catchup  choque do Sputnik: verba de recuperação para quem está atrás
// As decisões (dilema, prédio, espião) ficam em sim/actions.js, que conhece o estado inteiro.

export const TILES = [
  { id: 0, type: 'start', label: 'Largada', funds: 10 },
  { id: 1, type: 'lot', label: 'Terreno livre' },
  { id: 2, type: 'funds', label: 'Discurso: o espaço vira prioridade', funds: 10 },
  { id: 3, type: 'event', label: 'Evento' },
  { id: 4, type: 'spy', label: 'Espionagem' },
  { id: 5, type: 'lot', label: 'Terreno livre' },
  { id: 6, type: 'tech', label: 'Ano Geofísico Internacional', tech: 1 },
  { id: 7, type: 'event', label: 'Evento' },
  { id: 8, type: 'catchup', label: 'Choque do Sputnik', funds: 20 },
  { id: 9, type: 'lot', label: 'Terreno livre' },
  { id: 10, type: 'shop', label: 'Feira de fornecedores', discount: 15 },
  { id: 11, type: 'event', label: 'Evento' },
  { id: 12, type: 'repair', label: 'Oficina de reparos', shield: 1 },
  { id: 13, type: 'lot', label: 'Terreno livre' },
  { id: 14, type: 'funds', label: 'Crise diplomática: verba desviada', funds: -10 },
  { id: 15, type: 'event', label: 'Evento' },
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

// Aplica o efeito automático da casa. Devolve { player, messages[] }.
// `isLast` = jogador com menos progresso (recebe a verba do choque do Sputnik).
export function applyTile(player, tile, { isLast = false } = {}) {
  const messages = [];
  const p = { ...player };

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
      messages.push(`${tile.label}: cooperação científica, +${tile.tech} de tecnologia.`);
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
        messages.push(`${tile.label}: o governo libera verba de recuperação, +${tile.funds}.`);
      } else {
        messages.push(`${tile.label}: só vale para quem está atrás na corrida.`);
      }
      break;
    default:
      break;
  }

  p.funds = Math.max(0, p.funds);
  delete p.passedStart;
  return { player: p, messages };
}
