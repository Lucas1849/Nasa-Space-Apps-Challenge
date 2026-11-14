// Tela inicial: apresentação, lados e escadas, agências (hot-seat) e modo sandbox.
// Os lados são SORTEADOS ao começar, de forma equilibrada (IDEIA-v3 seção 9).
import { el, button, glossary, MISSION_ICONS } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { createPlayer } from '../sim/state.js';
import { SIDES } from '../data/sides.js';
import { MISSIONS } from '../data/missions.js';
import { START_YEAR, END_YEAR, ROUNDS_PER_YEAR } from '../data/history.js';

export function setupScreen(state, actions) {
  const players = [{ name: '' }];
  let sandbox = false;

  // Espaçonave de exemplo na capa (só visual)
  const demo = createPlayer(0, 'Demo', 'weather_watch');
  demo.spacecraft.parts = ['solar_large', 'antenna_dish', 'thruster', 'battery'];
  demo.spacecraft.instruments = ['camera', 'spectrometer', 'magnetometer'];
  demo.spacecraft.launcherId = 'medium';

  const playersBox = el('div', { class: 'players-box' });
  const soloNote = el('p', { class: 'hint' });
  const renderPlayers = () => {
    playersBox.innerHTML = '';
    players.forEach((p, i) => {
      const input = el('input', { type: 'text', placeholder: `Nome da agência ${i + 1}`, maxlength: 20, value: p.name });
      input.addEventListener('input', (e) => { p.name = e.target.value; });
      playersBox.appendChild(el('div', { class: 'player-row' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), input]));
    });
    soloNote.textContent = players.length === 1
      ? '🤖 Solo: o outro lado é um bot que cumpre cada degrau no ano em que ele aconteceu de verdade (com um ano de variação). Corra contra a história.'
      : players.length === 2
        ? '2 agências: lados diferentes, sorteados. Cada uma joga escondida: use espionagem e boatos.'
        : `${players.length} agências: lados sorteados de forma equilibrada. Quem é do mesmo lado disputa os mesmos degraus.`;
  };
  renderPlayers();

  const setCount = (n) => {
    while (players.length < n) players.push({ name: '' });
    players.length = n;
    renderPlayers();
    countBox.querySelectorAll('button').forEach((b, i) => b.classList.toggle('selected', i + 1 === n));
  };
  const countBox = el('div', { class: 'row count-btns' }, ['Agências:', ...[1, 2, 3, 4].map((n) => button(String(n), () => setCount(n), { class: n === 1 ? 'selected' : '' }))]);

  const toggle = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox' }), '🧪 Modo sandbox: sem tabuleiro, verba e tecnologia livres, qualquer missão. Só para explorar os trade-offs.']);
  toggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  return el('section', { class: 'screen setup' }, [
    el('div', { class: 'hero' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow' }, 'NASA Space Apps Challenge 2026 · Space Mission Design Game'),
        el('h1', {}, [el('span', {}, 'Projete uma missão espacial.'), ' Descubra por que ela deu certo ou errado.']),
        el('p', { class: 'lead' }, `Corrida espacial de ${START_YEAR} a ${END_YEAR}. Cada peça rende ciência, mas custa massa, energia, dinheiro e dados. Lançar agora é barato e arriscado; esperar deixa a nave melhor, mas você não sabe onde o rival está.`),
      ]),
      el('div', { class: 'spacecraft-box hero-art' }, [spacecraftSvg(demo), el('span', { class: 'caption' }, 'exemplo: satélite meteorológico')]),
    ]),
    el('h2', {}, 'Como funciona'),
    el('div', { class: 'steps-grid' }, [
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '01'), el('strong', {}, '🎲 Tabuleiro'), el('p', {}, `Role 2 dados e escolha um. Cartas de dilema, prédios, espionagem. A cada ${ROUNDS_PER_YEAR} rodadas, um ano novo traz verba e tecnologia.`)]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '02'), el('strong', {}, '🔧 Oficina'), el('p', {}, 'Monte a nave do próximo degrau. Veja os limites e o risco do voo antes de lançar.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '03'), el('strong', {}, '🚀 Voo em etapas'), el('p', {}, 'Uma etapa por turno, com imprevistos. Se falhar no meio, ainda sobra uma missão de consolação.')]),
    ]),
    el('h2', {}, 'Lados e escadas de missões'),
    el('p', { class: 'hint' }, 'Vence quem completar primeiro a escada do próprio lado. Cada degrau é uma nave nova. As agências são suas; o lado define a escada, uma vantagem e uma fraqueza.'),
    el('div', { class: 'cards sides' }, Object.values(SIDES).map((s) => el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('span', { class: 'icon' }, s.icon), el('strong', {}, s.name), el('small', { class: 'hint' }, s.focus)]),
      el('ol', { class: 'ladder compact' }, s.ladder.map((m) => el('li', {}, `${MISSION_ICONS[m] || '🚀'} ${MISSIONS[m].name}`))),
      el('small', { class: 'gain-text' }, `+ ${s.advantage}`),
      el('small', { class: 'lose-text' }, `− ${s.weakness}`),
    ]))),
    el('h2', {}, 'Partida'),
    countBox,
    playersBox,
    soloNote,
    toggle,
    el('div', { class: 'row' }, [button('🚀 Começar', () => actions.startGame(players.map((p) => ({ name: p.name.trim() })), { sandbox }), { class: 'primary' })]),
    glossary(),
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e na atividade Marsbound do JPL. Datas históricas: NASA History. Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
