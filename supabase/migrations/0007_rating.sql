-- =========================================================================
-- SUPERADA. Esta migracao nao e mais a definicao vigente de
-- `ratings_dos_jogadores()`. A vigente e a 0017.
--
-- Fica no historico porque ja foi aplicada e porque o cabecalho abaixo explica
-- POR QUE cada coisa e como e -- o raciocinio continua valendo. O que nao vale
-- mais e o CODIGO: os pesos, o prior e o piso daqui estao obsoletos. Mexer
-- neles nao muda nada em banco nenhum.
--
-- Para mudar um peso hoje, o lugar e `rating_parametros()`, na 0017.
-- =========================================================================

-- Etapa 05 -- O rating.
--
-- ---------------------------------------------------------------------------
-- Por que o calculo inteiro roda aqui, e nao no aplicativo
-- ---------------------------------------------------------------------------
--
-- Duas razoes, e a primeira nao tem alternativa.
--
-- 1. PRIVACIDADE. `avaliacoes` so devolve as linhas de quem pergunta, entao o
--    app nao consegue -- nem deve conseguir -- somar os votos alheios. Esta
--    funcao e `security definer`: ela le a tabela inteira e devolve so o
--    agregado. O voto cru nunca sai daqui.
--
--    E ha um detalhe que faz o piso ser obrigatorio: com poucos votos, QUALQUER
--    agregado revela o voto individual. Com n = 1, a media e a propria nota; e
--    como a formula abaixo e publica, ate a media bayesiana pode ser invertida
--    para recuperar a soma. Por isso, abaixo do piso, sai o valor neutro e nada
--    mais -- numero fixo nao carrega informacao de voto nenhum.
--
-- 2. O rating nao pode ser forjado pelo cliente. Se os pesos vivessem no
--    aplicativo, bastaria mexer neles para inflar o proprio numero e, na etapa
--    07, para forjar os times.
--
-- Isso REVERTE uma decisao anterior, que colocava os pesos em
-- `src/nucleo/atributos.ts`. Eles nao podem ficar nos dois lugares -- o
-- documento do projeto e explicito em nao espalhar esses valores --, e das duas
-- opcoes so esta protege o numero. O custo e que mudar peso agora exige uma
-- migracao nova, o que em troca deixa a mudanca versionada e auditavel.
--
-- ---------------------------------------------------------------------------
-- A formula
-- ---------------------------------------------------------------------------
--
--   media_ajustada = (PESO_DO_PRIOR * PRIOR + soma_das_notas) / (PESO_DO_PRIOR + n)
--
-- E a media bayesiana. Com poucos votos o valor fica preso perto do meio da
-- escala; conforme n cresce, os votos reais dominam. E o que da resistencia a
-- avaliacao injusta sem precisar de mediana nem de media aparada: um 1 isolado
-- entre trinta notas quase nao mexe, e entre duas notas nao chega a mandar
-- porque o piso ainda nao foi atingido.
--
-- O rating final e a media ponderada das oito caracteristicas ajustadas,
-- convertida da escala de estrelas (1 a 5) para 0 a 10.
--
-- Idempotente: pode rodar de novo sem quebrar.

