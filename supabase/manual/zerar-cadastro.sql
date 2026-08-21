-- Apaga contas de usuario. NAO E MIGRACAO, e nao tem volta.
--
-- ===========================================================================
-- LEIA ISTO ANTES
-- ===========================================================================
--
-- Este projeto NAO tem backup. Isso e decisao registrada em `docs/decisoes.md`,
-- e nao esquecimento -- mas ela foi tomada pensando em perda acidental, e nao
-- em apagar de proposito. O que sair daqui nao volta.
--
-- Apagar de `auth.users` derruba em cascata, porque `jogadores.id` referencia
-- `auth.users.id` com `on delete cascade`, e o resto do banco pendura em
-- `jogadores`:
--
--     auth.users
--       -> jogadores
--            -> avaliacoes_iniciais   (como avaliador E como avaliado)
--            -> avaliacoes_de_partida (idem)
--            -> partidas              (criada_por)
--                 -> partida_jogadores
--
-- Ou seja: some tambem todo o historico de partidas e todas as avaliacoes. O
-- rating nao precisa ser recalculado porque nunca foi gravado -- ele volta a
-- ser o neutro para todo mundo, sozinho.
--
-- ===========================================================================
-- DEPOIS DE RODAR, FALTA
-- ===========================================================================
--
--   1. Recriar sua conta pelo aplicativo.
--   2. Rodar `supabase/manual/promover-admin.sql` de novo -- o `admin` foi
--      junto com a linha.
--   3. Apagar `scripts/.semeadura.json`, se existir. Ele aponta para partidas
--      que nao existem mais, e enquanto estiver la o
--      `semear-avaliacoes.py` se recusa a semear de novo.
--   4. Se quiser os ficticios de volta:
--        python scripts/gerar-avatares.py
--        python scripts/semear.py
--        python scripts/semear-avaliacoes.py
--
-- As fotos ja enviadas continuam no bucket `avatares`, orfas -- a policy do
-- Storage nao apaga nada por cascata. Nao atrapalham: o caminho e `<uid>/`, e
-- uid novo nunca colide com uid velho.
--
-- ===========================================================================
-- COMO USAR
-- ===========================================================================
--
-- Troque `c_confirmo` para 'SIM' e, se quiser preservar alguma conta, ponha o
-- e-mail em `c_manter`. Deixar `c_manter` vazio apaga TODAS.
--
-- Cole no SQL Editor do painel do Supabase. Nao roda pela API: apagar usuario
-- exige privilegio que a anon key nao tem, e nem deve ter.

do $$
declare
  -- ======================= TROQUE ESTAS DUAS =======================
  c_confirmo constant text := 'NAO';
  c_manter   constant text := '';   -- e-mail a preservar, ou '' para nenhum
  -- =================================================================
  v_total int;
  v_apagados int;
begin
  if c_confirmo <> 'SIM' then
    raise exception 'Trava de seguranca: troque c_confirmo para SIM para apagar de verdade.';
  end if;

  select count(*) into v_total from auth.users;

  if c_manter <> '' then
    if not exists (select 1 from auth.users u where lower(u.email) = lower(c_manter)) then
      raise exception 'A conta a preservar (%) nao existe. Confira o e-mail antes.', c_manter;
    end if;
    delete from auth.users u where lower(u.email) is distinct from lower(c_manter);
  else
    delete from auth.users;
  end if;

  get diagnostics v_apagados = row_count;

  raise notice 'Apagadas % de % contas. Restam %.', v_apagados, v_total, v_total - v_apagados;
  raise notice 'Recrie sua conta pelo app e rode promover-admin.sql.';
end;
$$;

-- Confere o que sobrou. `jogadores` deve acompanhar `auth.users`: se sobrar
-- linha em `jogadores` sem conta, a cascata nao funcionou e vale investigar
-- antes de seguir.
select
  (select count(*) from auth.users) as contas,
  (select count(*) from public.jogadores) as jogadores,
  (select count(*) from public.partidas) as partidas,
  (select count(*) from public.avaliacoes_iniciais) as avaliacoes_iniciais,
  (select count(*) from public.avaliacoes_de_partida) as avaliacoes_de_partida;
