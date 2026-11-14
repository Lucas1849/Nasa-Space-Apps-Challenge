// Tela inicial: número de jogadores, nomes e missão de cada um (hot-seat: todos no mesmo computador).
import { el, button } from './components.js';
import { MISSIONS } from '../data/missions.js';

export function setupScreen(state, actions) {
  let count = 1;
  const form = el('div', { class: 'setup-players' });

  const renderPlayers = () => {
    form.innerHTML = '';
    for (let i = 0; i < count; i++) {
      form.appendChild(el('div', { class: 'player-row' }, [
        el('input', { type: 'text', placeholder: `Jogador ${i + 1}`, 'data-name': i, maxlength: 20 }),
        el('select', { 'data-mission': i }, Object.values(MISSIONS).map((m) =>
          el('option', { value: m.id }, `${m.name} (${m.difficulty})`))),
      ]));
    }
  };
  renderPlayers();

  const counter = el('div', { class: 'row' }, [
    'Jogadores: ',
    ...[1, 2, 3, 4].map((n) => button(String(n), () => { count = n; renderPlayers(); })),
  ]);

  const start = button('Começar', () => {
    const setup = [];
    for (let i = 0; i < count; i++) {
      setup.push({
        name: form.querySelector(`[data-name="${i}"]`).value.trim(),
        missionId: form.querySelector(`[data-mission="${i}"]`).value,
      });
    }
    actions.startGame(setup);
  }, { class: 'primary' });

  return el('section', { class: 'screen setup' }, [
    el('h1', {}, 'Space Mission Design Game'),
    el('p', {}, 'Monte uma missão espacial com recursos limitados. Cada peça tem um custo: massa, energia, dinheiro e dados. Ganha quem cumprir a própria missão primeiro.'),
    el('h2', {}, 'Como funciona'),
    el('ol', {}, [
      el('li', {}, 'No tabuleiro, jogue o dado para conseguir verba.'),
      el('li', {}, 'Na oficina, compre peças e instrumentos e escolha lançador e órbita.'),
      el('li', {}, 'Quando o projeto estiver pronto, lance. O jogo explica por que deu certo ou errado.'),
    ]),
    counter,
    form,
    start,
  ]);
}
