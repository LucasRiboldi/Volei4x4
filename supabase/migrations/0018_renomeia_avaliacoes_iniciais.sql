-- `avaliacoes` passa a se chamar `avaliacoes_iniciais`.
--
-- ---------------------------------------------------------------------------
-- Por que
-- ---------------------------------------------------------------------------
--
-- O nome parou de descrever a tabela quando a 0015 a transformou na avaliacao
-- inicial. Ela nasceu na 0006 como "avaliacoes", a avaliacao livre da etapa 04
-- -- qualquer um avalia qualquer um, a qualquer hora. Essa regra foi
-- substituida pela avaliacao pos-partida, que mora em
-- `avaliacoes_de_partida`, e a tabela antiga foi reaproveitada para a
-- avaliacao inicial: uma por par, sem update, garantida pela chave primaria.
--
-- Desde entao o banco tem duas tabelas de avaliacao, e a que se chama
-- `avaliacoes` NAO e a principal. Todo mundo que chega tropeca nisso uma vez.
--
-- ---------------------------------------------------------------------------
-- O que isto custa, e por que vale mesmo assim
-- ---------------------------------------------------------------------------
--
-- `ratings_dos_jogadores()` le desta tabela pelo nome, entao renomear obriga a
-- redefinir a funcao -- uma migracao depois de a 0017 ter reduzido cinco copias
-- a uma. E irritante e foi aceito de olhos abertos.
--
-- A alternativa seria uma view de compatibilidade chamada `avaliacoes` sobre a
-- tabela renomeada. Foi descartada: view no schema `public` nao tem RLS
-- propria, e uma view sobre tabela com RLS roda com os direitos de quem a criou
-- -- ou seja, veria TODAS as avaliacoes. Bastaria alguem conceder `select` nela
-- um dia, sem entender isso, para o voto de todo mundo vazar pela API. Nao vale
-- a comodidade.
--
-- O corpo da funcao abaixo foi extraido da 0017 por script, com uma unica
-- substituicao: o nome da tabela. Copiar a mao seria a chance de introduzir a
-- diferenca que ninguem quer.
--
-- ---------------------------------------------------------------------------
-- DEPENDE DA 0017
-- ---------------------------------------------------------------------------
--
-- A funcao abaixo le `rating_parametros()`, que nasce la. O bloco seguinte
-- recusa a migracao se a 0017 nao tiver sido aplicada, em vez de deixar o erro
-- aparecer so na primeira leitura de rating.
--
-- ---------------------------------------------------------------------------
-- HA UMA JANELA DE INDISPONIBILIDADE
-- ---------------------------------------------------------------------------
--
-- No instante em que isto roda, o bundle publicado ainda chama `avaliacoes`. A
-- avaliacao inicial passa a responder erro ate a Vercel publicar o codigo novo
-- -- um a dois minutos. Nada se perde: o PostgREST recusa a leitura, e a tela
-- mostra a mensagem de erro. Aplicar logo depois do deploy encurta a janela.
--
-- Idempotente: pode rodar de novo sem quebrar.

do $$
begin
  if to_regprocedure('public.rating_parametros()') is null then
    raise exception 'Aplique a 0017 antes desta: rating_parametros() nao existe.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- A tabela, e tudo o que carrega o nome dela
--
-- Renomear a tabela NAO renomeia indice, constraint, trigger nem policy: eles
-- ficam com o nome antigo, apontando para a tabela nova. Funciona, e mente para
-- quem for ler o esquema depois. Como o objetivo desta migracao e justamente o
-- nome dizer a verdade, vao todos junto.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.avaliacoes') is not null then
    alter table public.avaliacoes rename to avaliacoes_iniciais;
  end if;

  if to_regclass('public.avaliacoes_avaliado_idx') is not null then
    alter index public.avaliacoes_avaliado_idx rename to avaliacoes_iniciais_avaliado_idx;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'avaliacoes_ninguem_se_autoavalia'
      and conrelid = 'public.avaliacoes_iniciais'::regclass
  ) then
    alter table public.avaliacoes_iniciais
      rename constraint avaliacoes_ninguem_se_autoavalia to avaliacoes_iniciais_sem_autoavaliacao;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'ao_atualizar_avaliacao'
      and tgrelid = 'public.avaliacoes_iniciais'::regclass
  ) then
    alter trigger ao_atualizar_avaliacao on public.avaliacoes_iniciais
      rename to ao_atualizar_avaliacao_inicial;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'avaliacoes_iniciais'
      and policyname = 'avaliacoes_leio_so_as_minhas'
  ) then
    alter policy "avaliacoes_leio_so_as_minhas" on public.avaliacoes_iniciais
      rename to "avaliacoes_iniciais_leio_so_as_minhas";
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'avaliacoes_iniciais'
      and policyname = 'avaliacoes_dou_so_em_meu_nome'
  ) then
    alter policy "avaliacoes_dou_so_em_meu_nome" on public.avaliacoes_iniciais
      rename to "avaliacoes_iniciais_dou_so_em_meu_nome";
  end if;
end;
$$;

-- O grant acompanha a tabela no rename; esta linha existe para o arquivo poder
-- ser lido sozinho e para o caso de a tabela ja ter sido renomeada antes.
-- Continua sem UPDATE, que e o que faz "uma vez" ser uma vez -- ver a 0015.
grant select, insert on public.avaliacoes_iniciais to authenticated;
revoke update on public.avaliacoes_iniciais from authenticated;

