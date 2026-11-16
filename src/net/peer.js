// Camada fina de transporte P2P (WebRTC via PeerJS). Ver docs/PLANO-P2P.md e PLANO-SALAS.md.
// Não exige servidor nosso: usa o broker público gratuito do PeerJS só para o aperto de
// mão inicial (achar os dois navegadores); depois disso os dados trafegam direto entre
// eles. Carregado de CDN sob demanda, então não precisa de `npm install`.
const PEERJS_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';

// Servidores para atravessar o roteador (NAT). STUN descobre o endereço público; quando a conexão
// direta é bloqueada (4G, rede de escola/empresa), o TURN repassa os dados. Todos gratuitos e
// públicos: os do próprio PeerJS e o Open Relay (portas 80/443, que quase nenhuma rede bloqueia).
// Se um deles estiver fora do ar, o navegador simplesmente tenta o próximo.
const PEER_OPTIONS = {
  config: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
      { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
    ],
  },
};
// Tempo máximo para entrar numa sala: sem isso, uma conexão bloqueada ficava em "Conectando..." para sempre.
const JOIN_TIMEOUT_MS = 20000;

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
    const peer = peerId ? new window.Peer(peerId, PEER_OPTIONS) : new window.Peer(PEER_OPTIONS);
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
    const peer = new window.Peer(PEER_OPTIONS);
    let open = false;
    let brokerOk = false; // já falou com o broker do PeerJS (o "aperto de mão" inicial)
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      try { peer.destroy(); } catch { /* já caiu */ }
      reject(err);
    };
    const blocked = (type, message) => Object.assign(new Error(message), { type });
    // Nada respondeu a tempo: diz em qual etapa travou, em vez de ficar carregando para sempre.
    const timer = setTimeout(() => fail(brokerOk
      ? blocked('join-timeout', 'O anfitrião não respondeu. Confira se a aba da sala continua aberta no aparelho dele. Algumas redes (4G, escola, empresa) bloqueiam a conexão direta: tentem outra rede ou Wi-Fi.')
      : blocked('broker-timeout', 'Não foi possível alcançar o servidor de conexão. A sua rede pode estar bloqueando: tente outra rede ou Wi-Fi.')), JOIN_TIMEOUT_MS);
    peer.on('error', (err) => {
      if (!open) { fail(err); return; }
      onError && onError(err);
    });
    peer.on('open', () => {
      brokerOk = true;
      const conn = peer.connect(hostId, { reliable: true });
      // Se o caminho entre os dois navegadores falhar de vez, avisa na hora (sem esperar o tempo máximo).
      setTimeout(() => conn.peerConnection?.addEventListener?.('iceconnectionstatechange', () => {
        if (conn.peerConnection.iceConnectionState === 'failed' && !open) fail(blocked('ice-failed', 'A conexão direta com o anfitrião foi bloqueada pela rede. Tentem outra rede ou Wi-Fi (o 4G costuma bloquear).'));
      }), 0);
      conn.on('open', () => {
        open = true; settled = true; clearTimeout(timer);
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
