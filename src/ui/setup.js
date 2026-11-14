// Tela inicial: apresentação, cartas de vitória, agências (hot-seat) e modo sandbox.
// A carta de cada agência é SORTEADA ao começar (se fosse escolhida, todos pegariam a mais fácil).
import { el, button, glossary } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { createPlayer } from '../sim/state.js';
import { OBJECTIVES } from '../data/objectives.js';
import { START_YEAR, END_YEAR } from '../data/history.js';

export function setupScreen(state, actions) {
  const players = [{ name: '' }];
  let sandbox = false;

  // Espaçonave de exemplo na capa (só visual)
  const demo = createPlayer(0, 'Demo', 'weather_watch');
  demo.spacecraft.parts = ['solar_large', 'antenna_dish', 'thruster', 'battery'];
  demo.spacecraft.instruments = ['camera', 'spectrometer', 'magnetometer'];
  demo.spacecraft.launcherId = 'medium';

  const playersBox = el('div', { class: 'players-box' });
  const renderPlayers = () => {
    playersBox.innerHTML = '';
    players.forEach((p, i) => {
      const input = el('input', { type: 'text', placeholder: `Nome da agência ${i + 1}`, maxlength: 20, value: p.name });
      input.addEventListener('input', (e) => { p.name = e.target.value; });
      playersBox.appendChild(el('div', { class: 'player-row' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), input]));
    });
  };
  renderPlayers();

  const setCount = (n) => {
    while (players.length < n) players.push({ name: '' });
    players.length = n;
    renderPlayers();
    countBox.querySelectorAll('button').forEach((b, i) => b.classList.toggle('selected', i + 1 === n));
  };
  const countBox = el('div', { class: 'row count-btns' }, ['Agências:', ...[1, 2, 3, 4].map((n) => button(String(n), () => setCount(n), { class: n === 1 ? 'selected' : '' }))]);

  const toggle = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox' }), '🧪 Modo sandbox: sem tabuleiro, verba e tecnologia livres. Só para explorar os trade-offs.']);
  toggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  return el('section', { class: 'screen setup' }, [
    el('div', { class: 'hero' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow' }, 'NASA Space Apps Challenge 2026 · Space Mission Design Game'),
        el('h1', {}, [el('span', {}, 'Projete uma missão espacial.'), ' Descubra por que ela deu certo ou errado.']),
        el('p', { class: 'lead' }, `Corrida espacial de ${START_YEAR} a ${END_YEAR}, com agências fictícias. Cada peça rende ciência, mas custa massa, energia, dinheiro e dados. Lançar agora é barato e arriscado; esperar deixa a nave melhor, mas os rivais avançam.`),
      ]),
      el('div', { class: 'spacecraft-box hero-art' }, [spacecraftSvg(demo), el('span', { class: 'caption' }, 'exemplo: satélite meteorológico')]),
    ]),
    el('h2', {}, 'Como funciona'),
    el('div', { class: 'steps-grid' }, [
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '01'), el('strong', {}, '🎲 Tabuleiro'), el('p', {}, 'Cada rodada é um ano. Receba o orçamento, jogue o dado, construa prédios e enfrente eventos de época.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '02'), el('strong', {}, '🔧 Oficina'), el('p', {}, 'Escolha a missão e monte a nave. Veja os limites e o risco do voo antes de lançar.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '03'), el('strong', {}, '🚀 Voo em etapas'), el('p', {}, 'Uma etapa por turno, com imprevistos vindos do tabuleiro. O relatório explica o resultado.')]),
    ]),
    el('h2', {}, 'Cartas de vitória'),
    el('p', { class: 'hint' }, 'Cada agência recebe uma carta sorteada, sem repetição. Todas disputam as mesmas missões, e todos veem as cartas de todos.'),
    el('div', { class: 'cards objective-cards' }, Object.values(OBJECTIVES).map((o) => el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('span', { class: 'icon' }, o.icon), el('strong', {}, o.name)]),
      el('p', { style: 'margin:0' }, o.goal),
      el('small', { class: 'hint' }, `${o.profile} Critério do desafio: ${o.criterion}.`),
    ]))),
    el('h2', {}, 'Partida'),
    countBox,
    playersBox,
    toggle,
    el('div', { class: 'row' }, [button('🚀 Começar', () => actions.startGame(players.map((p) => ({ name: p.name.trim() })), { sandbox }), { class: 'primary' })]),
    glossary(),
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e na atividade Marsbound do JPL. Datas históricas: NASA History. Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
