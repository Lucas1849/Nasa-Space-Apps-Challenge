// Tela inicial: apresentação, missões em cards, jogadores (hot-seat) e modo sandbox.
import { el, button, glossary, MISSION_ICONS } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { MISSIONS } from '../data/missions.js';
import { createPlayer } from '../sim/state.js';

export function setupScreen(state, actions) {
  const missionIds = Object.keys(MISSIONS);
  const players = [{ name: '', missionId: missionIds[0] }];
  let sandbox = false;

  // Espaçonave de exemplo na capa (só visual)
  const demo = createPlayer(0, 'Demo', 'weather_watch');
  demo.spacecraft.parts = ['solar_large', 'antenna_dish', 'thruster', 'battery'];
  demo.spacecraft.instruments = ['camera', 'spectrometer', 'magnetometer'];
  demo.spacecraft.launcherId = 'medium';

  const playersBox = el('div');
  const renderPlayers = () => {
    playersBox.innerHTML = '';
    players.forEach((p, i) => {
      const input = el('input', { type: 'text', placeholder: `Jogador ${i + 1}`, maxlength: 20, value: p.name });
      input.addEventListener('input', (e) => { p.name = e.target.value; });
      const grid = el('div', { class: 'mission-grid' }, missionIds.map((id) => {
        const m = MISSIONS[id];
        return button([
          el('span', { class: 'icon' }, MISSION_ICONS[id] || '🚀'),
          el('strong', {}, m.name),
          el('span', { class: 'diff' }, m.difficulty),
          el('span', { class: 'goal' }, m.goal),
        ], () => { p.missionId = id; renderPlayers(); }, { class: `mission-card ${p.missionId === id ? 'selected' : ''}` });
      }));
      playersBox.appendChild(el('div', { class: 'panel', style: 'margin-bottom:12px' }, [
        el('div', { class: 'player-row' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), input]),
        el('div', { class: 'hint', style: 'margin:8px 0 10px' }, 'Escolha a missão deste jogador:'),
        grid,
      ]));
    });
  };
  renderPlayers();

  const setCount = (n) => {
    while (players.length < n) players.push({ name: '', missionId: missionIds[players.length % missionIds.length] });
    players.length = n;
    renderPlayers();
    countBox.querySelectorAll('button').forEach((b, i) => b.classList.toggle('selected', i + 1 === n));
  };
  const countBox = el('div', { class: 'row count-btns' }, ['Jogadores:', ...[1, 2, 3, 4].map((n) => button(String(n), () => setCount(n), { class: n === 1 ? 'selected' : '' }))]);

  const toggle = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox' }), '🧪 Modo sandbox: sem tabuleiro, verba livre. Só para explorar os trade-offs.']);
  toggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  return el('section', { class: 'screen setup' }, [
    el('div', { class: 'hero' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow' }, 'NASA Space Apps Challenge 2026 · Space Mission Design Game'),
        el('h1', {}, [el('span', {}, 'Projete uma missão espacial.'), ' Descubra por que ela deu certo ou errado.']),
        el('p', { class: 'lead' }, 'Cada peça rende ciência, mas custa massa, energia, dinheiro e dados. Não existe projeto perfeito, só o melhor equilíbrio para a sua missão.'),
      ]),
      el('div', { class: 'spacecraft-box hero-art' }, [spacecraftSvg(demo), el('span', { class: 'caption' }, 'exemplo: satélite meteorológico')]),
    ]),
    el('h2', {}, 'Como funciona'),
    el('div', { class: 'steps-grid' }, [
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '01'), el('strong', {}, '🎲 Tabuleiro'), el('p', {}, 'Jogue o dado para conseguir verba e enfrentar eventos.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '02'), el('strong', {}, '🔧 Oficina'), el('p', {}, 'Compre instrumentos e peças, escolha foguete e órbita. Veja a nave tomar forma.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '03'), el('strong', {}, '🚀 Lançamento'), el('p', {}, 'Em voo, um imprevisto exige decisão. O relatório explica o resultado.')]),
    ]),
    el('h2', {}, 'Partida'),
    countBox,
    playersBox,
    toggle,
    el('div', { class: 'row' }, [button('🚀 Começar', () => actions.startGame(players.map((p) => ({ name: p.name.trim(), missionId: p.missionId })), { sandbox }), { class: 'primary' })]),
    glossary(),
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e na atividade Marsbound do JPL. Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
