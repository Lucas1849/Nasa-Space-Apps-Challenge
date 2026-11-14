// Tela inicial: número de jogadores, nomes e missão de cada um (hot-seat: todos no mesmo computador).
import { el, button, glossary } from './components.js';
import { MISSIONS } from '../data/missions.js';

export function setupScreen(state, actions) {
  let count = 1;
  let sandbox = false;
  const form = el('div', { class: 'setup-players' });

  const renderPlayers = () => {
    form.innerHTML = '';
    for (let i = 0; i < count; i++) {
      form.appendChild(el('div', { class: 'player-row' }, [
        el('input', { type: 'text', placeholder: `Jogador ${i + 1}`, 'data-name': i, maxlength: 20 }),
        el('select', { 'data-mission': i }, Object.values(MISSIONS).map((m) =>
          el('option', { value: m.id, title: m.goal }, `${m.name} (${m.difficulty})`))),
      ]));
    }
  };
  renderPlayers();

  const counter = el('div', { class: 'row' }, [
    'Jogadores: ',
    ...[1, 2, 3, 4].map((n) => button(String(n), () => { count = n; renderPlayers(); })),
  ]);

  const sandboxToggle = el('label', { class: 'toggle' }, [
    el('input', { type: 'checkbox' }),
    ' Modo sandbox (sem tabuleiro, verba livre: só para explorar os trade-offs)',
  ]);
  sandboxToggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  const start = button('Começar', () => {
    const setup = [];
    for (let i = 0; i < count; i++) {
      setup.push({
        name: form.querySelector(`[data-name="${i}"]`).value.trim(),
        missionId: form.querySelector(`[data-mission="${i}"]`).value,
      });
    }
    actions.startGame(setup, { sandbox });
  }, { class: 'primary' });

  const missionList = el('ul', { class: 'mission-list' }, Object.values(MISSIONS).map((m) =>
    el('li', {}, [el('strong', {}, m.name), ` (${m.difficulty}): ${m.goal}`])));

  return el('section', { class: 'screen setup' }, [
    el('h1', {}, 'Space Mission Design Game'),
    el('p', {}, 'Monte uma missão espacial com recursos limitados. Cada peça tem um custo: massa, energia, dinheiro e dados. Ganha quem cumprir a própria missão primeiro.'),
    el('h2', {}, 'Como funciona'),
    el('ol', {}, [
      el('li', {}, 'No tabuleiro, jogue o dado para conseguir verba.'),
      el('li', {}, 'Na oficina, compre peças e instrumentos e escolha lançador e órbita. Veja a espaçonave tomar forma.'),
      el('li', {}, 'Lance. Em voo, um imprevisto vai exigir uma decisão. Depois, o relatório explica por que deu certo ou errado.'),
    ]),
    el('h2', {}, 'Missões'),
    missionList,
    glossary(),
    el('h2', {}, 'Partida'),
    counter,
    form,
    sandboxToggle,
    start,
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement). Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
