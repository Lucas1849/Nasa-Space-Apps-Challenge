# Plano: sessões multiplayer com lobby de agências

Evolução do multiplayer P2P (ver `docs/PLANO-P2P.md`, já na `main`) para uma experiência
de sala completa. Requisitos levantados pela equipe em 15/11:

| # | Requisito | Fase |
|---|---|---|
| R1 | Criar partida = criar sessão direto: solo → joga contra o bot; multiplayer → escolhe quantas pessoas e já sai o link da sala | Fase 2 |
| R2 | Link da sala mais curto (hoje é um UUID de 36 caracteres) | Fase 1 |
| R3 | Quem entra pelo link escolhe uma agência diferente — cada jogador controla a sua, como num jogo de tabuleiro | Fase 3 |
| R4 | Menu da sessão mostra as vagas de agência como retângulos clicáveis; cada um "ocupa" a sua antes de começar | Fase 3 |

**Atenção ao prazo**: a submissão é hoje (15/11) às 23:59. As fases estão ordenadas para
que cada uma seja entregável sozinha; se o tempo acabar no meio, o que já mergeou
continua funcionando e o painel experimental atual segue como fallback.

## Decisões de design (antes de codar)

1. **Código curto em vez de UUID (R2).** O PeerJS aceita ID de peer customizado
   (`new Peer(id)`). Geramos um código de 6 caracteres num alfabeto sem ambiguidade
   (sem `0/O`, `1/I/L`) e registramos o peer como `smdg-<CODIGO>` (prefixo evita colisão
   com outros usuários do broker público). O link vira `?sala=A3F9KQ` — curto o bastante
   para falar em voz alta, estilo Kahoot. Se o broker devolver `unavailable-id`
   (código já em uso), sorteia outro e tenta de novo (até 3 vezes).
2. **Identidade de jogador = id de peer do WebRTC.** O host já recebe `conn.peer` em cada
   mensagem (`peer.js`, `onData(data, peerId)`); o cliente conhece o próprio `peer.id`.
   É o suficiente para saber "qual vaga é minha" sem inventar login.
3. **Lobby autoritativo no host, como o jogo.** A sessão é um objeto
   `{ code, slots: [{ peerId, name } | null, ...], started }` que só o host altera;
   clientes mandam `{type:'claim'|'release'}` e recebem `{type:'lobby', session}`.
   Mesmo padrão do `state` do jogo — nada de lógica nova de consenso.
4. **Lados (EUA/URSS) continuam sorteados.** "Escolher agência" = ocupar uma vaga e dar
   o nome da sua agência. O sorteio equilibrado de lados do `startGame` não muda
   (é decisão de game design registrada na IDEIA.md v3, seção 9).
5. **Hot-seat local não morre.** Os 124 testes e a demo de fallback dependem dele. O novo
   fluxo oferece "com amigos no mesmo aparelho" como opção explícita (R1 fala de solo e
   multiplayer online; o hot-seat fica como terceiro caminho, sem custo).
6. **Lógica de lobby em módulo puro** (`src/net/lobby.js`, sem DOM), para testar com
   `node --test` — mesma regra das pastas `sim/` e `board/` (`docs/ARQUITETURA.md`).
7. **`dist/jogo.html` é gerado**: rodar `npm run build` ao fim de cada fase que tocar
   `src/`, antes do commit.

## Fase 0 — Protocolo de sessão (fundação, junto com a Fase 1)

Infra mínima para as fases seguintes. Sem UI nova.

- `src/net/peer.js`: `hostRoom`/`joinRoom` passam a aceitar `peerId` customizado e expor
  o próprio id; `joinRoom` ganha callback de erro pós-conexão (hoje `peer.on('error')`
  só funciona antes do handshake — achado da revisão).
- `src/net/sync.js`: novos tipos de mensagem `claim`, `release`, `lobby`, `start`
  (além dos atuais `action`/`state`). `onData` do host ganha o `peerId` de quem mandou
  (o transporte já fornece; o sync hoje ignora).
- `src/net/lobby.js` (novo, puro): `createSession(code, count)`, `claimSlot(session,
  peerId, slot, name)`, `releaseSlot(session, peerId)`, `canStart(session)`. Regras:
  uma vaga por peer, não ocupar vaga alheia, nome obrigatório (até 20 chars, como o
  input atual), só inicia com todas as vagas ocupadas.
