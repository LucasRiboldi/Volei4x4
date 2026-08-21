# Estado do projeto

Levantamento de 20/08/2026, conferido contra o banco, a interface, os testes e o
deploy. Nada aqui foi escrito de memória.

**No ar:** https://volei4x4.vercel.app — conferido com requisição direta: HTTP
200, sem Deployment Protection, servindo o `index.html` do SPA.

**Saúde do código:** `npx tsc --noEmit` sem erros; `npm run teste` com 65 testes
passando; 4.336 linhas de TypeScript e 1.888 de SQL.

As três listas abaixo — o que funciona, o que precisa de correção e o que falta
executar — são a fonte única do estado do projeto. Quando algo mudar, muda aqui.

---

## ✅ Funcional

Cada linha foi observada, não presumida. "API" quer dizer requisição direta ao
PostgREST, que é onde a garantia mora — interface escondida não prova nada.

### O produto, ponta a ponta

| # | Fase | Situação | Como se sabe |
|---|---|---|---|
| 01 | Estrutura, banco e autenticação | ✅ concluída | interface + API |
| 02 | Perfil do jogador | ✅ concluída | interface + API |
| 03 | Lista de jogadores e abas | ✅ concluída | interface |
| 04 | Avaliações | ✅ substituída pela avaliação por partida | — |
| 05 | Rating | ✅ concluída | API, com dado real |
| 06 | Motor de balanceamento | ✅ concluída | 11 testes |
| 07 | Partidas e sorteio | ✅ concluída | interface + API |
| 08 | Avaliação pós-partida | ✅ concluída | interface + API |
| — | Administrador | ✅ concluída | API, incluindo a escalada de privilégio |
| — | Avaliação inicial | ✅ concluída | API |
| — | Publicação na Vercel | ✅ no ar | HTTP 200 |

### Verificado na interface

| O que | O que foi observado |
|---|---|
| Cadastro, login e guarda de rota | entra; sem sessão volta ao login |
| Login em **produção** | passa em volei4x4.vercel.app |
| Perfil: nome, apelido, cidade | grava e relê |
| Lista de jogadores | 22 cadastrados, com rating |
| Busca | filtra por nome e apelido |
| Aviso de avaliação pendente | "6 jogadores aguardam sua avaliação" |
| Tela de avaliar a partida | progresso, prazo, quem já foi avaliado |
| Sorteio | Time A × Time B com força e diferença |
| Moldura de 768px | centralizada em 1440; tela cheia em 360 e 768 |
| Sem rolagem horizontal | em 360, 768 e 1440 |

### Verificado pela API — as regras que protegem os dados

| O que | Resultado |
|---|---|
| Rating: ordenação | bate com o nível semeado (Spearman 0,984) |
| Rating: escala | 0–10, neutro em 5,0 |
| Piso de confiança | 13 de 22 passaram; o resto mostra `–` |
| Compressão bayesiana | altos −0,60, baixos +0,33 — como projetado |
| Registrar partida | 4×4 gravado, rating congelado |
| Escalação inválida | recusada com mensagem |
| Foto: envio | 200, e legível publicamente |
| **Foto: escrever na pasta alheia** | **403** |
| **Criar perfil com id alheio** | **403** |
| **Editar perfil alheio** | **0 linhas** |
| **Ler avaliação alheia** | **vazio, contagem 0** |
| **Avaliar a si mesmo** | **403** |
| **Avaliar quem não jogou a partida** | **403** |
| **Votar em nome de outra pessoa** | **403** |
| **Avaliar no dia da partida** | **403 — janela fechada** |
| **Avaliar 5 dias depois** | **403 — janela fechada** |
| Avaliação inicial | 201 |
| **Avaliação inicial repetida** | **409 — chave primária** |
| **Sobrescrever a inicial (upsert)** | **403 — sem grant de update** |
| Admin edita perfil alheio | 1 linha |
| **Usuário comum se promove a admin** | **403** |
| **Admin promove alguém pela API** | **403 — não há esse caminho** |
| **Admin lê avaliação alheia** | **vazio** |

### Coberto por teste automatizado

65 testes, com `npm run teste`.

- **Motor de sorteio** (11) — as 35 divisões, força e diferença, recusa de
  quantidade ≠ 8, equilíbrio por modo, e o empate que travaria sem o epsilon.
- **Janela de avaliação** (8) — os cinco cenários do documento e as duas viradas
  exatas.
- **Contraste WCAG AA** (46) — cada par de cor dos dois temas, medido.

Os 46 de contraste mediam tokens que nenhuma tela usava — a ressalva que
ficava aqui. Desde a conversão do C-05, medem a paleta que está no ar.

---

## 🔴 Precisa de correção

Nada aqui é emergencial no sentido de derrubar o app — ele está no ar e
utilizável. Ordenado por gravidade.

Restam dois, os dois pequenos.

### Baixo

