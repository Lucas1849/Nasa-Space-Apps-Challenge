# Arquitetura

## Stack
- **HTML + CSS + JavaScript puro (ES modules).** Sem build, sem `npm install`, sem backend.
- Testes com o test runner nativo do Node (`node --test`), sem dependências.
- Publica direto no GitHub Pages (`.nojekyll` já está na raiz).
- Por quê: 5 pessoas e menos de 2 dias. Zero configuração = zero "na minha máquina funciona".
  Se a equipe quiser Canvas/SVG/Three.js para visual, entra por CDN sem mudar a estrutura.

## Rodar

```bash
npm start          # = python -m http.server 8000 → abrir http://localhost:8000
npm test           # roda test/*.test.mjs
```

Os módulos ES não funcionam abrindo o `index.html` direto do disco; precisa do servidor.
Qualquer servidor estático serve (`npx serve`, extensão Live Server do VS Code etc.).

## Pastas

| Pasta | O que tem | Regra |
|---|---|---|
| `src/data/` | Missões (com milestones), instrumentos, peças, lançadores, órbitas, cartas de vitória, etapas do voo, prédios, linha do tempo histórica | Só dados. Valores fictícios têm comentário avisando |
| `src/board/` | Tabuleiro: casas, dado, movimento, eventos | Funções puras, **sem DOM**, `rng` injetável |
| `src/sim/` | Estado, recursos, checagens, simulação, ações do turno | Funções puras, **sem DOM** |
| `src/ui/` | Telas (setup, tabuleiro, oficina, relatório) e componentes | Só lê o estado e chama `actions.*` |
| `src/styles/` | CSS | Cores em variáveis no `:root` |
| `test/` | Testes de `sim/` e `board/` | Um arquivo por módulo |
| `docs/` | Regras do evento, arquitetura, plano de tarefas | Markdown |

Raiz: `IDEIA.md` (conceito, do Marcus), `SUBMISSION.md` (campos da submissão), `CLAUDE.md`
(regras para o Claude Code), `package.json` (só scripts).

## Fluxo de dados

```
UI (src/ui)  --chama-->  actions (src/sim/actions.js)  --altera-->  state (src/sim/state.js)
   ^                           |
   |                           +--usa--> board.js (dado, casas)
   |                           +--usa--> simulate.js (checkDesign, simulate)
   |                                        +--usa--> resources.js (totais) --lê--> data/*
   +------------ main.js re-renderiza a tela inteira após cada ação -------------+
```

- `main.js` guarda o único `state`. Toda ação é `(state, ...args) => string | undefined`;
  se devolver string, é mensagem de erro para o jogador (toast).
- Não há framework: cada tela é `(state, actions) => HTMLElement` e é reconstruída inteira.
  É simples e suficiente para o tamanho do jogo.

## Ciclo do jogo (conforme `IDEIA.md` v2)

Tensão central: **lançar agora (barato e arriscado) ou esperar melhorar (seguro, mas os rivais avançam)**.

1. **Setup**: 1–4 agências (hot-seat). Cada uma recebe uma **carta de vitória sorteada**
   (`src/data/objectives.js`): Exploradora, Científica, Infraestrutura, Pioneira (não entra no solo).
2. **Início do turno**: cada rodada é um ano (1957–1969, `src/data/history.js`). A agência recebe o
   orçamento anual e +1 de tecnologia (mais o Laboratório).
3. **Tabuleiro** (16 casas, `src/board/board.js`): verba (fraca de propósito), sorte ou azar,
   tecnologia, feira (desconto), oficina de reparos (proteção), apoio ao atrasado, **terrenos** e
   **casas de risco**. No terreno livre a agência constrói um prédio (`src/data/buildings.js`); no
   terreno de um rival pode pagar para usar o prédio dele (os dois ganham).
4. **Oficina** (centro do jogo): escolhe a missão, compra/vende peças (algumas bloqueadas por
   tecnologia), escolhe lançador e órbita. Mostra recursos, checagem e o **risco do voo** por etapa.
5. **Lançamento**: paga o lançador; a nave sai da oficina (dá para montar a próxima enquanto ela voa)
   e a **subida** é sorteada na hora. Lançar encerra o turno.
6. **Voo em etapas** (`src/data/stages.js`, `src/sim/flight.js`): LEO 2 etapas, GEO 3, Lua 3,
   tripulada 4. Uma etapa por turno. A casa onde o jogador parou define o imprevisto (casas de risco
   e sorte ou azar); chegadas sempre têm imprevisto. Cada opção mostra o risco e o porquê; dá para
   pagar revisão extra ou **abortar**. Proteções salvam uma etapa.
