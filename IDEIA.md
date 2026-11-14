# Ideia do jogo (rascunho inicial)

> Status: **brotinho**. É um ponto de partida para discutirmos, nada aqui está fechado.

Desafio: **Space Mission Design Game** (NASA Space Apps 2026).
Detalhes do desafio em `space_mission_design_game.txt`.

## 1. O que o desafio pede (resumo)
Um jogo interativo em que o jogador **projeta, gerencia e simula uma missão espacial completa**, tomando decisões de engenharia com recursos limitados e vendo como cada escolha afeta o resultado. Deve servir para iniciantes e, de preferência, suportar equipes de até 4 pessoas.

O núcleo do desafio são os **trade-offs**: toda escolha melhora algo e piora outra coisa (ex.: instrumento melhor = mais ciência, mas mais massa, energia, dados e custo).

Recursos a controlar: **massa, energia, orçamento, dados, comunicações e tempo de vida da missão**.

## 2. A ideia
Um jogo de tabuleiro por turnos, 2D, no navegador, inspirado em **Banco Imobiliário (Monopoly)**, ambientado na **corrida espacial da Guerra Fria**.

Cada jogador (ou time) tem uma **missão secreta ou escolhida**, que é a sua condição de vitória. Ganha quem cumprir a missão primeiro.

O jogo tem duas camadas:

1. **Tabuleiro:** o jogador anda, disputa e conquista **recursos** (verba e peças), como no Banco Imobiliário.
2. **Loja / oficina de engenharia:** o jogador usa o que conseguiu para montar a espaçonave, respeitando os limites de massa, energia, dados e orçamento. Quando está pronta, lança e vê a **simulação**.

O **centro do jogo é a oficina de engenharia** (é isso que o desafio avalia). O tabuleiro é só o jeito de conseguir recursos.

### Ciclo de uma rodada
1. Joga no tabuleiro e ganha verba ou peças.
2. Vai à loja e monta ou melhora a espaçonave.
3. Volta ao tabuleiro e repete.
4. Quando a espaçonave atende aos requisitos da missão, **lança e simula**. O jogo explica por que deu certo ou errado.

## 3. Tema: Guerra Fria
A corrida espacial já tem objetivos concretos e rivalidade real. Missões possíveis:

| Missão | Exigência de engenharia |
|---|---|
| Primeiro satélite | Foguete simples, comunicação básica |
| Ser vivo em órbita | Suporte de vida, cápsula, mais massa |
| Sonda lunar | Comunicação de longa distância |
| Pouso tripulado na Lua | Foguete pesado, orçamento alto, muita energia |
| Estação espacial | Energia contínua, longa duração |

Facções (ex.: EUA e URSS) podem ter **vantagens e fraquezas diferentes** (ex.: um com mais verba, outro com foguetes mais fortes no começo).

Para encaixar na regra de equipes de até 4, podemos ter **2 blocos de até 2 jogadores**, dividindo papéis (um no tabuleiro e recursos, outro na engenharia).

O tom deve focar em ciência e engenharia, sem glorificar o conflito. Dá até para incluir cooperação como opção, como o Apollo-Soyuz.

## 4. Loja e trade-offs
Para a loja gerar decisão de verdade, **nenhum item pode ser só bônus**. Todo item melhora algo e piora outra coisa:

| Item | Ganha | Perde |
|---|---|---|
| Câmera de alta resolução | + ciência | + massa, + energia, + dados |
| Painel solar grande | + energia | + massa, + custo |
| Antena potente | + comunicação | + energia, + custo |
| Foguete pesado | Cabe mais carga | + custo |

Regra para desfazer compra (a definir): revender pelo valor cheio **antes do lançamento**, e perder valor depois.

## 5. Milestones (progresso na missão)
Em vez de milestones únicos por missão, usamos **a mesma estrutura para todas**, só trocando nome e requisito. Versão enxuta, **3 por missão**:

1. **Projeto pronto**
2. **Lançamento**
3. **Missão cumprida**

Cada milestone dá um benefício no tabuleiro. Só **3 tipos de efeito**, todos fáceis de entender:

- **+ verba** (prestígio gera mais orçamento)
- **desconto na loja** (experiência reduz custo)
- **proteção contra falha**

Cada missão é uma tabela pequena (nome da etapa, requisito, efeito), então **adicionar missão nova é só preencher dados**, sem código novo. Sugestão: guardar em JSON.

## 6. Riscos e pontos de atenção
- **Escopo:** tabuleiro, loja, simulação, milestones, facções e multiplayer é muita coisa para um hackathon. Primeiro fazer o **fluxo completo de uma missão simples**, depois expandir.
- **Parecer só um Monopoly com tema espacial:** a banca avalia o aprendizado de engenharia. A oficina e os trade-offs têm que ser o foco, e o resultado da simulação precisa **explicar o porquê**.
- **Bola de neve:** quem ganha vantagem cedo tende a ganhar mais. Pensar em compensação para quem está atrás.
- **Clareza:** o jogador precisa ver na tela o progresso, os limites de recursos e o próximo milestone.

## 7. Cortado por enquanto (pode voltar se sobrar tempo)
- Mais de 3 milestones por missão
- Mais de 3 tipos de efeito (movimento, informação, controle do tabuleiro, etc.)
- Espionagem e sabotagem entre jogadores
- Níveis de dificuldade e cenários extras

## 8. Perguntas em aberto
- Quanto tempo temos até a entrega?
- Quantas missões e quantos itens da loja cabem no escopo?
- Multiplayer online ou só no mesmo computador (hot-seat)?
- Qual tecnologia usar no navegador (ex.: JavaScript puro, Phaser, React)?
- Quem faz o quê (tabuleiro, loja/engenharia, simulação, arte, textos)?
