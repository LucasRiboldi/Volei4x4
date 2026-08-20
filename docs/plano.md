# Plano do projeto

Documento vivo. Registra o que ja foi decidido, para nao redecidir, e o que
falta. Leia antes de comecar qualquer etapa.

## Etapas

- **01 — Estrutura, banco e autenticacao.** Concluida. Scaffold Expo limpo,
  `jogadores` com RLS e gatilho de perfil, autenticacao por e-mail e senha,
  telas de login e cadastro, guarda de rota.
- **02 — Perfil do jogador.** Concluida. Nome, apelido, cidade e foto, com a
  imagem no bucket `avatares` do Storage. A autoavaliacao chegou a existir aqui
  e foi retirada do produto -- ver as decisoes abaixo.
- **03 — Lista de jogadores.** Concluida. As tres abas (Jogadores, Sorteio,
  Perfil), a lista com foto e apelido, e busca por nome ou apelido.
- **04 — Avaliacoes.** Concluida. Um voto por par, corrigivel, com a tela de
  avaliar e a marca de ja avaliado na lista. Voto e privado: so quem deu le.
- **05 — Rating.** Concluida e verificada com dado semeado. Formula bayesiana
  com piso de confianca, calculada no banco. Escala 0-10, neutro em 5,0.
- **06 — Motor de balanceamento.** Concluida. As 35 divisoes, recorte por modo
  de equilibrio e sorteio ponderado, em `src/nucleo/sorteio.ts`. 11 testes.
- **07 — Partidas e sorteio.** Concluida. Selecionar 8, sortear e gravar a
  partida com os times. As tabelas nasceram aqui porque a avaliacao pos-partida
  depende delas.
- **08 — Avaliacao pos-partida.** Concluida. Janela do dia seguinte,
  autorizacao por participacao na policy, uma avaliacao por par por partida.
  Substituiu a avaliacao global da etapa 04, e o rating passou a ler dela.
- **09 — Design system e interface.** Parcial. Tokens e identidade prontos e
  testados; nenhuma tela usa ainda.
- **10 — Polimento, acessibilidade e responsividade.** Nao iniciada.
- **Publicacao.** Concluida. No ar em https://volei4x4.vercel.app, com build
  proprio, manifest de PWA e moldura de 768px.

## Decisoes fechadas

**O alvo e a web, e so a web -- mas continua sendo Expo.** Toda etapa e feita e
testada no navegador; celular nao entra no criterio de pronto de nenhuma delas.

A stack continua sendo Expo, e nao Vite ou Next, justamente para essa decisao
ser reversivel de graca: `npm run android` e `npm run ios` seguem no
`package.json` e continuam funcionando. Trocar para web puro daria uma interface
um pouco melhor hoje, ao custo de reescrever tudo no dia em que quisermos app --
e o pedido foi explicitamente manter essa porta aberta.

**A regra que mantem a porta aberta: so usar biblioteca que exista dentro do
Expo Go.** Enquanto ela valer, rodar no celular e instalar o Expo Go e ler um QR
Code -- sem build, sem loja, sem custo. O primeiro pacote com codigo nativo
proprio acaba com isso: passa a exigir development build, e o iOS passa a exigir
o Apple Developer Program, US$ 99/ano. Antes de acrescentar dependencia, conferir
se ela roda no Expo Go.

**A autoavaliacao saiu do produto.** O perfil nao pede mais que a pessoa se
pontue. A tabela `autoavaliacoes` continua no banco, vazia e sem custo, caso a
ideia volte -- o que faltaria seria a tela, nao o esquema.

A consequencia real esta na etapa 05: jogador sem avaliacao nenhuma passa a cair
no valor neutro, e nao no proprio palpite. Tende a ser melhor, porque
autoavaliacao e enviesada, mas e mudanca de premissa e nao detalhe de tela.

**A foto e publica para leitura.** O bucket `avatares` e publico porque a imagem
aparece em listas com dezenas de fotos, e URL assinada por foto custaria uma ida
ao servidor cada. O que tem regra e a escrita: o caminho e `<uid>/avatar.<ext>`,
e a policy do Storage exige que a primeira pasta seja o uid de quem envia.

**Icone e emoji, nao biblioteca.** Biblioteca de icones costuma trazer fonte ou
modulo nativo, e isso quebraria a regra do Expo Go. Emoji renderiza igual nos
tres alvos, sem dependencia.

**A avaliacao passa a ser por partida, nao global.** A etapa 04 entregou
avaliacao livre: qualquer um avalia qualquer um, a qualquer hora, corrigindo
para sempre. O modulo de avaliacao pos-partida substitui essa regra -- so avalia
quem jogou com voce, so no dia seguinte, e a janela fecha em 24h. As chaves sao
incompativeis: `(avaliador, avaliado)` contra `(partida, avaliador, avaliado)`.

