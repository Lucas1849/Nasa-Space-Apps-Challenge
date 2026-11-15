// Tela inicial: apresentação, lados e escadas, e a escolha de COMO jogar (ver
// docs/PLANO-SALAS.md, Fase 2): sozinho contra o bot, no mesmo aparelho (hot-seat) ou
// online com link — o online cria a sala na hora e segue para o lobby de vagas.
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
  // Estado local da tela (nada disso entra no state do jogo antes do Começar)
  const players = [{ name: '' }, { name: '' }, { name: '' }, { name: '' }];
  let mode = 'solo';      // 'solo' | 'local' | 'online'
  let localCount = 2;     // agências no hot-seat
  let onlineCount = 2;    // vagas da sala online
  let sandbox = false;

  // Espaçonave de exemplo na capa (só visual)
  const demo = createPlayer(0, 'Demo', 'weather_watch');
  demo.spacecraft.parts = ['solar_large', 'antenna_dish', 'thruster', 'battery'];
  demo.spacecraft.instruments = ['camera', 'spectrometer', 'magnetometer'];
  demo.spacecraft.launcherId = 'medium';

  const sandboxToggle = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox' }), 'Modo sandbox: sem tabuleiro, verba e tecnologia livres, qualquer missão. Só para explorar os trade-offs.']);
  sandboxToggle.querySelector('input').addEventListener('change', (e) => { sandbox = e.target.checked; });

  // Orientações: liga/desliga as dicas de próximo passo durante a partida (salvo no navegador).
  const guideBox = el('label', { class: 'toggle' }, [el('input', { type: 'checkbox', checked: guideOn() ? 'checked' : null }), 'Mostrar orientações durante a partida: o que fazer a cada passo e o botão recomendado. Dá para mudar a qualquer momento no topo da tela.']);
  guideBox.querySelector('input').addEventListener('change', (e) => actions.setGuide(e.target.checked));

  const nameInput = (i) => {
    const input = el('input', { type: 'text', placeholder: `Nome da agência ${i + 1}`, maxlength: 20, value: players[i].name });
    input.addEventListener('input', (e) => { players[i].name = e.target.value; });
    return el('div', { class: 'player-row' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), input]);
  };

  const countButtons = (value, onPick) => el('div', { class: 'row count-btns' }, [2, 3, 4].map((n) => button(String(n), () => onPick(n), { class: n === value ? 'selected' : '' })));

  // Botão que se desabilita enquanto a promessa da ação roda (criar/entrar na sala).
  // Erros chegam por toast, tratados em main.js — a tela só chama actions.*.
  const busyButton = (label, busyLabel, run, attrs) => {
    const b = button(label, async () => {
      b.disabled = true;
      const original = b.innerHTML; // preserva o ícone do rótulo
      b.textContent = busyLabel;
      try { await run(); } finally { b.disabled = false; b.innerHTML = original; }
    }, attrs);
    return b;
  };

  // Área "Partida": re-renderizada quando o modo muda.
  const matchBox = el('div', { class: 'match-box' });
  const renderMatch = () => {
    matchBox.innerHTML = '';
    if (mode === 'solo') {
      matchBox.append(
        nameInput(0),
        el('p', { class: 'hint' }, 'Solo: o outro lado é um bot que cumpre cada degrau no ano em que ele aconteceu de verdade (com um ano de variação). Corra contra a história.'),
        sandboxToggle,
        el('div', { class: 'row' }, [button([icon('rocket', { size: 18 }), 'Começar a partida'], () => actions.startGame([{ name: players[0].name.trim() }], { sandbox }), { class: 'primary' })]),
      );
    } else if (mode === 'local') {
      matchBox.append(
        el('div', { class: 'row count-row' }, ['Agências:', countButtons(localCount, (n) => { localCount = n; renderMatch(); })]),
        ...Array.from({ length: localCount }, (_, i) => nameInput(i)),
        el('p', { class: 'hint' }, localCount === 2
          ? '2 agências no mesmo aparelho, revezando. Cada uma joga escondida: use espionagem e boatos.'
          : `${localCount} agências no mesmo aparelho, revezando. Lados sorteados de forma equilibrada; quem é do mesmo lado disputa os mesmos degraus.`),
        sandboxToggle,
        el('div', { class: 'row' }, [button([icon('rocket', { size: 18 }), 'Começar a partida'], () => actions.startGame(players.slice(0, localCount).map((p) => ({ name: p.name.trim() })), { sandbox }), { class: 'primary' })]),
      );
    } else {
      const joinInput = el('input', { type: 'text', placeholder: 'Código ou link da sala' });
      matchBox.append(
        el('div', { class: 'row count-row' }, ['Jogadores na sala:', countButtons(onlineCount, (n) => { onlineCount = n; renderMatch(); })]),
        el('p', { class: 'hint' }, 'Criar a sala gera um link curto na hora: mande para os outros e cada um ocupa a sua agência no lobby. Precisa de internet, e quem criou mantém a aba aberta durante a partida.'),
        el('div', { class: 'row' }, [busyButton([icon('wifi', { size: 18 }), 'Criar sala'], 'Criando sala...', () => actions.hostOnline(onlineCount), { class: 'primary' })]),
        el('div', { class: 'row join-row' }, [
          el('span', { class: 'hint' }, 'Recebeu um convite?'),
          joinInput,
          busyButton('Entrar na sala', 'Entrando...', () => actions.joinOnline(joinInput.value)),
        ]),
      );
    }
  };

  // Seletor de modo: três cartões, estilo dos passos da capa.
  const modeBox = el('div', { class: 'mode-grid' });
  const modes = [
    { id: 'solo', icon: 'helmet', title: 'Jogar sozinho', text: 'Você contra o calendário real da corrida espacial.' },
    { id: 'local', icon: 'die', title: 'No mesmo aparelho', text: '2–4 agências revezando o dispositivo (hot-seat).' },
    { id: 'online', icon: 'wifi', title: 'Online com link', text: 'Cada um no seu dispositivo, numa sala compartilhada.' },
  ];
  const renderModes = () => {
    modeBox.innerHTML = '';
    modes.forEach((m) => {
      const card = el('button', { class: `panel mode${mode === m.id ? ' selected' : ''}`, type: 'button' }, [
        el('strong', { class: 'with-icon' }, [icon(m.icon, { size: 18 }), m.title]),
        el('p', {}, m.text),
      ]);
      card.addEventListener('click', () => { mode = m.id; renderModes(); renderMatch(); });
      modeBox.appendChild(card);
    });
  };
  renderModes();
  renderMatch();

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
    modeBox,
    matchBox,
    guideBox,
    glossary(),
    el('p', { class: 'hint' }, 'Baseado no processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e na atividade Marsbound do JPL. Datas históricas: NASA History. Os números do jogo são fictícios, criados para o aprendizado.'),
  ]);
}
