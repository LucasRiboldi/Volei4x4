-- Etapa 01 -- Gatilho que cria o perfil no cadastro.
--
-- Isolado das outras migracoes de proposito. Criar gatilho em `auth.users`
-- exige privilegio no schema `auth`, e nem todo projeto do Supabase concede.
-- Como o editor de SQL roda o script inteiro em uma transacao, um erro aqui
-- dentro da 0001 reverteria as tabelas junto -- que foi exatamente o que
-- aconteceu na primeira tentativa.
--
-- Se esta migracao falhar por permissao, NAO ha problema: o aplicativo cria o
-- perfil no primeiro acesso, amparado pela policy `jogadores_cria_o_proprio`
-- da 0001. O gatilho e a via preferida, nao a unica.
--
-- Rode DEPOIS da 0001. Idempotente.

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
    -- OAuth, para o dia em que o Google entrar. O trecho antes do @ e o ultimo
    -- recurso, porque jogador sem nome quebraria as listas.
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

-- Privilegio de execucao vem de duas fontes: o EXECUTE que o Postgres da a
-- PUBLIC em toda funcao nova, e o que o Supabase da a anon e authenticated por
-- alter default privileges. Revogar so de uma deixa a outra passar. Quem chama
-- esta funcao e o gatilho, que roda como dono do banco e nao depende de grant.
revoke all on function public.criar_jogador_do_novo_usuario() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_jogador_do_novo_usuario();
