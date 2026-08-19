# Plano do projeto

Documento vivo. Registra o que ja foi decidido, para nao redecidir, e o que
falta. Leia antes de comecar qualquer etapa.

## Etapas

- **01 — Estrutura, banco e autenticacao.** Concluida. Scaffold Expo limpo,
  `jogadores` com RLS e gatilho de perfil, autenticacao por e-mail e senha,
  telas de login e cadastro, guarda de rota.
- **02 — Perfil do jogador.** Concluida. Nome, apelido, cidade e a
  autoavaliacao nas oito caracteristicas. A foto ficou de fora: depende de
  bucket no Storage, e entra quando houver etapa propria para ela.
- **03 — Lista de jogadores.** As tres abas (Perfil, Jogadores, Sorteio).
- **04 — Avaliacoes.** Um voto por par, editavel.
- **05 — Rating.** A formula, no banco.
- **06 — Motor de balanceamento.** Modulo puro em `src/nucleo/`, com testes.
- **07 — Tela de sorteio.** Selecionar 8, sortear, mostrar os times.
- **08 — Historico de partidas.** Registro e resultado.
- **09 — Testes.** Cobertura dos casos do documento original.
- **10 — Polimento e responsividade.**

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

**Autenticacao e do Supabase Auth, nao nossa.** O pedido original era uma tabela
`User` com `passwordHash`. Guardar senha a mao seria o ponto mais fragil do
sistema. O que importava do pedido esta mantido: identidade (`auth.users`)
separada do jogador (`public.jogadores`), e-mail nunca como chave, e o resto do
app falando so com `src/lib/auth.ts`. Acrescentar Google depois e uma funcao
nova nesse arquivo.

**O rating nao e gravado.** E sempre calculado a partir das avaliacoes. Por isso
mudar peso em `src/nucleo/atributos.ts` vale imediatamente, sem migracao e sem
recalculo em massa.

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

## Armadilhas ja encontradas

- **`esbuild` precisa de aprovacao de script no npm 11.** O vitest depende dele,
  e o npm 11 bloqueia postinstall por padrao. Esta registrado em `allowScripts`
  no `package.json`; sem isso o vitest nao roda.
- **Sem `window` no pre-render**, o cliente do Supabase lanca ao inicializar e
  derruba o processo, porque isso acontece fora de qualquer try. Ha uma guarda
  em `src/lib/supabase.ts`. Vale mesmo com a web em SPA, porque a guarda tambem
  protege qualquer execucao em Node.
- **`security definer` sem `set search_path = ''` e buraco de seguranca.** A
  funcao roda como dona do banco e um schema no caminho de busca pode sequestrar
  a resolucao de nome.
- **Privilegio de execucao vem de duas fontes.** O Postgres da EXECUTE a PUBLIC
  em toda funcao nova; o Supabase da a `anon` e `authenticated` por
  `alter default privileges`. Revogar de uma so deixa a outra passar. O idioma
  certo e `revoke ... from public, anon, authenticated` e conceder depois.

## Em aberto

- **Contagem de avaliacoes na tela.** O documento pede mostrar "31 avaliacoes"
  por jogador. Contagem exata ajuda a deduzir voto por diferenca quando o numero
  e pequeno. Decidir na etapa 04 entre numero exato e faixa ("pouca base" /
  "boa base").
- **Onde roda o sorteio.** O motor sera TypeScript puro e testavel. Se rodar so
  no aplicativo, da para forjar times mexendo no cliente. O rating, que e o que
  realmente importa proteger, fica no banco de qualquer forma. Decidir na etapa
  06 se vale mover o sorteio para uma funcao do banco.
- **Grupos.** Hoje a lista de jogadores e global: todo mundo que se cadastra ve
  todo mundo. Serve para um grupo unico. Se o app passar a atender varios
  grupos, `jogadores` precisara de um vinculo e a RLS muda junto.
