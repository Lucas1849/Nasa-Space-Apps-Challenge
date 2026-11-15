// Balanceamento da verba (15/11): com a verba inicial ninguém lança o 1º satélite no turno 1.
// Antes, a rodada 1 pagava o orçamento do ano e o marco "Projeto pronto" dava +20 ANTES de lançar,
// devolvendo o preço das peças. Valores do jogo são FICTÍCIOS (balanceamento).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/sim/state.js';
import { startGame, rollAndMove, buyItem, chooseLauncher, launch } from '../src/sim/actions.js';
import { MISSIONS } from '../src/data/missions.js';
import { CATALOG } from '../src/sim/resources.js';
import { LAUNCHERS } from '../src/data/launchers.js';

// rng 0 → EUA para o jogador; 0.99 → URSS. O dado 1 cai num terreno livre (sem verba extra).
function soloAs(rngValue) {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => rngValue });
  rollAndMove(state, () => 0.01);
  return state;
}

const kitCost = (missionId) => MISSIONS[missionId].kit.reduce((sum, id) => sum + (LAUNCHERS[id] || CATALOG[id]).cost, 0);

for (const [label, rngValue] of [['EUA', 0], ['URSS', 0.99]]) {
  test(`${label}: a verba do turno 1 não paga o 1º satélite inteiro`, () => {
    const state = soloAs(rngValue);
    const p = state.players[0];
    assert.ok(p.funds < kitCost('first_satellite'), `começa com ${p.funds}, o kit custa ${kitCost('first_satellite')}`);
  });

  test(`${label}: montar a nave não devolve verba antes do lançamento`, () => {
    const state = soloAs(rngValue);
    const p = state.players[0];
    p.tech = 5; // isola a verba: os EUA precisariam de tecnologia 2 para o foguete pequeno
    chooseLauncher(state, 'small');
    for (const id of ['radio_beacon', 'solar_small', 'antenna_basic']) buyItem(state, id);
    assert.ok(p.milestones.includes('first_satellite:design_ready'));
    assert.ok(p.funds < LAUNCHERS.small.cost, `sobrou ${p.funds} depois das peças: não deveria pagar o lançador`);
    assert.match(launch(state, () => 0.99) || '', /Verba|pendência/i);
  });
}

// Os mínimos de ciência e comunicação começam escondidos, então o jogo deixa lançar uma nave "vazia"
// (lançador + 1 painel) que vai falhar. Nem essa cabe na verba do turno 1.
for (const [label, rngValue] of [['EUA', 0], ['URSS', 0.99]]) {
  test(`${label}: nem a nave mais barata (lançador + painel) cabe na verba do turno 1`, () => {
    const state = soloAs(rngValue);
    const p = state.players[0];
    const cheapest = LAUNCHERS.small.cost + CATALOG.solar_small.cost;
    assert.ok(p.funds < cheapest, `começa com ${p.funds}, a nave mais barata custa ${cheapest}`);
  });
}
