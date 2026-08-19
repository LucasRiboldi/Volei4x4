-- Corrige a promocao a administrador, que falhou em silencio.
--
-- ---------------------------------------------------------------------------
-- O que aconteceu
-- ---------------------------------------------------------------------------
--
-- A 0009 terminava com:
--
--   update public.jogadores set admin = true
--   where id = (select id from auth.users where email = '...');
--
-- A conta existia em `auth.users`, mas nao tinha linha em `public.jogadores`:
-- o gatilho da 0003 nunca chegou a ser instalado, e a conta foi criada pela API
-- sem nunca abrir o aplicativo -- que e onde `garantirMeuPerfil()` cria o
-- perfil.
--
-- Resultado: o update casou com zero linhas. E zero linhas nao e erro. A
-- migracao passou verde e ninguem virou administrador.
--
-- E a mesma armadilha que ja apareceu neste projeto com o PostgREST: operacao
-- que nao encontra alvo e sucesso, nao falha. A correcao abaixo tem duas
-- partes: preencher o que falta, e nunca mais deixar isso passar calado.

-- ---------------------------------------------------------------------------
-- 1. Perfil para toda conta que nao tem
--
-- Resolve a causa, e nao so o caso: qualquer conta criada antes do gatilho, ou
-- por fora do aplicativo, ganha sua linha.
-- ---------------------------------------------------------------------------

insert into public.jogadores (id, nome)
select
  u.id,
  left(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Jogador'
  ), 60)
from auth.users u
where not exists (select 1 from public.jogadores j where j.id = u.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. A promocao, agora barulhenta
--
-- Em bloco anonimo para poder conferir quantas linhas mudaram. Se for zero, a
-- migracao para com mensagem em vez de fingir que deu certo -- que era
-- exatamente o defeito da 0009.
-- ---------------------------------------------------------------------------

do $$
declare
  c_email constant text := 'lucasriboldi.esteio@gmail.com';
  v_id uuid;
  v_linhas int;
begin
  select u.id into v_id
  from auth.users u
  where lower(u.email) = c_email;

  if v_id is null then
    raise exception 'Nao existe conta com o e-mail %. Crie a conta antes de promover.', c_email;
  end if;

  update public.jogadores set admin = true where id = v_id;
  get diagnostics v_linhas = row_count;

  if v_linhas <> 1 then
    raise exception 'Esperava promover 1 jogador, mas foram % linhas.', v_linhas;
  end if;

  raise notice 'Administrador definido: % (%)', c_email, v_id;
end;
$$;
