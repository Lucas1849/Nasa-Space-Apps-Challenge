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
