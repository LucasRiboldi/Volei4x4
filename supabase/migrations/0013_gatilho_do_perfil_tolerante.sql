-- Instala o gatilho de criacao de perfil sem poder derrubar o resto.
--
-- ---------------------------------------------------------------------------
-- Por que esta migracao existe, se a 0003 ja tentava isso
-- ---------------------------------------------------------------------------
--
-- A 0003 cria o gatilho em `auth.users`. Isso exige privilegio no schema
-- `auth`, que nem todo projeto do Supabase concede -- e neste ele nao foi
-- instalado: contas criadas pela API continuam nascendo sem linha em
-- `jogadores`.
--
-- O problema nao e o gatilho faltar. E que a tentativa de cria-lo aborta a
-- transacao inteira, e o editor de SQL roda o script todo em uma. Foi assim que
-- a 0001 perdeu as tabelas na primeira tentativa, e foi por isso que o gatilho
-- foi isolado na 0003.
--
-- Aqui a tentativa acontece dentro de um bloco que captura a falha de
-- privilegio. Se der certo, o gatilho fica. Se nao der, a migracao segue e
-- avisa -- e nada mais no script e perdido.
--
-- Nao ter o gatilho NAO quebra o aplicativo: `garantirMeuPerfil()` cria o
-- perfil no primeiro acesso, amparado pela policy `jogadores_cria_o_proprio`.
-- O gatilho e a via preferida porque cobre tambem quem nasce fora do app --
-- pela API, ou por um provedor OAuth no futuro.
--
-- Idempotente: pode rodar de novo sem quebrar.

create or replace function public.criar_jogador_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jogadores (id, nome)
  values (
    new.id,
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

revoke all on function public.criar_jogador_do_novo_usuario() from public, anon, authenticated;

do $$
begin
  execute 'drop trigger if exists ao_criar_usuario on auth.users';
  execute 'create trigger ao_criar_usuario
             after insert on auth.users
             for each row execute function public.criar_jogador_do_novo_usuario()';
  raise notice 'Gatilho de perfil instalado.';
exception
  when insufficient_privilege or undefined_table then
    -- Sem acesso ao schema `auth`. Nao e impedimento: o aplicativo cria o
    -- perfil no primeiro acesso.
    raise notice 'Sem privilegio para criar gatilho em auth.users. Seguindo sem ele -- o app cria o perfil no primeiro acesso.';
end;
$$;