- **Testes**: `test/lobby.test.mjs` cobrindo claim/release/duplicado/start.
- **Critério de aceite**: testes novos passam; jogo atual segue intacto (124 testes).

## Fase 1 — Código curto de sala (R2)

Pequena e independente; primeira a mergear.

- `src/net/roomCode.js` (novo, puro): `newCode()` → 6 chars do alfabeto seguro;
  `normalizeCode(raw)` → aceita código digitado (qualquer caixa) ou link colado e extrai
  o código. **Teste**: `test/room-code.test.mjs`.
- `hostRoom` usa `smdg-<code>` como peer id, com re-sorteio em `unavailable-id`.
- `?sala=` e o campo "Entrar na sala" passam a usar o código curto (compatibilidade com
  UUID antigo não é preciso — nenhuma sala vive mais que uma aba aberta).
- **Critério de aceite**: criar sala mostra link tipo `.../?sala=A3F9KQ`; entrar colando
  o link OU digitando só `a3f9kq` funciona; duas abas sincronizam como hoje.

## Fase 2 — Criar sessão direto (R1)

Reorganiza a tela inicial em torno de "como você quer jogar", sumindo com o painel
"experimental" avulso.

- `src/ui/setup.js`: três caminhos no lugar do contador de agências + painel online:
  1. **Jogar sozinho** — nome da agência → começa contra o bot (fluxo atual de 1 jogador).
  2. **Com amigos no mesmo aparelho** — contador 2–4 + nomes (hot-seat atual).
  3. **Com amigos online** — escolhe 2–4 → "Criar sala" → cria a sala na hora e já
     mostra link + código + botão copiar; vai para o lobby (Fase 3).
  Sandbox e orientações continuam onde estão.
- Quem abre `?sala=<code>` cai direto no lobby da sala (sem ver a tela de setup inteira).
- **Critério de aceite**: dá para começar solo em 2 cliques; escolher online gera o link
  imediatamente, sem passo intermediário; hot-seat intocado (testes de UI passam).

## Fase 3 — Lobby com vagas de agência (R3 + R4)

O coração do pedido: a sala como mesa de tabuleiro.

- Tela nova `lobby` em `src/ui/lobby.js` (+ registro em `screens.js`):
  - Código da sala em destaque + link de convite com botão copiar.
  - **Um retângulo por vaga** (quantidade que o host escolheu). Vazio: "Clique para
    ocupar". Ao clicar: campo de nome da agência dentro do próprio retângulo + confirmar.
    Ocupado por você: realce + "você" + editar nome/liberar. Ocupado por outro: nome
    dele, bloqueado. Host tem um selo de anfitrião.
  - Host vê "Começar a partida" habilitado só com todas as vagas ocupadas
    (`canStart`); pode também remover uma vaga vazia se alguém desistiu (vira sala menor).
- Ao começar: host roda `startGame` com os nomes das vagas (ordem dos retângulos) e
  manda `{type:'start', state, assignments}` — cada cliente guarda `myPlayerId` (o índice
  do jogador que é dele) e cai na tela do jogo.
- Entrar numa sala já iniciada: mensagem "Esta partida já começou" (reconexão é Fase 5).
- **Critério de aceite** (teste manual com 2+ abas): cada aba ocupa uma vaga distinta;
  uma aba não consegue tomar a vaga da outra; o jogo começa com as agências nomeadas
  por cada jogador; testes do lobby puro cobrem as regras.

## Fase 4 — Cada um joga a sua vez (consequência do R3)

Sem isso, "cada jogador com sua agência" é só visual: hoje qualquer cliente pode agir
no turno de qualquer um, e quem erra não vê o motivo.

- `sync.js`: host só aceita ação de gameplay do peer dono da agência da vez
  (`assignments` da Fase 3 × `state.turn`). Ação fora da vez → resposta de erro, sem
  tocar no estado. Fecha o achado nº 6 da revisão do PR #7.
- Resposta ao autor: host manda `{type:'result', error}` para o peer que agiu — o
  cliente finalmente vê toast de erro/sucesso (fecha a limitação documentada no
  PLANO-P2P: "cliente ainda não recebe o texto do erro").
- `src/ui/`: fora da sua vez, o cliente vê o tabuleiro em modo espera ("Vez de X");
  a tela de troca ("passe o dispositivo") é pulada no modo online — ela só existe por
  causa do hot-seat.
