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

## 13. Propostas do Henrique (para revisão)

> Status: **proposta**. Não substitui nada acima até o grupo aprovar. Responde às perguntas em
> aberto sobre fim de partida, duração do voo e multiplayer, e corrige um problema de
> balanceamento da versão atual.

### 13.1 Problema: missão fácil sempre vence
Hoje cada jogador **escolhe** a missão no setup e ganha quem terminar primeiro. Como as missões
vão de "fácil" a "muito difícil" sem compensação, quem pega o Primeiro satélite quase sempre
vence. O jogador esperto sempre escolhe a fácil.

### 13.2 Cartas de vitória: 4 condições, uma por jogador
A condição de vitória passa a ser uma **carta de agência**, **sorteada sem repetição**. As
cartas usam as missões que já existem e cada uma corresponde a um critério de pontuação do
desafio.

| Carta | Para vencer | Perfil | Critério do desafio |
|---|---|---|---|
| **Exploradora** | Cumprir o Pouso tripulado | Uma aposta grande, cara e arriscada | Sucesso da missão |
| **Científica** | Somar 15 de ciência em missões cumpridas | Instrumentos bons, destinos distantes | Valor científico |
| **Infraestrutura** | Cumprir 3 missões na órbita da Terra (satélite, ser vivo, GEO) | Missões baratas e confiáveis | Uso eficiente de recursos |
| **Pioneira** | Ser o primeiro do mundo em 2 missões quaisquer | Lançar cedo, arriscar | Boas decisões (lançar agora ou esperar) |

- Cada jogador cumpre cada missão **no máximo uma vez**.
- **Recorde mundial:** o jogo registra quem cumpriu cada missão primeiro.
- As cartas **disputam as mesmas missões**, então a corrida continua: a Pioneira compete com
  todos, Infraestrutura e Científica querem a GEO, Científica e Exploradora querem a Lua.
- No hot-seat todos veem as cartas de todos, e isso faz parte da corrida visível.
- Números (15 de ciência, 3 missões, 2 recordes) são **chutes para testar**. Suspeita: a
  Exploradora é a mais difícil e pode precisar de verba inicial maior.

| Jogadores | Distribuição |
|---|---|
| 1 (solo) | Sorteia 1 carta; joga contra o limite de rodadas e compara com a história real (13.5) |
| 2 e 3 | Sorteia sem repetir; as cartas que sobram ficam de fora (variedade entre partidas) |
| 4 | Uma carta para cada |

Por que não 2 condições para 4 jogadores: os pares com a mesma carta viram duas partidas
separadas e quem sai na frente dispara. Fica para o modo equipe EUA × URSS do roadmap.
Por que não deixar escolher: todos pegariam a que parece mais fácil.
Futuro: com 6 cartas, cada um compra 2 e fica com 1.

### 13.3 Estrutura da rodada
Uma **rodada** = todos jogam uma vez (hot-seat). Cada turno tem 3 fases:

1. **Tabuleiro (sempre):** rola o dado, anda, aplica a casa.
2. **Uma ação, conforme a nave:**
   - **No chão:** compra e vende na oficina à vontade; se quiser, **lança** (encerra o turno).
   - **Em voo:** não mexe na nave; pode comprar peças para a próxima missão (estoque).
   - **Missão cumprida:** escolhe a próxima missão.
3. **Voo avança uma etapa** (se em voo): evento da etapa com a chance de falha **e o motivo**
   ("40%: blindagem 1/3 +25%, sem redundância +15%"); jogador decide consertar, abortar ou
   insistir.
   - Etapa superada: avança; a última cumpre a missão.
   - Etapa falhou: a nave é perdida e o jogador ganha **dados de falha**, que reduzem o risco
     **do sistema que falhou** na próxima tentativa (ex.: falhou por energia → −20% de risco de
     energia). O relatório mostra essa ligação: é o passo *Verify* do ciclo da NASA.

**Fim da rodada:** confere as cartas. A rodada **termina antes** de declarar o vencedor, para
todos jogarem o mesmo número de turnos. Se dois cumprirem a carta na mesma rodada, desempata
pelo progresso extra (ex.: ciência a mais). No limite de rodadas, vence quem tiver **maior %
de progresso** na própria carta.

