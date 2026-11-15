// Oficina fechada com a nave em voo e kit do próximo degrau liberado só no sucesso (sim/actions.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf, walk } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const sim = await import('../src/sim/actions.js');
const { workshopScreen } = await import('../src/ui/workshop.js');
const { boardScreen } = await import('../src/ui/board.js');
const { reportScreen } = await import('../src/ui/report.js');
const { setGuide } = await import('../src/ui/prefs.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

function stepOnBoard(state) {
  sim.rollAndMove(state, die(2));
  if (state.pendingDilemma) sim.chooseDilemma(state, 0, noFailure);
  if (state.pendingTile) sim.skipTile(state);
}

// Solo com a nave do 1º degrau já lançada (o voo está em andamento).
function launched() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }], { rng: () => 0 });
  const p = state.players[0];
  p.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  stepOnBoard(state);
  assert.equal(sim.launch(state, noFailure), null);
  return { state, p };
}
// Termina o voo (2 etapas no LEO): a missão é cumprida ou falha conforme o sorteio.
function finishFlight(state, rng) {
  sim.endTurn(state);
  stepOnBoard(state);
  sim.advanceFlight(state, rng);
  sim.chooseStageOption(state, 0, rng);
}
const buttons = (root) => { const out = []; walk(root, (n) => { if (n.tag === 'button') out.push(n.textContent.replace(/\s+/g, ' ').trim()); }); return out; };

test('com a nave em voo a oficina recusa comprar, vender, foguete, órbita e ensaio', () => {
  const { state } = launched();
  for (const result of [
    sim.buyItem(state, 'radio_beacon'),
    sim.sellItem(state, 'radio_beacon'),
    sim.chooseLauncher(state, 'small'),
    sim.chooseOrbit(state, 'leo'),
    sim.rehearse(state),
  ]) assert.match(result, /em voo: aguarde o resultado/);
});

test('o sandbox continua livre com a nave em voo', () => {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  sim.buyItem(state, 'radio_beacon');
  sim.buyItem(state, 'solar_small');
  sim.buyItem(state, 'antenna_basic');
  sim.chooseLauncher(state, 'small');
  sim.chooseOrbit(state, 'leo');
  assert.equal(sim.launch(state, noFailure), null);
  assert.equal(sim.buyItem(state, 'solar_small'), null);
});

test('lançar não troca a missão nem revela o kit do próximo degrau', () => {
  const { p } = launched();
  assert.equal(p.missionId, 'first_satellite');
  assert.ok(!p.unlocked.includes('life_support'));
});

test('a oficina em voo mostra só o aviso, sem cartas de peças', () => {
  setGuide(true);
  const { state } = launched();
  const root = workshopScreen(state, actions);
  const text = root.textContent.replace(/\s+/g, ' ');
  assert.match(text, /Oficina fechada: a nave está em voo/);
  assert.match(text, /Etapa 2 de 2/);
  assert.equal(textsOf(root, 'card-head').length, 0);
});

test('o tabuleiro não oferece a Oficina enquanto a nave voa', () => {
  setGuide(true);
  const { state } = launched();
  assert.ok(!buttons(boardScreen(state, actions)).some((b) => /Oficina/.test(b)));
  assert.match(boardScreen(state, actions).textContent, /só pode ser montada quando esta cumprir a missão/);
});

test('cumprir o degrau libera o kit do próximo, mostra no relatório e reabre a oficina', () => {
  const { state, p } = launched();
  finishFlight(state, noFailure);
  assert.equal(p.lastResult.success, true);
  assert.equal(p.missionId, 'living_being');
  assert.ok(p.unlocked.includes('life_support'));

  const report = reportScreen(state, actions).textContent.replace(/\s+/g, ' ');
  assert.match(report, /Peças liberadas/);
  assert.match(report, /Cápsula com suporte de vida/);

  const shop = workshopScreen(state, actions);
  assert.ok(!/Oficina fechada/.test(shop.textContent));
  assert.ok(textsOf(shop, 'card-head').some((t) => /Cápsula com suporte de vida/.test(t)));
});

test('falhar o voo não libera nada e o relatório não mostra "Peças liberadas"', () => {
  const { state, p } = launched();
  finishFlight(state, () => 0); // a etapa de órbita falha
  assert.equal(p.lastResult.success, false);
  assert.equal(p.missionId, 'first_satellite');
  assert.ok(!p.unlocked.includes('life_support'));
  assert.ok(!/Peças liberadas/.test(reportScreen(state, actions).textContent));
});
