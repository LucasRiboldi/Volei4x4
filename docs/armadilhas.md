# Armadilhas já encontradas

Cada item aqui custou tempo de investigação uma vez. O arquivo existe para não
custar duas. Nada é removido daqui: armadilha resolvida continua sendo
armadilha para quem chegar depois.

- **`esbuild` precisa de aprovacao de script no npm 11.** O vitest depende dele,
  e o npm 11 bloqueia postinstall por padrao. Esta registrado em `allowScripts`
  no `package.json`; sem isso o vitest nao roda.
- **`npx expo install --fix` nao passa neste projeto, pelo mesmo motivo.** Ele
  chama `npm install --allow-scripts` por dentro, e o npm 11 recusa essa flag
  em instalacao de projeto:

      npm error code EALLOWSCRIPTS
      --allow-scripts is not allowed in project-scoped installs

  A permissao tem de vir do campo `allowScripts` do `package.json` -- que ja
  existe aqui --, e nao de uma flag. A saida e instalar direto pelo npm,
  nomeando as versoes que o `--check` pediu. `npm install` mexe no
  `package.json` e no lockfile juntos, que e o que o `expo lint` nao fazia e
  que quebrava o `npm ci`.
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
