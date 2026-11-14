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
| `src/data/` | Missões (com milestones), instrumentos, peças, lançadores, órbitas | Só dados. Valores fictícios têm comentário avisando |
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

## Ciclo do jogo (conforme `IDEIA.md`)

1. **Setup**: 1–4 jogadores (hot-seat), cada um escolhe uma missão.
2. **Tabuleiro**: joga o dado, cai numa casa (verba, imposto, evento, apoio ao atrasado).
3. **Oficina** (centro do jogo): compra/vende instrumentos e peças, escolhe lançador e órbita.
   O painel de recursos e a checagem do projeto atualizam em tempo real.
4. **Lançamento**: paga o lançador, `simulate()` roda as checagens + chance de falha aleatória
   (escudos absorvem). Milestones concedem verba, desconto ou escudo.
5. **Relatório**: sucesso/falha, pontuação e a lista de motivos (o porquê é o que a banca avalia).
6. Passa a vez. Ganha quem cumprir a própria missão primeiro; os outros podem continuar.

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
| Verba | ≥ custo do lançador |
| Falha aleatória | 15 % após projeto correto; escudo absorve |

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
