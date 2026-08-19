-- Papel de administrador.
--
-- O administrador pode editar o perfil de qualquer jogador. Todo o resto segue
-- valendo para ele como para os outros: avaliacao continua privada, e a janela
-- de avaliacao nao se abre por ser admin.
--
-- ---------------------------------------------------------------------------
-- A armadilha que este arquivo fecha
-- ---------------------------------------------------------------------------
--
-- A policy de update em `jogadores` permite a pessoa editar a propria linha.
-- Se `admin` fosse uma coluna comum, qualquer usuario poderia mandar
--
--     PATCH /rest/v1/jogadores?id=eq.<o proprio id>   {"admin": true}
--
-- e virar administrador sozinho. A policy nao barraria: a linha E dele.
--
-- A defesa nao esta na policy, e sim no GRANT: abaixo, `authenticated` recebe
-- update apenas nas colunas de perfil. `admin` fica de fora, entao o PostgREST
-- recusa a escrita antes mesmo de a RLS ser consultada. Promover alguem passa a
-- ser um ato deliberado, feito por SQL -- que e o que deve ser.
--
-- ---------------------------------------------------------------------------
-- A outra armadilha: recursao
-- ---------------------------------------------------------------------------
--
-- `e_admin()` consulta `jogadores`, e vai ser usada numa policy DA `jogadores`.
-- Sem cuidado isso e recursao infinita: para saber se pode ler a linha, precisa
-- ler a linha. Por isso ela e `security definer` -- roda por fora da RLS e corta
-- o ciclo.
--
-- Idempotente: pode rodar de novo sem quebrar.

alter table public.jogadores
  add column if not exists admin boolean not null default false;

create or replace function public.e_admin()
returns boolean
language sql
stable
security definer
-- `security definer` sem search_path fixo e buraco de seguranca: a funcao roda
-- como dona do banco, e um schema no caminho de busca poderia sequestrar a
-- resolucao de nome.
set search_path = ''
as $$
  select coalesce(
    (select j.admin from public.jogadores j where j.id = (select auth.uid())),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Quem edita o que
-- ---------------------------------------------------------------------------

drop policy if exists "jogadores_cada_um_edita_o_seu" on public.jogadores;
create policy "jogadores_edita_o_proprio_ou_admin"
  on public.jogadores for update to authenticated
  using (id = (select auth.uid()) or public.e_admin())
  with check (id = (select auth.uid()) or public.e_admin());

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- O update deixa de ser na tabela inteira e passa a ser coluna a coluna. E esta
-- linha -- e nao a policy -- que impede alguem de se promover a administrador.
-- ---------------------------------------------------------------------------

revoke update on public.jogadores from authenticated;
grant update (nome, apelido, cidade, foto_url) on public.jogadores to authenticated;

-- `alter default privileges` da 0004 concede update inteiro nas tabelas novas.
-- Nao vale para esta, que ja existia, mas vale lembrar ao criar as proximas:
-- tabela com coluna de privilegio precisa de grant por coluna.

revoke all on function public.e_admin() from public, anon;
grant execute on function public.e_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- O primeiro administrador
--
-- Feito por SQL de proposito: nao existe -- e nao deve existir -- caminho pela
-- API para alguem virar admin.
-- ---------------------------------------------------------------------------

update public.jogadores
set admin = true
where id = (
  select u.id from auth.users u
  where lower(u.email) = 'lucasriboldi.esteio@gmail.com'
);
