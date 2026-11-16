# Rascunho da submissão (campos da página do projeto, em inglês)

Prazo: domingo 15/11, 23:59 (horário de Uberlândia). Detalhes em `docs/regras-do-evento.md`.
Preencher tudo em inglês e clicar em "Submit for Judging".

- [ ] **Project Name:**
- [ ] **High-Level Project Summary:**
- [ ] **Link to Project Demo** (vídeo até 30 s ou até 7 slides, link público):
- [ ] **Link to Final Project** (jogo hospedado, link público sem login):
- [ ] **Detailed Project Description:**
- [ ] **Use of Super Intelligence (SI):** declarar o código gerado com IA (commits com `Co-Authored-By`)
- [ ] **NASA Data:** citar ao menos 1 recurso da NASA (obrigatório para prêmio global)
- [ ] **Space Agency Partner Data and Other References:** incluir tudo que foi usado

Lembretes: sem logos da NASA, sem imagem ou voz de menores de 18 anos, todos do time no mesmo Local Event.

## Recursos da NASA usados como base de design (para o campo "NASA Data")

Todos vêm da aba Resources do desafio (detalhes em `space_mission_design_game.txt`):

- **Design and Develop Science Missions** (webinar, NASA SmallSat Institute, 2025) — o ciclo do jogo
  segue o fluxo Need & Goals → Concept → Requirements → Design → Build & Verify → Implement, e as
  checagens da simulação cobrem os 4 segmentos (Launch, Space, Ground, User).
  https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
- **Mission Design Lab (GSFC)** — a oficina é um "trade study" simplificado: comparar arquiteturas
  (lançador × órbita × payload) contra massa, energia, comunicação e custo.
  https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
- **Concept Maturity Levels (JPL)** — os 3 milestones (Projeto pronto → Lançamento → Missão cumprida)
  são uma versão enxuta da progressão de maturidade de conceito.
  https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299
- **CubeSat 101 (NASA CSLI)** — referência para os tipos de subsistema (energia, comunicação,
  instrumentos) e para a ideia de que massa e energia são os limites principais de um satélite pequeno.
  https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf
- **Marsbound! Mission to the Red Planet (NASA/JPL Education)** — atividade oficial em que cada
  componente é uma carta com massa, energia e custo e a equipe itera até fechar o orçamento. Base
  do formato "Ganha / Custa" dos cards da oficina.
  https://www.jpl.nasa.gov/edu/teach/activity/marsbound

- **NASA History (calendário da corrida espacial)** — o jogo vai de 1957 a 1969, o bot do modo solo
  cumpre cada degrau no ano real e o relatório mostra o cartão "Na história real" (só o ano):
  - Sputnik 1 (1957) e Explorer 1 (1958): https://www.nasa.gov/history/explorer-1-overview/
  - Laika/Sputnik 2 (1957) e Enos/Mercury-Atlas 5 (1961): https://www.nasa.gov/history/a-brief-history-of-animals-in-space/
  - TIROS-1 (1960) e ATS-1 (1966): https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/
  - Luna 2 (1959) e Ranger 7 (1964): https://www.nasa.gov/history/60-years-ago-ranger-7-photographs-the-moon/
  - Salyut 1 (1971) e Skylab (1973): https://www.nasa.gov/missions/station/50-years-ago-launch-of-salyut-the-worlds-first-space-station/
  - Apollo 8 (1968): https://www.nasa.gov/mission/apollo-8/

Os números do jogo são fictícios (balanceamento); o que vem da NASA é o **processo, os trade-offs e
as datas históricas**.

## Uso de IA (campo "Use of SI")

Código, testes e documentação da estrutura inicial foram gerados com Claude Code (Anthropic) a partir
do conceito criado pela equipe em `IDEIA.md`; commits marcados com `Co-Authored-By: Claude`. A ideia
do jogo, o tema e as regras de trade-off são da equipe. Nenhuma imagem gerada por IA até o momento.

---

# Auditoria do formulário de entrega × projeto (14/11/2026, 22h50)

