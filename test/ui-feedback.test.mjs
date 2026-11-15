// Retorno imediato na tela do tabuleiro (cartão de resultado) e passar a vez sem confirmação.
import test from 'node:test';
import assert from 'node:assert/strict';
import { noActions as actions, textsOf } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const { startGame, rollAndMove, chooseDilemma, endTurn } = await import('../src/sim/actions.js');
const { boardScreen } = await import('../src/ui/board.js');
const summary = await import('../src/ui/summary.js');

const die = (steps) => () => (steps - 1) / 6 + 0.01;
const twoPlayers = () => { const s = createInitialState(); startGame(s, [{ name: 'A' }, { name: 'B' }], { rng: () => 0 }); return s; };
const outcomeText = (state) => textsOf(boardScreen(state, actions), 'outcome')[0] ?? null;

test('depois de escolher no dilema, a tela mostra o que mudou e a lição', () => {
  const state = twoPlayers();
  state.pendingDilemma = { id: 'congress' };
  assert.equal(outcomeText(state), null); // com a carta aberta ainda não há resultado
  chooseDilemma(state, 0);
  const text = outcomeText(state);
  assert.ok(text, 'cartão de resultado na tela');
  assert.match(text, /O Congresso quer resultados/);
  assert.match(text, /Você escolheu: Cortar o laboratório/);
  assert.match(text, /Verba \+20/);
  assert.match(text, /Tecnologia -1/);
  assert.match(text, /Cortar pesquisa/);
});

test('parar numa casa mostra o que ela deu', () => {
  const state = twoPlayers();
  rollAndMove(state, die(3));
  assert.match(outcomeText(state), /Discurso: o espaço vira prioridade/);
});

test('o resultado é de quem jogou: o outro jogador não o vê', () => {
  const state = twoPlayers();
  rollAndMove(state, die(3));
  assert.ok(outcomeText(state));
  state.turn = 1; // a tela é desenhada para o jogador da vez
  assert.equal(outcomeText(state), null);
});

test('passar a vez não tem janela de confirmação: o resumo do turno foi removido', () => {
  assert.equal(summary.turnSummaryModal, undefined);
  const state = twoPlayers();
  rollAndMove(state, die(2));
  assert.equal(endTurn(state), null);
  assert.equal(state.turn, 1);
});
