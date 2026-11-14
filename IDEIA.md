# Ideia do jogo (v2)

> Status: **em discussão**. A v1 era só um ponto de partida. Esta versão junta o que foi conversado depois.
> O que entra até o prazo está na seção 9. O resto é roadmap.

Desafio: **Space Mission Design Game** (NASA Space Apps 2026).
Detalhes do desafio em `space_mission_design_game.txt`.

## 1. O que o desafio pede (resumo)
Um jogo interativo em que o jogador **projeta, gerencia e simula uma missão espacial completa**, tomando decisões de engenharia com recursos limitados e vendo como cada escolha afeta o resultado. Deve servir para iniciantes e, de preferência, suportar equipes de até 4 pessoas.

O núcleo do desafio são os **trade-offs**: toda escolha melhora algo e piora outra coisa (ex.: instrumento melhor = mais ciência, mas mais massa, energia, dados e custo).

Recursos a controlar: **massa, energia, orçamento, dados, comunicações e tempo de vida da missão**.

## 2. Resumo da ideia
Jogo de tabuleiro por turnos, 2D, no navegador, na **corrida espacial da Guerra Fria**. Cada jogador é uma agência espacial com uma **missão como condição de vitória**. Ganha quem cumprir a sua primeiro.

O tabuleiro **não é o jogo principal**. Ele serve para conseguir recursos, tomar decisões, visitar lojas e sofrer eventos de sorte. O centro do jogo continua sendo a **engenharia da nave** e a decisão de **quando lançar**.

### Tensão central
> **Lançar agora (barato e arriscado) ou esperar melhorar (seguro, mas os rivais avançam)?**

Se esperar não custar nada, todo mundo espera e o jogo não tem decisão. Por isso o **custo de esperar** é a **corrida visível**: todos veem o progresso dos rivais, e **quem lança primeiro leva o bônus de degrau** (seção 8).

**Teste de coerência:** toda mecânica do jogo deve mudar essa decisão. Se não muda, é detalhe e vai para o roadmap.

## 3. Ciclo de cada turno
1. **Joga o dado e anda no tabuleiro** (recursos, loja, evento, prédio).
2. **Avança na missão**, escolhendo uma ação: pesquisar, montar ou melhorar a nave, ou **tentar lançar**.
3. A tecnologia soma automaticamente (seção 5).

Se a nave já estiver em voo, as casas em que o jogador cai também podem disparar eventos na missão (seção 7).

## 4. Tabuleiro
O tabuleiro é circular e compartilhado. Tipos de casa:

| Casa | O que acontece |
|---|---|
| **Terreno livre** | O jogador escolhe construir um prédio (seção 5) |
| **Prédio de outro jogador** | Pode pagar uma taxa para usá-lo |
| **Loja** | Compra peças e instrumentos (seção 6) |
| **Evento** | Sorte ou azar: corte de verba, descoberta, falha de fornecedor. É onde entra o **RNG** |
| **Dinheiro** | Ganha verba, mas o valor é **baixo de propósito**. Só compensa para quem está desesperado. Quem apostar demais nisso perde o ritmo da missão |
| **Ajuda internacional** | Dinheiro ou pontos de tecnologia (sem recurso extra de "prestígio") |
| **Espionagem** | Descobre a nave de um rival ou atrapalha a missão dele em voo |

A **volta completa** no tabuleiro dá uma verba fixa pequena, para ninguém travar.

### Contratos entre jogadores
Para incentivar a troca, os dois lados precisam ganhar:

> **Contrato:** o jogador A compra uma peça (ou paga um upgrade) para o jogador B. B recebe com **desconto ou bônus extra**, e A ganha **dinheiro ou pontos de tecnologia** em troca.

- Os dois saem melhor do que sozinhos, então vale propor.
- Tem dilema: ajudar um rival o deixa mais perto de ganhar.
- Uma regra só, com um botão "propor contrato". Sem sistema de negociação livre.

## 5. Prédios e tecnologia
**Tecnologia é um número** que sobe todo turno:

- **Base:** todo jogador ganha +1 por turno. Quem não construir nada continua no jogo, só mais devagar.
- **Laboratório:** cada nível do laboratório soma por cima (ex.: +1 por nível).

