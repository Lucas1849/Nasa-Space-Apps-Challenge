// Cálculo dos recursos da espaçonave: massa, energia, custo, dados, comunicação, ciência, vida útil.
// Funções puras (sem DOM) para facilitar teste e ensaiar o balanceamento.
import { INSTRUMENTS } from '../data/instruments.js';
import { PARTS } from '../data/parts.js';
import { ORBITS } from '../data/orbits.js';
import { LAUNCHERS } from '../data/launchers.js';

export const CATALOG = { ...INSTRUMENTS, ...PARTS };

export function itemsOf(player) {
  const { instruments, parts } = player.spacecraft;
  return [...instruments, ...parts].map((id) => CATALOG[id]).filter(Boolean);
}

// Totais brutos da espaçonave (sem considerar órbita nem lançador).
export function totalsFor(player) {
  const items = itemsOf(player);
  const sum = (key) => items.reduce((acc, item) => acc + (item[key] || 0), 0);
  return {
    mass: sum('mass'),
    powerUse: sum('power'),
    powerGen: sum('powerGen'),
    cost: sum('cost'),
    data: sum('dataRate'),
    comms: sum('commsRate'),
    science: sum('science'),
    lifetimeBonus: sum('lifetimeBonus'),
    lifeSupport: items.some((i) => i.lifeSupport),
  };
}

// Totais efetivos, já com o efeito da órbita e o limite do lançador.
export function effectiveTotals(player) {
  const t = totalsFor(player);
  const orbit = ORBITS[player.spacecraft.orbitId];
  const launcher = LAUNCHERS[player.spacecraft.launcherId];
  const commsEffective = orbit ? Math.floor(t.comms * (1 - orbit.commsPenalty)) : t.comms;
  return {
    ...t,
    commsEffective,
    scienceEffective: t.science + (orbit ? orbit.scienceBonus : 0),
    lifetime: (orbit ? orbit.baseLifetime : 0) + t.lifetimeBonus,
    maxMass: launcher ? launcher.maxMass : null,
    launchCost: launcher ? launcher.cost : 0,
    powerBalance: t.powerGen - t.powerUse,
  };
}

export const FACTORY_DISCOUNT_PER_LEVEL = 10; // % por nível da Fábrica (data/buildings.js)
export const MAX_DISCOUNT = 50;

// Desconto total em %: desconto de uma compra (evento, milestone) + Fábrica (permanente).
export function discountFor(player) {
  const factory = (player.buildings?.factory || 0) * FACTORY_DISCOUNT_PER_LEVEL;
  return Math.min(MAX_DISCOUNT, (player.discount || 0) + factory);
}

// Preço de um item para o jogador, já com desconto acumulado.
export function priceFor(player, itemId) {
  const base = CATALOG[itemId].cost;
  return Math.max(1, Math.round(base * (1 - discountFor(player) / 100)));
}

// Revenda: a peça física perde valor ao ser revendida (sucata). Devolve metade do custo BASE (arredondado para
// baixo). Como o desconto máximo é 50% (MAX_DISCOUNT), o preço pago nunca fica abaixo do reembolso: não existe
// lucro comprando com desconto e vendendo (antes devolvia o custo cheio e dava dinheiro de graça).
export const SELL_REFUND_RATE = 0.5;
export const refundFor = (itemId) => Math.floor(CATALOG[itemId].cost * SELL_REFUND_RATE);

// Nível de tecnologia exigido. Lançadores (têm `reach`) recebem o ajuste do lado (data/sides.js).
export const requiredTech = (player, item) => Math.max(1, (item.minTech || 0) + (item.reach ? player.launcherTech || 0 : 0));

// Peça ou lançador bloqueado pela tecnologia da agência?
export const isLocked = (player, item) => requiredTech(player, item) > (player.tech || 0);

// Descoberta (progressão): o jogador só vê e compra o que já descobriu. `player.unlocked` guarda
// ids de peças e de lançadores. O kit de cada degrau (data/missions.js) é revelado ao começar o degrau;
// o resto aparece nas casas do tabuleiro, na tecnologia e no Ano novo. O sandbox libera tudo.
export const isDiscovered = (player, item) => (player.unlocked || []).includes(item.id);

// Marca ids como descobertos e devolve só os que eram novos.
export function discover(player, ids) {
  player.unlocked = player.unlocked || [];
  const fresh = [...new Set(ids)].filter((id) => !player.unlocked.includes(id));
  player.unlocked.push(...fresh);
  return fresh;
}

// Peças (instrumentos e partes) que o jogador ainda não descobriu.
export const undiscoveredItems = (player) => Object.values(CATALOG).filter((item) => !isDiscovered(player, item));

// Todos os ids descobríveis: peças e lançadores (o sandbox começa com tudo).
export const allDiscoverableIds = () => [...Object.keys(CATALOG), ...Object.keys(LAUNCHERS)];

// Nome legível de uma peça ou lançador, para o diário.
export const nameOf = (id) => (CATALOG[id] || LAUNCHERS[id]).name;
