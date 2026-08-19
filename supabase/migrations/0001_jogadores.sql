-- Etapa 01 -- Identidade e perfil do jogador.
--
-- A separacao entre identidade e jogador e o ponto central deste arquivo, e o
-- que permite acrescentar login com Google depois sem tocar em nada:
--
--   auth.users   e a identidade. Quem cuida dela e o Supabase Auth: senha com
--                hash, e-mail, e a lista de provedores em auth.identities.
--   jogadores    e a pessoa dentro do jogo: nome, apelido, foto, cidade.
--
-- O e-mail nunca e chave de nada. A chave e o uuid interno, e ele nao muda se
-- a pessoa trocar de e-mail ou passar a entrar pelo Google.
--
-- Este arquivo e idempotente: pode rodar de novo sem quebrar.

create table if not exists public.jogadores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 60),
  apelido text check (apelido is null or length(trim(apelido)) between 1 and 30),
  cidade text check (cidade is null or length(trim(cidade)) <= 60),
  foto_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.jogadores enable row level security;

-- Todo mundo que entrou enxerga a lista de jogadores: e o que a tela de
-- Jogadores e a de Sorteio precisam. Nao ha nada sensivel aqui -- nota e
-- avaliacao vivem em outra tabela, com regra propria.
drop policy if exists "jogadores_todo_logado_ve" on public.jogadores;
create policy "jogadores_todo_logado_ve"
  on public.jogadores for select to authenticated
  using (true);

-- Cada um edita so o proprio perfil.
drop policy if exists "jogadores_cada_um_edita_o_seu" on public.jogadores;
create policy "jogadores_cada_um_edita_o_seu"
  on public.jogadores for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sem policy de INSERT: quem cria a linha e o gatilho abaixo, para nao existir
-- conta sem jogador. Sem policy de DELETE: o perfil morre junto com a conta,
-- por cascata.

-- ---------------------------------------------------------------------------
-- Perfil automatico no cadastro
-- ---------------------------------------------------------------------------

create or replace function public.criar_jogador_do_novo_usuario()
returns trigger
language plpgsql
security definer
-- `security definer` sem search_path fixo e buraco de seguranca: a funcao roda
-- como dona do banco, e um schema no caminho de busca poderia sequestrar a
-- resolucao de nome.
set search_path = ''
as $$
begin
  insert into public.jogadores (id, nome)
  values (
    new.id,
    -- `nome` vem do cadastro por e-mail. `full_name` e `name` cobrem provedores
    -- OAuth, para o dia em que o Google entrar. O e-mail e o ultimo recurso,
    -- porque jogador sem nome quebraria as listas.
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Jogador'
    ), 60)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_jogador_do_novo_usuario();

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- Privilegio de execucao vem de duas fontes: o EXECUTE que o Postgres da a
-- PUBLIC em toda funcao nova, e o que o Supabase da a anon e authenticated por
-- alter default privileges. Revogar so de uma deixa a outra passar.
-- ---------------------------------------------------------------------------

revoke all on function public.criar_jogador_do_novo_usuario() from public, anon, authenticated;