Leitura do formulário de edição em
https://www.spaceappschallenge.org/2026/find-a-team/the-goats3/?tab=project (último salvamento no site:
14/11 às 14:50; status **"Project Requires Submission for Judging"**, ou seja, **ainda não enviado**).
Prazo: domingo 15/11, 23:59.

## Estrutura real do formulário (4 blocos)

| Bloco | Campo | Tipo | Estado no site |
|---|---|---|---|
| Project Summary | Project Name | texto | Preenchido: "Online Games FRIV - Space Mission Design" |
| Project Summary | Summary * | texto, máx. 1500 caracteres (sugestão 50–200 palavras) | Preenchido com 167 caracteres (~30 palavras) |
| Project Links | Project Demonstration * | URL completa | **Vazio** |
| Project Links | Project * | URL completa | **Vazio** |
| Project Information | Project Details * | editor de texto rico | **Vazio** |
| Project Information | Use of Super Intelligence (SI) * | **caixas de seleção** (não é texto) | **Nada marcado** |
| Project Information | NASA Data * | lista de pares Link Text + Link URL | **Vazio** |
| Project Information | Space Agency Partner & Other Data | lista de pares Link Text + Link URL | **Vazio** |
| Verification | Agree to Terms and Conditions * | checkbox | Marcado |
| Verification | Confirm All Work is Original * | checkbox | Marcado |
| — | Lock / Save Progress / **Submit for Judging** | botões | Lock OFF, não enviado |

Opções do campo SI: Ideation or Brainstorming · Research or Information Gathering · Data Analysis
and Interpretation · Building SI/ML Into the Project · Coding, Debugging, or Troubleshooting ·
Writing, Editing, or Translation · Visual Design or Image Creation · Presentation, Video, or Audio ·
Other Project-Related SI Use · None / Did not use SI.

## Gaps e decisões que vão contra a entrega

### Bloqueantes (sem isso o projeto não é julgado ou perde o prêmio global)

1. **Link do projeto vazio e repositório privado.** O repositório
   `github.com/Lucas1849/Nasa-Space-Apps-Challenge` responde 404 sem login (é privado). O campo exige
   link "que não peça senha, permissão ou cadastro". Nem o repositório nem o `dist/jogo.html` dentro
   dele servem enquanto for privado. O deploy no GitHub Pages (P0 em `docs/TAREFAS.md`) ainda não foi
   feito, e **Pages em repositório privado exige plano pago do GitHub**.
   Decisão necessária: tornar o repositório público e ativar o Pages, **ou** hospedar o
   `dist/jogo.html` em outro lugar público (Netlify Drop, itch.io, repositório público só com o build).
   Testar o link em aba anônima.
2. **Demo inexistente.** Campo obrigatório vazio e o formato (vídeo ≤ 30 s com legenda em inglês **ou**
   ≤ 7 slides em inglês) ainda não foi escolhido. Passar do limite tira do julgamento global.
   Slides precisam de nome da equipe, integrantes e desafio.
3. **Project Details vazio** no site e no rascunho. Precisa responder às perguntas do formulário: o que
   faz e como funciona, benefícios, impacto pretendido, ferramentas e linguagens (JavaScript puro, ES
   modules, HTML/CSS, SVG, Node.js para testes e build, GitHub), por que é criativo e que fatores a equipe
   considerou.
4. **NASA Data vazio no site.** As referências já estão neste arquivo, mas precisam virar pares
   *Link Text* (nome do recurso, em inglês) + *Link URL* completa, um por linha, no formulário.
5. **"Submit for Judging" não clicado.** "Save Progress" não conta como envio.

### Conflitos com as regras (podem custar elegibilidade ou pontos)

6. **Nome do projeto usa "FRIV".** Friv é marca de um site de jogos de terceiros. Usar nome de outra
   marca contradiz o "Confirm All Work is Original" e passa a ideia de que o jogo é do Friv. O rascunho
   aqui também está com o nome em branco. Decisão: escolher um nome próprio (o jogo trata da corrida
   espacial 1957–1969) e usar o mesmo nome na página, na demo e na tela inicial.
