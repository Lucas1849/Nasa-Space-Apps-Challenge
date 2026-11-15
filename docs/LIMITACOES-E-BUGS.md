# Limitações conhecidas e bugs possíveis

Documento honesto sobre o estado do jogo depois das Etapas 0 a 7 do plano (simulador, revenda a 50%, calendário em 1955,
blueprints nos fornecedores, tabuleiro de 20 casas com oficina, tutorial contextual, espião com sabotagem, calibragem).
Está dividido em **o que não foi verificado**, **limitações de design e de balanceamento**, **bugs e riscos técnicos
prováveis** e **o que ficou fora**. Números vêm de `npm run simulate` (300 partidas, política "greedy", 1 jogador contra o bot).

## 1. O que NÃO foi verificado (testado só por código)

Os 190 testes automáticos passam, mas eles usam um DOM de mentira (`test/dom-stub.mjs`). Ninguém olhou o jogo rodando depois destas etapas.

- **Visual do tabuleiro 6×6** (`ui/board.js`, `.gameboard` em `main.css`): grade, cantos, altura das linhas, peões, arte nova da
  oficina. **Celular** em especial: as linhas ficaram com altura mínima menor e podem apertar o texto.
- **Cartões novos**: dica "Primeira vez", menu do espião (Observar/Sabotar), aviso "Modo planejamento" na oficina, preço nos
  botões do fornecedor (`.gb-price`).
- **Jogo online (WebRTC)**: foram adicionadas as ações `buyBlueprint` e `sabotage` à lista de rede (`src/main.js`), e `launch`,
  `buyItem` etc. passaram a depender da casa do peão. Nada disso foi testado com 2 pessoas de verdade. Se algum computador
  ficar com o estado diferente do host, o sintoma será uma compra "recusada" que no outro lado funcionou.
- **Animações** do Daniel (`motion.js`) com o anel novo: o passo do peão (`walkPawn`) usa `TILES.length`, mas não foi conferido o
  caminho visual em volta dos 4 cantos novos.

## 2. Limitações de design e de balanceamento

1. **A URSS nunca vence o bot (0% nas simulações) e os EUA quase sempre vencem (99%).** Já era assim antes das etapas (linha de
   base: 0% contra 89%). A causa é o bot seguir o calendário histórico real e a escada da URSS ter o degrau 3 mais difícil
   (24% de chance de cumpri-lo contra 92% dos EUA). Não foi corrigido: é decisão de design (ajustar bônus de verba, tecnologia
   exigida ou o calendário do bot).
2. **Ninguém completa a escada de 4 degraus.** O degrau 4 (Tripulação na Lua) nunca é cumprido em 45 rodadas. Toda partida
   acaba pelo teto de tempo e o vencedor sai por pontos. Se a ideia é a escada completa ser possível, falta ritmo ou o 4º degrau
   é caro demais.
3. **Ritmo do começo na borda da meta.** Mediana do 1º lançamento na rodada 10 (meta do plano: 5 a 9); p10 = 6, p90 = 15. O
   simulador joga sem erro, então um humano deve ser mais lento. Quem tiver azar com os dados pode levar muitas rodadas para
   achar um fornecedor e uma oficina (2 e 3 casas de 20).
4. **A "surpresa" do fornecedor quase não aparece no começo.** Com até 4 ofertas e kits de 4 a 6 itens, a visita é preenchida
   pelo que a missão precisa. As blueprints "surpresa" só aparecem depois que o kit do degrau está completo. Isso ajuda o ritmo,
   mas tira parte da graça da descoberta.
5. **A tecnologia continua inflada.** Mediana final de 38 a 49, e o jogo inteiro exige no máximo 6. O usuário decidiu
   deixar assim (o efeito contínuo de risco por tecnologia foi medido e não mudou nada). O Laboratório importa pelas exigências
   de peças e foguetes, mas o excesso é desperdício.
6. **O dinheiro não é mais o gargalo no começo; o deslocamento é.** Mudar verba inicial, orçamento anual ou preço da blueprint
   quase não altera o ritmo (ver `BASELINE-SIMULACAO.md`). Isso significa que os números de preço atuais são pouco testados
   contra jogadores reais.
7. **Valores são todos fictícios** (preços, riscos, custo da sabotagem, blueprint a 30% e 35%). Estão marcados em comentário,
   como pede o `CLAUDE.md`, mas não vêm de dados reais.