A nota deixa de ser opiniao solta e passa a ser observacao de desempenho numa
partida concreta, que e o que o rating precisa. O custo e que quem nunca jogou
fica sem rating ate a primeira partida.

**Os pesos do rating vivem no SQL, nao no TypeScript.** Reverte uma decisao
anterior. O rating precisa ser calculado no banco de qualquer forma, porque
`avaliacoes` so devolve as linhas de quem pergunta -- o app nao consegue somar
voto alheio. E peso no cliente e peso forjavel. Manter nos dois lugares seria
pior que escolher um: divergiriam em silencio. O custo e que mudar peso pede
migracao; em troca, fica versionado.

**O motor de sorteio nao sabe o que e React nem rede.** `src/nucleo/sorteio.ts`
recebe jogadores com rating e devolve dois times. A fonte de aleatoriedade e
injetavel, o que torna o teste deterministico -- e por isso da para provar que o
modo rigoroso nunca e pior que o solto, em vez de torcer.

**A avaliacao inicial existe para o grupo arrancar.** Com so a pos-partida,
ninguem tem rating ate jogar, e o sorteio precisa de rating -- a primeira
partida sairia no acaso. Cada pessoa pode avaliar cada outra UMA vez sem
partida; depois disso, aquele par so se reavalia apos jogarem juntos.

Quem garante o "uma vez" e a chave primaria de `avaliacoes`, e nao a tela. E ha
uma segunda trava: sem policy de update, nem `upsert` sobrescreve. As duas foram
verificadas -- 409 na chave, 403 no update.

**A largura para em 768px.** Acima disso o conteudo centraliza. As telas foram
desenhadas em uma coluna; esticar num monitor de 1920 daria linha longa demais e
cartao com vao enorme. O fundo lateral exigiu trocar o tema do react-navigation
-- o cinza padrao dele vem de dentro do navegador, e nenhuma View por cima
alcanca.

**Autenticacao e do Supabase Auth, nao nossa.** O pedido original era uma tabela
`User` com `passwordHash`. Guardar senha a mao seria o ponto mais fragil do
sistema. O que importava do pedido esta mantido: identidade (`auth.users`)
separada do jogador (`public.jogadores`), e-mail nunca como chave, e o resto do
app falando so com `src/lib/auth.ts`. Acrescentar Google depois e uma funcao
nova nesse arquivo.

**O rating nao e gravado.** E sempre calculado a partir das avaliacoes, entao
mudar a formula vale na leitura seguinte, sem recalculo em massa. Os pesos
ficam no SQL -- ver a decisao acima --, entao muda-los pede uma migracao nova.

A unica excecao e `partida_jogadores.rating_no_momento`, que E uma coluna: o
rating congelado no instante do sorteio. Foi essa excecao que quase passou
despercebida na correcao de escala da 0012.

**A escala do voto e 1 a 5; a do rating exibido e 0 a 10.** O documento original
misturava as duas. O voto casa com as estrelas da interface; o rating tem casa
decimal porque precisa ordenar jogadores proximos.

**Resistencia a voto injusto e media bayesiana**, nao mediana nem media aparada.
`(C*prior + soma) / (C + n)`: com poucos votos o valor fica perto do meio da
escala, e vai soltando conforme a amostra cresce. E simples de explicar, de
testar e de trocar depois -- que era o pedido do documento.

**A web roda como SPA.** `web.output: "single"`. O app e todo atras de login,
entao pre-render nao entrega nada, e o cliente do Supabase precisa de `window`
para inicializar.

**Sem script de lint.** O `expo lint` do template nao tem eslint como
dependencia: rodar grava as deps no `package.json` sem tocar no lockfile, e
`npm ci` passa a falhar. Se adotarmos eslint, sera com lockfile no commit.

**O agregado nao devolve contagem de avaliadores.** Fecha o item que estava em
aberto desde a etapa 04. Hoje `ratings_dos_jogadores()` devolve a coluna
`avaliadores`, e a lista mostra "7 avaliadores" embaixo do rating. Esse e o
ataque mais barato contra o voto privado: quem anota o par (contagem, rating)
antes e depois de uma partida resolve por subtracao o voto exato que entrou no
meio. Com amostra pequena a conta fecha de primeira, e nao exige acesso ao
banco -- basta olhar a tela duas vezes.

O que basta no lugar ja existe: o booleano `confiavel`. Ele responde a unica
pergunta que a interface faz -- mostrar o numero ou mostrar um traco -- e nao
carrega informacao de voto nenhum. Abaixo do piso a funcao continua devolvendo
o prior puro, e nao a media parcial: valor fixo nao vaza nada e ainda serve ao
sorteio.

O custo e uma migracao para tirar a coluna do retorno, o tipo em
`src/lib/ratings.ts`, e as linhas de `(abas)/index.tsx` que exibem a contagem.
Some da tela um numero que era informativo; e o preco de a nota continuar
privada.

