// Virada de ano (renda + animação), faixa de prédios sob o tabuleiro e HUD com recursos em destaque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf, walk } from './dom-stub.mjs';

const { createInitialState, YEARLY_BUDGET, TECH_PER_YEAR, SPONSOR_FUNDS_PER_LEVEL } = await import('../src/sim/state.js');
const sim = await import('../src/sim/actions.js');
const { yearlyIncome } = await import('../src/sim/income.js');
const { SIDES } = await import('../src/data/sides.js');
const { upgradeCost, MAX_LEVEL } = await import('../src/data/buildings.js');
const { boardScreen } = await import('../src/ui/board.js');
const { hud, agencyStrip } = await import('../src/ui/components.js');
const { yearOverlayNode, yearOverlayKey } = await import('../src/ui/yearOverlay.js');
const { setGuide } = await import('../src/ui/prefs.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
function newGame(humans = 1) {
  const state = createInitialState();
  sim.startGame(state, Array.from({ length: humans }, (_, i) => ({ name: `J${i + 1}` })), { rng: () => 0 });
  return state;
}
// Passa o turno do jogador da vez (anda no tabuleiro e resolve o que a casa pedir).
function pass(state) {
  sim.rollAndMove(state, die(2));
  if (state.pendingDilemma) sim.chooseDilemma(state, 0, () => 0.99);
  if (state.pendingTile) sim.skipTile(state);
  assert.equal(sim.endTurn(state), null);
  if (state.screen === 'handoff') state.screen = 'board'; // "Sou eu: começar meu turno"
}
const buttons = (root) => { const out = []; walk(root, (n) => { if (n.tag === 'button') out.push(n); }); return out; };
const text = (root) => root.textContent.replace(/\s+/g, ' ');

// ---------------------------------------------------------------- renda e registro da virada

test('yearlyIncome soma orçamento, bônus do lado, Patrocinador e Laboratório', () => {
  const state = newGame();
  const p = state.players[0];
  const base = yearlyIncome(p);
  assert.equal(base.funds, YEARLY_BUDGET + SIDES[p.side].yearlyBonus);
  assert.equal(base.tech, TECH_PER_YEAR);
  p.buildings.sponsor = 2;
  p.buildings.lab = 3;
  const full = yearlyIncome(p);
  assert.equal(full.funds, base.funds + 2 * SPONSOR_FUNDS_PER_LEVEL);
  assert.equal(full.tech, TECH_PER_YEAR + 3);
  assert.deepEqual(full.parts, { base: YEARLY_BUDGET, side: SIDES[p.side].yearlyBonus, sponsor: 2 * SPONSOR_FUNDS_PER_LEVEL });
  assert.deepEqual(full.techParts, { base: TECH_PER_YEAR, lab: 3 });
});

test('a abertura registra a virada de 1955 com o que entrou, sem peça liberada', () => {
  const state = newGame();
  const p = state.players[0];
  const yc = state.yearChange;
  assert.equal(yc.playerId, p.id);
  assert.equal(yc.round, 1);
  assert.equal(yc.year, 1955);
  assert.equal(yc.funds, yearlyIncome(p).funds);
  assert.equal(yc.tech, TECH_PER_YEAR);
  assert.equal(yc.techLevel, p.tech);
  assert.equal(yc.part, undefined, 'a pesquisa do ano não libera peça (só os fornecedores dão blueprint)');
});

test('a virada seguinte (rodada 4, 1956) vem sem pesquisa básica', () => {
  const state = newGame();
  for (let i = 0; i < 3; i++) pass(state); // rodadas 1, 2 e 3
  assert.equal(state.round, 4);
  const yc = state.yearChange;
  assert.equal(yc.year, 1956);
  assert.equal(yc.round, 4);
  assert.equal(yc.tech, 0, 'a pesquisa básica só rende de 2 em 2 anos');
  assert.equal(yc.techParts.base, 0);
  assert.equal(yc.part, undefined);
});

test('a virada de 1957 (rodada 7) volta a render tecnologia', () => {
  const state = newGame();
  for (let i = 0; i < 6; i++) pass(state);
  assert.equal(state.round, 7);
  assert.equal(state.yearChange.year, 1957);
  assert.equal(state.yearChange.tech, 1);
  assert.equal(state.yearChange.techParts.base, 1);
});

test('o bot não recebe virada; em 2 humanos cada um recebe a sua', () => {
  const solo = newGame();
  assert.equal(solo.yearChange.playerId, solo.players[0].id);
  const duo = newGame(2);
  assert.equal(duo.yearChange.playerId, duo.players[0].id);
  pass(duo); // vez do jogador 2, mesma rodada
  assert.equal(duo.yearChange.playerId, duo.players[1].id);
  assert.equal(duo.yearChange.round, 1);
});

test('subir um prédio devolve o resultado na hora', () => {
  const state = newGame();
  const p = state.players[0];
  p.buildings.lab = 1;
  p.funds = 200;
  assert.equal(sim.upgradeBuilding(state, 'lab'), null);
  assert.match(state.outcome.title, /Laboratório: nível 2 de 3/);
  assert.equal(state.outcome.changes[0].label, 'Verba');
  assert.ok(state.outcome.changes[0].value < 0);
});

// ---------------------------------------------------------------- animação

test('overlay: mostra o ano novo, o ano que sai e os ganhos', () => {
  const state = newGame();
  for (let i = 0; i < 6; i++) pass(state); // rodada 7 = 1957, ano com pesquisa básica
  const root = yearOverlayNode(state.yearChange);
  assert.match(text(root), /Ano novo/);
  assert.deepEqual(textsOf(root, 'year-old'), ['1956']);
  assert.deepEqual(textsOf(root, 'year-new'), ['1957']);
  const gains = textsOf(root, 'gain');
  assert.ok(gains.some((g) => /Verba \+/.test(g)));
  assert.ok(gains.some((g) => /Tecnologia \+1/.test(g)));
  assert.ok(!gains.some((g) => /Peça liberada/.test(g)));
});

test('overlay: na abertura não há ano antigo; com movimento reduzido também não', () => {
  const state = newGame();
  const open = yearOverlayNode(state.yearChange);
  assert.match(text(open), /Começa a corrida espacial/);
  assert.deepEqual(textsOf(open, 'year-old'), []);
  assert.deepEqual(textsOf(open, 'year-new'), ['1955']);
  for (let i = 0; i < 3; i++) pass(state);
  assert.deepEqual(textsOf(yearOverlayNode(state.yearChange, { reduced: true }), 'year-old'), []);
});

test('overlay: o balão de cada ganho explica a origem', () => {
  const state = newGame();
  const p = state.players[0];
  p.buildings.sponsor = 1;
  p.buildings.lab = 2;
  state.yearChange = { ...state.yearChange, ...{ funds: yearlyIncome(p).funds, tech: yearlyIncome(p).tech, parts: yearlyIncome(p).parts, techParts: yearlyIncome(p).techParts } };
  const root = yearOverlayNode(state.yearChange);
  const titles = [];
  walk(root, (n) => { if (/\bgain\b/.test(n.className)) titles.push(n.attrs.title); });
  assert.ok(titles.some((t) => /Patrocinador \+10/.test(t)));
  assert.ok(titles.some((t) => /Laboratório \+2/.test(t)));
});

test('quando animar: só no tabuleiro, fora do sandbox, uma vez por virada e só para o jogador da vez', () => {
  const state = newGame();
  assert.equal(yearOverlayKey(state), '1:0');
  assert.equal(yearOverlayKey(state, '1:0'), null, 'não repete a cada clique');
  state.screen = 'handoff';
  assert.equal(yearOverlayKey(state), null, 'nunca na tela de troca (os ganhos são secretos)');
  state.screen = 'workshop';
  assert.equal(yearOverlayKey(state), null);
  state.screen = 'board';
  state.gameOver = true;
  assert.equal(yearOverlayKey(state), null);
  state.gameOver = false;
  state.yearChange = { ...state.yearChange, playerId: 7 };
  assert.equal(yearOverlayKey(state), null, 'só para quem recebeu');

  const sandbox = createInitialState();
  sim.startGame(sandbox, [{ name: 'S', missionId: 'first_satellite' }], { sandbox: true });
  assert.equal(yearOverlayKey(sandbox), null);
});

test('em 2 humanos a chave só vale depois do "Sou eu" e é a de cada jogador', () => {
  const duo = newGame(2);
  assert.equal(duo.screen, 'handoff');
  assert.equal(yearOverlayKey(duo), null);
  duo.screen = 'board';
  assert.equal(yearOverlayKey(duo), '1:0');
  pass(duo);
  assert.equal(yearOverlayKey(duo), '1:1');
});

// ---------------------------------------------------------------- faixa de prédios

test('faixa: 4 prédios, nível, custo do upgrade e botão desabilitado sem verba', () => {
  setGuide(true);
  const state = newGame();
  const p = state.players[0];
  p.buildings.lab = 1;
  p.funds = 10;
  const root = agencyStrip(state, p, actions);
  const cards = textsOf(root, 'building-card');
  assert.equal(cards.length, 4);
  assert.ok(cards.some((c) => /Laboratório/.test(c) && /nível 1\/3/.test(c)));
  assert.equal(textsOf(root, 'not-built').length, 3, 'os não construídos aparecem esmaecidos');
  const up = buttons(root).find((b) => /Subir/.test(b.textContent));
  assert.ok(up, 'botão de subir');
  assert.equal(up.disabled, true);
  assert.match(up.attrs.title, /Faltam \d+ de verba/);
  p.funds = 200;
  assert.equal(buttons(agencyStrip(state, p, actions)).find((b) => /Subir/.test(b.textContent)).disabled, false);
});

test('faixa: prédio no nível máximo não tem botão e mostra o selo; não construído explica o custo', () => {
  const state = newGame();
  const p = state.players[0];
  p.buildings.factory = MAX_LEVEL;
  const root = agencyStrip(state, p, actions);
  assert.ok(text(root).includes('nível máximo'));
  assert.ok(!buttons(root).some((b) => /Subir/.test(b.textContent)));
  assert.ok(text(root).includes(`Construa num terreno livre por ${upgradeCost(0)}`));
});

test('faixa: o socorro de emergência fica junto, só com pouca verba', () => {
  const state = newGame();
  const p = state.players[0];
  p.funds = 5;
  assert.ok(buttons(agencyStrip(state, p, actions)).some((b) => /Socorro de emergência/.test(b.textContent)));
  p.funds = 500;
  assert.ok(!buttons(agencyStrip(state, p, actions)).some((b) => /Socorro de emergência/.test(b.textContent)));
});

test('tabuleiro: a faixa fica depois da barra de ações e a aba "Sua agência" sumiu da lateral', () => {
  setGuide(false); // interface completa
  const state = newGame();
  state.players[0].rolled = true;
  const root = boardScreen(state, actions);
  // UX de 15/11: a faixa é irmã do tabuleiro, logo depois dele; as ações ficam numa barra fixa,
  // o último bloco da tela (sempre à vista no rodapé)
  let ordered = false;
  walk(root, (n) => {
    const names = n.children.map((c) => c.className || '');
    const board = names.findIndex((c) => /\bgameboard\b/.test(c));
    const strip = names.findIndex((c) => /\bagency-strip\b/.test(c));
    if (board !== -1 && strip !== -1) ordered = strip === board + 1;
  });
  assert.equal(ordered, true);
  const dock = root.children[root.children.length - 1];
  assert.match(dock.className, /\bturn-dock\b/);
  let bar = false;
  walk(dock, (n) => { if (/\baction-bar\b/.test(n.className)) bar = true; });
  assert.equal(bar, true, 'Oficina, Lançar e Passar a vez ficam na barra fixa');
  const summaries = [];
  walk(root, (n) => { if (n.tag === 'summary') summaries.push(n.textContent); });
  assert.ok(!summaries.some((t) => /Sua agência/.test(t)));
  setGuide(true);
});

// ---------------------------------------------------------------- HUD

test('HUD: verba, tecnologia e proteções em destaque, com a previsão do próximo ano', () => {
  setGuide(false);
  const state = newGame();
  const p = state.players[0];
  const root = hud(state, p, 'board', actions);
  const stats = textsOf(root, 'stat');
  assert.equal(stats.length, 3, 'verba, tecnologia e proteções sempre visíveis');
  assert.ok(stats.some((s) => s.includes('Verba') && s.includes(String(p.funds))));
  assert.ok(stats.some((s) => s.includes('Tecnologia')));
  assert.ok(stats.some((s) => s.includes('Proteções')));
  assert.ok(textsOf(root, 'stat-next').some((t) => /^\+\d+ em 3 rodadas$/.test(t)), 'previsão do próximo Ano novo');
  setGuide(true);
});

test('HUD: na interface enxuta a previsão só fica no balão e as proteções vazias somem', () => {
  setGuide(true);
  const state = newGame();
  const root = hud(state, state.players[0], 'board', actions);
  assert.deepEqual(textsOf(root, 'stat-next'), []);
  assert.equal(textsOf(root, 'stat').length, 2);
  const titles = [];
  walk(root, (n) => { if (/\bstat\b/.test(n.className)) titles.push(n.attrs.title); });
  assert.ok(titles.some((t) => /No próximo Ano novo entram \+\d+/.test(t)));
});
