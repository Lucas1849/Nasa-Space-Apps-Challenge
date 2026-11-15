// Lobby da sala online (ver docs/PLANO-SALAS.md, Fase 3): o código da sala em destaque
// e uma vaga retangular por agência — cada jogador clica numa vaga livre, dá o nome da
// sua agência e "senta na mesa". O anfitrião começa quando todas estiverem ocupadas.
// A tela só lê a sessão e chama actions.lobby.* (regras em src/net/lobby.js, no host).
import { el, button } from './components.js';
import { icon } from './icons.js';

// Rascunho local do editor de vaga (qual retângulo está aberto e o texto digitado):
// sobrevive aos re-renders disparados pelos broadcasts dos outros jogadores.
let draft = null; // { slot, name } | null

export function lobbyScreen(state, actions) {
  const lobby = actions.lobby;
  const session = lobby.session();

  // Entrou pelo link e o primeiro broadcast do anfitrião ainda não chegou.
  if (!session) {
    return el('section', { class: 'screen lobby' }, [
      el('h1', {}, 'Entrando na sala...'),
      el('p', { class: 'hint' }, 'Recebendo os dados do anfitrião. Se demorar, confira o código e se o anfitrião está com a aba aberta.'),
      el('div', { class: 'row' }, [button('Voltar', () => lobby.leave())]),
    ]);
  }

  const myPeerId = lobby.myPeerId();
  const hostPeerId = lobby.hostPeerId();
  const isHost = lobby.isHost();
  const link = `${location.origin}${location.pathname}?sala=${session.code}`;
  const taken = session.slots.filter(Boolean).length;
  const allTaken = taken === session.slots.length;

  // Editor dentro do retângulo: nome da agência + ocupar/cancelar.
  const slotEditor = (i, card) => {
    const input = el('input', { type: 'text', placeholder: 'Nome da sua agência', maxlength: 20, value: draft?.name ?? '' });
    input.addEventListener('input', (e) => { draft = { slot: i, name: e.target.value }; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm.click(); });
    const confirm = button('Ocupar', () => { lobby.claim(i, input.value); draft = null; }, { class: 'primary' });
    const cancel = button('Cancelar', () => { draft = null; card.replaceChildren(...emptyBody(i, card)); });
    card.replaceChildren(el('div', { class: 'slot-edit' }, [input, el('div', { class: 'row' }, [confirm, cancel])]));
    input.focus();
  };

  const emptyBody = (i, card) => {
    const bits = [
      el('span', { class: 'slot-n' }, String(i + 1)),
      el('strong', {}, 'Vaga livre'),
      el('p', { class: 'hint' }, 'Clique para ocupar com a sua agência.'),
    ];
    if (isHost && session.slots.length > 2) {
      const rm = button('Remover vaga', (e) => { e.stopPropagation(); lobby.dropSlot(i); }, { class: 'small' });
      bits.push(rm);
    }
    card.onclick = () => { draft = { slot: i, name: draft?.name ?? '' }; slotEditor(i, card); };
    return bits;
  };

  const slotCard = (slot, i) => {
    const mine = slot && slot.peerId === myPeerId;
    const card = el('div', {
      class: `panel slot${slot ? ' taken' : ' empty'}${mine ? ' mine' : ''}`,
      role: slot ? undefined : 'button',
    });
    if (!slot) {
      // Reabre o editor se era aqui que este jogador estava digitando.
      if (draft && draft.slot === i) slotEditor(i, card);
      else card.append(...emptyBody(i, card));
      return card;
    }
    const badges = [];
    if (slot.peerId === hostPeerId) badges.push(el('span', { class: 'slot-badge' }, 'anfitrião'));
    if (mine) badges.push(el('span', { class: 'slot-badge you' }, 'você'));
    card.append(
      el('span', { class: 'slot-n' }, String(i + 1)),
      el('strong', {}, slot.name),
      el('div', { class: 'row badges' }, badges),
    );
    if (mine) {
      card.append(el('div', { class: 'row' }, [
        button('Renomear', () => { draft = { slot: i, name: slot.name }; slotEditor(i, card); }, { class: 'small' }),
        button('Sair da vaga', () => { draft = null; lobby.release(); }, { class: 'small' }),
      ]));
    }
    return card;
  };

  // Link de convite com botão copiar (fallback: seleciona o texto para copiar à mão).
  const linkCode = el('code', {}, link);
  const copyBtn = button('Copiar link', async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Copiado!';
      setTimeout(() => { copyBtn.textContent = 'Copiar link'; }, 1500);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(linkCode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  const footer = isHost
    ? el('div', { class: 'row' }, [
      button([icon('rocket', { size: 18 }), 'Começar a partida'], () => lobby.start(), { class: 'primary', disabled: !allTaken }),
      button('Fechar a sala', () => lobby.leave()),
    ])
    : el('div', { class: 'row' }, [
      el('p', { class: 'hint' }, 'O anfitrião começa a partida quando todas as vagas estiverem ocupadas.'),
      button('Sair da sala', () => lobby.leave()),
    ]);

  return el('section', { class: 'screen lobby' }, [
    el('p', { class: 'eyebrow' }, 'Sala multiplayer'),
    el('h1', { class: 'with-icon' }, [icon('wifi', { size: 26 }), 'Código: ', el('span', { class: 'room-code' }, session.code)]),
    el('div', { class: 'row invite' }, [linkCode, copyBtn]),
    el('p', { class: 'hint' }, `Vagas ocupadas: ${taken} de ${session.slots.length}. Cada jogador clica numa vaga livre e dá o nome da sua agência — os lados (EUA/URSS) são sorteados quando a partida começa.`),
    el('div', { class: 'lobby-slots' }, session.slots.map(slotCard)),
    footer,
  ]);
}