**Upgrade em vez de mais casas.** Ao cair numa casa livre, o jogador pode construir um prédio. Depois disso, ele **sobe o nível do mesmo prédio** gastando dinheiro, sem precisar de outra casa. Assim o limite do tabuleiro não limita o jogo.

| Prédio | Efeito por nível |
|---|---|
| **Laboratório** | Mais tecnologia por turno |
| **Fábrica** | Mais desconto em peças |
| **Controle de missão** | Menos risco nos eventos durante o voo |
| **Patrocinador** | Gera dinheiro, mas **fraco** (o nerf proposital) |

Para evitar bola de neve:
- o custo de cada upgrade sobe a cada nível;
- cada peça nova pede mais tecnologia que a anterior, então o ritmo se equilibra;
- quem está muito atrás pode ter desconto no upgrade.

**Peças bloqueadas por tecnologia.** Cada peça tem um nível mínimo (ex.: foguete pesado exige tecnologia 3).

**Pesquisa estilo Civ (futuro).** A tecnologia pode virar uma árvore com ramos, e o jogador escolhe a direção (propulsão, comunicação, energia). Na versão atual, só o número.

## 6. Loja e trade-offs
Nenhum item é só bônus. Todo item melhora algo e piora outra coisa:

| Item | Ganha | Perde |
|---|---|---|
| Câmera de alta resolução | + ciência | + massa, + energia, + dados |
| Painel solar grande | + energia | + massa, + custo |
| Antena potente | + comunicação | + energia, + custo |
| Foguete pesado | Cabe mais carga | + custo |

Tem também o trade-off de **tempo**: esperar pela peça perfeita ou lançar agora com uma nave mais simples (ver seção 8).

Revenda (a definir): devolve o valor cheio **antes do lançamento** e perde valor depois.

## 7. Missão em voo e eventos
Cada missão tem um **tempo de voo** em turnos (2 a 4). Enquanto a nave viaja, o jogador continua jogando no tabuleiro, e **cada casa em que cai pode disparar um evento na missão**:

| Casa | Evento | O que testa |
|---|---|---|
| Clima espacial | Tempestade solar | Blindagem, energia |
| Detritos | Micrometeoroide | Estrutura, redundância |
| Comunicação | Perda de sinal | Antena |
| Oficina | Chance de consertar | Verba de reserva |
| Casa neutra | Nada acontece | |

- Antes do evento, o jogo **mostra a chance de falha** calculada pelos atributos da nave. Assim o jogador vê que o trade-off que ele fez na montagem mudou o resultado.
- Um foguete mais rápido gasta mais combustível e custa mais. Um mais lento é barato, mas tem mais turnos de risco.
- O jogador tem **decisões no meio da missão**: gastar a reserva para consertar, abortar, insistir.
- Eventos garantidos nos pontos-chave (chegada, pouso) para o voo nunca ser vazio.

## 8. Missões, degraus e incentivo a tentar
Cada missão tem **degraus**, do mais simples ao mais ambicioso (ex.: suborbital, órbita, sonda lunar, pouso). Todo degrau concluído dá um **bônus** (verba, desconto na loja ou proteção contra falha).

Isso cria o incentivo central do jogo: **tentar cedo com um foguete simples** em vez de esperar pelo ideal. É como a engenharia espacial de verdade, com voos de teste.

Duas regras para o incentivo funcionar:
- **Etapas contam.** A missão é uma sequência (subida, órbita, viagem, chegada). Se a nave falha no pouso, o jogador ainda ganha o bônus de ter chegado à órbita.
- **Falhar também dá algo.** Cada falha gera *dados de falha* que viram pontos de tecnologia ou reduzem o risco da próxima tentativa. O prejuízo é tempo e dinheiro, nunca "perdi tudo".

Missões inspiradas na Guerra Fria:

| Missão | Exigência de engenharia |
|---|---|
| Primeiro satélite | Foguete simples, comunicação básica |
| Ser vivo em órbita | Suporte de vida, cápsula, mais massa |
| Sonda lunar | Comunicação de longa distância |
| Pouso tripulado na Lua | Foguete pesado, orçamento alto, muita energia |
| Estação espacial | Energia contínua, longa duração |