create or replace function public.ratings_dos_jogadores()
returns table (
  jogador_id uuid,
  ataque numeric,
  defesa numeric,
  passe numeric,
  saque numeric,
  bloqueio numeric,
  agilidade numeric,
  leitura numeric,
  equipe numeric,
  rating numeric,
  avaliadores int,
  confiavel boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- O meio da escala de estrelas.
  c_prior constant numeric := 3;
  -- Quanto o prior vale, em votos equivalentes.
  c_peso_do_prior constant numeric := 5;
  -- Minimo de avaliadores para o numero sair calculado em vez de neutro.
  c_piso constant int := 5;

  -- Os pesos. Somam 1. (Era a unica fonte deles quando isto foi escrito;
  -- hoje a fonte e `rating_parametros()`, na 0017. Ver o aviso no topo.)
  c_p_ataque    constant numeric := 0.20;
  c_p_defesa    constant numeric := 0.20;
  c_p_passe     constant numeric := 0.15;
  c_p_saque     constant numeric := 0.10;
  c_p_bloqueio  constant numeric := 0.10;
  c_p_agilidade constant numeric := 0.10;
  c_p_leitura   constant numeric := 0.10;
  c_p_equipe    constant numeric := 0.05;
begin
  if (select auth.uid()) is null then
    raise exception 'Precisa estar logado.';
  end if;

  return query
  with recebidas as (
    select
      a.avaliado_id as quem,
      count(*)::int as votos,
      sum(a.ataque)::numeric    as s_ataque,
      sum(a.defesa)::numeric    as s_defesa,
      sum(a.passe)::numeric     as s_passe,
      sum(a.saque)::numeric     as s_saque,
      sum(a.bloqueio)::numeric  as s_bloqueio,
      sum(a.agilidade)::numeric as s_agilidade,
      sum(a.leitura)::numeric   as s_leitura,
      sum(a.equipe)::numeric    as s_equipe
    from public.avaliacoes a
    group by a.avaliado_id
  ),
  ajustadas as (
    select
      j.id as quem,
      coalesce(r.votos, 0) as votos,
      coalesce(r.votos, 0) >= c_piso as passou,
      (c_peso_do_prior * c_prior + coalesce(r.s_ataque, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as ataque,
      (c_peso_do_prior * c_prior + coalesce(r.s_defesa, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as defesa,
      (c_peso_do_prior * c_prior + coalesce(r.s_passe, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as passe,
      (c_peso_do_prior * c_prior + coalesce(r.s_saque, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as saque,
      (c_peso_do_prior * c_prior + coalesce(r.s_bloqueio, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as bloqueio,
      (c_peso_do_prior * c_prior + coalesce(r.s_agilidade, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as agilidade,
      (c_peso_do_prior * c_prior + coalesce(r.s_leitura, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as leitura,
      (c_peso_do_prior * c_prior + coalesce(r.s_equipe, 0))
        / (c_peso_do_prior + coalesce(r.votos, 0)) as equipe
    from public.jogadores j
    left join recebidas r on r.quem = j.id
  ),
  exibidas as (
    -- Abaixo do piso sai exatamente o neutro, para nenhum numero na tela
    -- carregar informacao de voto individual.
    select
      a.quem,
      a.votos,
      a.passou,
      case when a.passou then a.ataque    else c_prior end as ataque,
      case when a.passou then a.defesa    else c_prior end as defesa,
      case when a.passou then a.passe     else c_prior end as passe,
      case when a.passou then a.saque     else c_prior end as saque,
      case when a.passou then a.bloqueio  else c_prior end as bloqueio,
      case when a.passou then a.agilidade else c_prior end as agilidade,
      case when a.passou then a.leitura   else c_prior end as leitura,
      case when a.passou then a.equipe    else c_prior end as equipe
    from ajustadas a
  )
  select
    e.quem,
    round(e.ataque, 2),
    round(e.defesa, 2),
    round(e.passe, 2),
    round(e.saque, 2),
    round(e.bloqueio, 2),
    round(e.agilidade, 2),
    round(e.leitura, 2),
    round(e.equipe, 2),
    -- Da escala de estrelas (1 a 5) para 0 a 10, que e como o rating aparece.
    round(
      (
        e.ataque * c_p_ataque + e.defesa * c_p_defesa + e.passe * c_p_passe
        + e.saque * c_p_saque + e.bloqueio * c_p_bloqueio
        + e.agilidade * c_p_agilidade + e.leitura * c_p_leitura
        + e.equipe * c_p_equipe
      ) * 2.0, 2
    ),
    e.votos,
    e.passou
  from exibidas e;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- Revogar das duas fontes antes de conceder: o EXECUTE que o Postgres da a
-- PUBLIC em toda funcao nova, e o que o Supabase da a anon e authenticated por
-- alter default privileges. Revogar de uma so deixa a outra passar.
-- ---------------------------------------------------------------------------

revoke all on function public.ratings_dos_jogadores() from public, anon;
grant execute on function public.ratings_dos_jogadores() to authenticated;