-- ---------------------------------------------------------------------------
-- A funcao, apontando para o nome novo
-- ---------------------------------------------------------------------------

create or replace function public.ratings_dos_jogadores()
returns table (
  jogador_id uuid,
  ataque numeric, defesa numeric, passe numeric, saque numeric,
  bloqueio numeric, agilidade numeric, leitura numeric, equipe numeric,
  rating numeric,
  confiavel boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg record;
begin
  if (select auth.uid()) is null then
    raise exception 'Precisa estar logado.';
  end if;

  select * into cfg from public.rating_parametros();

  return query
  with todas as (
    -- A inicial e a de partida entram na mesma pilha, com o mesmo peso.
    select a.avaliador_id, a.avaliado_id, a.ataque, a.defesa, a.passe, a.saque,
           a.bloqueio, a.agilidade, a.leitura, a.equipe
    from public.avaliacoes_iniciais a
    union all
    select p.avaliador_id, p.avaliado_id, p.ataque, p.defesa, p.passe, p.saque,
           p.bloqueio, p.agilidade, p.leitura, p.equipe
    from public.avaliacoes_de_partida p
  ),
  recebidas as (
    select
      t.avaliado_id as quem,
      -- PESSOAS distintas decide o piso; NOTAS decide o peso da media. Quem
      -- jogou cinco partidas com voce e avaliou nas cinco continua sendo um
      -- avaliador so -- senao uma pessoa insistente atingiria o piso sozinha.
      count(distinct t.avaliador_id)::int as pessoas,
      count(*)::int as notas,
      sum(t.ataque)::numeric as s_ataque,
      sum(t.defesa)::numeric as s_defesa,
      sum(t.passe)::numeric as s_passe,
      sum(t.saque)::numeric as s_saque,
      sum(t.bloqueio)::numeric as s_bloqueio,
      sum(t.agilidade)::numeric as s_agilidade,
      sum(t.leitura)::numeric as s_leitura,
      sum(t.equipe)::numeric as s_equipe
    from todas t
    group by t.avaliado_id
  ),
  ajustadas as (
    -- A media bayesiana: (peso_do_prior * prior + soma) / (peso_do_prior + n).
    select
      j.id as quem,
      coalesce(r.pessoas, 0) >= cfg.piso as passou,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_ataque, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as ataque,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_defesa, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as defesa,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_passe, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as passe,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_saque, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as saque,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_bloqueio, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as bloqueio,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_agilidade, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as agilidade,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_leitura, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as leitura,
      (cfg.peso_do_prior * cfg.prior + coalesce(r.s_equipe, 0)) / (cfg.peso_do_prior + coalesce(r.notas, 0)) as equipe
    from public.jogadores j
    left join recebidas r on r.quem = j.id
  ),
  exibidas as (
    -- Abaixo do piso sai exatamente o neutro. Valor fixo nao carrega informacao
    -- de voto de ninguem, e ainda serve ao sorteio.
    select
      a.quem, a.passou,
      case when a.passou then a.ataque else cfg.prior end as ataque,
      case when a.passou then a.defesa else cfg.prior end as defesa,
      case when a.passou then a.passe else cfg.prior end as passe,
      case when a.passou then a.saque else cfg.prior end as saque,
      case when a.passou then a.bloqueio else cfg.prior end as bloqueio,
      case when a.passou then a.agilidade else cfg.prior end as agilidade,
      case when a.passou then a.leitura else cfg.prior end as leitura,
      case when a.passou then a.equipe else cfg.prior end as equipe
    from ajustadas a
  )
  select
    e.quem,
    round(e.ataque, 2), round(e.defesa, 2), round(e.passe, 2), round(e.saque, 2),
    round(e.bloqueio, 2), round(e.agilidade, 2), round(e.leitura, 2), round(e.equipe, 2),
    -- Da escala de estrelas para 0-10.
    round(
      (
        (e.ataque * cfg.p_ataque + e.defesa * cfg.p_defesa + e.passe * cfg.p_passe
         + e.saque * cfg.p_saque + e.bloqueio * cfg.p_bloqueio + e.agilidade * cfg.p_agilidade
         + e.leitura * cfg.p_leitura + e.equipe * cfg.p_equipe)
        - cfg.nota_minima
      ) / (cfg.nota_maxima - cfg.nota_minima) * 10, 2
    ),
    e.passou
  from exibidas e;
end;
$$;

revoke all on function public.ratings_dos_jogadores() from public, anon;
revoke all on function public.ratings_dos_jogadores() from public, anon;
grant execute on function public.ratings_dos_jogadores() to authenticated;

-- Confere que a leitura ainda funciona e que a tabela antiga sumiu de vez.
do $$
begin
  if to_regclass('public.avaliacoes') is not null then
    raise exception 'A tabela `avaliacoes` ainda existe. O rename nao aconteceu.';
  end if;
  if to_regclass('public.avaliacoes_iniciais') is null then
    raise exception 'A tabela `avaliacoes_iniciais` nao existe.';
  end if;
  raise notice 'Renomeada. Publique o codigo novo, se ainda nao publicou.';
end;
$$;
