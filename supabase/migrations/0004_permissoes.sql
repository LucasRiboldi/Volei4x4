-- Etapa 01 -- Privilegios de tabela, e o recarregamento do cache da API.
--
-- Por que esta migracao existe
-- ---------------------------------------------------------------------------
--
-- As tabelas foram criadas e a RLS ligada, mas nenhum `grant` foi escrito: a
-- aposta era que o `alter default privileges` do Supabase concederia sozinho a
-- `anon` e `authenticated`. Nao concedeu -- e o sintoma foi cruel, porque nao
-- parece falta de permissao:
--
--   PGRST205: Could not find the table 'public.jogadores' in the schema cache
--
-- O PostgREST monta o cache de schema com o que os papeis alcancam. Tabela sem
-- grant nenhum nao entra nesse cache, e a API responde como se ela nao
-- existisse. Passamos um bom tempo procurando uma tabela ausente que estava la.
--
-- As duas travas sao diferentes e ambas necessarias:
--   grant  decide SE a tabela e alcancavel.
--   RLS    decide QUAIS LINHAS podem ser lidas ou escritas.
--
-- Conceder tudo a `authenticated` nao afrouxa nada: as policies das migracoes
-- anteriores continuam sendo quem decide linha a linha. `anon` fica de fora de
-- proposito -- nenhuma policy do projeto e `to anon`, entao dar acesso a ele
-- seria conceder o que nunca sera usado.
--
-- Idempotente: pode rodar de novo sem quebrar.

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.jogadores to authenticated;
grant select, insert, update on public.autoavaliacoes to authenticated;

-- Sem delete em nenhuma das duas: apagar perfil ou autoavaliacao nao e acao do
-- produto, e as duas somem por cascata quando a conta e removida.

-- Vale para as tabelas das proximas etapas, para nao repetir o mesmo erro.
alter default privileges in schema public
  grant select, insert, update on tables to authenticated;

-- O cache do PostgREST costuma recarregar sozinho depois de um DDL, mas a
-- espera nao e garantida. Este aviso forca, e e o que faz a correcao valer na
-- hora em vez de "daqui a pouco".
notify pgrst, 'reload schema';