### 13.4 Etapas do voo por destino

| Destino | Etapas | Turnos em voo | Missões |
|---|---|---|---|
| LEO | Subida → Órbita | 1 | Primeiro satélite, Ser vivo |
| GEO | Subida → Transferência → GEO | 2 | Satélite de comunicação |
| Lua | Subida → Transferência → Chegada (→ Pouso) | 3 a 4 | Sonda lunar, Pouso tripulado |

Destinos distantes = mais eventos = mais risco. A decisão "lanço agora ou espero" existe para
todos, mas pesa diferente em cada carta.

### 13.5 Contexto de Guerra Fria
- **Cada rodada é um ano**, de **1957** (Sputnik) a **1969** (Apollo 11): **13 rodadas**. O ano
  aparece no topo da tela.
- **História alternativa:** os jogadores comandam **agências fictícias** (nome escolhido no
  setup). Funciona com 4 jogadores e evita colocar alguém para "jogar de URSS contra EUA".
- **Cartão "Na história real"** no relatório de sucesso:

  | Missão | Marco real |
  |---|---|
  | Primeiro satélite | Sputnik 1 (URSS, 1957); Explorer 1 (EUA, 1958) |
  | Ser vivo em órbita | Sputnik 2, com a cadela Laika (URSS, 1957) |
  | Satélite GEO | Syncom 3 (EUA, 1964) |
  | Sonda lunar | Luna 2 (URSS, 1959) |
  | Pouso tripulado | Apollo 11 (EUA, 1969) |

  **Conferir as datas nas páginas de história da NASA (nasa.gov/history) antes de publicar** e
  citar a fonte na tela e no `SUBMISSION.md`. Isso conta para o requisito de recurso da NASA.
