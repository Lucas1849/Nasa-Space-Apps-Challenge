# CLAUDE.md — Nasa-Space-Apps-Challenge

Contexto para o Claude Code neste repositório. Leia antes de qualquer tarefa.

## O projeto

Jogo 2D gratuito, executado no navegador, para o desafio **Space Mission Design Game** do
**NASA Space Apps Challenge 2026** (dificuldade Intermediate / Beginner-Youth, assunto: Games).

Ideia da equipe: tornar o design de missões espaciais acessível a qualquer pessoa.

Página oficial do desafio: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/

O arquivo `space_mission_design_game.txt` na raiz é a captura (em português) da página do
desafio: resumo, contexto, objetivos, considerações opcionais e recursos. Consulte-o como
fonte de requisitos.

## O que o desafio pede

Um jogo/simulação interativa em que o jogador projeta, gerencia e simula uma missão espacial
completa, tomando decisões de engenharia com recursos limitados e vendo como cada escolha
afeta o sucesso da missão.

Funcionalidades que o desafio sugere:
- Definir objetivo e requisitos da missão (antes das decisões de engenharia)
- Projetar a espaçonave (estrutura, energia, baterias, comunicações, computador de bordo,
  controle de atitude, instrumentos científicos)
- Selecionar instrumentos científicos (cada um com massa, consumo de energia, custo, geração
  de dados e valor científico)
- Escolher veículo de lançamento e órbita
- Gerenciar restrições: orçamento, massa, energia, comunicações, dados e tempo de vida
- Simular a missão e dar feedback claro sobre por que teve sucesso ou falhou
- Pontuação que premie sucesso, valor científico, uso eficiente de recursos e boas decisões
- Jogo individual e em equipe (até 4 jogadores, com papéis diferentes)
- Níveis de dificuldade, tipos de missão ou cenários

Princípio central: **toda decisão tem consequência** (mais instrumentos = mais ciência, mas
também mais massa, energia, custo e dados). Não deve existir uma única solução perfeita.

## Regras de trabalho para o Claude

- Responda e comente em **português**. Nomes de variáveis, funções e arquivos em **inglês**.
- Mantenha tudo rodando no navegador, sem dependências pagas e sem backend obrigatório,
  a menos que a equipe decida o contrário.
- Antes de criar algo grande, proponha a estrutura e espere confirmação.
- Mudanças pequenas e focadas; explique o que mudou em poucas linhas.
- Não invente dados reais de foguetes, instrumentos ou missões. Se usar valores aproximados
  para balanceamento, deixe isso explícito em comentário ou na documentação.
- Não commitar segredos, tokens ou arquivos grandes sem necessidade.

## Fluxo Git (repositório compartilhado)

O repositório é privado e compartilhado. **Não usar `git init`**; ele já existe.

```bash
git clone https://github.com/Lucas1849/Nasa-Space-Apps-Challenge.git
git pull                              # sempre antes de começar
git checkout -b <nome>/<assunto>      # uma branch por tarefa
git add <arquivos>
git commit -m "Mensagem curta no imperativo"
git push -u origin <nome>/<assunto>   # depois abrir Pull Request
```

- Não escrever direto na `main` sem combinar com a equipe.
- Em conflito de merge, mostrar os trechos conflitantes e perguntar qual versão manter.
- Só fazer commit ou push quando o usuário pedir.

## Estado atual

- Conceito do jogo em `IDEIA.md` (tabuleiro estilo Banco Imobiliário + oficina de engenharia,
  tema corrida espacial). Regras do evento em `docs/regras-do-evento.md`.
- Stack e estrutura em `docs/ARQUITETURA.md` (JS puro, ES modules, sem build; testes com
  `node --test`). O jogo segue a `IDEIA.md` v2: rodada = ano (1957–1969), cartas de vitória
  sorteadas, recordes mundiais, tabuleiro de 16 casas com prédios e tecnologia, voo em etapas
  (uma por turno) com risco explicado, dados de falha, cartão "Na história real" e tela de fim.
  1–4 agências em hot-seat ou sandbox. `npm start` para jogar, `npm test` para testar.
- Plano de tarefas e divisão por área em `docs/TAREFAS.md`. Donos de cada área: **a definir**.
- Regras de simulação ficam em `src/sim/simulate.js`; toda regra nova precisa de teste e de um
  texto explicando a falha (o "porquê" é o que a banca avalia).
- Prazo da submissão: domingo 15/11/2026, 23:59 (horário de Uberlândia).

## Recursos de apoio citados no desafio

- Visualização de missões na web e orreries: Three.js, orrery interativo, Inner Solar System
- pykep (biblioteca Python da ESA) para plotagem de órbitas
- Conceitos úteis: elipse/parábola/hipérbole, transferência de Hohmann, otimização
  multidisciplinar (ex.: Dymos)
- Referências de jogos da Canadian Space Agency (Mission: Astronaut, OSIRIS-REx, etc.)
- A lista de recursos da página pode crescer antes do hackathon; vale revisitar.
