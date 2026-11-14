# Skills do Claude Code para o projeto

Guia das skills que mais ajudam a desenvolver o jogo e criar as artes. Pesquisa feita em
14/11/2026, com o prazo da submissão (15/11, 23:59) em mente.

## O que é uma skill

Uma skill é uma pasta com um `SKILL.md`: instruções que o Claude carrega quando a tarefa pede.
Você pode chamar pelo nome (`/frontend-design`) ou só descrever a tarefa ("use a skill
frontend-design para redesenhar a oficina"). As skills ficam em três lugares:

| Onde | Quem vê | Quando usar |
|---|---|---|
| `.claude/skills/<nome>/SKILL.md` neste repositório | toda a equipe (vai pelo Git) | skills específicas do jogo |
| `~/.claude/skills/<nome>/` | só você | gosto pessoal |
| plugin (`/plugin install ...`) | quem instalar | coleções prontas |

## Contexto que guiou a escolha

- O jogo é **JS puro + DOM/CSS**, sem canvas e sem engine (Phaser, Pixi etc.). Skills de
  Godot/Unity/Unreal ou de física **não servem**.
- A arte precisa rodar sem build e sem arquivos pesados: **SVG inline e CSS** são o caminho
  mais barato. Pixel art em PNG também funciona, mas exige mais cuidado com escala.
- A banca avalia clareza do "porquê" da falha da missão, então a UI do relatório e da oficina
  pesa tanto quanto a arte.

## Resumo (ordem de prioridade)

| # | Skill | Para quê | Origem |
|---|---|---|---|
| 1 | `frontend-design` | dar cara de jogo à UI (oficina, tabuleiro, relatório) | Anthropic, oficial |
| 2 | `svg-art` | ícones de peças, instrumentos, foguetes, planetas em SVG | comunidade |
| 3 | `game-art` | definir estilo visual, paleta e consistência | comunidade |
| 4 | `theme-factory` | paleta e tipografia únicas aplicadas no CSS | Anthropic, oficial |
| 5 | `webapp-testing` | jogar o fluxo inteiro com Playwright e tirar screenshots | Anthropic, oficial |
| 6 | `run` | subir o jogo e ver a mudança funcionando | embutida no Claude Code |
| 7 | `game-ui-ux` / `game-feel` | HUD legível, acessibilidade, animações de feedback | comunidade |
| 8 | `canvas-design` | pôster, capa da submissão, imagens para os slides | Anthropic, oficial |
| 9 | `algorithmic-art` | fundo de estrelas/órbitas generativo | Anthropic, oficial |
| 10 | `code-review` / `simplify` | revisar PRs antes do merge | embutidas no Claude Code |
| 11 | `skill-creator` | criar skills do próprio projeto (ex.: "adicionar missão") | Anthropic, oficial |

Opcional, só se a equipe escolher pixel art: `pixel-art-sprites` ou `codixel` (ver no fim).

---

## 1. `frontend-design` (Anthropic)

**Por que:** é a skill oficial para interfaces com acabamento de produto, e não de
template genérico. Ela força escolhas de tipografia, cor, hierarquia e movimento antes de
escrever o CSS, que é justamente o que falta no `src/styles/main.css` (97 linhas hoje).
Também respeita o projeto como ele é: HTML/CSS/JS sem framework.

**Como usar:**
```
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
```
Depois:
> Use a skill frontend-design para redesenhar a tela da oficina (`src/ui/workshop.js` +
> `src/styles/main.css`) com tema corrida espacial anos 60. Sem frameworks, só CSS.

**Dica:** peça uma tela por vez e passe a referência visual (print, paleta, jogo de
referência). Mudanças grandes no CSS conflitam com o trabalho dos outros, então combine no grupo.

## 2. `svg-art` (mostafa-drz)

**Por que:** escreve SVG direto como código: ícones de linha, marcas geométricas, padrões e
composições. Para um jogo DOM/CSS isso é ideal: os ícones das peças (`src/data/parts.js`),
instrumentos, lançadores e órbitas viram SVG inline, leves, escaláveis, que trocam de cor
por CSS (`currentColor`) e não precisam de build. Ela também gera uma galeria HTML de prévia
para a equipe escolher.

**Como usar** (instala em `.claude/skills` do projeto, então dá para commitar):
```
npx -y skills add mostafa-drz/claude-skills --skill svg-art --agent claude-code
```
> Use svg-art para criar 12 ícones 48×48 em estilo de linha, traço 2px, `currentColor`,
> um para cada peça em `src/data/parts.js`. Mesmo grid e mesmo peso de traço em todos.

**Atenção:** por padrão ela salva as sessões numa pasta do Desktop. Peça para salvar em
`assets/icons/` dentro do repositório.

## 3. `game-art` (davila7/claude-code-templates)

**Por que:** não gera arte. É um guia de **direção de arte**: árvore de decisão para escolher
o estilo (pixel, vetor/flat, low-poly...), teoria de cor (contraste, legibilidade, humor),
convenção de nomes de assets (`[tipo]_[objeto]_[variante]_[estado].ext`) e anti-padrões como
misturar estilos. Usar antes do `svg-art` evita um jogo com cara de colagem. Princípio da
skill: *"Art serves gameplay."*

**Como usar:** o arquivo está em
`cli-tool/components/skills/creative-design/game-development/game-art/SKILL.md` no repositório
[davila7/claude-code-templates](https://github.com/davila7/claude-code-templates). Copie essa
pasta para `.claude/skills/game-art/` e commite. Depois:
> Use game-art para propor 2 direções de arte para o jogo (paleta de 5 cores, estilo dos
> ícones, fontes) e escreva a escolhida em `docs/ESTILO.md`.

## 4. `theme-factory` (Anthropic)

**Por que:** cria um tema (paleta e par de fontes) e aplica de forma consistente. É útil para
transformar a direção de arte do item 3 em variáveis CSS (`--color-*`, `--font-*`) num único
lugar. Assim quem mexe em UI não inventa cor nova.

**Como usar:** vem no mesmo plugin `example-skills` do item 1.
> Use theme-factory para criar um tema "Mission Control" e escreva como variáveis CSS no
> topo de `src/styles/main.css`.

## 5. `webapp-testing` (Anthropic)

**Por que:** usa Playwright para abrir o jogo no navegador, clicar, verificar a UI, capturar
screenshots e ler o console. Serve para testar o fluxo setup → tabuleiro → oficina →
lançamento → relatório que o `node --test` não cobre (ele só testa as regras), e para gerar
os prints da submissão e dos slides.

**Como usar:** vem no plugin `example-skills`. Precisa de Python + Playwright
(`pip install playwright && playwright install chromium`).
> Use webapp-testing: rode `npm start`, jogue uma partida de 2 jogadores até o relatório e
> salve screenshots de cada tela em `docs/screenshots/`. Reporte erros do console.

## 6. `run` (embutida)

**Por que:** já vem no Claude Code. Sobe o app do projeto e confirma que a mudança funciona
de verdade, não só nos testes. É a forma mais rápida de "deixa eu ver".

**Como usar:** `/run` ou "rode o jogo e me mostre a oficina".

## 7. `game-ui-ux` e `game-feel` (gamedev-skills)

**Por que:** é o único catálogo grande de gamedev que traz skills **independentes de engine**.
- `game-ui-ux`: regras de HUD e menus (âncoras, escala, legibilidade, mínimos de
  acessibilidade). O painel de recursos da oficina (massa/energia/custo/dados) se beneficia
  diretamente.
- `game-feel`: tweens com easing, "shake", squash and stretch. Na versão CSS, dá para fazer
  o lançamento e o "projeto fechou/não fechou" terem impacto.
- `game-docs` (bônus): mantém um GDD de uma página sincronizado com o código, útil para o
  `SUBMISSION.md`.

**Como usar:**
```
claude plugin marketplace add gamedev-skills/awesome-gamedev-agent-skills
claude plugin install gamedev@awesome-gamedev-agent-skills
```
Ignore as skills de engines (Godot, Unity, Phaser...); elas não se aplicam.

## 8. `canvas-design` (Anthropic)

**Por que:** gera arte estática (PNG/PDF) com intenção de design: pôsteres e composições.
Serve para o **material da submissão**: capa do projeto, imagem de destaque e fundos dos
slides da demo (≤ 7 slides). Não é para os assets do jogo.

**Como usar:** plugin `example-skills`.
> Use canvas-design para criar uma capa 1920×1080 para o "Space Mission Design Game — The
> Goats", usando a paleta de `docs/ESTILO.md`.

## 9. `algorithmic-art` (Anthropic)

**Por que:** arte generativa com p5.js (aleatoriedade com semente, campos de fluxo,
partículas). Bom para um **fundo animado de estrelas/órbitas** na tela inicial ou no
lançamento. Prioridade baixa: só depois do P0/P1 do `docs/TAREFAS.md`.

**Atenção:** p5.js é uma dependência externa. Se usar, carregue de CDN com versão fixa, ou peça
para portar o resultado para canvas puro, mantendo o projeto sem build.

## 10. `code-review` e `simplify` (embutidas)

**Por que:** com várias pessoas mexendo ao mesmo tempo, revisar antes do merge evita quebrar
a `main` na véspera da entrega. `code-review` caça bugs; `simplify` limpa duplicação.

**Como usar:** `/code-review` (revisa o diff atual) ou `/code-review 12` (revisa o PR #12).

## 11. `skill-creator` (Anthropic) → skills do próprio projeto

**Por que:** as tarefas que mais se repetem aqui são receitas fixas: "adicionar missão",
"adicionar peça", "nova regra de simulação com teste e texto do porquê". Transformar isso em
skills em `.claude/skills/` faz o Claude de **todo mundo da equipe** seguir o mesmo padrão
do `docs/ARQUITETURA.md`.

**Como usar:** já disponível como `skill-creator`.
> Use skill-creator para criar a skill `add-mission` em `.claude/skills/` a partir das
> instruções de `docs/ARQUITETURA.md`.

Sugestões: `add-mission`, `add-part`, `add-sim-rule` (exige teste + mensagem de falha) e
`art-style` (paleta, traço e tamanho dos ícones da equipe, para toda arte nova seguir o mesmo
padrão).

---

## Opcional: pixel art

Só vale se a equipe decidir por estilo pixel. Com o prazo curto, vetor/SVG é mais rápido e
combina melhor com DOM/CSS.

- **`pixel-art-sprites`** (omer-metin): a mais instalada do gênero. Tamanhos de sprite,
  número de frames, paletas indexadas e checagem de escala.
- **`codixel`** ([mankidev/codixel](https://github.com/mankidev/codixel)): sprites, animações
  e efeitos (fogo, fumaça), útil para o fogo do foguete. A própria skill avisa que o Claude
  "escreve código, não pinta", então precisa de imagem de referência e revisão a cada passo.

No CSS, use `image-rendering: pixelated` e escala inteira (2×, 3×) para não borrar.

## Cuidados com skills de terceiros

- **Leia o `SKILL.md` antes de instalar.** Skill é instrução que o Claude segue e pode
  incluir scripts. As oficiais (Anthropic) e as embutidas são seguras; as de comunidade não
  foram auditadas por nós.
- Arte gerada por IA: confira as regras do evento (`docs/regras-do-evento.md`) sobre uso e
  divulgação de IA e cite na submissão se for exigido.
- Não commitar assets grandes (regra do `CLAUDE.md`): prefira SVG e PNG pequenos.

## Fontes

- [anthropics/skills](https://github.com/anthropics/skills): skills oficiais (frontend-design,
  theme-factory, webapp-testing, canvas-design, algorithmic-art, skill-creator)
- [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills):
  game-ui-ux, game-feel, game-docs, create-game-assets (Apache-2.0)
- [davila7/claude-code-templates: game-art](https://github.com/davila7/claude-code-templates/blob/main/cli-tool/components/skills/creative-design/game-development/game-art/SKILL.md)
- [svg-art no Skills Directory](https://www.skillsdirectory.com/skills/mostafa-drz-svg-art) ·
  [mostafa-drz/claude-skills](https://github.com/mostafa-drz/claude-skills)
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- [Guia de skills de pixel art (Skillselion)](https://skillselion.com/guides/pixel-art-skills-claude-code-guide) ·
  [mankidev/codixel](https://github.com/mankidev/codixel)
