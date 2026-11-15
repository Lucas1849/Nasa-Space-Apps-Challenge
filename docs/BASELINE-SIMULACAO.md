# Linha de base do ritmo do jogo (Etapa 0 do plano em etapas)

Medida com o simulador sem interface, nas regras da `main` em `8961cee` (com o balanceamento do Daniel de 15/11:
verba inicial 5, foguete pequeno 25, 1º satélite = 43). Serve para comparar cada etapa seguinte com números, em
vez de chute. Os valores do jogo são **fictícios** (balanceamento).

```
npm run simulate -- 1000 greedy 7     # 1000 partidas solo, jogador "guloso"
npm run simulate -- 1000 random 7     # 1000 partidas solo, dado ao acaso
```

O jogador simulado é de propósito simples (compra o kit do degrau, lança com o kit completo, não usa ensaio nem
espionagem). **greedy** escolhe o dado que cai na casa mais útil e constrói o Laboratório; **random** não.
Partidas repetíveis: a mesma semente dá a mesma partida (`test/simulate-script.test.mjs`).

## Resultados (1000 partidas, semente 7)
| | greedy EUA | greedy URSS | random EUA | random URSS |
|---|---|---|---|---|
| 1º lançamento, rodada (mediana) | 4 | 5 | 4 | 4 |
| 1º degrau cumprido, rodada (mediana) | 5 | 7 | 5 | 6 |
| 2º degrau cumprido, rodada (mediana) | 9 | 14 | 11 | 14 |
| 3º degrau cumprido, rodada (mediana) | 27 | 29 | 24 | 27 |
| 4º degrau (escada completa) | **nunca** | **nunca** | **nunca** | **nunca** |
| Vence o bot | 89% | **0%** | 42% | **0%** |
| Tecnologia final (mediana) | **46** | **33** | **16** | **16** |
| Nave vazia lançável no turno 1 | 28% | 30% | 21% | 25% |

## O que a linha de base mostra
1. **A tecnologia está inflada** (a queixa do usuário se confirma): a mediana final é 16 sem nenhuma estratégia e
   33 a 46 com o jogador guloso, e o jogo inteiro só exige até 6. A casa de tecnologia (+1 a cada parada) e as
   outras fontes enchem a conta; o Laboratório quase não faz diferença para o resultado.
2. **Brecha: uma nave vazia (só o foguete, 25) lança no turno 1** em 21% a 30% das partidas, porque os mínimos de
   ciência e comunicação são escondidos e não travam, e a URSS chega a 30 de verba parando no "Discurso" (+10).
   O fix do Daniel fechou a nave "foguete + painel" (33), mas não essa. As blueprints (Etapa 3) fecham de vez:
   sem blueprint não existe foguete para escolher.
3. **Ninguém completa a escada em 39 rodadas.** O 3º degrau sai por volta da rodada 27 a 29 e o 4º nunca. Todas as
   partidas terminam pelo teto de tempo, e quem vence é decidido por pontos. O 4º degrau (Tripulação na Lua) é
   inalcançável para este jogador; vale conferir se é intenção.
4. **O lado importa muito:** a URSS **nunca** vence o bot (0%), e os EUA vencem de 42% a 89%. O bot da URSS cumpre
   os degraus nos anos reais e é mais rápido que o jogador; o dos EUA não.
5. **O ritmo do começo está como o Daniel mediu:** 1º lançamento na rodada 4 a 5 e 1º degrau na rodada 5 a 7.

## Como usar nas próximas etapas
- Rodar os mesmos comandos depois de cada etapa e comparar esta tabela.
- A meta do plano para o 1º lançamento (rodada 5 a 9) e a tecnologia mais escassa (Etapa 2) têm que melhorar os itens
  1 e 2 sem piorar o 4.
- A política de compra ainda usa o kit automático de `missions.js`. Quando as blueprints chegarem (Etapa 3), o
  simulador passa a comprar blueprints nos fornecedores.

## Depois da Etapa 2 (calendário em 1955, pesquisa básica de 2 em 2 anos, piso de tecnologia no socorro)
Mesmos comandos (1000 partidas, semente 7), teto de 45 rodadas.

| | greedy EUA | greedy URSS | random EUA | random URSS |
|---|---|---|---|---|
| 1º lançamento, rodada (mediana) | 4 | 6 | 4 | 5 |
| 1º degrau cumprido, rodada (mediana) | 5 | 8 | 6 | 6 |
| Tecnologia final (mediana) | **46** | **35** | **11** | **12** |
| Vence o bot | 82% | **0%** | 45% | **0%** |

### O que a medição ensinou (e o plano não previa)
1. **Cortar a pesquisa básica quase não reduz a inflação.** Desligando uma fonte de cada vez: sem a casa de
   tecnologia a mediana só cai de 12 para 9 (random). O que enche a conta do jogador guloso é o **Laboratório**:
   +1 por nível *por ano*, então no nível 3 são +3 por ano, e o jogo todo só exige até 6. Passando de 6 a tecnologia
   deixa de importar.
2. **Armadilha nova (corrigida):** o socorro de emergência custa 2 de tecnologia. Com a tecnologia escassa isso derrubava
   o jogador a 0, quando nenhuma peça (todas exigem 1 ou mais) pode ser comprada: o 1º lançamento da URSS foi de 5 para 7.
   Com o piso de tecnologia 1 voltou para 4 a 6.