- **Solo:** no fim, compara com a história ("Você pousou na Lua em 1966, 3 anos antes da
  história real"), sem disputa de recorde com eventos reais.
- **Casas com cara de época** (só texto, mesma mecânica): "Discurso presidencial: a Lua vira
  prioridade", "Crise diplomática: verba desviada", "Ano Geofísico Internacional: cooperação
  científica", "Teste de motor falha na plataforma".
- **Tom:** prestígio e ciência, nada de armas ou caricatura de países. Epílogo com o
  **Apollo–Soyuz (1975)**: a competição que virou cooperação.

### 13.6 Ordem de implementação sugerida
1. Ano na tela, limite de 13 rodadas, textos de época nas casas (só dados e texto).
2. Cartas de vitória (`src/data/objectives.js`, uma função `check` por carta) e registro de
   recordes no estado.
3. Escolher a próxima missão após cumprir uma.
4. Cartão "Na história real" (`src/data/history.js`).
5. Voo em várias etapas (mexe em `src/sim/actions.js` e `src/sim/state.js`: **avisar o grupo**).
6. Dados de falha por sistema.

### 13.7 Decisões para o grupo
- Aprovar as 4 cartas e os números (15 de ciência, 3 missões, 2 recordes).
- Falha = nave perdida inteira (proposta) ou só parte?
- 13 rodadas (1957–1969) está bom?


---

# Ideia do jogo (v3)

> Status: **em discussão**. Esta versão **não substitui** a anterior: o v2 continua em [`IDEIA.md`](IDEIA.md) e o v1 está no histórico do Git.
> O v3 reúne as decisões tomadas depois do v2 e marca o que mudou.

Desafio: **Space Mission Design Game** (NASA Space Apps 2026). Detalhes em `space_mission_design_game.txt`.

## O que mudou em relação ao v2
| Tema | v2 | v3 |
|---|---|---|
| Win con | Uma missão ou escada genérica | **Uma escada de missões por lado da Guerra Fria** (EUA ou URSS) |
| Rival | Corrida visível | **Rival escondido**; a casa de espião é a fonte de informação |
| Tempo | Rodadas | **Anos** (3 rodadas = 1 ano), com calendário histórico |
| Solo | Não resolvido | **Bot** que segue o calendário histórico com variação |
| Eventos | Ligados à casa | **Cartas de dilema** sorteadas conforme a situação do jogador |
| Falha no voo | Abortar | **Missão de consolação** (crédito parcial) |
| 4 jogadores | Equipes com papéis (ideia descartada) | **Cada um joga sozinho**, lados sorteados |

## 1. Resumo
Jogo de tabuleiro por turnos, 2D, no navegador, na **corrida espacial da Guerra Fria**. Cada jogador é uma agência espacial de um dos dois lados (**EUA** ou **URSS**) e tem uma **win con**: completar a **escada de missões** do seu lado. O primeiro a completar o degrau final da própria escada ganha.

O centro do jogo continua sendo a **engenharia da nave** e a decisão de **quando lançar**. O tabuleiro serve para conseguir recursos, tomar decisões, visitar lojas e sofrer eventos de sorte.

### Tensão central
> **Lançar agora (barato e arriscado) ou esperar melhorar (seguro, mas o rival pode estar na frente)?**

Como o rival é escondido, o jogador **não sabe quanto tempo tem**. O custo de esperar é a dúvida. Para reduzir a dúvida, ele paga pelo espião.

**Teste de coerência:** toda mecânica deve mudar essa decisão. Se não muda, é detalhe.

## 2. Lados e escadas de missões
**Missão** é um degrau (um lançamento concreto). **Win con** é uma escada: a sequência de missões do lado.

| Lado | Escada (exemplo) | Foco |
|---|---|---|
| **EUA** | Primeiro satélite → Ser vivo em órbita → Sonda lunar → Tripulação na Lua | Foguete pesado, suporte de vida |
| **URSS** | Primeiro satélite → Ser vivo em órbita → Estação espacial → (degrau final a definir) | Vida no espaço, energia contínua |

- Cada degrau é **uma nave nova**. O que persiste entre degraus é **tecnologia, prédios, dinheiro e bônus**.
- Cada lado tem **uma vantagem pequena e uma fraqueza pequena** (ex.: um com mais verba, outro com foguetes mais fortes no começo).
- Quem fica atrás recebe um **bônus de recuperação** (o "choque do Sputnik").
- Missões novas e mais escadas (outras nações) são **só dados**, sem código novo.

As missões que já existem em `src/data/missions.js` servem de ponto de partida para os degraus.

## 3. Tempo: anos e calendário
- Cada **turno** é uma jogada de um jogador no tabuleiro.
- **3 rodadas = 1 ano** (todo mundo joga uma vez por rodada). Isso mantém o ano sincronizado com vários peões.
- A casa **"Ano novo"** dá a renda individual do ano e a soma de tecnologia.
- O jogo começa perto de 1957, e o calendário histórico define os marcos do rival no modo solo.

## 4. Tabuleiro
Circular e compartilhado, com dado. Tipos de casa:

| Casa | O que acontece |
|---|---|
| **Terreno livre** | Constrói um prédio (seção 5) |
| **Prédio de outro jogador** | Pode pagar uma taxa para usá-lo |
| **Loja** | Compra peças e instrumentos (seção 6) |
| **Evento** | Sorteia uma **carta de dilema** (seção 7) |
| **Dinheiro** | Ganha verba, mas o valor é **baixo de propósito** |
| **Espião** | Paga para descobrir o estado de um rival (seção 8) |

**Escolha no movimento:** o jogador rola 2 dados e escolhe qual usar (ou paga para andar mais). Ainda tem sorte, mas ele sente que decidiu.

## 5. Prédios e tecnologia
**Tecnologia é um número** que sobe todo turno de ano novo:
- **Base:** todo jogador ganha +1 por ano.
- **Laboratório:** cada nível soma por cima.

**Upgrade em vez de mais casas:** ao cair numa casa livre, o jogador constrói um prédio e depois **sobe o nível do mesmo prédio** com dinheiro, sem precisar de outra casa.

| Prédio | Efeito por nível |
|---|---|
| **Laboratório** | Mais tecnologia por ano |
| **Fábrica** | Mais desconto em peças |
| **Controle de missão** | Menos risco durante o voo |
| **Patrocinador** | Gera dinheiro, mas **fraco** (nerf proposital) |

Contra bola de neve: o custo de upgrade sobe por nível; cada peça nova pede mais tecnologia; quem está muito atrás tem desconto. **Peças são bloqueadas por nível de tecnologia** (ex.: foguete pesado exige tecnologia 3).

## 6. Loja e trade-offs
Nenhum item é só bônus. Todo item melhora algo e piora outra coisa:

| Item | Ganha | Perde |
|---|---|---|
| Câmera de alta resolução | + ciência | + massa, + energia, + dados |
| Painel solar grande | + energia | + massa, + custo |
| Antena potente | + comunicação | + energia, + custo |
| Foguete pesado | Cabe mais carga | + custo |

Idea a testar: **sinergias** entre peças (ex.: antena + painel solar certo dão bônus), para o jogador descobrir combinações.

## 7. Cartas de dilema (RNG com decisão)
Cair numa casa de evento sorteia uma carta com **escolha**, não só um número. A carta depende da situação do jogador, então **sempre existe um dilema válido**:

| Situação | Dilemas possíveis |
|---|---|
| Sem missão em andamento | Orçamento, política, cientistas (ex.: "o Congresso quer resultados: corta o laboratório ou promete um lançamento?") |
| Montando a nave | Sobre a nave (ex.: "o fornecedor atrasou a peça: espera ou compra uma pior?") |
| Nave em voo | Sobre a missão (ex.: "perda de sinal: gasta a reserva para consertar?") |

### Voo
- A missão tem um **tempo de voo** em turnos, e as casas em que o jogador cai durante o voo podem disparar eventos.
- Os riscos são **mostrados** antes de resolver, calculados pelos atributos da nave. Assim o jogador vê que o trade-off feito na montagem mudou o resultado.
- **Missão de consolação:** se a missão falha no meio, a nave pode cumprir um objetivo menor com **crédito parcial** (ex.: a sonda não pousa, mas faz um sobrevoo lunar).
- **Reserva de verba:** o jogador pode gastá-la no meio do voo para reduzir o risco.
- **Falha gera dados** que viram tecnologia ou reduzem o risco da próxima tentativa. O prejuízo é tempo e dinheiro, nunca "perdi tudo".
- Não existe "abortar": só faria sentido se continuar tivesse um custo que abortar evitasse.

## 8. Rival escondido e espionagem
- O estado do rival é **totalmente escondido**. Ninguém anuncia nada.
- A **casa de espião** (e cartas de espionagem) revela o estado do rival: **degrau atual e quanto a nave está pronta**.
- **Boatos** nas cartas de evento dão informação vaga, às vezes errada.
- O **fim da partida é revelado** quando alguém cumpre o degrau final.
- A espionagem não pode ser barata nem cara demais: custo médio e limite de **uma por ano** (a ajustar nos testes).

## 9. Modos de jogo
- **1 jogador:** o outro lado é um **bot**, que segue o calendário histórico com variação.
- **2 jogadores:** os lados são sempre **diferentes** (um EUA, um URSS), sorteados.
- **3 ou 4 jogadores:** lados sorteados de forma **equilibrada** (2 contra 2, ou 2 contra 1). **Cada um joga sozinho**, com a própria nave e os próprios recursos. Quem fica no mesmo lado joga a mesma escada e **disputa os mesmos degraus**: o primeiro leva o bônus cheio e o outro leva menos.
  - Opcional: contratos entre jogadores do mesmo lado são mais baratos.
- Em um único computador, o jogo precisa de uma **tela de troca** ("passe o dispositivo") entre turnos para esconder o estado de cada um.

Ideia descartada: equipes de 2 com papéis divididos. Exigia regras extras e não funcionava bem em dupla.

## 10. Contratos entre jogadores
> **Contrato:** o jogador A compra uma peça (ou paga um upgrade) para o jogador B. B recebe com **desconto ou bônus extra**, e A ganha **dinheiro ou tecnologia** em troca.

Os dois lados ganham, mas ajudar um rival o deixa mais perto de ganhar. É o "Apollo-Soyuz" do jogo. Uma regra só, com um botão "propor contrato".

## 11. Fim da partida
- **Vitória:** o primeiro a concluir o **degrau final** da própria escada.
- **Limite de rodadas:** se ninguém conseguir, ganha quem completou **mais degraus**. O número é definido depois de testar.
- **Sem eliminação:** se faltar dinheiro, o jogador pega um **socorro de emergência** (ganha verba, mas perde tecnologia ou verba futura).
- **Curva:** os degraus escalam sozinhos. O primeiro é barato e seguro, o último é caro e arriscado, e o custo de falhar sobe junto.

## 12. Teste de coerência
| Sistema | Muda a decisão "lanço agora ou espero"? |
|---|---|
| Tecnologia e laboratório | Sim: dá motivo para esperar |
| Peças bloqueadas por tecnologia | Sim: reforça o motivo para esperar |
| Degraus com bônus | Sim: dá motivo para lançar cedo |
| Dados de falha e missão de consolação | Sim: tornam lançar cedo menos punitivo |
| Rival escondido e espião | Sim: criam a dúvida sobre o tempo que resta |
| Dilemas | Sim: cada carta é uma decisão |
| Eventos no voo | Sim: risco de lançar |
| Contratos | Sim: ajudam ou atrapalham o prazo de alguém |
| Casas de dinheiro nerfadas | Sim: tentação com custo |

## 13. Riscos e pontos de atenção
- **Parecer só um Monopoly com tema espacial:** a nave, os trade-offs e o relatório do "porquê" têm que ser o foco.
- **Bola de neve:** ver as proteções na seção 5 e o bônus de recuperação.
- **Rival escondido demais:** o jogador não pode jogar às cegas. O espião e os boatos precisam dar informação suficiente.
- **Sorte demais:** casas neutras e a reserva de verba amenizam.
- **Clareza:** o jogador precisa ver na tela os limites de recursos, o nível de tecnologia e o degrau atual.
- **Tom e marca:** focar em ciência e engenharia, sem glorificar o conflito. Usar arte própria, sem logos nem bandeiras da NASA. Os números do jogo são fictícios.

## 14. Roadmap
- Mais nações e escadas (Europa, China)
- Árvore de tecnologia com ramos (estilo Civ)
- Sinergias entre peças
- Níveis de dificuldade e cenários extras
- Modo online, para o esconder de informação sem tela de troca

## 15. Perguntas em aberto
- Quais são os degraus exatos de cada escada e o degrau final da URSS?
- Quanto tempo dura uma partida e quantas rodadas é o limite? (definir depois de testar)
- Quantos níveis tem cada prédio e quanto custa cada upgrade?
- Quanto custa o espião e o que ele revela exatamente?
- Quais e quantas cartas de dilema por situação?
- Vantagem e fraqueza de cada lado.
- Tutorial e camada educativa extra (depois do jogo pronto).

## 16. O que já está no jogo (Daniel, 14/11)

> Status: **implementado** na branch `daniel/ideia-v2`. Segue esta v3 e aproveita da v2 o que a v3
> manteve. Todos os números são chutes para testar e ficam em `src/data/`, sem código novo para mudar.

### 16.1 O que faltava no tabuleiro para a ideia funcionar
O tabuleiro antigo (8 casas, quase todas de dinheiro) tinha quatro problemas:

1. **Não tinha decisão.** Agora há 2 dados à escolha, cartas de dilema, terrenos (construir ou não,
   qual prédio), prédios de rivais (pagar para usar ou não) e espionagem.
2. **Não falava com a engenharia.** As casas dão o que a oficina usa: tecnologia, desconto, proteção.
   Com a nave em voo, a casa de evento vira o imprevisto da próxima etapa.
3. **Dinheiro dependia de sorte.** O Ano novo dá verba e tecnologia fixas a cada 3 rodadas. As casas
   de dinheiro ficaram fracas, como a seção 4 pede.
4. **Não tinha interação.** Usar o prédio do rival paga o dono e dá um efeito para quem usa: é um
   contrato simples, de um botão, em que os dois ganham.

### 16.2 Mapa do que entrou
| Ideia | Onde está |
|---|---|
| Lados EUA e URSS, escadas de 4 degraus, vantagem e fraqueza | `src/data/sides.js` |
| Primeiro do lado leva bônus cheio (+20), quem chega depois leva menos (+8) | `src/sim/actions.js` |
| 3 rodadas = 1 ano, 1957–1969, Ano novo com verba e tecnologia | `src/data/history.js` |
| Solo contra bot que segue o calendário histórico (±1 ano) | `src/sim/actions.js` |
| Rival escondido, diário privado, tela "passe o dispositivo" | `src/ui/handoff.js` |
| Espionagem (12, uma vez por ano) e boatos (acertam 70%) | casa 🕵️ e carta "Boato" |
| Cartas de dilema por situação (sem nave, montando a nave, em voo) | `src/data/dilemmas.js` |
| 2 dados, o jogador escolhe qual usar | tabuleiro |
| Prédios: Laboratório, Fábrica, Controle de missão, Patrocinador (nível 1 a 3) | `src/data/buildings.js` |
| Peças e foguetes bloqueados por tecnologia | `minTech` em `src/data/` |
| Voo em etapas (LEO 2, GEO 3, Lua 3, tripulada 4), uma por turno | `src/data/stages.js` |
| Risco por etapa mostrado antes, com o motivo | `src/sim/flight.js` |
| Reserva de verba no voo (revisão paga), sem "abortar" | tela de voo |
| Missão de consolação com crédito parcial e dados de falha | `src/data/stages.js` |
| Montar a nave do próximo degrau enquanto a atual voa | oficina |
| Socorro de emergência, choque do Sputnik para quem está atrás | painel da agência, tabuleiro |
| Cartão "Na história real" por lado, com fonte da NASA, e epílogo Apollo-Soyuz | relatório e fim |

### 16.3 Decisões que tomei para responder as perguntas da seção 15 (dá para mudar)
- **Escada da URSS:** Primeiro satélite → Ser vivo → Estação espacial → Tripulação na Lua. O final
  é a Lua para os dois lados: a corrida à Lua. Na história real a URSS nunca chegou, então o bot
  soviético nunca cumpre esse degrau.
- **Vantagens:** EUA com mais verba (+5 por ano; o bônus de +20 no início saiu no balanceamento de 15/11) e foguetes mais tarde (+1 de
  tecnologia nos lançadores). URSS com foguetes cedo (−1) e orçamento menor (−5 por ano).
- **Espião:** custa 12, uma vez por ano, e mostra degraus, missão atual e quanto a nave está pronta.
- **Limite:** 1969 (39 rodadas). Com verba de 40 por ano, a Lua fica alcançável perto de 1965–1968.
- **Falha = nave perdida inteira.** Em troca: dados de falha, +1 de tecnologia e, se passou da
  subida, missão de consolação (+8 de verba).
- A subida acontece no turno do lançamento. Por isso a Lua leva 2 a 3 turnos em voo.

### 16.4 Ainda não entrou
- Contratos completos (seção 10). Só existe o "usar prédio do rival".
- Pagar para andar mais, sinergias entre peças, mais nações e escadas.
- Balanceamento por partidas de teste.

## 17. Ajuste de início de jogo (Marcus, 14/11)
Problema: no turno 1 a oficina mostrava o catálogo inteiro (12 peças, 3 foguetes, 3 órbitas, 7
medidores) e a verba cobria o primeiro satélite sem esforço. Era informação demais e opção demais.

### 17.1 Verba menor
- Verba inicial **20** (era 60) e orçamento anual **20** (era 40). O +20 de "Projeto pronto" continua.
- Na rodada 1, a URSS fica com 35 e os EUA com 65. O jogador precisa passar pelo tabuleiro para
  completar o primeiro projeto.

### 17.2 Peças descobertas aos poucos
- A oficina só mostra o que o jogador já **descobriu**. Cada degrau da escada dá um **kit** (o mínimo
  para fechar o projeto) e a órbita da missão já vem escolhida.
- O resto é revelado pelo tabuleiro: **Feira de fornecedores** (até 3 peças), **Ano Geofísico**
  (até 2, só o que o nível de tecnologia alcança) e o **Ano novo** a partir do 2º ano.
- Comprar continua exigindo o nível de tecnologia. O sandbox libera tudo.
- Nada obriga a montar a nave no turno 1: o guia agora diz que andar pelo tabuleiro rende verba e
  peças novas.

### 17.3 Decidido não fazer agora
- Loja de 3 itens no lugar da oficina e troca de peças entre jogadores: a troca só faz sentido com
  escassez, e a oficina foi mantida.
- Limites por turno e "kit básico" de um clique.

### 17.4 Pontos para testar jogando
- Os EUA exigem tecnologia 2 para o foguete pequeno e começam com 1 (a URSS lança no turno 1), e a
  verba menor deixa os EUA com quase o dobro de dinheiro.
- Se o início ainda ficar fácil, cortar a verba mais (10 inicial e 10 por ano).

## 18. Interface enxuta no começo (Marcus, 15/11)
Problema: ao abrir o jogo pela primeira vez, o jogador via de uma vez a ordem dos turnos, o tabuleiro com
16 legendas, o degrau, a escada, o rival, a agência, o diário, 4 botões e a trilha Tabuleiro / Oficina /
Voo / Relatório. Na tela do tabuleiro eram cerca de 430 palavras e 5 abas laterais.

Decisão: **mostrar a informação quando ela passa a importar**, o mesmo princípio da descoberta de peças.
- Vale no 1º degrau, com as dicas ligadas. Cumprir o 1º degrau ou desligar as dicas mostra tudo.
- Lateral: só a missão atual (com o objetivo da partida em uma frase) e o diário. A escada, os rivais
  e a agência aparecem quando o jogador usa o espião, constrói algo ou avança.
- Turno: só "Rolar dados" antes de andar; depois Oficina e Passar a vez; Lançar quando o projeto fecha.
- Casas: legenda curta, mantendo o valor que decide o dado (+10 verba, +1 tecnologia). O texto
  completo continua no balão.
- Cabeçalho: sem a trilha de etapas e sem "rodada 1/3" (fica no balão do ano).
Resultado medido na tela do tabuleiro no turno 1: 5 botões para 2, 5 abas para 2, 429 palavras para 258.

Ainda por avaliar: a oficina (7 medidores e a checagem do projeto) e o relatório. Teste com alguém que
nunca viu o jogo antes de concluir que está simples o bastante.

## 19. Retorno imediato e passar a vez sem confirmação (Marcus, 15/11)
Dois problemas vistos jogando:
- **Confirmação a cada turno.** "Passar a vez" abria o "Resumo do turno" e pedia para clicar "Passar a vez"
  de novo. Sozinho, isso era só atrito.
- **Sem retorno nas escolhas.** Ao escolher uma opção de dilema a carta sumia e o resultado só ia para o
  Diário (fechado). O jogador não sabia o que tinha acontecido.

Decisão:
- **Passar a vez é direto**, sem janela. O que aconteceu já foi mostrado na hora, e o cartão "Desde o seu
  último turno" recapitula no começo da próxima vez.
- **Cartão de resultado no centro do tabuleiro**, sem botão de confirmar, que some no próximo turno:
  - dilema: a opção escolhida, o que mudou (verba, tecnologia, proteção), se a aposta deu certo ou errado e a lição;
  - casa: o que ela deu (verba, tecnologia, peças descobertas);
  - construir, espionar e usar o prédio de um rival: o custo e o que o jogador ganhou.
- Regra de interface: **nunca pedir confirmação para algo que não se desfaz de forma custosa**; mostrar o
  resultado depois, sem bloquear.

Ainda sem retorno imediato: as escolhas durante o voo (tela de voo). Vale conferir se ali o jogador
entende o que mudou.

## 20. Requisitos escondidos, descobertos por ensaio ou por tentativa (Marcus, 15/11)
Problema: o jogador só seguia o "Checklist do projeto": ele dizia exatamente o que comprar, travava o
lançamento até ficar tudo verde e o risco era de uns 13% no 1º satélite. Não havia dúvida nem motivo para
errar, e o relatório do "porquê" quase nunca aparecia. Aumentar o risco por sorte só criaria falha chata.

Decisão: **a falha nasce de uma decisão do jogador e ensina**.
- No jogo normal o jogador **não vê o mínimo de ciência e de comunicação** da missão. Vê o objetivo e uma
  pista ("ciência moderada, comunicação alta"), para manter o passo "requisitos primeiro" do processo da NASA.
- Esses dois requisitos **não travam o lançamento**. O que é conta física na tela continua visível e
  travando: foguete, alcance, massa, energia, suporte de vida, vida útil e verba.
- **Ensaio em solo** (5 de verba, 1 por turno, sem gastar foguete): diz em palavras se a nave atende, está
  um pouco ou bem abaixo. Escolha: pagar pouco para saber ou apostar e lançar. É a tensão central do jogo.
- **Lançar sem atingir o mínimo**: o voo acontece, a avaliação final falha e o relatório diz o que faltou, com
  os números. Eles passam a aparecer e a travar o lançamento. Errar rende **+1 de tecnologia, só na primeira
  vez** que o requisito é descoberto, para não dar para abusar.
- O marco "Projeto pronto" (+20) usa só o que é visível, para não revelar se a nave atende.
- O sandbox mostra tudo.

Para testar jogando: o kit do degrau já cobre o mínimo do 1º degrau, então o erro tende a aparecer a partir
do 2º (ex.: a Tripulação na Lua pede duas antenas parabólicas). Se ninguém errar, a pista qualitativa está
generosa demais. Ainda sem fazer: variar os mínimos a cada partida e esconder vida útil e suporte de vida.

## 21. O kit do próximo degrau só é liberado ao cumprir o degrau (Marcus, 15/11)
Problema: ao **lançar** o degrau N, o jogo já trocava a missão para N+1 e revelava o kit dele, mesmo que o
voo falhasse depois. A oficina mostrava uma nave nova e vazia, e o jogador achava que as peças tinham sumido.

Decisão (do usuário): **descobrir é recompensa por cumprir o degrau.**
- O kit do degrau seguinte e a troca de missão só acontecem quando o degrau atual é **cumprido**. Se o voo falha,
  nada é liberado e o jogador monta outra nave para o mesmo degrau.
- Consequência aceita: **com a nave em voo a oficina fica fechada** ("aguarde o resultado do voo"). Não dá mais
  para montar a próxima nave enquanto a atual voa. Em voos longos (Lua, 3 a 4 turnos) o jogador só anda no
  tabuleiro, juntando verba e peças.
- O relatório de sucesso ganhou o painel **"Peças liberadas"**, que mostra o prêmio por ter cumprido o degrau.
- O sandbox não muda.

Ponto a observar jogando: nos voos longos, esperar sem poder montar nada pode ficar parado. Se incomodar, uma
saída é permitir montar com as peças que o jogador já descobriu, sem liberar o kit novo.

## 22. Virada de ano animada, prédios sempre à vista e recursos em destaque (Marcus, 15/11)
Problemas vistos jogando:
- **Passar o ano era só uma linha de texto.** Um marco do jogo (o ano muda, a verba e a tecnologia entram) não tinha peso.
- **Os prédios ficavam numa aba fechada** ("Sua agência"), com os botões de subir de nível dentro dela. Para o jogador
  era uma opção escondida, não algo seu.
- **O HUD "só em menus"**: recursos pequenos no topo e o resto atrás de cliques.

Decisão:
- **Animação do ano**: um calendário no meio da tela vira do ano antigo para o novo e mostra o que a agência ganhou
  (verba, tecnologia, peça liberada pela pesquisa), com a origem de cada ganho no balão. Dura cerca de 2 s, some
  sozinha e um clique pula, **sem botão de confirmar**. Aparece também na abertura (1957). Como os ganhos são secretos
  de cada agência, **só aparece no tabuleiro do jogador da vez, nunca na tela de troca**.
- **Faixa de prédios sob o tabuleiro e os botões Oficina / Lançar / Passar a vez**: os 4 prédios em cartões, com
  nível, o que dão e o botão de subir com o custo; os não construídos aparecem esmaecidos, para o jogador ver o que
  existe. O socorro de emergência fica junto. No começo (interface enxuta) a faixa só aparece depois do 1º prédio.
- **Recursos em destaque no topo**: verba, tecnologia e proteções em números grandes, com a previsão do próximo
  Ano novo ("+25 em 2 rodadas"). Subir um prédio passou a dar retorno imediato.

Fora desta entrega: mostrar o progresso da escada no topo (o usuário preferiu só prédios e recursos) e deixar a
escada, os rivais e o diário fora de abas. Para avaliar jogando: se a faixa e o HUD maior apertam o tabuleiro em
telas pequenas, e se 2 s de animação cansam quando a virada vem a cada 3 rodadas.