## Armadilhas ja encontradas

- **`esbuild` precisa de aprovacao de script no npm 11.** O vitest depende dele,
  e o npm 11 bloqueia postinstall por padrao. Esta registrado em `allowScripts`
  no `package.json`; sem isso o vitest nao roda.
- **Sem `window` no pre-render**, o cliente do Supabase lanca ao inicializar e
  derruba o processo, porque isso acontece fora de qualquer try. Ha uma guarda
  em `src/lib/supabase.ts`. Vale mesmo com a web em SPA, porque a guarda tambem
  protege qualquer execucao em Node.
- **Tabela sem `grant` some da API, e o erro nao diz isso.** Criar a tabela e
  ligar a RLS nao basta: sem privilegio de tabela para `authenticated`, o
  PostgREST nao inclui a tabela no cache de schema e responde

      PGRST205: Could not find the table 'public.jogadores' in the schema cache

  que parece tabela inexistente. As duas travas sao diferentes: `grant` decide
  SE a tabela e alcancavel, RLS decide QUAIS LINHAS. Toda tabela nova precisa
  das duas. Ver `0004_permissoes.sql`, que tambem deixa um
  `alter default privileges` para as proximas.
- **`create trigger` em `auth.users` pode derrubar a migracao inteira.** O
  editor de SQL do Supabase roda o script em uma transacao: um erro de
  privilegio no gatilho reverte as tabelas criadas antes dele. Por isso o
  gatilho vive sozinho na 0003.
- **`security definer` sem `set search_path = ''` e buraco de seguranca.** A
  funcao roda como dona do banco e um schema no caminho de busca pode sequestrar
  a resolucao de nome.
- **Privilegio de execucao vem de duas fontes.** O Postgres da EXECUTE a PUBLIC
  em toda funcao nova; o Supabase da a `anon` e `authenticated` por
  `alter default privileges`. Revogar de uma so deixa a outra passar. O idioma
  certo e `revoke ... from public, anon, authenticated` e conceder depois.
- **Update ou delete que nao casa com nenhuma linha e sucesso.** O PostgREST
  responde 200 com lista vazia, nao erro. Uma policy que barra a operacao
  produz exatamente isso: a tela diz que salvou e nada mudou. Onde a recusa
  precisa ser visivel, a operacao vira funcao que levanta excecao -- policy
  sozinha nao sabe reclamar.
- **Policy de UPDATE sem policy de SELECT nunca dispara.** Todo update vindo do
  cliente precisa de um `where` para achar a linha, e isso faz valer as
  policies de SELECT junto com as de UPDATE. Sem nenhuma de SELECT o update
  casa com zero linhas -- e, pela armadilha acima, calado. O mesmo vale para
  `insert ... on conflict do update`, que consulta a policy de SELECT para
  checar a linha existente.
- **Policy que consulta a propria tabela entra em recursao infinita.** Ler
  `jogadores` para decidir se voce pode ler `jogadores` nao termina. A saida e
  a checagem viver em funcao `security definer`, que roda por fora da RLS e
  corta o ciclo -- e o que `e_admin()` ja faz. Toda policy nova que dependa de
  um atributo guardado na propria tabela precisa de uma funcao assim.
- **`.returns<T>()` do supabase-js esta deprecado**, em favor de
  `.overrideTypes<T, { merge: false }>()`. E funcao que devolve uma linha so
  precisa de `.maybeSingle()` antes: o PostgREST responde com o objeto direto,
  e sem isso o TypeScript acusa conversao de lista para objeto.

## Em aberto

- **Onde roda o sorteio.** O motor sera TypeScript puro e testavel. Se rodar so
  no aplicativo, da para forjar times mexendo no cliente. O rating, que e o que
  realmente importa proteger, fica no banco de qualquer forma. Decidir na etapa
  06 se vale mover o sorteio para uma funcao do banco.
- **Grupos.** Hoje a lista de jogadores e global: todo mundo que se cadastra ve
  todo mundo. Serve para um grupo unico. Se o app passar a atender varios
  grupos, `jogadores` precisara de um vinculo e a RLS muda junto.

  Um desenho ja fechado em outro projeto, caso sirva de ponto de partida:
  codigo de convite de 6 caracteres num alfabeto sem I, L, O, 0 e 1 -- o codigo
  e ditado em quadra e digitado no celular do outro, entao o que se confunde a
  olho sai do alfabeto, e o campo filtra por esse mesmo alfabeto para o erro
  aparecer na hora de digitar e nao depois de uma ida ao servidor; entrada e
  saida por funcao `security definer`, e nao escrita direta na tabela de
  vinculo, para a recusa poder reclamar em vez de casar com zero linhas; e o
  pertencimento checado por funcao, pela armadilha da recursao acima. Sem
  policy de INSERT na tabela de vinculo, so se entra pelo codigo.