Cada missão é uma tabela pequena (degraus, requisitos, efeito do bônus). **Adicionar missão nova é só preencher dados**, sem código novo.

### Fim da partida e curva de tensão
- **Vitória:** o primeiro a concluir o **degrau final** da sua missão ganha.
- **Limite de rodadas:** se ninguém conseguir, ganha quem completou **mais degraus**. O número de rodadas é definido depois de testar o jogo.
- **Sem eliminação:** se faltar dinheiro, o jogador pega um **socorro de emergência** (ganha verba, mas perde tecnologia ou verba futura).
- **Curva:** os degraus escalam sozinhos. O primeiro é barato e seguro, o último é caro e arriscado, e o custo de falhar sobe junto.

## 9. Prioridades
O foco agora é **fazer o jogo fazer sentido**. Acabamento, tutorial, modo solo, tempo de partida e camada educativa extra vêm depois de o jogo estar pronto e testado.

O time já tem uma base jogável (tabuleiro, oficina, simulação, 3 missões). Ordem de prioridade:

1. **Tensão central fechada** (lançar vs esperar, com a corrida visível como custo de esperar).
2. **Loop de turno claro** (o que o jogador faz, em ordem).
3. **Trade-offs da nave** funcionando e visíveis na tela.
4. **Degraus, bônus e dados de falha** (seção 8).
5. **Contratos entre jogadores** (seção 4).
6. O resto (prédios e tecnologia mais elaborados, voo com eventos detalhados) conforme sobra tempo.

### Teste de coerência
| Sistema | Muda a decisão "lanço agora ou espero"? |
|---|---|
| Tecnologia e laboratório | Sim: dá motivo para esperar |
| Peças bloqueadas por tecnologia | Sim: reforça o motivo para esperar |
| Degraus com bônus | Sim: dá motivo para lançar cedo |
| Dados de falha | Sim: torna lançar cedo menos punitivo |
| Corrida visível | Sim: é o custo de esperar |
| Eventos no voo | Sim: risco de lançar |
| Contratos | Sim: ajudam ou atrapalham o prazo de alguém |
| Casas de dinheiro nerfadas | Sim: tentação com custo |
| Espionagem, facções, árvore Civ | Não: roadmap |

## 10. Roadmap (depois do prazo)
- Árvore de tecnologia com ramos (estilo Civ)
- Espionagem e sabotagem entre jogadores
- Facções com vantagens diferentes (ex.: EUA e URSS)
- Equipes de até 2 por bloco, com papéis divididos
- Níveis de dificuldade e cenários extras
- Cooperação opcional entre jogadores (ex.: Apollo-Soyuz)

## 11. Riscos e pontos de atenção
- **Escopo:** muita coisa para pouco tempo. Fazer o fluxo completo simples antes de expandir.
- **Parecer só um Monopoly com tema espacial:** a banca avalia o aprendizado de engenharia. A nave, os trade-offs e o relatório do "porquê" têm que ser o foco.
- **Bola de neve:** quem ganha vantagem cedo tende a ganhar mais. Ver as proteções na seção 5.
- **Sorte demais:** um jogador pode cair em muitas casas ruins durante o voo. Casas neutras e reserva de verba amenizam.
- **Clareza:** o jogador precisa ver na tela os limites de recursos, o nível de tecnologia e o próximo bônus.
- **Tom:** focar em ciência e engenharia, sem glorificar o conflito da Guerra Fria.

## 12. Perguntas em aberto
- Quanto tempo dura uma partida e quantas rodadas é o limite? (definir depois de testar)
- Modo solo (contra bots ou contra a meta) e tutorial: como será? (depois do jogo pronto)
- Quantos níveis tem cada prédio e quanto custa cada upgrade?
- Revenda de peças: como funciona exatamente?
- O voo tem quantos turnos em cada missão?
- Multiplayer: só no mesmo computador (hot-seat) ou online?
- Quem faz o quê (dados, simulação, interface, textos)?
