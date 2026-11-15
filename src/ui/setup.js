// Tela inicial: apresentação, lados e escadas, agências (hot-seat) e modo sandbox.
// Os lados são SORTEADOS ao começar, de forma equilibrada (IDEIA.md v3 seção 9).
import { el, button, glossary, missionIcon } from './components.js';
import { icon } from './icons.js';
import { guideOn } from './prefs.js';
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
      ? 'Solo: o outro lado é um bot que cumpre cada degrau no ano em que ele aconteceu de verdade (com um ano de variação). Corra contra a história.'
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

  const toggle = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox' }), 'Modo sandbox: sem tabuleiro, verba e tecnologia livres, qualquer missão. Só para explorar os trade-offs.']);

  // Orientações: liga/desliga as dicas de próximo passo durante a partida (salvo no navegador).
  const guideBox = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox', checked: guideOn() ? 'checked' : null }), 'Mostrar orientações durante a partida: o que fazer a cada passo e o botão recomendado. Dá para mudar a qualquer momento no topo da tela.']);
  guideBox.querySelector('input').addEventListener('change', (e) => actions.setGuide(e.target.checked));
  toggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  // Sala online (experimental, ver docs/PLANO-P2P.md): cada jogador no seu dispositivo,
  // conectados direto por WebRTC. Quem cria a sala vira o host (guarda o jogo oficial);
  // quem entra pelo link recebe o estado do host e passa a jogar à distância.
  const onlineStatus = el('p', { class: 'hint' });
  const joinInput = el('input', { type: 'text', placeholder: 'Cole o link ou o código da sala' });
  const onlinePanel = el('div', { class: 'panel online-room' }, [
    el('strong', { class: 'with-icon' }, [icon('wifi', { size: 18 }), 'Jogar à distância (experimental)']),
    el('p', { class: 'hint' }, 'Um jogador cria a sala e manda o link para os outros. Precisa de internet; quem criou tem que deixar a aba aberta durante a partida.'),
    el('div', { class: 'row' }, [
      button('Criar sala', async () => {
        onlineStatus.textContent = 'Criando sala...';
        try {
          const id = await actions.hostOnline();
          const link = `${location.origin}${location.pathname}?sala=${id}`;
          onlineStatus.innerHTML = '';
          onlineStatus.append('Link da sala: ', el('code', {}, link));
        } catch (err) {
          onlineStatus.textContent = err.message || 'Não foi possível criar a sala.';
        }
      }),
      joinInput,
      button('Entrar na sala', async () => {
        const raw = joinInput.value.trim();
        if (!raw) return;
        const id = raw.includes('sala=') ? new URL(raw, location.href).searchParams.get('sala') : raw;
        onlineStatus.textContent = 'Conectando...';
        try {
          await actions.joinOnline(id);
          onlineStatus.textContent = 'Conectado! Aguardando o estado do host...';
        } catch (err) {
          onlineStatus.textContent = err.message || 'Não foi possível entrar na sala.';
        }
      }),
    ]),
    onlineStatus,
  ]);

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
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '01'), el('strong', { class: 'with-icon' }, [icon('die', { size: 18 }), 'Tabuleiro']), el('p', {}, `Role 2 dados e escolha um. Cartas de dilema, prédios, espionagem. A cada ${ROUNDS_PER_YEAR} rodadas, um ano novo traz verba e tecnologia.`)]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '02'), el('strong', { class: 'with-icon' }, [icon('wrench', { size: 18 }), 'Oficina']), el('p', {}, 'Monte a nave do próximo degrau. Veja os limites e o risco do voo antes de lançar.')]),
      el('div', { class: 'panel step' }, [el('span', { class: 'n' }, '03'), el('strong', { class: 'with-icon' }, [icon('rocket', { size: 18 }), 'Voo em etapas']), el('p', {}, 'Uma etapa por turno, com imprevistos. Se falhar no meio, ainda sobra uma missão de consolação.')]),
    ]),
    el('h2', {}, 'Lados e escadas de missões'),
    el('p', { class: 'hint' }, 'Vence quem completar primeiro a escada do próprio lado. Cada degrau é uma nave nova. As agências são suas; o lado define a escada, uma vantagem e uma fraqueza.'),
    el('div', { class: 'cards sides' }, Object.values(SIDES).map((s) => el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('span', { class: 'icon' }, icon(s.icon, { size: 22 })), el('strong', {}, s.name), el('small', { class: 'hint' }, s.focus)]),
      el('ol', { class: 'ladder compact' }, s.ladder.map((m) => el('li', { class: 'with-icon' }, [missionIcon(m, { size: 16 }), MISSIONS[m].name]))),
      el('small', { class: 'gain-text' }, `+ ${s.advantage}`),
      el('small', { class: 'lose-text' }, `− ${s.weakness}`),
    ]))),
    el('h2', {}, 'Partida'),
    countBox,
    playersBox,
    soloNote,
    toggle,
    guideBox,
    onlinePanel,
    el('div', { class: 'row' }, [button([icon('rocket', { size: 18 }), 'Começar a partida'], () => actions.startGame(players.map((p) => ({ name: p.name.trim() })), { sandbox }), { class: 'primary' })]),
    glossary(),
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e na atividade Marsbound do JPL. Datas históricas: NASA History. Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
