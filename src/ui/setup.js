// Tela inicial em 3 passos limpos e centralizados (sem rolagem e sem poluição visual):
// 1. Capa minimalista: apenas título centralizado, animação 3D em ASCII e o convite para começar.
// 2. Menu principal: Nova partida, Como funciona, Configurações e Créditos.
// 3. Cartão centralizado de Nova Partida (estilo .grupo da Íris), com botão discreto "Como funciona" caso
//    queira ler as regras. O cartão escolhe COMO jogar (docs/PLANO-SALAS.md, Fase 2): sozinho contra o bot,
//    no mesmo aparelho (hot-seat) ou online com link; o online cria a sala na hora e segue para o lobby.
// Os lados são SORTEADOS ao começar, de forma equilibrada (IDEIA.md v3 seção 9).
import { el, button, themeToggle, langToggle, openRulesModal } from './components.js';
import { icon } from './icons.js';
import { guideOn, themeOf, toggleTheme } from './prefs.js';
import { getLang, setLang } from '../i18n/index.js';
import { createAsciiCanvas } from './art.js';
import { START_YEAR, END_YEAR } from '../data/history.js';


// Céu estrelado em tela cheia para o fundo da capa ("Click any button to start")
function createSplashStarfield() {
  const sky = document.createElement('canvas');
  sky.className = 'splash-starfield';
  sky.setAttribute('aria-hidden', 'true');
  if (typeof sky.getContext !== 'function' || typeof window === 'undefined') {
    return sky;
  }

  const stars = Array.from({ length: 190 }, (_, i) => ({
    u: ((i * 73 + 19) % 997) / 997,
    v: ((i * 151 + 43) % 991) / 991,
    size: i % 13 === 0 ? 3.2 : i % 4 === 0 ? 2.2 : 1.5,
    kind: i % 13 === 0 ? 'cross' : i % 29 === 0 ? 'diamond' : 'dot',
    speed: 0.6 + (i % 7) * 0.28,
    phase: i * 0.85,
    driftX: ((i % 5) - 2) * 0.0018,
    driftY: ((i % 3) - 1) * 0.0012,
  }));

  // Constelações discretas nas laterais da página
  const constellations = [
    [[0.08, 0.18], [0.14, 0.14], [0.21, 0.19], [0.18, 0.29]],
    [[0.82, 0.16], [0.89, 0.12], [0.93, 0.22], [0.86, 0.28]],
    [[0.09, 0.72], [0.16, 0.66], [0.23, 0.74], [0.15, 0.83]],
    [[0.79, 0.74], [0.87, 0.68], [0.92, 0.79], [0.84, 0.86]],
  ];

  let raf = 0;
  const t0 = performance.now();

  const render = (now) => {
    if (sky.isConnected === false && now - t0 > 600) {
      cancelAnimationFrame(raf);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    if (sky.width !== Math.floor(w * dpr) || sky.height !== Math.floor(h * dpr)) {
      sky.width = Math.floor(w * dpr);
      sky.height = Math.floor(h * dpr);
    }
    const ctx = sky.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const isDark = document.documentElement?.getAttribute('data-tema') === 'escuro';
    const rgb = isDark ? '242, 240, 235' : '22, 23, 26';
    const t = (now - t0) * 0.001;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Linhas tênues de constelações nas bordas da tela
    ctx.strokeStyle = `rgba(${rgb}, ${isDark ? 0.11 : 0.08})`;
    ctx.lineWidth = 1;
    for (const poly of constellations) {
      ctx.beginPath();
      poly.forEach(([pu, pv], idx) => {
        const px = pu * w + Math.sin(t * 0.25 + idx) * 3;
        const py = pv * h + Math.cos(t * 0.25 + idx) * 3;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      for (const [pu, pv] of poly) {
        const px = pu * w;
        const py = pv * h;
        ctx.fillStyle = `rgba(${rgb}, ${isDark ? 0.55 : 0.42})`;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }

    // Estrelas cintilantes espalhadas por toda a página
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      const u = (s.u + t * s.driftX + 10) % 1;
      const v = (s.v + t * s.driftY + 10) % 1;
      const x = u * w;
      const y = v * h;

      // Suaviza no miolo central para não competir com o globo 3D
      const distCenter = Math.hypot(x - cx, y - cy);
      const centerMask = Math.min(1, Math.max(0.18, (distCenter - 110) / 180));
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      const alpha = twinkle * centerMask * (isDark ? 0.78 : 0.52);

      ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      if (s.kind === 'cross') {
        const arm = s.size + (twinkle > 0.75 ? 2.2 : 1);
        ctx.fillRect(x - arm, y - 0.6, arm * 2, 1.2);
        ctx.fillRect(x - 0.6, y - arm, 1.2, arm * 2);
        ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      } else if (s.kind === 'diamond') {
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        ctx.fillRect(x - 3, y - 0.5, 6, 1);
        ctx.fillRect(x - 0.5, y - 3, 1, 6);
      } else {
        ctx.fillRect(x - s.size * 0.5, y - s.size * 0.5, s.size, s.size);
      }
    }

    // Estrela cadente / satélite cruzando o céu suavemente a cada ciclo
    const meteorCycle = (t * 0.22) % 1;
    if (meteorCycle < 0.28) {
      const p = meteorCycle / 0.28;
      const mx = w * (0.12 + p * 0.26);
      const my = h * (0.14 + p * 0.16);
      const tailX = mx - 42;
      const tailY = my - 24;
      const grad = ctx.createLinearGradient(tailX, tailY, mx, my);
      grad.addColorStop(0, `rgba(${rgb}, 0)`);
      grad.addColorStop(1, `rgba(${rgb}, ${(Math.sin(p * Math.PI) * (isDark ? 0.65 : 0.45)).toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.fillStyle = `rgba(${rgb}, ${(Math.sin(p * Math.PI) * 0.85).toFixed(3)})`;
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }

    raf = requestAnimationFrame(render);
  };

  raf = requestAnimationFrame(render);
  return sky;
}

function buildSplashView(onEnter) {
  const starfield = createSplashStarfield();
  const { canvas } = createAsciiCanvas({
    scene: 'olho',
    cycle: true,
    width: 440,
    height: 360,
    cell: 5,
  });

  let entered = false;
  const triggerEnter = () => {
    if (entered) return;
    entered = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKey);
    }
    onEnter();
  };

  const onKey = (ev) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(ev.key)) return;
    if (!splashRoot.isConnected) {
      window.removeEventListener('keydown', onKey);
      return;
    }
    ev.preventDefault();
    triggerEnter();
  };

  if (typeof window !== 'undefined') {
    setTimeout(() => window.addEventListener('keydown', onKey), 60);
  }

  const splashRoot = el('section', {
    class: 'screen splash-screen enter',
    onclick: triggerEnter,
    role: 'button',
    tabindex: '0',
    'aria-label': 'Clique ou aperte qualquer tecla para começar',
  }, [
    starfield,
    el('h1', { class: 'splash-only-title' }, 'Apogeu'),
    el('div', { class: 'splash-only-art' }, [canvas]),
    el('p', { class: 'splash-only-prompt' }, 'Clique ou aperte qualquer tecla para começar'),
  ]);

  return splashRoot;
}

// Estado local do cartão de Nova Partida (nada disso entra no state do jogo antes do Começar).
// Fica no módulo para sobreviver ao Voltar da capa e à saída do lobby (main.js volta para 'setup').
const draft = {
  mode: 'solo',      // 'solo' | 'local' | 'online' (docs/PLANO-SALAS.md, Fase 2)
  localCount: 2,     // agências no hot-seat
  onlineCount: 2,    // vagas da sala online
  sandbox: false,
  names: ['', '', '', ''],
  joinCode: '',
};

const MODES = [
  { id: 'solo', icon: 'helmet', label: 'Solo', desc: 'Contra o calendário real' },
  { id: 'local', icon: 'die', label: 'Mesmo aparelho', desc: '2 a 4 agências revezando' },
  { id: 'online', icon: 'wifi', label: 'Online', desc: 'Cada um no seu, com link' },
];

// Cartões de opção (ícone, nome e uma linha do que é): escolha que precisa de explicação, não só um rótulo.
function optionCards(label, options, value, onPick) {
  return el('div', { class: 'option-cards', role: 'group', 'aria-label': label, style: `--cols:${options.length}` }, options.map((o) => el('button', {
    type: 'button', class: 'option-card', 'aria-pressed': String(o.value === value), onclick: () => onPick(o.value),
  }, [icon(o.icon, { size: 18 }), el('strong', {}, o.label), el('small', {}, o.desc)])));
}

// Botão que se desabilita enquanto a promessa da ação roda (criar/entrar na sala).
// Erros chegam por toast, tratados em main.js; a tela só chama actions.*.
function busyButton(label, busyLabel, run, attrs) {
  const b = button(label, async () => {
    b.disabled = true;
    const original = b.innerHTML; // preserva o ícone do rótulo
    b.textContent = busyLabel;
    try { await run(); } finally { b.disabled = false; b.innerHTML = original; }
  }, attrs);
  return b;
}

// Controle segmentado da Íris: um botão por opção, o escolhido com aria-pressed.
function segmented(label, options, value, onPick) {
  return el('div', { class: 'setup-seg', role: 'group', 'aria-label': label }, options.map((o) => el('button', {
    type: 'button',
    'aria-pressed': String(o.value === value),
    onclick: () => onPick(o.value),
  }, o.icon ? [icon(o.icon, { size: 14 }), o.label] : o.label)));
}

const rowLabel = (title, sub) => el('div', { class: 'setup-row-label' }, [
  el('strong', {}, title),
  sub ? el('small', { class: 'setup-row-sub' }, sub) : null,
]);

function modeNoteText() {
  if (draft.mode === 'online') return 'Cada agência no seu dispositivo, numa sala com link.';
  if (draft.sandbox) return 'Sem tabuleiro, com verba e tecnologia livres para testar projetos.';
  if (draft.mode === 'solo') return 'Você contra um bot que cumpre cada degrau no ano real (com um ano de variação).';
  return draft.localCount === 2
    ? '2 agências no mesmo aparelho, revezando. Cada uma joga escondida: use espionagem e boatos.'
    : `${draft.localCount} agências no mesmo aparelho, revezando. Quem é do mesmo lado disputa os mesmos degraus.`;
}

function renderConfigView(actions, backToSplash) {
  const body = el('div', { class: 'setup-sheet-body' });

  const playerInputs = (count) => el('div', { class: 'setup-players-list' }, Array.from({ length: count }, (_, i) => {
    const input = el('input', {
      type: 'text',
      placeholder: count === 1 ? 'Nome da sua agência (ex.: NASA, Roscosmos)' : `Agência ${i + 1}`,
      maxlength: 20,
      value: draft.names[i],
      'aria-label': count === 1 ? 'Nome da sua agência' : `Nome da agência ${i + 1}`,
    });
    input.addEventListener('input', (e) => { draft.names[i] = e.target.value; });
    return el('div', { class: 'setup-player-item' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), input]);
  }));

  const guideSwitch = () => {
    const sw = el('button', {
      type: 'button',
      class: 'setup-switch',
      role: 'switch',
      'aria-checked': String(guideOn()),
      'aria-label': 'Dicas passo a passo',
      onclick: () => {
        const on = !guideOn();
        actions.setGuide(on);
        sw.setAttribute('aria-checked', String(on));
      },
    });
    return sw;
  };

  const start = () => {
    const count = draft.mode === 'solo' ? 1 : draft.localCount;
    actions.startGame(draft.names.slice(0, count).map((name) => ({ name: name.trim() })), { sandbox: draft.sandbox });
  };

  const render = () => {
    const rows = [
      el('div', { class: 'setup-row setup-row-stack' }, [
        rowLabel('Como jogar'),
        optionCards('Como jogar', MODES.map((m) => ({ value: m.id, label: m.label, icon: m.icon, desc: m.desc })), draft.mode, (v) => { draft.mode = v; render(); }),
      ]),
    ];

    if (draft.mode === 'online') {
      rows.push(
        el('div', { class: 'setup-row' }, [
          rowLabel('Jogadores na sala', 'Uma vaga por agência'),
          segmented('Jogadores na sala', [2, 3, 4].map((n) => ({ value: n, label: String(n) })), draft.onlineCount, (v) => { draft.onlineCount = v; render(); }),
        ]),
        el('div', { class: 'setup-row setup-note' }, [
          icon('wifi', { size: 15 }),
          el('small', {}, 'Criar a sala gera um link curto na hora: mande para os outros e cada um ocupa a sua agência no lobby. Precisa de internet, e quem criou mantém a aba aberta durante a partida.'),
        ]),
      );
    } else {
      rows.push(el('div', { class: 'setup-row setup-row-stack' }, [
        rowLabel('Modo'),
        optionCards('Modo de jogo', [
          { value: false, icon: 'flag', label: `Corrida ${START_YEAR}–${String(END_YEAR).slice(2)}`, desc: 'Tabuleiro, rivais e calendário' },
          { value: true, icon: 'flask', label: 'Sandbox', desc: 'Oficina livre, sem tabuleiro' },
        ], draft.sandbox, (v) => { draft.sandbox = v; render(); }),
      ]));
      if (draft.mode === 'local') {
        rows.push(el('div', { class: 'setup-row' }, [
          rowLabel('Agências', 'Revezando o mesmo dispositivo'),
          segmented('Número de agências', [2, 3, 4].map((n) => ({ value: n, label: String(n) })), draft.localCount, (v) => { draft.localCount = v; render(); }),
        ]));
      }
      const count = draft.mode === 'solo' ? 1 : draft.localCount;
      rows.push(el('div', { class: 'setup-row setup-row-stack' }, [
        rowLabel(count > 1 ? 'Nomes das agências' : 'Sua agência'),
        playerInputs(count),
      ]));
    }

    rows.push(el('div', { class: 'setup-row' }, [
      rowLabel('Dicas passo a passo', 'Mostra o que fazer em cada turno'),
      guideSwitch(),
    ]));

    const footer = draft.mode === 'online'
      ? [
        busyButton([icon('wifi', { size: 18 }), 'Criar sala'], 'Criando sala...', () => actions.hostOnline(draft.onlineCount), { class: 'primary setup-submit' }),
        joinBox(),
      ]
      : [button([icon('rocket', { size: 18 }), 'Começar a partida'], start, { class: 'primary setup-submit' })];

    body.replaceChildren(
      el('div', { class: 'setup-sheet-head' }, [
        el('span', { class: 'eyebrow' }, `${START_YEAR} — ${END_YEAR}`),
        el('h1', { class: 'setup-sheet-title' }, draft.mode === 'online' ? 'Sala online' : 'Nova partida'),
        el('small', { class: 'setup-row-sub' }, modeNoteText()),
      ]),
      el('div', { class: 'setup-group' }, rows),
      ...footer,
    );
  };

  // "Recebeu um convite?": código de 6 letras ou o link inteiro (net/roomCode.js entende os dois).
  const joinBox = () => {
    const input = el('input', { type: 'text', placeholder: 'Código ou link da sala', value: draft.joinCode, 'aria-label': 'Código ou link da sala' });
    input.addEventListener('input', (e) => { draft.joinCode = e.target.value; });
    const join = busyButton('Entrar na sala', 'Entrando...', () => actions.joinOnline(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join.click(); });
    return el('div', { class: 'setup-join' }, [
      el('span', { class: 'setup-join-label' }, 'Recebeu um convite?'),
      el('div', { class: 'setup-join-row' }, [input, join]),
    ]);
  };

  render();

  return el('section', { class: 'screen setup-clean enter' }, [
    el('header', { class: 'setup-clean-bar' }, [
      button([icon('arrowLeft', { size: 15 }), 'Menu'], backToSplash, { class: 'small ghost' }),
      el('div', { class: 'row', style: 'margin:0;gap:8px' }, [
        button([icon('bulb', { size: 15 }), 'Como funciona'], openRulesModal, { class: 'small ghost' }),
        langToggle(actions),
        themeToggle(),
      ]),
    ]),
    el('div', { class: 'setup-clean-center' }, [
      el('div', { class: 'setup-sheet' }, [body]),
    ]),
  ]);
}

// Menu principal (entre a capa e a Nova Partida), como nos jogos: jogar, regras, configurações, créditos.
function renderMainMenu(actions, go) {
  // Lista secundária: ícone, nome e uma seta que aparece no foco/hover (o que é clicável fica evidente).
  const item = (iconName, label, run) => el('button', { type: 'button', class: 'main-menu-item', onclick: run }, [
    icon(iconName, { size: 18 }),
    el('span', { class: 'mm-label' }, label),
    el('span', { class: 'mm-chev', 'aria-hidden': 'true' }, icon('arrowRight', { size: 16 })),
  ]);
  return el('section', { class: 'screen main-menu enter' }, [
    createSplashStarfield(),
    el('header', { class: 'setup-clean-bar main-menu-bar' }, [
      button([icon('arrowLeft', { size: 15 }), 'Voltar à capa'], () => go('splash'), { class: 'small ghost' }),
      el('div', { class: 'row', style: 'margin:0;gap:8px' }, [langToggle(actions), themeToggle()]),
    ]),
    el('div', { class: 'main-menu-box' }, [
      el('div', { class: 'main-menu-head' }, [
        el('span', { class: 'eyebrow' }, `${START_YEAR} — ${END_YEAR}`),
        el('h1', { class: 'main-menu-title' }, 'Apogeu'),
        el('p', { class: 'main-menu-sub' }, 'Projete, lance e opere missões espaciais com recursos limitados.'),
      ]),
      // A ação de quase todo mundo que abre o jogo é a principal, cheia; o resto fica na lista.
      button([icon('rocket', { size: 18 }), 'Nova partida'], () => go('config'), { class: 'primary main-menu-primary' }),
      el('nav', { class: 'main-menu-list', 'aria-label': 'Menu principal' }, [
        item('bulb', 'Como funciona', openRulesModal),
        item('compass', 'Configurações', () => go('settings')),
        item('users', 'Créditos', () => go('credits')),
      ]),
      el('p', { class: 'main-menu-foot' }, 'NASA Space Apps Challenge 2026 · Space Mission Design Game'),
    ]),
  ]);
}

// Moldura das telas secundárias do menu (configurações, créditos): voltar no topo e um cartão no centro.
const menuSheet = (title, body, go) => el('section', { class: 'screen setup-clean enter' }, [
  el('header', { class: 'setup-clean-bar' }, [button([icon('arrowLeft', { size: 15 }), 'Menu'], () => go('menu'), { class: 'small ghost' }), el('span', {})]),
  el('div', { class: 'setup-clean-center' }, [
    el('div', { class: 'setup-sheet' }, [el('div', { class: 'setup-sheet-head' }, [el('h1', { class: 'setup-sheet-title' }, title)]), ...body]),
  ]),
]);

function renderSettings(actions, go) {
  const themeSeg = el('div', {});
  const drawTheme = () => themeSeg.replaceChildren(segmented('Tema', [{ value: 'claro', label: 'Claro' }, { value: 'escuro', label: 'Escuro' }], themeOf(), (v) => { if (v !== themeOf()) toggleTheme(); drawTheme(); }));
  drawTheme();
  // Idioma: ao trocar, re-monta a tela de configurações já no novo idioma (go re-renderiza a view atual).
  const langSeg = segmented('Idioma', [{ value: 'pt', label: 'Português' }, { value: 'en', label: 'English' }], getLang(), (v) => { if (v !== getLang()) { setLang(v); go('settings'); } });
  const sw = el('button', {
    type: 'button', class: 'setup-switch', role: 'switch', 'aria-checked': String(guideOn()), 'aria-label': 'Dicas passo a passo',
    onclick: () => { const on = !guideOn(); actions.setGuide(on); sw.setAttribute('aria-checked', String(on)); },
  });
  return menuSheet('Configurações', [
    el('div', { class: 'setup-group' }, [
      el('div', { class: 'setup-row' }, [rowLabel('Idioma', 'Português do Brasil ou inglês'), langSeg]),
      el('div', { class: 'setup-row' }, [rowLabel('Tema', 'Papel claro ou grafite escuro'), themeSeg]),
      el('div', { class: 'setup-row' }, [rowLabel('Dicas passo a passo', 'Mostra o que fazer em cada turno'), sw]),
    ]),
    el('small', { class: 'setup-row-sub' }, 'As preferências ficam salvas neste navegador.'),
  ], go);
}

function renderCredits(go) {
  const entry = (title, text) => el('li', {}, [el('strong', {}, title), text]);
  return menuSheet('Créditos', [
    el('ul', { class: 'credits-list' }, [
      entry('Desafio', 'NASA Space Apps Challenge 2026, desafio Space Mission Design Game.'),
      entry('Base do jogo', 'Processo de design de missões da NASA (Need → Concept → Requirements → Design → Verify → Implement) e a atividade Marsbound do JPL. Datas históricas: NASA History.'),
      entry('Números', 'Os valores de peças, foguetes e missões são fictícios, criados para o aprendizado.'),
      entry('Tipografia', 'IBM Plex Sans e IBM Plex Mono (licença SIL Open Font).'),
      entry('Código', 'Feito com apoio de IA, declarado na submissão conforme as regras do evento.'),
    ]),
  ], go);
}

// Qual tela do menu está aberta. Fica no módulo para sobreviver aos re-renders e à volta do lobby.
let view = 'splash'; // 'splash' | 'menu' | 'config' | 'settings' | 'credits'

export function setupScreen(state, actions) {
  const host = el('div', { class: 'setup-host' });
  const go = (next) => {
    view = next;
    mount();
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };
  const mount = () => {
    host.innerHTML = '';
    if (view === 'splash') host.appendChild(buildSplashView(() => go('menu')));
    else if (view === 'config') host.appendChild(renderConfigView(actions, () => go('menu')));
    else if (view === 'settings') host.appendChild(renderSettings(actions, go));
    else if (view === 'credits') host.appendChild(renderCredits(go));
    else host.appendChild(renderMainMenu(actions, go));
  };
  mount();
  return host;
}
