# Plano de execução — The Goats

Prazo: **domingo 15/11, 23:59 (Uberlândia)**. Tudo que está aqui cabe nesse prazo se cada um
ficar na própria área. Marque `[x]` ao concluir e abra PR pequeno (ver `CLAUDE.md`).

Estado da base (`main`): o ciclo completo já roda —
setup → tabuleiro → oficina → lançamento → relatório com explicação — para 1 a 4 jogadores
em hot-seat, com 3 missões, 17 testes passando. **O que falta é polir, balancear e entregar.**

## Áreas e donos

| Área | Pastas | Dono | Toca em |
|---|---|---|---|
| Dados e balanceamento | `src/data/` | _definir_ | só dados |
| Simulação e regras | `src/sim/`, `src/board/`, `test/` | _definir_ | funções puras |
| Interface e arte | `src/ui/`, `src/styles/`, `index.html` | _definir_ | só DOM/CSS |
| Demo, textos e submissão | `docs/`, `SUBMISSION.md`, `README.md` | _definir_ | markdown, vídeo/slides |
| Integração, deploy e PRs | GitHub Pages, revisão de PR | _definir_ | `main` |

Regra de ouro: quem precisar mudar `src/sim/state.js` ou `src/sim/actions.js` avisa no grupo antes.

## P0 — obrigatório para submeter (sábado)

- [ ] **Deploy público** no GitHub Pages (Settings → Pages → branch `main`, pasta `/`). Testar o link
      em aba anônima. Sem link público o projeto não é julgado.
- [x] **Merge da estrutura** na `main` (PRs #1 e #2). Todos partem da mesma base.
- [x] **Henrique** já é colaborador do repositório.
- [ ] **Texto da página do projeto em inglês** (campos em `SUBMISSION.md`). Rascunhar já; refinar domingo.
- [ ] **Citar ao menos 1 recurso da NASA** (obrigatório p/ prêmio global). Sugestões que já usamos
      como referência de design: webinar *Design and Develop Science Missions* (fluxo Need → Concept →
      Requirements → Design → Verify → Implement), *Mission Design Lab* (trade studies), *CubeSat 101*.
      Colocar a referência também na tela inicial do jogo ("Baseado em…").
- [ ] **Demo**: vídeo ≤ 30 s (legenda em inglês) OU ≤ 7 slides em inglês. Decidir o formato hoje.

## P1 — faz o jogo ficar bom (sábado à noite / domingo de manhã)

Dados e balanceamento
- [ ] Jogar 3 partidas inteiras e anotar: dá para cumprir "Primeiro satélite" em ~3 rodadas?
      "Sonda lunar" em ~8? Ajustar custos/verba em `src/data/` e `STARTING_FUNDS`.
- [x] Adicionar 2 missões → feitas: "Satélite meteorológico" (GEO, 5 anos) e "Tripulação na Lua".
- [x] Revisar textos das peças: cards mostram "Ganha:" e "Custa:" separados.
- [ ] Mais eventos de voo em `src/data/events.js` (hoje são 4). Cada um com 2 opções e lição.

Simulação e regras
- [x] Vida útil da missão: órbita tem `baseLifetime`, propulsor/bateria têm `lifetimeBonus`.
- [x] Eventos de voo com decisão (tempestade solar, detrito, corte de verba, antena travada).
- [x] Glossário dos recursos (tela inicial e oficina).
- [x] Modo sandbox (sem tabuleiro, verba livre).
- [ ] Evento de "janela de lançamento": lançar fora da janela custa mais verba.
- [ ] Testes para cada regra nova (seguir o padrão de `test/simulate.test.mjs`).

Interface e arte
- [x] Desenho da espaçonave na oficina que muda conforme as peças (SVG em `src/ui/spacecraft.js`).
- [ ] Melhorar a arte do SVG (texturas, animação de lançamento). Hoje são formas simples.
- [ ] Tabuleiro mais visual (anel em vez de grade) e animação do peão.
- [ ] Ícones por recurso; tooltips já existem (`title`), melhorar o texto.
- [ ] Responsivo no celular (a grade já quebra em 2 colunas; conferir a oficina).
- [ ] **Não usar logo/marca da NASA.** Arte própria ou livre de direitos, com crédito em `SUBMISSION.md`.

Demo e submissão
- [ ] Roteiro do vídeo (30 s): problema → o jogo → 1 decisão com trade-off na tela → relatório
      explicando → "feito com dados/recursos da NASA".
- [ ] Capturar telas do jogo para a página do projeto (JPG/PNG ≤ 10 MB).
- [ ] Preencher o campo *Use of SI*: código gerado com Claude Code (commits com `Co-Authored-By`).

## P2 — se sobrar tempo (domingo à tarde)

- [ ] Modo cooperativo (2 jogadores controlam a mesma missão com papéis: um no tabuleiro, outro na oficina).
- [ ] Facções com bônus diferentes (mais verba × foguetes melhores).
- [ ] Ranking local (`localStorage`) com as melhores pontuações.
- [ ] Modo sandbox (verba infinita, sem tabuleiro) para explorar trade-offs.
- [ ] Classificação do site no FortiGuard (opcional, evita bloqueio para os juízes).

## Cortado (não fazer nesta edição)

- Multiplayer online (exige backend; hot-seat atende "até 4 jogadores").
- Física orbital real (os números são fictícios de propósito, está documentado).
- Espionagem/sabotagem entre jogadores.

## Checklist final (domingo, 20h)

- [ ] `npm test` verde na `main`.
- [ ] Link do jogo abre em aba anônima, no celular e no computador.
- [ ] Todos os campos da submissão preenchidos em inglês.
- [ ] Demo dentro do limite (30 s / 7 slides) e com link público.
- [ ] Checkboxes "Terms and Conditions" e "Confirm All Work is Original" marcados.
- [ ] **"Submit for Judging" clicado** antes das 23:59. Só a última versão salva vale.