| # | Problema | Onde | Situação |
|---|---|---|---|
| **C-13** | Nada leva ao histórico. `/partidas` funciona e nenhuma tela aponta para ela. | — | ⬜ pendente |
| **C-17** | `supabase/manual/` e `supabase/testes/` têm propósitos vizinhos — os dois guardam SQL que não é migração. | `supabase/` | ⬜ pendente |

### Ambiente e dados, não código

| # | Situação |
|---|---|
| **A-01** | A chave anon na Vercel está quebrada em linhas. O app funciona porque `src/lib/supabase.ts` limpa espaço em branco — mas se alguém remover a limpeza sem saber por que ela existe, o bug volta. 🧑 |
| **A-03** | Dados de teste no banco: 22 jogadores, dos quais 13 fictícios (`@volei4x4-teste.com`) e ~8 contas de teste minhas; 9 partidas e 224 avaliações semeadas. Reversível por `scripts/semear-avaliacoes.py --desfazer`. 🧑 Apagar contas exige `service_role`. |
| **A-05** | O gatilho de perfil pode não estar instalado. A `0013` tenta e tolera falha de privilégio. Se não instalou, contas criadas fora do app só ganham perfil no primeiro acesso — o que funciona. |
| **A-06** | Sem backup e sem monitoramento. **Risco aceito por decisão**, não esquecimento — ver `decisoes.md`. Deixa de ser aceitável se o grupo passar a depender do histórico de avaliações. |

### Já corrigido — 20/08/2026

| # | O que era | O que foi feito |
|---|---|---|
| ✅ | Senha das contas de teste em texto puro no repositório | Vem de `VOLEI_SENHA_DE_TESTE`, sem valor padrão. O nome não leva `EXPO_PUBLIC_` de propósito: esse prefixo embutiria a senha no bundle da web |
| ✅ | E a senha antiga continuava valendo — tirá-la do código não a tira do histórico do git | `scripts/trocar-senha-de-teste.py` trocou as 13, uma a uma, conferindo cada troca entrando de novo. Verificado por fora depois: a senha do histórico devolve **400**, a nova devolve **200** |
| ✅ | A `0011` abortava em instalação limpa, e o e-mail pessoal estava versionado | Promoção movida para `supabase/manual/promover-admin.sql`, parametrizada. Nenhum arquivo rastreado contém mais o e-mail |
| ✅ | A contagem de avaliadores permitia deduzir voto por subtração | `0016` tira a coluna do retorno; `src/lib/ratings.ts` e `(abas)/index.tsx` acompanham. **Aplicada em produção** — `conferir-o-alcance.sql` devolve `ok` para as seis funções, então o `grant execute` sobreviveu ao `drop function` que a migração exigiu |
| ✅ | `supabase/testes/conferir-o-alcance.sql` fora do versionamento | Versionado |

### Já corrigido — scripts

| # | O que era | O que foi feito |
|---|---|---|
| ✅ | `semear.py` falhava nos 13 jogadores com `42501 permission denied for table jogadores` | Era a defesa funcionando: a `0009` tirou o UPDATE de tabela e deixou só as colunas de perfil, e o *upsert* manda o `id` junto. Trocado por PATCH e, se não casar linha, INSERT — sem afrouxar grant nenhum |
| ✅ | 13 jogadores de demonstração sem foto (A-02) | Resolvido pela mesma corrida: os 13 têm `foto_url` |
| ✅ | Bruno Carvalho com cidade "Esteio" (A-04) | Voltou a "Gravatai" |

### Já corrigido — Fase 3

| # | O que era | O que foi feito |
|---|---|---|
| ✅ | `LICENSE` em nome da Expo (C-09) | MIT em nome de Lucas Riboldi, 2026 |
| ✅ | `salvarPlacar()` sem chamador (C-12) | Removida, por decisão: o placar não se escreve pelo app. A **leitura** fica — o histórico mostra o que houver, e um traço quando não há |
| ✅ | As telas não usavam o design system (C-05) | As 13 rotas e os 4 componentes convertidos para `src/design/tokens.ts`, via `src/design/tema.ts`. `src/constants/theme.ts` removido. Provado no bundle: **nenhuma** das 9 cores da paleta escura sobrou, e as da clara entraram |
| ✅ | `app.json` prometia tema claro e as telas pintavam escuro (C-06) | Deixou de ser contradição sozinho, ao fechar o C-05. `DarkTheme` → `DefaultTheme` no navegador, e a barra de status virou escura sobre fundo claro |
| ✅ | `avaliacoes` não descrevia mais a tabela (C-10) | Renomeada para `avaliacoes_iniciais` na `0018`, junto com o índice, a constraint, o gatilho e as duas policies — nome de objeto que mente é pior que nome feio. `0018` aplicada, e os ratings conferidos contra a linha de base: 22 jogadores × 10 campos, nenhuma diferença |
| ✅ | O MER dizia que `avaliacoes` estava aposentada (C-07) | Regenerado: a tabela aparece como ativa, com o nome novo e a regra certa na tabela de permissões. `autoavaliacoes` segue marcada como vazia |
| ✅ | "Onde roda o sorteio" em aberto desde a etapa 06 (C-16) | Decidido e registrado no plano: continua no navegador. Forjar times rende escolher a própria escalação numa pelada; o rating, que é o que importa, é do banco, e `criar_partida()` recusa escalação inválida |

