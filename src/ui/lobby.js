// Lobby da sala online (ver docs/PLANO-SALAS.md, Fase 3): o código da sala em destaque
// e uma vaga retangular por agência — cada jogador clica numa vaga livre, dá o nome da
// sua agência e "senta na mesa". O anfitrião começa quando todas estiverem ocupadas.
// A tela só lê a sessão e chama actions.lobby.* (regras em src/net/lobby.js, no host).
// Visual: mesmo cartão centralizado da tela de Nova Partida (.setup-clean / .grupo da Íris),
// com o código em "teclas" monoespaçadas e as vagas como cartões numerados.
import { el, button, themeToggle } from './components.js';
import { icon } from './icons.js';

// Rascunho local do editor de vaga (qual retângulo está aberto e o texto digitado):
// sobrevive aos re-renders disparados pelos broadcasts dos outros jogadores.
let draft = null; // { slot, name } | null

// Moldura comum: barra do topo (sair + tema) e o cartão no meio da tela.
const frame = (leaveButton, sheet) => el('section', { class: 'screen setup-clean lobby' }, [
  el('header', { class: 'setup-clean-bar' }, [leaveButton, themeToggle()]),
  el('div', { class: 'setup-clean-center' }, [sheet]),
]);

export function lobbyScreen(state, actions) {
  const lobby = actions.lobby;
  const session = lobby.session();

  // Entrou pelo link e o primeiro broadcast do anfitrião ainda não chegou.
  if (!session) {
    return frame(
      button([icon('arrowLeft', { size: 15 }), 'Voltar'], () => lobby.leave(), { class: 'small ghost' }),
      el('div', { class: 'setup-sheet lobby-sheet lobby-wait' }, [
        el('div', { class: 'setup-sheet-head' }, [
          el('span', { class: 'eyebrow' }, 'Sala multiplayer'),
          el('h1', { class: 'setup-sheet-title' }, 'Entrando na sala...'),
          el('small', { class: 'setup-row-sub' }, 'Recebendo os dados do anfitrião. Se demorar, confira o código e se o anfitrião está com a aba aberta.'),
        ]),
        button('Voltar', () => lobby.leave()),
      ]),
    );
  }

  const myPeerId = lobby.myPeerId();
  const hostPeerId = lobby.hostPeerId();
  const isHost = lobby.isHost();
  const link = `${location.origin}${location.pathname}?sala=${session.code}`;
  const taken = session.slots.filter(Boolean).length;
  const allTaken = taken === session.slots.length;
  const missing = session.slots.length - taken;

  // Editor dentro do retângulo: nome da agência + ocupar/cancelar.
  const slotEditor = (i, card) => {
    const input = el('input', { type: 'text', placeholder: 'Nome da sua agência', maxlength: 20, value: draft?.name ?? '', 'aria-label': `Nome da agência na vaga ${i + 1}` });
    input.addEventListener('input', (e) => { draft = { slot: i, name: e.target.value }; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm.click(); });
    // O clique dentro do editor não pode reabrir o editor (o cartão vazio também escuta cliques).
    input.addEventListener('click', (e) => e.stopPropagation());
    const confirm = button('Ocupar', (e) => { e.stopPropagation(); lobby.claim(i, input.value); draft = null; }, { class: 'primary small' });
    const cancel = button('Cancelar', (e) => { e.stopPropagation(); draft = null; card.classList.remove('editing'); card.replaceChildren(...emptyBody(i, card)); }, { class: 'small ghost' });
    card.classList.add('editing');
    card.replaceChildren(
      el('div', { class: 'slot-top' }, [el('span', { class: `avatar c${i}` }, String(i + 1)), el('span', { class: 'slot-n' }, `VAGA ${String(i + 1).padStart(2, '0')}`)]),
      el('div', { class: 'slot-edit' }, [input, el('div', { class: 'row' }, [confirm, cancel])]),
    );
    input.focus();
  };

  const emptyBody = (i, card) => {
    const bits = [
      el('div', { class: 'slot-top' }, [el('span', { class: 'avatar slot-avatar-empty' }, String(i + 1)), el('span', { class: 'slot-n' }, `VAGA ${String(i + 1).padStart(2, '0')}`)]),
      el('strong', {}, 'Vaga livre'),
      el('p', { class: 'hint' }, 'Clique para ocupar com a sua agência.'),
    ];
    if (isHost && session.slots.length > 2) {
      const rm = button([icon('x', { size: 13 }), 'Remover vaga'], (e) => { e.stopPropagation(); lobby.dropSlot(i); }, { class: 'small ghost slot-remove' });
      bits.push(rm);
    }
    card.onclick = () => { draft = { slot: i, name: draft?.name ?? '' }; slotEditor(i, card); };
    return bits;
  };

  const slotCard = (slot, i) => {
    const mine = slot && slot.peerId === myPeerId;
    const card = el('div', {
      class: `slot${slot ? ' taken' : ' empty'}${mine ? ' mine' : ''}`,
      role: slot ? undefined : 'button',
      tabindex: slot ? undefined : '0',
    });
    if (!slot) {
      card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); card.click(); } });
      // Reabre o editor se era aqui que este jogador estava digitando.
      if (draft && draft.slot === i) slotEditor(i, card);
      else card.append(...emptyBody(i, card));
      return card;
    }
    const badges = [];
    if (slot.peerId === hostPeerId) badges.push(el('span', { class: 'slot-badge' }, 'anfitrião'));
    if (mine) badges.push(el('span', { class: 'slot-badge you' }, 'você'));
    card.append(
      el('div', { class: 'slot-top' }, [
        el('span', { class: `avatar c${i}` }, (slot.name[0] || String(i + 1)).toUpperCase()),
        el('span', { class: 'slot-n' }, `VAGA ${String(i + 1).padStart(2, '0')}`),
        el('span', { class: 'slot-ready', title: 'Pronto' }, icon('check', { size: 13, label: 'pronto' })),
      ]),
      el('strong', {}, slot.name),
      el('div', { class: 'row badges' }, badges),
    );
    if (mine) {
      card.append(el('div', { class: 'row slot-actions' }, [
        button('Renomear', () => { draft = { slot: i, name: slot.name }; slotEditor(i, card); }, { class: 'small' }),
        button('Sair da vaga', () => { draft = null; lobby.release(); }, { class: 'small ghost' }),
      ]));
    }
    return card;
  };

  // Link de convite com botão copiar (fallback: seleciona o texto para copiar à mão).
  const linkCode = el('code', { class: 'invite-link' }, link);
  const copyBtn = button([icon('clipboard', { size: 15 }), 'Copiar link'], async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Copiado!';
      setTimeout(() => { copyBtn.replaceChildren(icon('clipboard', { size: 15 }), 'Copiar link'); }, 1500);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(linkCode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, { class: 'small' });

  // Código da sala em "teclas" monoespaçadas: fácil de ditar em voz alta.
  const codeKeys = el('div', { class: 'room-code', 'aria-label': `Código da sala: ${session.code.split('').join(' ')}` },
    session.code.split('').map((ch) => el('span', { class: 'room-key', 'aria-hidden': 'true' }, ch)));

  const footer = isHost
    ? el('div', { class: 'lobby-footer' }, [
      button([icon('rocket', { size: 18 }), 'Começar a partida'], () => lobby.start(), {
        class: 'primary setup-submit', disabled: !allTaken,
        title: allTaken ? 'Todos sentaram: os lados são sorteados agora.' : `Faltam ${missing} ${missing === 1 ? 'vaga' : 'vagas'} para começar.`,
      }),
      el('small', { class: 'setup-row-sub' }, allTaken ? 'Mesa completa. Os lados (EUA/URSS) são sorteados ao começar.' : `Faltam ${missing} ${missing === 1 ? 'agência' : 'agências'} para começar.`),
    ])
    : el('div', { class: 'lobby-footer' }, [
      el('p', { class: 'tip-line' }, [icon('hourglass', { size: 15 }), 'O anfitrião começa a partida quando todas as vagas estiverem ocupadas.']),
    ]);

  return frame(
    button([icon('arrowLeft', { size: 15 }), isHost ? 'Fechar a sala' : 'Sair da sala'], () => lobby.leave(), { class: 'small ghost' }),
    el('div', { class: 'setup-sheet lobby-sheet' }, [
      el('div', { class: 'setup-sheet-head' }, [
        el('span', { class: 'eyebrow with-icon' }, [icon('wifi', { size: 13 }), 'Sala multiplayer']),
        el('h1', { class: 'setup-sheet-title' }, 'Código da sala'),
        codeKeys,
      ]),
      el('div', { class: 'setup-group invite' }, [
        el('div', { class: 'setup-row' }, [
          el('div', { class: 'setup-row-label' }, [el('strong', {}, 'Convite'), linkCode]),
          copyBtn,
        ]),
      ]),
      el('div', { class: 'lobby-count' }, [
        el('strong', {}, 'Vagas'),
        el('span', { class: 'chip small' }, [el('span', { class: 'num' }, `${taken}/${session.slots.length}`), 'ocupadas']),
        el('div', { class: 'pbar', 'aria-hidden': 'true' }, [el('div', { class: 'fill', style: `width:${Math.round((taken / session.slots.length) * 100)}%` })]),
      ]),
      el('p', { class: 'hint' }, 'Cada jogador clica numa vaga livre e dá o nome da sua agência. Os lados (EUA/URSS) são sorteados quando a partida começa.'),
      el('div', { class: 'lobby-slots' }, session.slots.map(slotCard)),
      footer,
    ]),
  );
}
