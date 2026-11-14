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
