// Protocolo de sincronização: host autoritativo. Ver docs/PLANO-P2P.md e PLANO-SALAS.md.
// O host roda o jogo normalmente (mesmas regras de src/sim/actions.js) e transmite o
// `state` inteiro a cada mudança. Os clientes não alteram o estado local: mandam a ação
// pro host e esperam o `state` atualizado chegar. Antes da partida existe o LOBBY
// (lobby.js): as vagas de agência que cada jogador ocupa; o host também é o dono da
// sessão e rebate cada mudança para todos. Isola toda a rede deste arquivo; main.js
// só chama createNetworkController().
//
// Mensagens: { type: 'action' | 'state' | 'claim' | 'release' | 'lobby' | 'start' |
//              'toast' | 'rejected' }
import { hostRoom, joinRoom } from './peer.js';
import { newCode, peerIdFor, normalizeCode } from './roomCode.js';
import {
  createSession, claimSlot, releaseSlot, removeSlot, canStart, assignmentsFor,
} from './lobby.js';

const HOST_RETRIES = 3; // tentativas de código até desistir (colisão é raríssima)

export function createNetworkController({
  actionsMap, getState, setState, render, showError, enterLobby, exitToSetup,
}) {
  let channel = null;    // { isHost, broadcast?, sendTo?, send?, close }
  let session = null;    // lobby.js; null fora do modo online
  let myPeerId = null;   // identidade deste dispositivo na sala
  let myPlayerId = null; // índice da agência deste dispositivo depois do start

  function applyLocally(name, args) {
    // `name` pode vir de uma mensagem de rede: só roda o que está na lista vetada
    // (ver NETWORKED_ACTION_NAMES em main.js), nunca uma função arbitrária.
    if (typeof actionsMap[name] !== 'function') return 'Ação desconhecida.';
    const error = actionsMap[name](getState(), ...args);
    render();
    if (channel?.isHost) channel.broadcast({ type: 'state', state: getState() });
    return error;
  }

  function broadcastLobby() {
    if (channel?.isHost) channel.broadcast({ type: 'lobby', session });
  }

  // Mudança de vaga pedida por um convidado: o host valida com as regras puras do
  // lobby.js e, se falhar, devolve o motivo só para quem pediu (vira toast lá).
  function onGuestLobbyMessage(msg, fromPeer) {
    const result = msg.type === 'claim'
      ? claimSlot(session, fromPeer, msg.slot, msg.name)
      : releaseSlot(session, fromPeer);
    if (result.error) { channel.sendTo(fromPeer, { type: 'toast', text: result.error }); return; }
    session = result.session;
    broadcastLobby();
    render();
  }

  function onHostData(msg, fromPeer) {
    if (msg.type === 'action') { applyLocally(msg.name, msg.args); return; }
    if (session && !session.started && (msg.type === 'claim' || msg.type === 'release')) {
      onGuestLobbyMessage(msg, fromPeer);
    }
  }

  // Cria a sala com um código curto. Colisão de código (unavailable-id) sorteia outro.
  // Devolve o código; a tela de lobby entra em seguida.
  async function host(count) {
    let lastErr = null;
    for (let attempt = 0; attempt < HOST_RETRIES; attempt += 1) {
      const code = newCode();
      try {
        const room = await hostRoom({
          peerId: peerIdFor(code),
          onData: onHostData,
          onPeerJoin: (pid) => {
            if (session?.started) { room.sendTo(pid, { type: 'rejected', reason: 'Esta partida já começou.' }); return; }
            broadcastLobby();
          },
          onPeerLeave: (pid) => {
            if (session && !session.started) {
              session = releaseSlot(session, pid).session;
              broadcastLobby();
              render();
            }
          },
          onError: () => { showError?.('Um jogador não conseguiu se conectar à sala.'); },
        });
        channel = { isHost: true, broadcast: room.broadcast, sendTo: room.sendTo, close: room.close };
        myPeerId = room.id;
        myPlayerId = null;
        session = createSession(code, count);
        enterLobby?.();
        return code;
      } catch (err) {
        if (err?.type === 'unavailable-id') { lastErr = err; continue; }
        throw err;
      }
    }
    throw lastErr ?? new Error('Não foi possível criar a sala.');
  }

  function onClientData(msg, conn) {
    if (msg.type === 'state') { setState(msg.state); render(); return; }
    if (msg.type === 'lobby') { session = msg.session; render(); return; }
    if (msg.type === 'start') {
      session = session ? { ...session, started: true } : session;
      myPlayerId = msg.assignments[myPeerId] ?? null;
      setState(msg.state);
      render();
      return;
    }
    if (msg.type === 'toast') { showError?.(msg.text); return; }
    if (msg.type === 'rejected') {
      showError?.(msg.reason);
      conn.close();
      channel = null;
      session = null;
      exitToSetup?.();
    }
  }

  // Entra numa sala pelo código (ou link colado). O lobby abre vazio ("recebendo...")
  // e preenche quando o primeiro broadcast do host chega.
  async function join(rawCode) {
    const code = normalizeCode(rawCode);
    if (!code) throw new Error('Código de sala inválido.');
    const conn = await joinRoom(peerIdFor(code), {
      onData: (msg) => onClientData(msg, conn),
      onClose: () => {
        const wasConnected = !!channel;
        channel = null;
        session = null;
        if (wasConnected) showError?.('A conexão com a sala caiu.');
      },
      onError: () => { showError?.('Problema na conexão com a sala.'); },
    });
    channel = { isHost: false, send: conn.send, close: conn.close };
    myPeerId = conn.id;
    myPlayerId = null;
    enterLobby?.();
  }

  // ---- Vagas do lobby: o host aplica direto; o convidado pede ao host.
  function claim(slot, name) {
    if (!session || !channel) return;
    if (!channel.isHost) { channel.send({ type: 'claim', slot, name }); return; }
    const result = claimSlot(session, myPeerId, slot, name);
    if (result.error) { showError?.(result.error); return; }
    session = result.session;
    broadcastLobby();
    render();
  }

  function release() {
    if (!session || !channel) return;
    if (!channel.isHost) { channel.send({ type: 'release' }); return; }
    session = releaseSlot(session, myPeerId).session;
    broadcastLobby();
    render();
  }

  // Host remove uma vaga vazia (alguém desistiu de vir) e a sala encolhe.
  function dropSlot(slot) {
    if (!channel?.isHost || !session) return;
    const result = removeSlot(session, slot);
    if (result.error) { showError?.(result.error); return; }
    session = result.session;
    broadcastLobby();
    render();
  }

  // Host inicia a partida: roda o startGame de verdade (via `startGameFn`, em main.js)
  // e manda o estado + o mapa peer->agência, para cada um saber qual jogador é seu.
  // Devolve string de erro (vira toast) ou undefined.
  function startSession(startGameFn) {
    if (!channel?.isHost || !session) return 'Só o anfitrião inicia a partida.';
    if (!canStart(session)) return 'A partida só começa com todas as vagas ocupadas.';
    const error = startGameFn(session.slots.map((s) => ({ name: s.name })));
    if (typeof error === 'string') return error;
    session = { ...session, started: true };
    const assignments = assignmentsFor(session);
    myPlayerId = assignments[myPeerId] ?? null;
    channel.broadcast({ type: 'start', state: getState(), assignments });
    return undefined;
  }

  // Chamado pelo wrapper de ações do jogo (ver netWrap em main.js).
  // Sem rede: devolve null (quem chamou aplica normal, como antes).
  // Como host: aplica na hora e devolve { error } — o host sabe o resultado igual a
  // antes, então o toast e o after() continuam funcionando no dispositivo dele.
  // Como cliente: só manda a ação pro host e devolve { pending: true } — ainda não dá
  // para saber se deu certo (Fase 4 do PLANO-SALAS.md fecha isso).
  function dispatch(name, args) {
    if (!channel) return null;
    if (channel.isHost) return { error: applyLocally(name, args) };
    channel.send({ type: 'action', name, args });
    return { pending: true };
  }

  return {
    host,
    join,
    dispatch,
    claim,
    release,
    dropSlot,
    startSession,
    // Para ações locais do host que mudam o `state` todo (nova partida no hot-seat)
    // e não passam por dispatch(). Sem efeito se não for host.
    broadcastState: () => { if (channel?.isHost) channel.broadcast({ type: 'state', state: getState() }); },
    getSession: () => session,
    getMyPeerId: () => myPeerId,
    getMyPlayerId: () => myPlayerId,
    getHostPeerId: () => (session ? peerIdFor(session.code) : null),
    isConnected: () => !!channel,
    isHost: () => !!channel?.isHost,
    disconnect: () => { channel?.close(); channel = null; session = null; myPlayerId = null; },
  };
}
