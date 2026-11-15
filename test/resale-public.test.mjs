// Etapa 1: revenda a 50% (sem lucro com desconto) e lançamento público (anúncio + marcador "em voo").
import test from 'node:test';
import assert from 'node:assert/strict';
import { standOn } from './tiles.mjs';
import { noActions as actions, textsOf, walk } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const sim = await import('../src/sim/actions.js');
const { CATALOG, refundFor, priceFor, SELL_REFUND_RATE, MAX_DISCOUNT, discover } = await import('../src/sim/resources.js');
const { workshopScreen } = await import('../src/ui/workshop.js');
const { boardScreen } = await import('../src/ui/board.js');
const { setGuide } = await import('../src/ui/prefs.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const noFailure = () => 0.99;

// Dois jogadores humanos: com rng 0 o sorteio dá [URSS, EUA]; A (URSS) pode usar o foguete pequeno.
function twoPlayers() {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 });
  state.screen = 'board';
  return state;
}
function stepOnBoard(state) {
  sim.rollAndMove(state, die(2));
  if (state.pendingDilemma) sim.chooseDilemma(state, 0, noFailure);
  if (state.pendingTile) sim.skipTile(state);
}
const visibleTo = (state, viewerId) => state.log.filter((l) => l.who == null || l.who === viewerId).map((l) => l.text);

// ---------------------------------------------------------------- revenda

test('a revenda devolve metade do custo base, arredondado para baixo', () => {
  assert.equal(SELL_REFUND_RATE, 0.5);
  assert.equal(refundFor('camera'), Math.floor(CATALOG.camera.cost / 2));
  assert.equal(refundFor('radio_beacon'), Math.floor(CATALOG.radio_beacon.cost / 2));
});

test('nunca dá lucro: com qualquer desconto o reembolso não passa do preço pago', () => {
  for (const id of Object.keys(CATALOG)) {
    for (let discount = 0; discount <= MAX_DISCOUNT; discount += 5) {
      const price = priceFor({ discount, buildings: { factory: 0 } }, id);
      assert.ok(refundFor(id) <= price, `${id} com ${discount}% de desconto: paga ${price}, devolve ${refundFor(id)}`);
    }
  }
});

test('comprar com desconto máximo e revender nunca aumenta a verba (o ralo antigo)', () => {
  const state = twoPlayers();
  standOn(state, 'workshop');
  const a = state.players[0];
  a.funds = 500;
  a.tech = 10;
  a.buildings.factory = 3; // 30% permanente, mais 20% de um evento = 50% (o máximo)
  for (const id of Object.keys(CATALOG)) {
    discover(a, [id]);
    const before = a.funds;
    a.discount = 20;
    assert.equal(sim.buyItem(state, id), null, id);
    assert.equal(sim.sellItem(state, id), null, id);
    assert.ok(a.funds <= before, `${id}: ${before} -> ${a.funds}`);
  }
});

test('vender devolve o valor e só mexe na nave', () => {
  const state = twoPlayers();
  standOn(state, 'workshop');
  const a = state.players[0];
  discover(a, ['camera']);
  sim.buyItem(state, 'camera');
  const funds = a.funds;
  assert.equal(sim.sellItem(state, 'camera'), null);
  assert.equal(a.funds, funds + refundFor('camera'));
  assert.equal(a.spacecraft.instruments.length, 0);
  assert.match(sim.sellItem(state, 'camera'), /não está na espaçonave/);
});

test('o botão "Vender" mostra quanto devolve', () => {
  const state = twoPlayers();
  const a = state.players[0];
  discover(a, ['solar_small']);
  a.spacecraft.parts.push('solar_small');
  const root = workshopScreen(state, actions);
  const labels = [];
  walk(root, (n) => { if (n.tag === 'button' && /Vender/.test(n.textContent)) labels.push(n.textContent.trim()); });
  assert.ok(labels.includes(`Vender +${refundFor('solar_small')}`), labels.join(' | '));
});

// ---------------------------------------------------------------- lançamento público

function launchAsFirstPlayer() {
  const state = twoPlayers();
  const a = state.players[0];
  a.spacecraft = { instruments: ['radio_beacon'], parts: ['solar_small', 'antenna_basic'], launcherId: 'small', orbitId: 'leo' };
  a.funds = 200;
  stepOnBoard(state);
  assert.equal(sim.launch(state, noFailure), null);
  return { state, a, b: state.players[1] };
}

test('lançar é anunciado a todos; a nave por dentro e o resultado continuam secretos', () => {
  const { state, a, b } = launchAsFirstPlayer();
  const seenByB = visibleTo(state, b.id);
  assert.ok(seenByB.some((t) => /A lançou a missão "Primeiro satélite"/.test(t)), 'B vê o anúncio');
  assert.ok(!seenByB.some((t) => /comprou|vendeu|revendeu|ensaio/.test(t)), 'nada privado de A vaza para B');
  // o resultado do voo segue privado: nenhuma entrada pública de sucesso ou falha
  assert.ok(!seenByB.some((t) => /CUMPRIDA|falhou|FALHOU|superada/.test(t)));
  assert.ok(a.flight);
});

test('o anúncio de lançamento aparece uma vez só no diário do próprio jogador', () => {
  const { state, a } = launchAsFirstPlayer();
  const mine = visibleTo(state, a.id).filter((t) => /lançou a missão/.test(t));
  assert.equal(mine.length, 1);
});

test('o peão de quem está com a nave no ar mostra o marcador "em voo" para os outros', () => {
  setGuide(true);
  const { state, a, b } = launchAsFirstPlayer();
  state.turn = b.id; // a tela é desenhada para a vez de B
  const root = boardScreen(state, actions);
  const pawns = [];
  walk(root, (n) => { if (/\bgb-pawn\b/.test(n.className)) pawns.push({ cls: n.className, title: n.attrs.title, pid: n.attrs['data-pid'] }); });
  const flying = pawns.filter((p) => /\bin-flight\b/.test(p.cls));
  assert.equal(flying.length, 1);
  assert.equal(flying[0].pid, String(a.id));
  assert.match(flying[0].title, /nave em voo/);
});

test('sem nave no ar não há marcador', () => {
  setGuide(true);
  const state = twoPlayers();
  const root = boardScreen(state, actions);
  let marked = 0;
  walk(root, (n) => { if (/\bin-flight\b/.test(n.className)) marked += 1; });
  assert.equal(marked, 0);
});

test('o painel de rivais mostra a nave em voo sem espião e aparece na interface enxuta', () => {
  setGuide(true);
  const { state, a, b } = launchAsFirstPlayer();
  state.turn = b.id;
  assert.equal(b.step, 0); // interface enxuta de B (1º degrau)
  const root = boardScreen(state, actions);
  const tabs = [];
  walk(root, (n) => { if (n.tag === 'summary') tabs.push(n.textContent); });
  assert.ok(tabs.some((t) => /Rivais/.test(t)), 'a aba de rivais aparece quando alguém lança');
  assert.ok(textsOf(root, 'flight-public').some((t) => /Nave em voo \(anúncio público\)/.test(t)));
  assert.deepEqual(b.intel, {}, 'sem espionar, B não sabe mais nada do rival');
  assert.ok(a.flight);
});

test('no solo o bot não tem nave nem marcador', () => {
  const state = createInitialState();
  sim.startGame(state, [{ name: 'S' }], { rng: () => 0 });
  const bot = state.players.find((p) => p.bot);
  assert.equal(bot.flight, null);
  assert.equal(state.players.filter((p) => p.flight).length, 0);
});