8. **Posição inicial.** Todo jogador começa na casa 0 (largada), que não é oficina nem fornecedor. No turno 1 só dá para comprar
   se o dado cair na oficina (casa 2) ou, para blueprints, no fornecedor (casa 7).

## 3. Bugs e riscos técnicos prováveis

1. **Só existe uma dica por vez** (`state.tip`). Se a mesma jogada disparar duas dicas (chegar à oficina e comprar a primeira
   peça no mesmo turno), a segunda substitui a primeira, e a primeira nunca mais aparece (ela já foi marcada como vista).
2. **A dica some no início do próximo turno**, sem botão de dispensar nem de rever. Quem não leu na hora perde.
3. **Sabotagem só pega com a nave na etapa final naquele ano.** Se o rival não voar nesse ano, os 15 de verba são perdidos e
   a interferência expira. A vítima também não recebe um aviso separado: o plano previa um campo `p.alerts`, mas foi usado só
   o diário e o próprio cartão do imprevisto.
4. **A opção paga de qualquer imprevisto fica desabilitada sem verba.** Na sabotagem sobra só a opção "sem custo" (mais arriscada),
   o que é proposital. Mas a regra vale para todos os eventos (`stageOptions`), então no "Corte no orçamento" quem está sem
   verba também não consegue mais escolher pagar os 15 (antes a verba só era cortada em zero).
5. **Contra o bot a sabotagem atrasa uma vez por degrau** (um abuso foi corrigido: antes uma sabotagem por ano o seguraria
   para sempre). Continua sendo uma jogada forte e barata nos degraus decisivos.
6. **Uma sabotagem armada por vítima.** Não dá para armar duas no mesmo jogador, mas dois jogadores podem sabotar rivais
   diferentes no mesmo ano; os efeitos são independentes.
7. **Documentos antigos contradizem os novos.** `IDEIA.md` só ganha seções no fim, por regra do projeto, então as seções 1 a 22
   ainda descrevem kit automático, 16 casas e 1957. Valem as seções 23 a 29. `README.md` e `CLAUDE.md` só tiveram os anos
   trocados; o resto do texto pode estar desatualizado. `docs/TAREFAS.md` não foi revisado.
8. **Testes frágeis de layout.** `test/tiles.mjs` resolve a maior parte, mas alguns testes ainda andam um número fixo de casas
   com `die(n)` a partir da largada (por exemplo, "casa 2 é oficina" e "casa 4 é evento"). Mudar o tabuleiro de novo vai
   quebrar alguns.
9. **O simulador joga só solo e só com 3 políticas** (greedy, greedy sem laboratório, aleatória). Não simula 2 a 4 jogadores,
   espionagem, sabotagem humana, nem erros de jogadores reais. Todo número de balanceamento deste projeto vem desse jogador.
10. **Estado do trabalho no Git.** As Etapas 0 a 7 estão **no mesmo diretório de trabalho, sem commit nem push**, em branches
    criadas em sequência a partir do mesmo estado sujo. Antes de subir é preciso decidir se vira um commit só ou vários, e fazer
    o merge com o que Lucas e Daniel mudaram em `board.js`, `boardArt.js`, `main.js` e `state.js`: conflitos prováveis.

## 4. O que ficou fora (de propósito)

- **Roubar blueprint** com o espião (roadmap).
- **Fase 4b do Lucas** (planejar a nave fora da vez, online). A regra "agir na casa" ajuda: o gasto já exige o peão na
  oficina, então um rascunho local não gasta nada. Mas o rascunho em si não existe.
- **Limite de blueprints por visita.** O plano previa avaliar; hoje o jogador pode comprar todas as que couberem na verba.
- **Pontuação por eficiência de recursos** além do que já existia.

## 5. Como conferir rápido (para a equipe)

1. `npm test` (190 testes) e `npm run build`.
2. `npm run simulate` para reproduzir as tabelas de `docs/BASELINE-SIMULACAO.md`.
3. Abrir `http://localhost:8000` (`Ctrl+Shift+R`): jogar uma partida solo inteira olhando o tabuleiro, o celular e a dica de
   "Primeira vez"; depois uma partida online de 2 pessoas, comprando blueprint, sabotando e lançando.