7. **Campo SI é de caixas de seleção, não texto.** O rascunho trata "Use of SI" como texto livre. O
   formulário diz que essa resposta **não é vista pelos juízes**. A declaração que conta precisa estar
   **no próprio projeto**: no texto do Project Details e nos metadados (README, `<meta>` do HTML,
   créditos no jogo). Hoje nem a tela inicial do jogo nem o `index.html` mencionam o uso de IA.
   Marcar no site, de acordo com o que foi feito: *Coding, Debugging, or Troubleshooting* e
   *Writing, Editing, or Translation* (documentação e textos em inglês). **Não** marcar
   *Ideation or Brainstorming*: a regra proíbe usar IA para criar a ideia da solução, e a ideia
   é da equipe (`IDEIA.md`). Se a demo usar imagem, vídeo ou voz gerados por IA, marcar
   *Presentation, Video, or Audio* e colocar marca d'água visível.
8. **"Confirm All Work is Original" já marcado com as listas de referências vazias.** Ao marcar, a
   equipe declara que todo recurso externo (código, texto, imagens) está listado nos campos NASA Data
   e Other Data. Hoje isso não é verdade. Preencher as listas antes de enviar.
9. **Recursos externos não listados em "Space Agency Partner & Other Data".** O rascunho diz "incluir
   tudo", mas não lista nada. Já usamos, no mínimo:
   - Google Fonts: DM Sans e DM Mono (carregadas em `index.html`; atualizado em 15/11) — https://fonts.google.com
   - PeerJS 1.5.4 (biblioteca do modo online, carregada do jsDelivr em `src/net/peer.js`) e o servidor
     público gratuito do PeerJS, que faz a ponte entre os aparelhos — https://peerjs.com
   - Claude Code (Anthropic), ferramenta de IA usada no código — https://claude.com/claude-code
   - Node.js (testes e build) — https://nodejs.org
   - GitHub / GitHub Pages (código e hospedagem) — https://github.com
   - Página do desafio Space Mission Design Game —
     https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/
   - Qualquer imagem, ícone ou som de terceiros que entrar na demo ou no jogo.
   Nenhum dado de agência parceira (ex.: Agência Espacial Brasileira) foi usado até agora; se não for
   usar, tudo bem deixar só "Other".

### Qualidade (afeta os critérios Impact, Creativity, Validity, Relevance e Presentation)

10. **Summary curto e com erros.** Tem ~30 palavras (o site sugere 50–200) e erros de inglês
    ("accessable" → *accessible*; "any person that want" → *anyone who wants*). Também não responde às
    três perguntas do campo: o que foi desenvolvido, como atende ao desafio e por que importa.
11. **Jogo só em português** (`<html lang="pt-BR">`, todos os textos da interface). Os juízes globais
    leem em inglês. Não é proibido, mas pesa em Presentation e na hora de abrir o link. Decisão:
    traduzir pelo menos a tela inicial, a oficina e o relatório, ou avisar no Project Details que
    o jogo está em português e mostrar na demo, com legenda em inglês.
12. **Números fictícios × critério Validity.** O README avisa que massa, energia e custos são
    inventados. Isso precisa aparecer no Project Details junto com o que **vem da NASA** (processo
    de design, trade-offs, datas históricas), para não parecer erro de dado.
13. **Itens do desafio ainda pendentes em `docs/TAREFAS.md`** que valem citar ou fechar antes do envio:
    deploy público, papéis diferentes por jogador (o desafio pede até 4 jogadores **com papéis
    diferentes**; hoje são 4 agências em hot-seat e o modo cooperativo é P2), janela de lançamento,
    mais eventos de voo, versão para celular e capturas de tela para a página.
14. **Repositório local na branch `master`**, enquanto o remoto e a documentação usam `main`. Antes do
    build final, confirmar que o `dist/jogo.html` publicado foi gerado a partir da `main` atualizada.

### Avisos para o Project Details (15/11)

- **Modo online depende de serviço externo gratuito** (servidor público do PeerJS). Se ele estiver fora
  do ar, o online falha. Deixar escrito que o modo solo (contra o bot) e o hot-seat (mesmo aparelho)
  funcionam sem rede e sem cadastro, para o juiz testar por eles.