7. **Resultado**: falha = nave perdida + **dados de falha** (−5% de risco naquele sistema e +1 de
   tecnologia). Sucesso = avaliação final (`simulate` com `randomFailure: false`), degrau "Missão
   cumprida", **recorde mundial** (+20) se for o primeiro, e escolha da próxima missão.
8. **Fim da rodada**: confere as cartas. Quem cumpriu vence (desempate pelo progresso extra). Em
   1969 sem ninguém, vence o maior progresso. Tela final compara com a história real.

**Sandbox**: `startGame(state, setup, { sandbox: true })` pula o tabuleiro, dá verba e tecnologia
altas e deixa avançar as etapas do voo em sequência. Serve para explorar trade-offs e para a demo.

Checagens têm `hard: true|false`. As duras impedem o sucesso; as leves (hoje só "dados >
comunicação") deixam voar e reduzem a ciência pela metade. Isso segue a ideia de que a maior
parte dos problemas de projeto não explode o foguete, só piora a missão.

## Regras da simulação (`src/sim/simulate.js`)

Todas devolvem um texto explicativo que aparece na oficina (preview) e no relatório:

| Checagem | Regra |
|---|---|
| Lançador alcança a órbita | `launcher.reach` inclui `orbit.id` |
| Massa | soma das peças ≤ `launcher.maxMass` |
| Órbita da missão | `orbit.id === mission.orbit` |
| Energia | energia gerada ≥ consumida |
| Comunicação × dados | comunicação efetiva (com penalidade da órbita) ≥ dados gerados; se não, metade da ciência se perde |
| Ciência e comunicação mínimas | ≥ `mission.needs` |
| Suporte de vida | se `mission.needs.lifeSupport` |
| Vida útil | `orbit.baseLifetime` + Σ `lifetimeBonus` (+ `lifetimeDelta` do voo) ≥ `mission.needs.lifetime` |
| Verba | ≥ custo do lançador (ignorada na avaliação depois do voo, `modifiers.launched`) |
| Falha aleatória | no jogo, substituída pelo risco por etapa (`src/sim/flight.js`); `simulate` ainda aceita a falha única de 15 % para testes |

## Risco por etapa (`src/sim/flight.js`)

| Sistema da etapa | Aumenta o risco | Reduz o risco |
|---|---|---|
| Lançamento (subida) | carga > 85 % do foguete (+10 %) | dados de falha, Controle de missão |
| Energia (órbita, transferência) | sobra de energia < 5 (+10 %) | bateria (−5 %) |
| Comunicação (chegadas) | dados > comunicação (+10 %) | 2+ antenas (−5 %) |
| Suporte de vida (retorno) | sobra de energia < 10 (+10 %) | |
| Qualquer | opção arriscada do imprevisto (+20 a +35 %) | revisão paga (−8 %), dados de falha (−5 % cada), Controle de missão (−3 % por nível) |

Risco mínimo 2 %, máximo 90 %. Todos os números são fictícios, para balanceamento.

## Inspirações (ideias, sem código copiado)

- **Marsbound! (NASA/JPL Education)**: jogo de cartas em que cada carta mostra massa, energia e
  custo e a equipe ajusta até fechar todos os limites. É a lógica dos nossos cards "Ganha / Custa".
- Entradas públicas de outras equipes deste desafio (ex.: *Margin*, *SATIT Orbital*): falhas duras
  × leves, imprevistos em voo com decisão, debrief com "o que mudaria o resultado", modo sandbox.
- `IDEIA.md` (Marcus): tabuleiro como fonte de recursos, oficina como centro, 3 milestones.

Pontuação = ciência entregue × 10 + verba poupada + margem de massa não usada. Premia
sucesso, ciência e **uso eficiente de recursos**, como o desafio pede.

## Como adicionar coisas sem quebrar os outros

- **Missão nova**: entrada em `src/data/missions.js`. Zero código.
- **Peça nova**: entrada em `parts.js` ou `instruments.js` com os mesmos campos. Aparece na oficina sozinha.
- **Regra nova**: função em `simulate.js` que faz `add(id, ok, okText, failText)` + teste em `test/simulate.test.mjs`.
- **Casa nova no tabuleiro**: entrada em `TILES` e um `case` em `applyTile`.
- **Tela nova**: arquivo em `src/ui/`, registrar em `screens.js`.

## Convenções
- Código em inglês, comentários e textos do jogo em português (a submissão é em inglês; ver `SUBMISSION.md`).
- Valores de jogo são fictícios; nunca apresentar como dados reais de foguetes ou missões.
- Declarar na submissão o código gerado com IA (regra do evento, ver `regras-do-evento.md`).
- Não usar logos ou marcas da NASA.
- Decisão pendente da equipe: idioma da interface do jogo (pt-BR hoje). Se for para inglês,
  os textos estão concentrados em `src/data/*`, `src/sim/simulate.js` e `src/ui/*`.
