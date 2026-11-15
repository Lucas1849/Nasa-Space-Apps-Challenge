// Camada fina de transporte P2P (WebRTC via PeerJS). Ver docs/PLANO-P2P.md e PLANO-SALAS.md.
// Não exige servidor nosso: usa o broker público gratuito do PeerJS só para o aperto de
// mão inicial (achar os dois navegadores); depois disso os dados trafegam direto entre
// eles. Carregado de CDN sob demanda, então não precisa de `npm install`.
const PEERJS_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';

let loadPromise = null;
function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEERJS_CDN;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // permite tentar de novo (ex.: a internet voltou)
      script.remove();
      reject(new Error('Não foi possível carregar a conexão online (sem internet?).'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Hospeda uma sala, opcionalmente com um ID escolhido (`peerId`, ver roomCode.js).
// Se o ID já estiver em uso no broker, rejeita com err.type === 'unavailable-id' — quem
// chamou sorteia outro código e tenta de novo.
// Devolve { id, broadcast(data), sendTo(peerId, data), peerCount(), close() }.
export async function hostRoom({ peerId, onPeerJoin, onPeerLeave, onData, onError } = {}) {
  await loadPeerJs();
  return new Promise((resolve, reject) => {
    const peer = peerId ? new window.Peer(peerId) : new window.Peer();
    const conns = new Map();
    let open = false;
    peer.on('error', (err) => {
      // Antes do registro no broker: falha na criação da sala. Depois: erro de um peer
      // (ex.: handshake de um convidado falhou) — avisa sem derrubar a sala.
      if (!open) { try { peer.destroy(); } catch { /* já caiu */ } reject(err); return; }
      onError && onError(err);
    });
    peer.on('open', (id) => {
      open = true;
      peer.on('connection', (conn) => {
        conn.on('open', () => { conns.set(conn.peer, conn); onPeerJoin && onPeerJoin(conn.peer); });
        conn.on('data', (data) => onData && onData(data, conn.peer));
        conn.on('close', () => { conns.delete(conn.peer); onPeerLeave && onPeerLeave(conn.peer); });
      });
      resolve({
        id,
        broadcast: (data) => conns.forEach((c) => c.send(data)),
        sendTo: (pid, data) => { conns.get(pid)?.send(data); },
        peerCount: () => conns.size,
        close: () => { conns.forEach((c) => c.close()); peer.destroy(); },
      });
    });
  });
}

// Entra numa sala existente. Devolve { id, send(data), close() } — `id` é a identidade
// deste jogador (o host nos reconhece por ele; ver lobby.js).
export async function joinRoom(hostId, { onData, onClose, onError } = {}) {
  await loadPeerJs();
  return new Promise((resolve, reject) => {
    const peer = new window.Peer();
    let open = false;
    const fail = (err) => { try { peer.destroy(); } catch { /* já caiu */ } reject(err); };
    peer.on('error', (err) => {
      if (!open) { fail(err); return; }
      onError && onError(err);
    });
    peer.on('open', () => {
      const conn = peer.connect(hostId, { reliable: true });
      conn.on('open', () => {
        open = true;
        resolve({
          id: peer.id,
          send: (data) => conn.send(data),
          close: () => { conn.close(); peer.destroy(); },
        });
      });
      conn.on('data', (data) => onData && onData(data));
      conn.on('close', () => { peer.destroy(); onClose && onClose(); });
      conn.on('error', (err) => { if (!open) fail(err); else onError && onError(err); });
    });
  });
}
