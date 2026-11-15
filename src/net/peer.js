// Camada fina de transporte P2P (WebRTC via PeerJS). Ver docs/PLANO-P2P.md.
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
    script.onerror = () => reject(new Error('Não foi possível carregar a conexão online (sem internet?).'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Hospeda uma sala. Devolve { id, broadcast(data), peerCount(), close() }.
export async function hostRoom({ onPeerJoin, onPeerLeave, onData } = {}) {
  await loadPeerJs();
  return new Promise((resolve, reject) => {
    const peer = new window.Peer();
    const conns = new Map();
    peer.on('error', (err) => reject(err));
    peer.on('open', (id) => {
      peer.on('connection', (conn) => {
        conn.on('open', () => { conns.set(conn.peer, conn); onPeerJoin && onPeerJoin(conn.peer); });
        conn.on('data', (data) => onData && onData(data, conn.peer));
        conn.on('close', () => { conns.delete(conn.peer); onPeerLeave && onPeerLeave(conn.peer); });
      });
      resolve({
        id,
        broadcast: (data) => conns.forEach((c) => c.send(data)),
        peerCount: () => conns.size,
        close: () => { conns.forEach((c) => c.close()); peer.destroy(); },
      });
    });
  });
}

// Entra numa sala existente. Devolve { send(data), close() }.
export async function joinRoom(hostId, { onData, onClose } = {}) {
  await loadPeerJs();
  return new Promise((resolve, reject) => {
    const peer = new window.Peer();
    peer.on('error', (err) => reject(err));
    peer.on('open', () => {
      const conn = peer.connect(hostId, { reliable: true });
      conn.on('open', () => resolve({
        send: (data) => conn.send(data),
        close: () => { conn.close(); peer.destroy(); },
      }));
      conn.on('data', (data) => onData && onData(data));
      conn.on('close', () => onClose && onClose());
      conn.on('error', (err) => reject(err));
    });
  });
}
