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
| `src/data/` | Missões (com milestones), instrumentos, peças, lançadores, órbitas, lados e escadas, cartas de dilema, etapas do voo, prédios, calendário histórico | Só dados. Valores fictícios têm comentário avisando |
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

## Ciclo do jogo (conforme a parte v3 do `IDEIA.md`)

Tensão central: **lançar agora (barato e arriscado) ou esperar melhorar (seguro, mas o rival pode
estar na frente)**. O rival é escondido, então o custo de esperar é a dúvida.

1. **Setup**: 1–4 agências (hot-seat). Os **lados** (EUA ou URSS, `src/data/sides.js`) são sorteados
   de forma equilibrada. Cada lado tem uma **escada** de 4 missões; completar a escada é a vitória.
   Solo: o outro lado é um **bot** que cumpre cada degrau no ano real (±1).
2. **Tela de troca** entre turnos: "passe o dispositivo". O diário é privado; rivais ficam escondidos.
3. **Ano novo** (a cada 3 rodadas, `src/data/history.js`): verba e tecnologia (mais Laboratório e
   Patrocinador). A partida vai de 1957 a 1969.
4. **Tabuleiro** (16 casas, `src/board/board.js`): rola 2 dados e escolhe um. Casas de evento sorteiam
   uma **carta de dilema** conforme a situação (`src/data/dilemmas.js`); terrenos recebem prédios
   (`src/data/buildings.js`); prédio de rival pode ser usado pagando ao dono; a **espionagem** revela
   o estado real de um rival (uma vez por ano); boatos dão informação vaga.
5. **Oficina** (centro do jogo): a missão é o degrau atual da escada. Peças e lançadores são
   bloqueados por tecnologia. Mostra recursos, checagem e o **risco do voo** por etapa.
6. **Lançamento**: paga o lançador; a nave sai da oficina (dá para montar a do próximo degrau
   enquanto ela voa) e a **subida** é sorteada na hora. Lançar encerra o turno.
7. **Voo em etapas** (`src/data/stages.js`, `src/sim/flight.js`): LEO 2 etapas, GEO 3, Lua 3,
   tripulada 4. Uma etapa por turno. Casa de evento com a nave em voo vira imprevisto; chegadas sempre
   têm imprevisto. Cada opção mostra o risco e o porquê; dá para gastar a reserva (revisão paga).
   Não existe abortar. Proteções salvam uma etapa.
8. **Resultado**: falha = nave perdida + **dados de falha** (−5% de risco naquele sistema e +1 de
   tecnologia) + **missão de consolação** se passou da subida. Sucesso = avaliação final (`simulate`
   com `randomFailure: false`), sobe um degrau; o primeiro do lado leva o bônus cheio.
9. **Fim da rodada**: quem completou a escada vence (a rodada termina antes, para todos jogarem o
   mesmo número de turnos). Em 1969, vence quem subiu mais degraus. A tela final revela tudo e compara
   com a história real.

**Sandbox**: `startGame(state, setup, { sandbox: true })` pula o tabuleiro, dá verba e tecnologia
altas, deixa escolher qualquer missão e avançar as etapas do voo em sequência. Serve para a demo.

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
- **Ícone novo**: entrada em `ICONS` (`src/ui/icons.js`) com o miolo de um SVG 24×24 de traço
  (sem preenchimento, `currentColor`). Use `icon('nome')` na UI. Nos dados (`icon:` em
  `buildings.js`, `sides.js`, `stages.js`) vai só o nome do ícone. **Sem emojis**: renderizam
  diferente em cada sistema e não seguem o tema.
- **Dica nova para o jogador**: em `nextStep()` (`src/ui/guide.js`), que diz o próximo passo de
  cada tela e qual botão destacar (`hl(state, tela, chave)`). O jogador liga e desliga as dicas
  no topo da tela; a preferência fica no navegador (`src/ui/prefs.js`).
- **Resumos**: `src/ui/summary.js` monta o "Resumo do seu turno" (ao passar a vez) e o "Desde o
  seu último turno" comparando fotos da agência. Só mostra o que é público ou do próprio
  jogador (rival escondido).

## Convenções
- Código em inglês, comentários e textos do jogo em português (a submissão é em inglês; ver `SUBMISSION.md`).
- Valores de jogo são fictícios; nunca apresentar como dados reais de foguetes ou missões.
- Declarar na submissão o código gerado com IA (regra do evento, ver `regras-do-evento.md`).
- Não usar logos ou marcas da NASA.
- Decisão pendente da equipe: idioma da interface do jogo (pt-BR hoje). Se for para inglês,
  os textos estão concentrados em `src/data/*`, `src/sim/simulate.js` e `src/ui/*`.