- **Idioma:** o jogo abre em inglês quando o navegador não está em português, e o link
  `https://lucas1849.github.io/Nasa-Space-Apps-Challenge/?lang=en` força o inglês. Usar esse link no
  campo do projeto.

### Pontos a confirmar com a equipe

- Todos os 5 integrantes confirmados no Local Event de Uberlândia (condição para prêmios).
- Nenhum integrante menor de 18 anos aparece com imagem, voz ou nome na demo.
- Quem clica em "Submit for Judging" e até que horas (sugestão: domingo 20h, como no checklist).

## Ordem sugerida para fechar

1. Decidir nome do projeto e hospedagem pública → publicar e testar o link.
2. Gravar a demo (ou montar os slides) → subir com link público.
3. Escrever Summary e Project Details em inglês aqui neste arquivo, revisar, colar no site.
4. Preencher NASA Data e Other Data (pares nome + URL) e marcar as opções de SI.
5. Colocar a declaração de IA no jogo (tela inicial) e no README.
6. Save Progress → revisar em aba anônima → **Submit for Judging**.

---

# Decisões de negócio e próximos passos (14/11/2026)

Resumo consolidado a partir de `IDEIA.md` (v1 → v3) e `docs/TAREFAS.md`, para orientar o
que entra na submissão.

## Decisões de negócio já fechadas (e implementadas)

**Conceito e tema**
- Jogo de tabuleiro 2D por turnos no navegador, tema **corrida espacial da Guerra Fria**
  (1957–1969), sem backend e sem dependências pagas.
- Núcleo do jogo = **engenharia da nave + decisão de "lançar agora ou esperar"**. O tabuleiro
  é meio para recursos/eventos, não o foco.

**Estrutura de partida (v3 + implementação de 14/11)**
- **Lados EUA × URSS**, cada um com uma **escada de 4 missões** como condição de vitória.
  Vence quem completar o degrau final primeiro.
- **Rival escondido** (abandonada a "corrida visível" da v2); informação vem da casa de
  **espião** (custo 12, 1×/ano) e de **boatos** (acertam 70%).
- **Tempo:** 3 rodadas = 1 ano; calendário histórico até 1969 (limite de 39 rodadas).
- **Modo solo** contra bot que segue o calendário histórico (±1 ano). 1–4 jogadores em
  hot-seat com tela "passe o dispositivo".
- **Falha = nave perdida inteira**, compensada com dados de falha, +1 tecnologia e missão
  de consolação (crédito parcial).
- **Vantagens/fraquezas:** EUA com mais verba e foguetes mais tarde; URSS com foguetes cedo
  e orçamento menor.
- **Balanceamento de início (14/11):** verba inicial cortada (60 → 20) e anual (40 → 20);
  peças reveladas aos poucos pelo tabuleiro em vez do catálogo inteiro no turno 1.
- **Descartado nesta edição:** equipes com papéis, multiplayer online, física orbital real,
  espionagem/sabotagem entre jogadores.

## Próximos passos

**P0 — obrigatório para submeter (pendente):**
- Deploy público no GitHub Pages (sem link público o projeto não é julgado).
- Texto da página do projeto em inglês (campos deste arquivo).
- Citar ao menos 1 recurso da NASA (obrigatório para prêmio global) — já listados acima.
- Demo: vídeo ≤ 30 s ou ≤ 7 slides em inglês.

**P1 — deixar o jogo bom:**
- Jogar 3 partidas inteiras e ajustar balanceamento (custos/verba).
- Mais eventos de voo; evento de "janela de lançamento"; testes para cada regra nova.
- Melhorar arte do SVG, tabuleiro mais visual, responsivo no celular.

**Questões de negócio ainda em aberto** (seção 15 do `IDEIA.md`): degrau final exato da URSS,
duração ideal da partida, custos de upgrade dos prédios e **definição dos donos de cada área**
(hoje todos "_definir_" em `docs/TAREFAS.md`).
