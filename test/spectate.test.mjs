// Tela de espectador do modo online (ui/spectate.js): fora da sua vez você vê o palco
// público do jogador da vez (dados, casas, a ação dele) e os SEUS painéis, mas não os
// dados sigilosos do rival (oficina, recursos). A sua oficina abre em modo leitura.
// Renderiza com um DOM mínimo (sem navegador) e confere o que aparece e o que fica travado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { discover } from '../src/sim/resources.js';

import { noActions, walk, textsOf } from './dom-stub.mjs';

const { createInitialState } = await import('../src/sim/state.js');
const { startGame, rollAndMove } = await import('../src/sim/actions.js');
const { spectateScreen } = await import('../src/ui/spectate.js');
const { workshopScreen } = await import('../src/ui/workshop.js');
const { setGuide } = await import('../src/ui/prefs.js');

// Partida de 2 agências (hot-seat serve para o teste: o estado é o mesmo que viaja pela rede).
function twoPlayerGame() {
  const s = createInitialState();
  startGame(s, [{ name: 'EUA' }, { name: 'URSS' }], { rng: () => 0.5 });
  return s;
}

function buttons(root) {
  const out = [];
  walk(root, (n) => { if (n.tag === 'button') out.push({ text: n.textContent.trim(), disabled: n.disabled }); });
  return out;
}
const allText = (root) => { let t = ''; walk(root, (n) => { if (n.tag === '#text') t += ` ${n.text}`; }); return t; };

test('espectador vê o palco do jogador da vez: quem joga e o botão da própria oficina', () => {
  setGuide(false);
  const state = twoPlayerGame(); // vez do jogador 0 (EUA); eu sou o jogador 1 (URSS)
  const me = state.players[1];
  const root = spectateScreen(state, me, noActions);
  const text = allText(root);
  assert.ok(text.includes('Vez de EUA'), 'mostra de quem é a vez');
  assert.ok(buttons(root).some((b) => b.text.includes('Minha oficina')), 'tem atalho para a minha oficina');
  // Nenhum botão de jogada do rival (rolar/passar a vez) na tela de espectador.
  assert.ok(!buttons(root).some((b) => b.text.includes('Rolar')), 'não dá para rolar os dados do rival');
  assert.ok(!buttons(root).some((b) => b.text.includes('Passar a vez')), 'não dá para passar a vez do rival');
});

test('espectador vê o resultado dos dados do jogador da vez', () => {
  setGuide(false);
  const state = twoPlayerGame();
  rollAndMove(state, () => 0.01); // o jogador 0 rola e anda
  const me = state.players[1];
  const text = allText(spectateScreen(state, me, noActions));
  assert.ok(/andou \d/.test(text), 'mostra quanto o jogador da vez andou');
});

test('os objetivos e o diário são MEUS, não os do jogador da vez', () => {
  setGuide(false);
  const state = twoPlayerGame();
  const me = state.players[1];
  me.missionId = 'first_satellite';
  const summaries = textsOf(spectateScreen(state, me, noActions), 'panel-head');
  // A escada do meu lado aparece como painel meu (sidePanel usa o lado do jogador passado).
  assert.ok(summaries.some((t) => t.includes('Escada')), 'minha escada aparece');
});

test('minha oficina em modo leitura não deixa comprar, vender nem lançar', () => {
  setGuide(false);
  const state = twoPlayerGame();
  const me = state.players[1];
  // Tech e verba altas desbloqueiam itens: sem a trava, os botões de compra ficariam ativos.
  me.tech = 99;
  me.funds = 9999;
  discover(me, ['camera', 'solar_small']); // sem blueprint a oficina nem lista a peça
  me.spacecraft.instruments.push('camera'); // algo para o botão "Vender" existir
  const root = workshopScreen(state, noActions, me, { readOnly: true });
  const bs = buttons(root);
  // Não há botão de Lançar nem de Ensaio na oficina de espectador.
  assert.ok(!bs.some((b) => b.text.includes('Lançar')), 'sem botão de lançar');
  assert.ok(!bs.some((b) => b.text.includes('Ensaio')), 'sem ensaio em solo');
  // Nenhum botão de comprar ou vender fica habilitado.
  assert.ok(bs.some((b) => b.text.includes('Comprar')), 'há peças para comprar (com tech/verba)');
  assert.ok(!bs.some((b) => b.text.includes('Comprar') && !b.disabled), 'nenhuma compra habilitada');
  assert.ok(!bs.some((b) => b.text.includes('Vender') && !b.disabled), 'nenhuma venda habilitada');
  // O aviso de que é só leitura aparece.
  assert.ok(allText(root).includes('vendo a sua oficina'), 'explica que é só leitura');
});

test('a oficina de espectador renderiza a MINHA agência, não a do jogador da vez', () => {
  setGuide(false);
  const state = twoPlayerGame();
  const me = state.players[1];
  // Dou verba só para mim: a oficina de espectador mostra os meus recursos no HUD.
  me.funds = 1234;
  const text = allText(workshopScreen(state, noActions, me, { readOnly: true }));
  assert.ok(text.includes('1234'), 'mostra a minha verba, não a do rival');
});