### Já corrigido — Fase 2

| # | O que era | O que foi feito |
|---|---|---|
| ✅ | `src/lib/avaliacoes.ts` morto, e errado se alguém o reativasse | Removido. Nenhum importador, nenhum dos quatro símbolos usado em lugar nenhum — conferido antes |
| ✅ | `scripts/.semeadura.json` versionado | Fora do versionamento e no `.gitignore`. O arquivo continua em disco: é ele que o `--desfazer` lê |
| ✅ | `?? 0` no sorteio prometia "valor neutro" e entregava o piso da escala | `RATING_NEUTRO` em `src/nucleo/atributos.ts`, **derivado** de `NOTA_NEUTRA` e dos limites da escala em vez de escrito à mão — dá 5,0 e acompanha a escala se ela mudar |
| ✅ | 5 dependências suspeitas de não serem usadas | Investigadas: **nenhuma sai**. `expo-constants`, `expo-linking` e `react-native-gesture-handler` são *peerDependencies* do expo-router; `expo-font` é dependência do próprio `expo`; `expo-splash-screen` e `expo-system-ui` servem ao `app.json` |
| ✅ | A justificativa do nome `VOLEI_SENHA_DE_TESTE` estava só no raciocínio | Provada: `npm run build` e busca no bundle publicado. A senha **não** aparece em `dist/`; a anon key aparece, como esperado e por desenho |
| ⚠️ | **C-15 era falso alarme.** A auditoria viu 7 de 36 arquivos em CRLF e concluiu "diffs ruidosos". Errado: medi pelo `file`, que olha o disco. Esta máquina tem `core.autocrlf=true`, então o git já convertia na entrada — `git ls-files --eol` mostra **zero** arquivos com CRLF no índice, e `git add --renormalize .` não moveu nada. O `.gitattributes` fica assim mesmo, por outro motivo: `core.autocrlf` é configuração de máquina e não viaja no clone; `.gitattributes` faz a garantia viajar com o repositório |
| ✅ | 5 pacotes atrás da versão esperada pelo SDK 57 | Atualizados pelo npm direto, porque `expo install --fix` não passa no npm 11 — ver a armadilha no plano. Conferido com `expo install --check`, `npm ci`, `tsc`, os 61 testes e o `npm run build` |

---

## 📋 Falta executar

### Fases 1, 2 e 3 — concluídas em 20/08/2026

Ver as três tabelas de [Já corrigido](#já-corrigido--fase-3). Sobrou uma coisa
só, herdada da Fase 3:

- Extrair o componente comum das duas telas de avaliar. Elas têm a mesma
  estrutura e as mesmas chaves de estilo, com formatação diferente

### Fase 4 — qualidade

É onde o projeto está agora.

- 🧑 **Abrir o app e olhar.** A conversão para o design system foi provada pelo
  bundle — nenhuma cor da paleta escura sobrou —, mas ninguém viu a tela. Não
  havia painel de navegador na sessão em que foi feita. Contraste medido não é
  o mesmo que layout bom
- Adotar eslint, com o lockfile no commit. Hoje a única análise estática é o
  `tsc`, e o `?? 0` do sorteio é o tipo de coisa que passa por ele
- Testes para `src/lib/` com o Supabase simulado — hoje há zero
- Testar **pela tela**: registrar partida, salvar avaliação e enviar foto. Os
  três são verificados só pela API
- Testar as telas `/admin` e `/editar/[jogador]`, que nunca foram exercitadas
- Tratar os `any` do mapeamento do PostgREST em `partidas.ts` e
  `avaliacoes-de-partida.ts`
- Link para o histórico a partir de alguma aba (C-13)
- Unir `supabase/manual/` e `supabase/testes/` (C-17)

### Fase 5 — continuidade

- `CHANGELOG.md`
- Backlog de produto num arquivo só

Os outros dois itens que estavam aqui viraram decisão e saíram: não haverá
projeto Supabase separado, nem rotina de backup. Ver `decisoes.md`.

### Produto — depois das fases acima

- Indicador de quem venceu, no histórico
- Marcador de pendência na barra de navegação
- Perfil público do jogador — ⚠️ expõe as oito médias por jogador; exige
  reavaliar a privacidade antes, pelo mesmo raciocínio que tirou a contagem de
  avaliadores da tela: oito médias dão oito equações, e é mais material para
  inverter, não menos
- Animação do sorteio, estados vazios e *skeletons*
- Layout de tablet e desktop além da moldura
- Acessibilidade: foco visível, navegação por teclado, *reduced motion*
- Grupos, com código de convite — desenho já esboçado em `decisoes.md`

O placar por tela saiu do backlog: virou decisão de não fazer.