3. **A brecha da nave vazia no turno 1 continua** (28% a 30%): só as blueprints (Etapa 3) fecham.
4. **A URSS ainda perde sempre para o bot** (0%): o bot da URSS segue os anos reais e é mais rápido que o jogador.

### Decisão pendente de design (para a calibragem, Etapa 7)
A tecnologia é um portão com teto de utilidade em 6. Para o Laboratório ser um investimento que importa o jogo todo,
as opções são: o Laboratório render 1 a cada 2 anos (como a pesquisa básica), subir os níveis exigidos pelas peças e
foguetes, ou dar à tecnologia um efeito contínuo (por exemplo, reduzir o risco do voo a cada nível acima do exigido).

## Experimentos de preço e tecnologia (Etapa 2): o que NÃO resolveu
Feitos em memória no simulador (1000 partidas, mesma semente), sem mudar o jogo. A política `greedy-nolab` é a
`greedy` que nunca constrói o Laboratório, para medir o valor dele com o mesmo jogador.

| Experimento | Resultado |
|---|---|
| Encarecer só peças e foguetes de tecnologia 2+ (x1,5 / x2) | Degrau 3 passa da rodada 30 para 39 / 45 e cai de 83% para 49% / 13% das partidas. **Piora uma escada que já não fecha**: o gargalo é o dinheiro, não a tecnologia. |
| Subir só os níveis de tecnologia exigidos (x2 / x3) | Sem Laboratório: 54% para 47% / 34% cumprem o degrau 3. Com Laboratório também cai (83% para 68% / 59%). |
| Encarecer o Laboratório (x2 a x4) | Constrói menos nível (2,6 para 0,7), mas a tecnologia final continua 21 a 27, muito acima dos 6 exigidos. |
| Efeito contínuo: -1% de risco por nível acima do exigido (teto 6%) | **Nenhuma mudança.** O sucesso por lançamento já é 97% porque as proteções absorvem as falhas. Foi implementado, medido e **removido**. |
| Desconto de até 25% por tecnologia madura (peças e foguetes) | +3 pontos no degrau 3 com Laboratório: quase nada, o dinheiro trava o começo, antes de a tecnologia acumular. |

Conclusão: **o Laboratório já importa** (sem ele 62% cumprem o degrau 3 contra 83% com ele, e o degrau 2 é 70% contra
87%) porque as peças e foguetes avançados exigem tecnologia. O que sobra, passando das exigências, é desperdício
inofensivo. Decisão do usuário: **deixar a tecnologia como está**.

## Depois da Etapa 3 (blueprints nos fornecedores, sem kit automático)

300 partidas, política greedy (agora compra as blueprints do kit na casa de Fornecedor): 1º lançamento mediana **rodada 15**
(p10 8, p90 29); degrau 1 em 94%, degrau 2 em 82%, degrau 3 em 25%; nave vazia no turno 1: **0%** (brecha fechada).
Mexer no preço da blueprint (25% a 45%) e na quantidade de ofertas quase não muda o ritmo: o gargalo é **passar pela
única casa de fornecedor** do tabuleiro de 10 casas. A Etapa 4 (20 casas, 2 fornecedores) e a Etapa 7 (calibragem) tratam disso.

## Depois da Etapa 4 (20 casas, 3 oficinas, 2 fornecedores, agir só na casa)

300 partidas, greedy (vai à oficina quando já tem as blueprints, ao fornecedor quando falta): 1º lançamento mediana **rodada 14**
(p10 9, p90 23); degrau 1 em 99%, degrau 2 em 97%, degrau 3 em 30%; vence o bot 46%. O ritmo continua mais lento que a meta
(rodada 5 a 9): sobra para a Etapa 7 (verba inicial, preço das blueprints, ofertas por visita).

## Depois da Etapa 7 (calibragem)

Ajustes: o fornecedor oferece **até 4 blueprints por visita** (o kit que falta vem primeiro), blueprint de peça a **30%** do custo e de
foguete a **35%**. A verba inicial (5) e o orçamento anual (20) ficaram como estavam: a grade de testes mostrou que **dinheiro
não era o gargalo, o deslocamento era** (visitar fornecedor e depois oficina). 300 partidas, greedy:

| | Etapa 4 (antes) | Etapa 7 (agora) |
|---|---|---|
| 1º lançamento, rodada (p10 / mediana / p90) | 9 / 14 / 23 | **6 / 10 / 15** |
| Degrau 1 cumprido, rodada mediana | 15 | 11 |
| Degrau 2 cumprido (%) | 97% | 99% |
| Degrau 3 cumprido (%) | 30% | 56% (EUA 92%, URSS 24%) |
| Vence o bot | 46% | 46% (EUA 99%, URSS 0%) |
| Nave vazia lançável no turno 1 | 0% | 0% |

Meta do plano (1º lançamento na rodada 5 a 9): a mediana ficou em **10**, na borda. O jogador simulado é "guloso e sem erro", então um
jogador humano real deve ser um pouco mais lento. Limitações abertas em `docs/LIMITACOES-E-BUGS.md`.
