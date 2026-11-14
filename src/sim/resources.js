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

// Peça ou lançador bloqueado pela tecnologia da agência?
export const isLocked = (player, item) => (item.minTech || 0) > (player.tech || 0);
