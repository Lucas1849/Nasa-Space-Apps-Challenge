// Fornecedores e blueprints (Etapa 3 do plano). Ninguém começa com as peças: o jogador conquista a BLUEPRINT
// (o projeto, o conhecimento) de cada peça e foguete parando numa casa de fornecedor, e depois paga a PEÇA na oficina.
//   blueprint = pesquisa: paga uma vez, vale para sempre (entra em `player.unlocked`, sim/resources.js);
//   peça      = fabricação: paga a cada nave.
// A cada visita o fornecedor mostra 4 ofertas: até 4 do kit do degrau atual (o que a missão precisa, para ninguém ficar
// travado) e o resto surpresa. A PRIMEIRA blueprint da partida é de graça (aprendizado). Funções puras, sem DOM.
// ATENÇÃO: preços FICTÍCIOS para balanceamento (a calibragem final é com scripts/simulate.mjs).
import { CATALOG } from './resources.js';
import { LAUNCHERS } from '../data/launchers.js';
import { MISSIONS } from '../data/missions.js';

export const BLUEPRINT_RATE = 0.3;          // blueprint de peça: 30% do custo da peça
export const BLUEPRINT_RATE_LAUNCHER = 0.35;  // blueprint de foguete: 35% do custo de lançamento
export const SUPPLIER_OFFERS = 4;            // ofertas por visita
export const SUPPLIER_KIT_OFFERS = 4;        // quantas dessas vêm do kit do degrau atual

export const isLauncherId = (id) => Boolean(LAUNCHERS[id]);
export const itemOf = (id) => LAUNCHERS[id] || CATALOG[id];

// Preço da blueprint (ainda sem a gratuidade da 1ª): mínimo 1.
export function blueprintPrice(id) {
  const rate = isLauncherId(id) ? BLUEPRINT_RATE_LAUNCHER : BLUEPRINT_RATE;
  return Math.max(1, Math.round(itemOf(id).cost * rate));
}

// Quanto o jogador paga agora: a primeira blueprint da partida é grátis.
export const blueprintCostFor = (player, id) => (player.freeBlueprintUsed ? blueprintPrice(id) : 0);

// Sorteio embaralhado, repetível com um `rng` injetado.
function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// O que ainda falta do kit do degrau atual (peças e foguete).
export function missingKit(player) {
  const mission = MISSIONS[player.missionId];
  if (!mission) return [];
  return mission.kit.filter((id) => !(player.unlocked || []).includes(id));
}

// Ofertas de uma visita: até 2 do kit que falta + o resto surpresa. Nunca repete e nunca oferece o que o jogador já tem.
export function makeOffers(player, rng = Math.random) {
  const owned = new Set(player.unlocked || []);
  const everything = [...Object.keys(CATALOG), ...Object.keys(LAUNCHERS)].filter((id) => !owned.has(id));
  const fromKit = shuffled(missingKit(player), rng).slice(0, SUPPLIER_KIT_OFFERS);
  const rest = shuffled(everything.filter((id) => !fromKit.includes(id)), rng);
  return [...fromKit, ...rest].slice(0, SUPPLIER_OFFERS);
}