- **Teste**: regra de autorização como função pura em `lobby.js`/`sync.js` + caso em
  `test/lobby.test.mjs`.
- **Critério de aceite**: aba B não consegue rolar o dado no turno da aba A; quem age
  e erra vê o toast explicando.

## Fase 4b — Espectador ativo: planejar enquanto o rival joga (A FAZER)

> Requisito levantado em 15/11, depois da Fase 4 entrar. Status: **documentado, não
> implementado** — dono a definir.

Hoje, fora da sua vez, o jogador online vê só a tela de espera (`ui/wait.js`). Isso
protege os segredos, mas deixa o jogador parado. O pedido da equipe:

1. **Ver o tabuleiro** enquanto o rival joga: posição dos peões, prédios, casas — o que
   já é público no hot-seat. NÃO mostrar o que é privado do rival (diário dele, nave
   dele, cartas dele).
2. **Interagir com a própria nave** para planejar a próxima jogada: abrir a oficina,
   montar/desmontar peças, ver o checklist e o risco do voo — tudo da MINHA agência.

### Caminho sugerido de implementação

- **Onde entra**: o desvio está em `render()` no `src/main.js` (branch `waiting`); hoje
  ele troca tudo por `waitScreen(state, myPlayerId)`. A mudança é esse modo de espera
  virar uma visão navegável em vez de um cartão estático.
- **Tabuleiro espectador**: renderizar `boardScreen` com um "modo espectador": banner
  fixo "Vez de X — você pode planejar", sem os botões de ação (rolar, resolver casa,
  passar a vez). Atenção à lateral: o diário/painel mostrado deve ser o do MEU
  `myPlayerId`, não o de `state.turn` (hoje as telas assumem que quem olha é o jogador
  da vez — esse é o trabalho de verdade desta fase).
- **Oficina de planejamento**: duas opções, decidir com a equipe antes de codar:
  - *(a) Rascunho local*: fora da vez, `buyItem`/`sellItem` etc. agem numa CÓPIA local da
    nave (não passam por `net.dispatch`); ao chegar a minha vez, ofereço "aplicar o
    rascunho" (reexecuta as ações na ordem via rede). Mais trabalho, experiência melhor.
  - *(b) Liberar ações da própria nave fora da vez*: afrouxar a trava de turno
    (`turnBlockError`) para um subconjunto de ações que só tocam `players[myPlayerId]`
    (`buyItem`, `sellItem`, `chooseLauncher`, `chooseOrbit`). Mais simples, mas CUIDADO:
    essas ações gastam verba de verdade e hoje operam em `currentPlayer(state)` — seria
    preciso que aceitassem o jogador explícito, senão o espectador mexe na nave do rival.
    Mudança em `src/sim/actions.js` com testes.
- **O que continua travado fora da vez, sempre**: rolar dado, resolver casa, dilemas,
  espionagem, construir, lançar, avançar voo, passar a vez.
- **Teste**: casos novos em `test/lobby.test.mjs` (quais ações a trava libera para o
  espectador) e teste de UI garantindo que a lateral do tabuleiro espectador mostra a
  agência de quem olha.
- **Critério de aceite**: com a vez do rival, consigo abrir meu tabuleiro e minha
  oficina, mexer na minha nave e ver meu checklist; não consigo ver a nave/diário do
  rival nem executar nenhuma ação de turno; quando minha vez chega, a tela troca sozinha
  como hoje.

## Fase 5 — Robustez (depois do prazo)

Explicitamente fora do escopo de hoje; registrado para não se perder:

- Queda e reconexão: vaga marcada "desconectado", reentrar pelo código reassume a vaga.
- Aviso "sala encerrada" quando o host fecha a aba.
- Privacidade real do diário: hoje o cliente recebe o `state` inteiro (os segredos dos
  rivais estão no payload, só não aparecem na tela). Filtrar por jogador é trabalho de
  servidor-de-verdade; para a banca, documentar como limitação conhecida.

## Fluxo Git

Uma branch por fase (`net/room-code`, `net/session-flow`, `net/lobby`, `net/turn-lock`),
PR revisado antes de mergear — igual ao PR #7. `npm test` + teste manual com duas abas
antes de cada push. `npm run build` em toda fase que tocar `src/`.

## Plano B

Qualquer fase pode parar no meio sem quebrar a `main`: o painel atual (criar/entrar com
código) continua existindo até a Fase 2 substituí-lo, e o hot-seat cobre a demo em
último caso.
