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
//   shop     fornecedor: até 4 ofertas de blueprint por visita (peças e foguetes); a 1ª é de graça
//   lot      terreno: construir prédio ou usar o prédio do rival
//   spy      espionagem: paga para ver o estado de um rival (uma vez por ano)
//   workshop oficina de montagem: onde se compra, vende e lança (3 casas, espalhadas)
//   repair   reparos: +1 proteção contra falha
//   catchup  choque do Sputnik: verba de recuperação para quem está atrás
// As decisões (dilema, prédio, espião) ficam em sim/actions.js, que conhece o estado inteiro.
import { localizeList } from '../i18n/localize.js';
import { t } from '../i18n/index.js';

// Rótulos das casas em i18n (tile.<id>.label). Aqui ficam só ids, tipos e números.
export const TILES = localizeList('tile', [
  { id: 0, type: 'start', funds: 10 },
  { id: 1, type: 'lot' },
  { id: 2, type: 'workshop' },
  { id: 3, type: 'funds', funds: 10 },
  { id: 4, type: 'event' },
  { id: 5, type: 'spy' },
  { id: 6, type: 'tech', tech: 1 },
  { id: 7, type: 'shop' },
  { id: 8, type: 'lot' },
  { id: 9, type: 'event' },
  { id: 10, type: 'workshop' },
  { id: 11, type: 'catchup', funds: 20 },
  { id: 12, type: 'repair', shield: 1 },
  { id: 13, type: 'lot' },
  { id: 14, type: 'shop' },
  { id: 15, type: 'event' },
  { id: 16, type: 'funds', funds: -10 },
  { id: 17, type: 'workshop' },
  { id: 18, type: 'lot' },
  { id: 19, type: 'event' },
], ['label']);

// A oficina de montagem: só nela (ou no sandbox) dá para comprar, vender, escolher foguete/órbita, ensaiar e lançar.
// A TELA da oficina abre de qualquer lugar, para planejar sem gastar.
export const atWorkshopTile = (player) => TILES[player.position]?.type === 'workshop';

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
    messages.push(t('tilemsg.passedStart', { n: TILES[0].funds }));
  }

  switch (tile.type) {
    case 'start':
    case 'funds':
      p.funds += tile.funds;
      messages.push(t('tilemsg.funds', { label: tile.label, v: `${tile.funds >= 0 ? '+' : ''}${tile.funds}` }));
      break;
    case 'tech':
      p.tech = (p.tech || 0) + tile.tech;
      messages.push(t('tilemsg.tech', { label: tile.label, n: tile.tech }));
      break;
    case 'shop':
      break; // as ofertas de blueprint abrem em sim/actions.js (moveBy, pendingTile 'supplier')
    case 'repair':
      p.shields = (p.shields || 0) + tile.shield;
      messages.push(t('tilemsg.repair', { label: tile.label, n: tile.shield }));
      break;
    case 'catchup':
      if (isLast) {
        p.funds += tile.funds;
        messages.push(t('tilemsg.catchup', { label: tile.label, n: tile.funds }));
      } else {
        messages.push(t('tilemsg.catchupNo', { label: tile.label }));
      }
      break;
    default:
      break;
  }

  p.funds = Math.max(0, p.funds);
  delete p.passedStart;
  return { player: p, messages };
}
