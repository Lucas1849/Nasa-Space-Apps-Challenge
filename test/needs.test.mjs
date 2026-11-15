// Requisitos escondidos da missão (sim/needs.js): o jogador não vê o mínimo de ciência e comunicação,
// pode lançar mesmo assim, descobre ao errar (ou por um ensaio em solo) e depois o checklist volta a travar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, REHEARSAL_COST } from '../src/sim/state.js';
import {
  startGame, rollAndMove, endTurn, launch, advanceFlight, chooseStageOption, chooseDilemma, skipTile,
  buyItem, chooseLauncher, rehearse,
} from '../src/sim/actions.js';
import { checkDesign } from '../src/sim/simulate.js';
import { isHidden, learnNeeds, needLevel } from '../src/sim/needs.js';
import { MISSIONS } from '../src/data/missions.js';

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

function walk(state, steps = 2) {
  rollAndMove(state, die(steps));
  if (state.pendingDilemma) chooseDilemma(state, 0, noFailure);
  if (state.pendingTile) skipTile(state);
}

// Jogo solo (URSS: pode lançar o foguete pequeno no turno 1) com a nave do 1º satélite.
function soloGame() {
  const state = createInitialState();
  startGame(state, [{ name: 'A' }], { rng: () => 0 });
  return state;
}
// Projeto que fecha nas contas físicas mas não entrega o mínimo de ciência (nenhum instrumento).
function shortScience(p) {
  p.spacecraft = { instruments: [], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
}
function goodShip(p) {
  p.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
}

test('jogo normal esconde os mínimos; o sandbox e jogadores de teste não', () => {
  const normal = soloGame();
  assert.equal(normal.players[0].hideNeeds, true);
  assert.equal(isHidden(normal.players[0]), true);
  const sandbox = createInitialState();
  startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.equal(isHidden(sandbox.players[0]), false);
});

test('a pista qualitativa dá noção sem o número', () => {
  assert.equal(needLevel('science', 2), 'baixa');
  assert.equal(needLevel('science', 4), 'moderada');
  assert.equal(needLevel('science', 8), 'alta');
  assert.equal(needLevel('comms', 3), 'baixa');
  assert.equal(needLevel('comms', 8), 'alta');
});

test('checklist: mínimo desconhecido não trava e não mostra o número; depois de descoberto trava', () => {
  const state = soloGame();
  const p = state.players[0];
  shortScience(p);
  p.funds = 100;
  const hiddenView = checkDesign(p);
  assert.equal(hiddenView.ok, true, 'não trava por um mínimo desconhecido');
  const science = hiddenView.checks.find((c) => c.id === 'science');
  assert.equal(science.hidden, true);
  assert.ok(!/mínimo 2/.test(science.text) && !/\/2/.test(science.text), 'o número não aparece');
  assert.match(science.text, /ciência baixa/); // só a pista

  learnNeeds(p, 'first_satellite');
  const known = checkDesign(p);
  assert.equal(known.ok, false, 'depois de descoberto, trava');
  assert.match(known.checks.find((c) => c.id === 'science').text, /abaixo do mínimo 2/);
});

test('a avaliação final sempre vale, mesmo com o mínimo escondido', () => {
  const state = soloGame();
  const p = state.players[0];
  shortScience(p);
  const evaluated = checkDesign(p, { evaluate: true });
  assert.equal(evaluated.ok, false);
  assert.ok(!evaluated.checks.some((c) => c.hidden));
});

test('lançar sem atingir o mínimo escondido: voa, falha na avaliação, explica e revela os números', () => {
  const state = soloGame();
  const a = state.players[0];
  shortScience(a);
  const techBefore = a.tech;
  walk(state);
  assert.equal(launch(state, noFailure), null, 'o lançamento não é travado');
  endTurn(state);
  walk(state);
  advanceFlight(state, noFailure);
  chooseStageOption(state, 0, noFailure);

  const r = a.lastResult;
  assert.equal(r.success, false);
  assert.ok(r.reasons.some((t) => /Ciência 0 abaixo do mínimo 2/.test(t)), 'o relatório diz o que faltou');
  assert.match(r.learning, /Requisito descoberto/);
  assert.match(r.learning, /ciência ≥ 2/);
  assert.equal(a.tech, techBefore + 1, 'errar por requisito ensina: +1 de tecnologia');
  assert.equal(a.step, 0);
  assert.equal(isHidden(a), false, 'os números passam a aparecer');
});

test('depois de descoberto, lançar de novo a nave curta é travado pelo checklist', () => {
  const state = soloGame();
  const a = state.players[0];
  shortScience(a);
  walk(state);
  launch(state, noFailure);
  endTurn(state);
  walk(state);
  advanceFlight(state, noFailure);
  chooseStageOption(state, 0, noFailure);
  endTurn(state);
  shortScience(a);
  a.funds = 100;
  walk(state);
  assert.match(launch(state, noFailure), /pendências/);
});

test('acertar o mínimo escondido: cumpre a missão e também revela os números', () => {
  const state = soloGame();
  const a = state.players[0];
  goodShip(a);
  walk(state);
  assert.equal(launch(state, noFailure), null);
  endTurn(state);
  walk(state);
  advanceFlight(state, noFailure);
  chooseStageOption(state, 0, noFailure);
  assert.equal(a.lastResult.success, true);
  assert.equal(a.lastResult.learning, undefined, 'sem erro não há +1 de tecnologia por descoberta');
  assert.equal(isHidden(a, 'first_satellite'), false);
});

test('"Projeto pronto" depende só do que é visível: não vaza se a nave atende', () => {
  const state = soloGame();
  const a = state.players[0];
  a.funds = 100;
  a.tech = 2; // solo com rng 0 sorteia os EUA, que exigem tecnologia 2 para o foguete pequeno
  assert.equal(chooseLauncher(state, 'small'), null);
  buyItem(state, 'solar_small');
  buyItem(state, 'antenna_basic'); // sem instrumento: a ciência está curta, mas isso é escondido
  assert.ok(a.milestones.includes('first_satellite:design_ready'));
});

test('ensaio em solo: custa, diz em palavras, não gasta foguete e é 1 por turno', () => {
  const state = soloGame();
  const a = state.players[0];
  shortScience(a);
  const funds = a.funds;
  assert.equal(rehearse(state), null);
  assert.equal(a.funds, funds - REHEARSAL_COST);
  assert.equal(a.spacecraft.launcherId, 'small', 'a nave continua na oficina');
  assert.equal(a.launches, 0, 'nenhum lançamento');
  const notes = state.outcome.notes.join(' ');
  assert.match(notes, /Ciência: está bem abaixo/);
  assert.match(notes, /Comunicação: atende/);
  assert.ok(!/\d+ de ciência|mínimo/.test(notes), 'sem o número');
  assert.match(rehearse(state), /Só um ensaio por turno/);
});

test('ensaio de uma nave que atende diz que nada indica falta de requisito', () => {
  const state = soloGame();
  goodShip(state.players[0]);
  rehearse(state);
  assert.match(state.outcome.notes.join(' '), /Ciência: atende/);
  assert.match(state.outcome.notes.join(' '), /Nada indica falta de requisito/);
});

test('ensaio: recusa sem verba, com requisito já conhecido e no sandbox', () => {
  const state = soloGame();
  const a = state.players[0];
  a.funds = REHEARSAL_COST - 1;
  assert.match(rehearse(state), /Verba insuficiente/);
  a.funds = 50;
  learnNeeds(a, 'first_satellite');
  assert.match(rehearse(state), /já são conhecidos/);

  const sandbox = createInitialState();
  startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.match(rehearse(sandbox), /sandbox/);
});

test('toda missão da escada tem um mínimo que dá para classificar em pista', () => {
  for (const m of Object.values(MISSIONS)) {
    assert.ok(['baixa', 'moderada', 'alta'].includes(needLevel('science', m.needs.science)), m.id);
    assert.ok(['baixa', 'moderada', 'alta'].includes(needLevel('comms', m.needs.comms)), m.id);
  }
});
