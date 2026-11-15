// Protocolo de sincronização: host autoritativo. Ver docs/PLANO-P2P.md.
// O host roda o jogo normalmente (mesmas regras de src/sim/actions.js) e transmite o
// `state` inteiro a cada mudança. Os clientes não alteram o estado local: mandam a ação
// pro host e esperam o `state` atualizado chegar. Isola toda a rede deste arquivo; main.js
// só chama createNetworkController().
import { hostRoom, joinRoom } from './peer.js';

export function createNetworkController({ actionsMap, getState, setState, render }) {
  let channel = null; // { isHost, broadcast?, send?, close }

  function applyLocally(name, args) {
    const error = actionsMap[name](getState(), ...args);
    render();
    if (channel?.isHost) channel.broadcast({ type: 'state', state: getState() });
    return error;
  }

  async function host() {
    const room = await hostRoom({
      onData: (msg) => { if (msg.type === 'action') applyLocally(msg.name, msg.args); },
      onPeerJoin: () => room.broadcast({ type: 'state', state: getState() }),
    });
    channel = { isHost: true, broadcast: room.broadcast, close: room.close };
    return room.id;
  }

  async function join(hostId) {
    await new Promise((resolve, reject) => {
      joinRoom(hostId, {
        onData: (msg) => { if (msg.type === 'state') { setState(msg.state); render(); } },
        onClose: () => { channel = null; },
      }).then((conn) => {
        channel = { isHost: false, send: conn.send, close: conn.close };
        resolve();
      }).catch(reject);
    });
  }

  // Chamado pelo wrapper de ações do jogo (ver netWrap em main.js).
  // Devolve true se já cuidou da ação (rede ligada); false = quem chamou aplica normal.
  function dispatch(name, args) {
    if (!channel) return false;
    if (channel.isHost) applyLocally(name, args);
    else channel.send({ type: 'action', name, args });
    return true;
  }

  return {
    host,
    join,
    dispatch,
    // Para ações locais do host que mudam o `state` todo (começar partida, nova partida)
    // e não passam por dispatch(). Sem efeito se não for host.
    broadcastState: () => { if (channel?.isHost) channel.broadcast({ type: 'state', state: getState() }); },
    isConnected: () => !!channel,
    isHost: () => !!channel?.isHost,
    disconnect: () => { channel?.close(); channel = null; },
  };
}
