# Vôlei 4x4

App para grupos que jogam vôlei de areia e perdem tempo montando time. O grupo
avalia os próprios jogadores, o app aprende o nível de cada um e sorteia dois
times de quatro que sejam de fato parelhos — com sorte suficiente para os times
não serem sempre os mesmos.

Roda no navegador, em qualquer celular ou computador. É feito para ser usado em
pé, na beira da quadra, com o celular na mão.

**No ar:** [volei4x4.vercel.app](https://volei4x4.vercel.app) — público, com as
variáveis de ambiente configuradas. O painel do projeto fica em
[vercel.com/lucasriboldis-projects/volei4x4](https://vercel.com/lucasriboldis-projects/volei4x4).
Ver [Estado atual](#estado-atual).

---

# Como usar

## Criar sua conta

Na primeira vez, toque em **Criar conta** e informe nome, e-mail e uma senha de
pelo menos 8 caracteres. Você entra direto, sem precisar confirmar e-mail.

## Perfil

A aba **Perfil** é onde você se apresenta ao grupo.

- **Foto** — toque no círculo com suas iniciais para escolher uma imagem do
  aparelho. Ela aparece nas listas e nos times sorteados.
- **Nome, apelido e cidade** — o apelido é o que aparece na tela de sorteio,
  onde o espaço é curto.
- **Sair da conta** fica no fim da tela.

Você só edita o seu próprio perfil. Ninguém mexe no seu.

## Jogadores

A aba **Jogadores** mostra todo mundo do grupo, com foto, apelido, cidade e a
nota geral de cada um.

- O número grande é o **rating**, de 0 a 10. O meio da escala é 5,0.
- Um traço (`–`) no lugar do número quer dizer **ainda não há avaliações
  suficientes**. Não é nota zero: é o app dizendo que ainda não sabe o
  bastante para arriscar um número.
- O app **não** mostra quantas pessoas avaliaram alguém, e isso é de propósito:
  esse número permitiria descobrir a nota de quem votou. Ver
  [Ninguém descobre quem deu qual nota](#ninguém-descobre-quem-deu-qual-nota).
- A busca filtra por nome ou apelido.

Quando você tem avaliações pendentes, um aviso aparece no topo desta aba.

## Sorteio

A aba **Sorteio** é onde a partida nasce.

1. Escolha o **modo**: *Equilíbrio* busca os times mais parelhos possíveis,
   *Variedade* aceita um pouco mais de diferença em troca de escalações
   diferentes a cada semana, e *Meio-termo* fica entre os dois.
2. Marque **exatamente 8 jogadores**. O contador no topo mostra quantos faltam,
   e o app não deixa passar de oito.
3. Toque em **Sortear times**.

O app não sorteia no acaso. Ele calcula todas as 35 formas possíveis de dividir
aqueles 8 jogadores em dois times de 4, mede a diferença de força de cada
divisão, separa as melhores e sorteia entre elas. Por isso os times ficam
parelhos e ainda assim mudam de uma semana para a outra.

Na tela de resultado você vê os dois times, a força estimada de cada um e a
diferença entre eles. **Sortear de novo** mantém as mesmas 8 pessoas e tenta
outra divisão.

**Registrar partida** grava aquele jogo — e é isso que libera as avaliações
depois.

## Avaliar depois da partida

Esta é a parte que faz o app melhorar com o tempo.

**Só quem jogou avalia, e só no dia seguinte.**

- No **dia da partida**, ninguém avalia. Nem quem jogou.
- Na **virada para o dia seguinte**, a avaliação abre para os 8 participantes.
- Na **virada seguinte**, fecha. O que foi salvo fica; nada mais entra.

A janela depende da **data** do jogo, não do horário. Uma partida às 8 da manhã
e outra às 22:30 do mesmo dia abrem para avaliação exatamente no mesmo momento.

Quando a janela abre, um aviso aparece na aba Jogadores. Você avalia cada
companheiro em oito características — ataque, defesa, passe, saque, bloqueio,
agilidade, leitura de jogo e trabalho em equipe —, de 1 a 5 estrelas.

Não precisa avaliar todo mundo. O que você salvar conta; o resto simplesmente
não entra. Enquanto a janela estiver aberta, dá para voltar e corrigir.

Você avalia **o desempenho naquela partida**, e não a pessoa em geral. Por isso
a mesma pessoa pode receber notas diferentes em jogos diferentes — e o rating é
a média de tudo isso.

## Partidas

O histórico mostra os jogos anteriores, com os times, o placar quando informado
e o estado da avaliação de cada um: *amanhã*, *aberta* ou *encerrada*.

## Ninguém descobre quem deu qual nota

Isso não é promessa da tela, é regra do banco de dados.

- Você lê **apenas as notas que você mesmo deu**.
- Ninguém lê as suas — nem a pessoa avaliada, nem o administrador.
- O que o grupo enxerga é a **média**, nunca o voto individual.
- Enquanto um jogador tem poucos avaliadores, o app mostra `–` em vez de um
  número. Com poucos votos, qualquer média entregaria quem votou o quê.
- A tela também **não** diz quantas pessoas avaliaram. Parece inofensivo, e não
  é: quem anotasse a contagem e a média antes e depois de uma partida resolveria
  por subtração a nota exata que entrou no meio — sem precisar de acesso a nada,
  só olhando duas vezes.

## Administrador

Uma conta pode ser marcada como administradora. Ela pode corrigir nome, apelido
e cidade de qualquer jogador — útil quando alguém digita errado no cadastro.

O administrador **não** vê avaliações, **não** troca a foto de outra pessoa e
**não** avalia fora da janela. Privilégio administrativo não é o mesmo que ver
tudo.

---

# Parte técnica

**Expo + React Native + Expo Router**, um código só para web, Android e iOS.
**Supabase** (Postgres) para banco e autenticação, no plano gratuito.

**O alvo hoje é a web, e só a web.** Toda etapa é desenvolvida e testada no
navegador. Ver [Virar app de celular depois](#virar-app-de-celular-depois) para
o porquê disso não fechar a porta.

O modelo do banco está desenhado em **[docs/mer.html](docs/mer.html)** — abra no
navegador. Traz as tabelas, as relações, quem pode ler e escrever o quê, e as
funções. É gerado por `scripts/gerar-mer.py`; para atualizar, edite o script e
rode de novo.

## Estado atual

Levantamento de 20/08/2026, conferido contra o banco, a interface, os testes e o
deploy. Nada aqui foi escrito de memória.

**No ar:** https://volei4x4.vercel.app — conferido com requisição direta: HTTP
200, sem Deployment Protection, servindo o `index.html` do SPA.

**Saúde do código:** `npx tsc --noEmit` sem erros; `npm run teste` com 61 testes
passando; 4.336 linhas de TypeScript e 1.888 de SQL.

As três listas abaixo — o que funciona, o que precisa de correção e o que falta
executar — são a fonte única do estado do projeto. Quando algo mudar, muda aqui.

---

### ✅ Funcional

Cada linha foi observada, não presumida. "API" quer dizer requisição direta ao
PostgREST, que é onde a garantia mora — interface escondida não prova nada.

#### O produto, ponta a ponta

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

#### Verificado na interface

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

#### Verificado pela API — as regras que protegem os dados

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

#### Coberto por teste automatizado

61 testes, com `npm run teste`.

- **Motor de sorteio** (11) — as 35 divisões, força e diferença, recusa de
  quantidade ≠ 8, equilíbrio por modo, e o empate que travaria sem o epsilon.
- **Janela de avaliação** (8) — os cinco cenários do documento e as duas viradas
  exatas.
- **Contraste WCAG AA** (42) — cada par de cor dos dois temas, medido.

⚠️ Os 42 de contraste medem `src/design/tokens.ts`, que **nenhuma tela usa**
ainda. A cobertura efetiva do que está no ar são os 19 de sorteio e janela. Ver
C-05 abaixo.

---

### 🔴 Precisa de correção

Nada aqui é emergencial no sentido de derrubar o app — ele está no ar e
utilizável. Ordenado por gravidade.

#### Crítico e alto

| # | Problema | Onde | Situação |
|---|---|---|---|
| **C-03** | Consolidada na `0017`: os números saem para `rating_parametros()`, e mudar um peso passa a ser mexer numa função de dez linhas em vez de reescrever cento e trinta. As cinco anteriores ganharam aviso de superada. | `supabase/migrations/0017` | 🔶 **escrita; falta aplicar a `0017`** |

#### Médio

| # | Problema | Onde | Situação |
|---|---|---|---|
| **C-05** | **As telas não usam o design system.** `src/design/tokens.ts` existe, tem 295 linhas e 42 testes; as 13 rotas leem `src/constants/theme.ts`, a paleta escura. Duas paletas convivem, e o tema que está no ar é o que **não** tem verificação de contraste. | `src/design/` × `src/constants/` | ⬜ pendente — decisão de produto |
| **C-06** | Consequência do C-05: `app.json` declara `userInterfaceStyle: "light"` e fundo `#FDF7EE`; as telas pintam `#0E1B2A`. | `app.json` | ⬜ pendente |
| **C-07** | `docs/mer.html` marca `avaliacoes` como "Aposentada — escrita revogada". A `0015` devolveu o insert e a transformou na avaliação inicial: o diagrama diz o oposto do que é verdade. `autoavaliacoes` também aparece sem marca de inativa. | `scripts/gerar-mer.py` | ⬜ pendente |
| **C-09** | `LICENSE` atribui o copyright a "650 Industries, Inc. (aka Expo)". É o arquivo do template, não do projeto. | `LICENSE` | ⬜ pendente |
| **C-10** | O nome `avaliacoes` não descreve mais a tabela: hoje ela é a avaliação **inicial**. Custo cognitivo permanente para quem chega. | banco | ⬜ pendente |

#### Baixo

| # | Problema | Onde | Situação |
|---|---|---|---|
| **C-12** | `salvarPlacar()` existe e não tem chamador. O banco aceita placar; nenhuma tela oferece. | `src/lib/partidas.ts` | ⬜ pendente |
| **C-13** | Nada leva ao histórico. `/partidas` funciona e nenhuma tela aponta para ela. | — | ⬜ pendente |
| **C-16** | O plano lista "onde roda o sorteio" como item em aberto, a decidir na etapa 06. A etapa 06 está concluída e o sorteio roda no cliente: a decisão foi tomada de fato e nunca registrada. | `docs/plano.md` | ⬜ pendente |
| **C-17** | `supabase/manual/` e `supabase/testes/` têm propósitos vizinhos — os dois guardam SQL que não é migração. | `supabase/` | ⬜ pendente |

#### Ambiente e dados, não código

| # | Situação |
|---|---|
| **A-01** | A chave anon na Vercel está quebrada em linhas. O app funciona porque `src/lib/supabase.ts` limpa espaço em branco — mas se alguém remover a limpeza sem saber por que ela existe, o bug volta. 🧑 |
| **A-02** | Os 13 jogadores de demonstração estão sem foto: foram semeados antes de o bucket existir. Basta rodar `python scripts/semear.py` de novo — é idempotente. |
| **A-03** | Dados de teste no banco: 22 jogadores, dos quais 13 fictícios (`@volei4x4-teste.com`) e ~8 contas de teste minhas; 9 partidas e 224 avaliações semeadas. Reversível por `scripts/semear-avaliacoes.py --desfazer`. 🧑 Apagar contas exige `service_role`. |
| **A-04** | Bruno Carvalho está com cidade "Esteio" — resíduo do teste de edição por administrador. |
| **A-05** | O gatilho de perfil pode não estar instalado. A `0013` tenta e tolera falha de privilégio. Se não instalou, contas criadas fora do app só ganham perfil no primeiro acesso — o que funciona. |
| **A-06** | Sem backup e sem monitoramento. Aceitável nesta escala; deixa de ser se o grupo passar a depender dos dados. |

#### Já corrigido — 20/08/2026

| # | O que era | O que foi feito |
|---|---|---|
| ✅ | Senha das contas de teste em texto puro no repositório | Vem de `VOLEI_SENHA_DE_TESTE`, sem valor padrão. O nome não leva `EXPO_PUBLIC_` de propósito: esse prefixo embutiria a senha no bundle da web |
| ✅ | E a senha antiga continuava valendo — tirá-la do código não a tira do histórico do git | `scripts/trocar-senha-de-teste.py` trocou as 13, uma a uma, conferindo cada troca entrando de novo. Verificado por fora depois: a senha do histórico devolve **400**, a nova devolve **200** |
| ✅ | A `0011` abortava em instalação limpa, e o e-mail pessoal estava versionado | Promoção movida para `supabase/manual/promover-admin.sql`, parametrizada. Nenhum arquivo rastreado contém mais o e-mail |
| ✅ | A contagem de avaliadores permitia deduzir voto por subtração | `0016` tira a coluna do retorno; `src/lib/ratings.ts` e `(abas)/index.tsx` acompanham. **Aplicada em produção** — `conferir-o-alcance.sql` devolve `ok` para as seis funções, então o `grant execute` sobreviveu ao `drop function` que a migração exigiu |
| ✅ | `supabase/testes/conferir-o-alcance.sql` fora do versionamento | Versionado |

#### Já corrigido — Fase 2

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

### 📋 Falta executar

Na ordem. As fases seguem o plano de correção da auditoria de 20/08/2026.

#### Fase 1 — correções críticas

✅ **Concluída em 20/08/2026.** Os quatro itens estão em
[Já corrigido](#já-corrigido--20082026).

A senha nova vive só no `.env.local`, que é ignorado pelo git. Se ela se perder,
`scripts/trocar-senha-de-teste.py` roda de novo com a que estiver valendo em
`VOLEI_SENHA_ANTIGA` — e reconhece conta já trocada, então falha no meio não
obriga a recomeçar.

#### Fase 2 — simplificação

Concluída em 20/08/2026 — ver [Já corrigido — Fase 2](#já-corrigido--fase-2).
Sobrou:

- **Decidir `salvarPlacar()`**: ligar a uma tela ou remover (C-12). O banco
  aceita placar, a policy `partidas_placar_de_quem_jogou` existe, o `grant` é
  por coluna e o histórico já mostra o placar quando existe — falta só a tela
  que o informa. Remover jogaria fora um caminho pronto e verificado

#### Fase 3 — consolidação

- 🧑 **Aplicar a `0017` no SQL Editor**, e conferir contra a linha de base: 22
  jogadores, 13 confiáveis, ratings de 3,57 a 7,28. Nenhum número deve se mexer
  — a fórmula é a mesma, só os literais viraram campos de configuração
- Regenerar `docs/mer.html` (C-07)
- Reorganizar a documentação; unir `supabase/manual/` e `supabase/testes/` (C-17)
- Escrever um `AGENTS.md` de verdade: arquitetura, regras invioláveis, como
  rodar e testar, e o link para as armadilhas do plano
- Registrar a decisão sobre onde roda o sorteio (C-16)
- Extrair o componente comum das duas telas de avaliar
- Link para o histórico de partidas a partir de alguma aba (C-13)
- Corrigir o `LICENSE` (C-09)

#### Fase 4 — qualidade

- **Decidir o destino do design system** (C-05): converter as telas, ou congelar
  os tokens e mover o teste de contraste para a paleta que está no ar
- Adotar eslint com o lockfile no commit
- Testes para `src/lib/` com o Supabase simulado
- Testar **pela tela**: registrar partida, salvar avaliação e enviar foto — hoje
  verificados só pela API
- Testar as telas `/admin` e `/editar/[jogador]`
- Tratar os `any` do mapeamento do PostgREST em `partidas.ts` e
  `avaliacoes-de-partida.ts`

#### Fase 5 — continuidade

- Backlog de produto num arquivo só
- `CHANGELOG.md`
- Definir a postura de backup do Supabase (A-06)
- Avaliar um projeto Supabase separado para desenvolvimento — é a raiz do C-01

#### Produto — depois das fases acima

- Registrar o placar pela tela (o banco já aceita)
- Indicador de quem venceu, no histórico
- Marcador de pendência na barra de navegação
- Perfil público do jogador — ⚠️ expõe as oito médias por jogador; exige
  reavaliar a privacidade antes, pelo mesmo raciocínio que tirou a contagem de
  avaliadores da tela — oito médias por jogador dão oito equações, e é mais
  material para inverter, não menos
- Animação do sorteio, estados vazios e *skeletons*
- Layout de tablet e desktop além da moldura
- Acessibilidade: foco visível, navegação por teclado, *reduced motion*
- Grupos, com código de convite — desenho já esboçado no plano

## Publicar

O build da web é gerado por:

```bash
npm run build
```

Ele roda `expo export -p web`, que produz `dist/`, e em seguida
`scripts/finalizar-build.mjs`, que acrescenta ao `index.html` o que o Expo não
coloca: manifest de PWA, ícone do iOS, `viewport-fit=cover`, idioma e a cor de
fundo que evita o lampejo branco. O script confere o resultado e falha se algo
não entrou — build silenciosamente incompleto é pior que build quebrado.

O `vercel.json` já aponta para tudo isso: comando de build, `dist` como saída,
`npm ci` na instalação, e o *rewrite* que manda qualquer rota para o
`index.html` — sem ele, abrir `/perfil` direto daria 404, porque num SPA só
existe um arquivo de verdade.

Testado servindo o `dist/` localmente: a tela de login renderiza, o manifest
carrega e os ícones respondem.

O deploy está completo: as variáveis de ambiente existem no painel e a
Deployment Protection está desligada — conferido com requisição direta, que
volta 200 sem passar por autenticação da Vercel. O que resta é o A-01 do
[Estado atual](#estado-atual): a chave anon está gravada quebrada em linhas, e
só funciona porque `src/lib/supabase.ts` limpa espaço em branco.

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com) e aplique as migrações de
   `supabase/migrations/`, em ordem crescente de nome, pelo SQL Editor do painel.

3. Copie `.env.example` para `.env.local` e preencha com a URL e a *anon key* do
   seu projeto:

   ```bash
   cp .env.example .env.local
   ```

   **Sem esse arquivo o app não sobe**: `src/lib/supabase.ts` lança já no
   import. A `service_role` nunca entra aí — ela ignora toda a RLS, que é a
   fronteira real dos dados.

4. Suba o servidor:

   ```bash
   npm run web
   ```

   Abra `http://localhost:8081`. A primeira compilação leva algo como meio
   minuto; depois é imediata.

5. **Depois de criar sua conta pelo app**, promova-a a administradora, se
   quiser: abra `supabase/manual/promover-admin.sql`, troque o e-mail na linha
   marcada e rode no SQL Editor.

   Esse passo é manual e fica fora das migrações de propósito. Quem é o
   administrador é **dado**, não esquema: varia de instalação para instalação, e
   não há caminho pela API para alguém se promover — o `grant` de `jogadores` é
   por coluna, e `admin` fica de fora dele.

## Dados de demonstração

Para encher o banco com jogadores fictícios durante o desenvolvimento:

```bash
python scripts/gerar-avatares.py
python scripts/semear.py
```

Todos ficam sob o domínio `@volei4x4-teste.com`, para nunca serem confundidos
com pessoas reais. Os avatares são gerados — círculo colorido com iniciais —, e
não fotos de gente de verdade.

**Antes de rodar, defina `VOLEI_SENHA_DE_TESTE`** no `.env.local` (ou no
ambiente). É a senha das contas fictícias, e os scripts param sem ela.

Ela já esteve escrita dentro de `scripts/semear.py`, e isso era um problema
real: o repositório é público, as contas de demonstração vivem no **mesmo**
projeto Supabase que atende produção, e o app está no ar sem barreira. Com o
domínio previsível e a senha em texto puro, qualquer pessoa entrava como um dos
jogadores fictícios e podia fazer a avaliação inicial de todo mundo — treze
contas passam do piso de cinco avaliadores e movem o rating de qualquer jogador
real.

Repare que o nome **não** começa com `EXPO_PUBLIC_`: esse prefixo faz o Expo
embutir o valor no bundle da web, o que republicaria a senha por outra porta.

## Virar app de celular depois

O projeto é Expo, então o mesmo código que roda no navegador gera aplicativo
Android e iOS — `npm run android` e `npm run ios` já estão no `package.json`.
Não há migração a fazer no dia em que isso for desejado.

Para que continue assim, vale **uma regra**: só usar bibliotecas que existam
dentro do Expo Go. Assim que entrar um pacote com código nativo próprio, esse
caminho barato acaba: passa a ser necessário um *development build*, e o iOS
exige o Apple Developer Program (US$ 99/ano).

## Antes de commitar

```bash
npx tsc --noEmit
npm run teste
```

**O `tsc` precisa que o servidor tenha rodado pelo menos uma vez.** Os tipos
gerados — `expo-env.d.ts` e `.expo/types/` — nascem do `npx expo start` e estão
no `.gitignore`. Em árvore recém-clonada, antes disso, o `tsc` acusa rota
inexistente. O mesmo vale ao criar uma rota nova: reinicie o servidor.

## Onde fica cada coisa

| Caminho | O que tem |
|---|---|
| `src/app/` | Rotas, e só rotas — telas e layout do expo-router |
| `src/nucleo/` | Regra pura e testável: atributos, sorteio, janela de avaliação |
| `src/lib/` | Conversa com o Supabase: auth, jogadores, partidas, avaliações |
| `src/components/` | Componentes de interface reaproveitados |
| `src/contexts/` | Sessão de autenticação |
| `src/constants/` | Paleta e espaçamentos |
| `scripts/` | Semeadura de dados de demonstração |
| `supabase/migrations/` | Esquema, RLS e funções — aplicadas à mão |

`src/nucleo/` é a parte que não depende de React nem de rede. O motor de
balanceamento e a regra da janela de avaliação vivem lá justamente para poderem
ser testados sozinhos, sem subir o app.

## Decisões que valem saber

**As regras de autorização vivem no banco, não na tela.** Quem pode avaliar
quem, quando, e quem pode editar qual perfil é decidido por policies de RLS.
Interface escondida não protege nada — um `curl` com a chave pública bateria na
mesma parede.

**O rating nunca é gravado.** É sempre calculado a partir das avaliações. Os
pesos das oito características vivem em `supabase/migrations/0007_rating.sql`,
e não no TypeScript: peso no cliente seria peso forjável.

**A janela de avaliação é gravada na criação da partida**, não calculada na
hora, e não depende de cron. Se está aberta é uma comparação entre o instante
atual e os dois marcos gravados, feita pelo servidor.

**A web roda como SPA** (`web.output: "single"`). O app inteiro fica atrás de
login: não há o que um render de servidor entregar.

**Não existe script de lint.** O `expo lint` do template não tem eslint como
dependência: ao rodar, grava as dependências no `package.json` sem tocar no
lockfile, e isso quebra o `npm ci`.

## Convenções

Código e comentários em português, sem acento em identificador. Comentário
explica **por que**, não o que o código já diz. Rotas em `src/app`, resto em
`src/`.
