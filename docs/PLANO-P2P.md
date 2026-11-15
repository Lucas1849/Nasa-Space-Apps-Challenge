# Plano: multiplayer remoto por Peer-to-Peer (WebRTC)

Branch: `net/peer-to-peer`. Objetivo: permitir que jogadores em dispositivos diferentes
entrem na mesma partida por um link, sem exigir um backend nosso (container, VPS etc.).
Se der errado ou não terminar a tempo, a `main` não é afetada: o módulo é isolado e
desligado por padrão.

## Ideia central: host autoritativo + "microserviço" só de sinalização

- O jogo já é todo baseado num único objeto `state` compartilhado e em turnos (hoje
  trocado passando o dispositivo). Isso combina bem com WebRTC: **um jogador hospeda**
  (fica com o `state` oficial), os outros **se conectam direto no navegador dele**
  (peer-to-peer de verdade, sem passar pelos nossos servidores).
- O único papel de "servidor" que precisamos é o **sinalização**: o aperto de mão inicial
  que ajuda os navegadores a se acharem na internet (trocar SDP/ICE). Isso é exatamente o
  que a biblioteca **PeerJS** resolve usando o **broker público gratuito** que ela mesma
  mantém (`0.peerjs.com`) — não precisamos subir container nenhum para isso.
  - Pensar nisso como um "microserviço": é um serviço de terceiros, de uma única
    responsabilidade (achar os dois navegadores um para o outro), que não guarda estado
    do jogo e que podemos trocar por outro broker (ou um nosso, se algum dia quisermos)
    sem mudar o resto do código — fica isolado em `src/net/peer.js`.
- Depois do aperto de mão, a conexão é **direta entre os navegadores** (WebRTC data
  channel). Não há servidor nosso guardando partidas.

## Por que host autoritativo (e não sincronizar tudo em todo lugar)

- Mais simples de implementar num prazo curto e sem introduzir estados divergentes.
- O jogo já é por turnos com um "dono da vez"; o host pode ser literalmente o dispositivo
  de quem começou a sala.
- Fluxo: cliente manda a *ação* (ex.: `rollDice`), o host aplica no `state` dele (as
  mesmas regras de sempre, sem duplicar lógica) e **transmite o `state` inteiro** de volta
  para todo mundo. Cada cliente substitui o `state` local pelo recebido e re-renderiza.
- Trade-off aceito para o prazo: se uma ação do cliente for inválida (ex.: comprar sem
  verba), o erro aparece como *toast* hoje só na tela do host (quem efetivamente rodou a
  função). Not perfect, mas não quebra o jogo — fica anotado como próximo passo.

## Módulos novos (isolados, não tocam na lógica de jogo existente)

```
src/net/peer.js   -> transporte: WebRTC via PeerJS (carregado de CDN, só quando usado)
                     hostRoom() / joinRoom(id) -> enviar/receber mensagens cruas
src/net/sync.js   -> protocolo: mensagens { type: 'action' | 'state' }
                     createNetworkController() -> liga isso nas ações do jogo
```

- `src/sim/*` e `src/ui/*` **não mudam de comportamento** fora do modo online: sem rede,
  tudo funciona exatamente como hoje (hot-seat local).
- PeerJS não entra como dependência de build: é carregado por `<script>` dinâmico de um
  CDN só quando alguém clica em "Criar sala" ou "Entrar numa sala". Se não tiver internet
  para isso, aparece um erro e o resto do jogo continua normal.

## Ponto de integração em `src/main.js`

- Ações de **gameplay** (`rollDice`, `buyItem`, `launch`, `endTurn` etc.) passam a ir por
  um `netWrap` em vez do `wrap` simples:
  - sem rede → comportamento atual, sem diferença nenhuma.
  - conectado como **host** → aplica local (como hoje) e depois transmite o `state`.
  - conectado como **cliente** → não aplica local; manda a ação pro host e espera o
    próximo `state` chegar.
- Ações de **UI local** (`go`, `toggleGuide`, `newGame`) continuam sempre locais: cada
  tela pode navegar/ver dicas sem depender da rede.
- Novo par: `hostOnline()` / `joinOnline(id)`, chamados pela tela de setup.

## Risco e plano de reversão

- Tudo isolado em `src/net/` + poucas linhas em `main.js`/`setup.js` atrás de um "modo
  online" opcional. Se travar perto do prazo: reverter só esses pontos (ou simplesmente
  não mergear a branch) e a `main` segue com o hot-seat local, que já funciona.
- Nenhum dado de jogo (`src/sim`, `src/data`) muda de formato — dá para tirar a rede sem
  quebrar saves/replays futuros.

## Limitações conhecidas (documentadas, não escondidas)

- Precisa que o host mantenha a aba aberta durante a partida (ele é quem guarda o
  `state`). Se o host fechar, a sala cai — aceitável para uma demo de jurados.
- Validações/erros de ação do cliente só aparecem no toast do host por enquanto.
- Sem reconexão automática se a internet cair no meio (fica para uma v2, se sobrar tempo).
