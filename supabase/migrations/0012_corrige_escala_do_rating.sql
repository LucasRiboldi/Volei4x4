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

-- Corrige a conversao da escala do rating.
--
-- ---------------------------------------------------------------------------
-- O defeito
-- ---------------------------------------------------------------------------
--
-- O voto vai de 1 a 5 estrelas. O rating deveria sair de 0 a 10. A conversao
-- escrita era:
--
--     rating = media_das_estrelas * 2
--
-- que leva 1 estrela a 2,0 e 5 estrelas a 10,0. Ou seja, a escala real era de
-- 2 a 10: ninguem podia receber menos que 2, e o meio da escala caia em 6,0 em
-- vez de 5,0.
--
-- Passou despercebido porque, sem avaliacoes de verdade, todo mundo saia no
-- valor neutro -- e 6,0 parecia tao plausivel quanto qualquer outro numero. So
-- apareceu quando o banco foi semeado e os ratings se espalharam: o pior
-- jogador do lote recebeu 4,7, quando deveria estar perto de 3.
--
-- A conversao correta de [1..5] para [0..10]:
--
--     rating = (media_das_estrelas - 1) / 4 * 10
--
-- Com ela, 1 estrela vira 0, 3 estrelas viram 5,0 e 5 estrelas viram 10. A
-- diferenca entre jogadores tambem fica mais visivel, porque a faixa util
-- deixa de ser 8 pontos e passa a ser 10.
--
-- O rating nao e gravado em lugar nenhum -- e sempre calculado --, entao esta
-- migracao nao precisa recalcular nada. A proxima leitura ja sai certa.
--
-- Idempotente: pode rodar de novo sem quebrar.

create or replace function public.ratings_dos_jogadores()
returns table (
  jogador_id uuid,
  ataque numeric, defesa numeric, passe numeric, saque numeric,
  bloqueio numeric, agilidade numeric, leitura numeric, equipe numeric,
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
  c_prior constant numeric := 3;
  c_peso_do_prior constant numeric := 5;
  c_piso constant int := 5;
  c_p_ataque constant numeric := 0.20;
  c_p_defesa constant numeric := 0.20;
  c_p_passe constant numeric := 0.15;
  c_p_saque constant numeric := 0.10;
  c_p_bloqueio constant numeric := 0.10;
  c_p_agilidade constant numeric := 0.10;
  c_p_leitura constant numeric := 0.10;
  c_p_equipe constant numeric := 0.05;
  -- Os limites da escala de estrelas, para a conversao nao ficar com numeros
  -- soltos no meio da conta.
  c_nota_minima constant numeric := 1;
  c_nota_maxima constant numeric := 5;
begin
  if (select auth.uid()) is null then
    raise exception 'Precisa estar logado.';
  end if;

  return query
  with recebidas as (
    select
      a.avaliado_id as quem,
      count(distinct a.avaliador_id)::int as pessoas,
      count(*)::int as notas,
      sum(a.ataque)::numeric as s_ataque,
      sum(a.defesa)::numeric as s_defesa,
      sum(a.passe)::numeric as s_passe,
      sum(a.saque)::numeric as s_saque,
      sum(a.bloqueio)::numeric as s_bloqueio,
      sum(a.agilidade)::numeric as s_agilidade,
      sum(a.leitura)::numeric as s_leitura,
      sum(a.equipe)::numeric as s_equipe
    from public.avaliacoes_de_partida a
    group by a.avaliado_id
  ),
  ajustadas as (
    select
      j.id as quem,
      coalesce(r.pessoas, 0) as pessoas,
      coalesce(r.pessoas, 0) >= c_piso as passou,
      (c_peso_do_prior * c_prior + coalesce(r.s_ataque, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as ataque,
      (c_peso_do_prior * c_prior + coalesce(r.s_defesa, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as defesa,
      (c_peso_do_prior * c_prior + coalesce(r.s_passe, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as passe,
      (c_peso_do_prior * c_prior + coalesce(r.s_saque, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as saque,
      (c_peso_do_prior * c_prior + coalesce(r.s_bloqueio, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as bloqueio,
      (c_peso_do_prior * c_prior + coalesce(r.s_agilidade, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as agilidade,
      (c_peso_do_prior * c_prior + coalesce(r.s_leitura, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as leitura,
      (c_peso_do_prior * c_prior + coalesce(r.s_equipe, 0)) / (c_peso_do_prior + coalesce(r.notas, 0)) as equipe
    from public.jogadores j
    left join recebidas r on r.quem = j.id
  ),
  exibidas as (
    select
      a.quem, a.pessoas, a.passou,
      case when a.passou then a.ataque else c_prior end as ataque,
      case when a.passou then a.defesa else c_prior end as defesa,
      case when a.passou then a.passe else c_prior end as passe,
      case when a.passou then a.saque else c_prior end as saque,
      case when a.passou then a.bloqueio else c_prior end as bloqueio,
      case when a.passou then a.agilidade else c_prior end as agilidade,
      case when a.passou then a.leitura else c_prior end as leitura,
      case when a.passou then a.equipe else c_prior end as equipe
    from ajustadas a
  )
  select
    e.quem,
    round(e.ataque, 2), round(e.defesa, 2), round(e.passe, 2), round(e.saque, 2),
    round(e.bloqueio, 2), round(e.agilidade, 2), round(e.leitura, 2), round(e.equipe, 2),
    -- De [1..5] para [0..10]. Antes era `* 2`, que dava a faixa 2..10.
    round(
      (
        (e.ataque * c_p_ataque + e.defesa * c_p_defesa + e.passe * c_p_passe
         + e.saque * c_p_saque + e.bloqueio * c_p_bloqueio + e.agilidade * c_p_agilidade
         + e.leitura * c_p_leitura + e.equipe * c_p_equipe)
        - c_nota_minima
      ) / (c_nota_maxima - c_nota_minima) * 10, 2
    ),
    e.pessoas,
    e.passou
  from exibidas e;
end;
$$;

revoke all on function public.ratings_dos_jogadores() from public, anon;
grant execute on function public.ratings_dos_jogadores() to authenticated;

-- ---------------------------------------------------------------------------
-- O que ficou gravado na escala antiga
-- ---------------------------------------------------------------------------
--
-- `partida_jogadores.rating_no_momento` NAO e calculado na leitura: e uma
-- coluna, preenchida por `criar_partida()` com o rating congelado no instante
-- do sorteio. Corrigir so a funcao deixaria essa coluna misturando duas
-- escalas, sem nada que as distinga.
--
-- As linhas de hoje sao todas 6,0 -- o neutro da escala antiga --, porque
-- nasceram quando ninguem tinha avaliacao. O neutro da escala nova e 5,0.
--
-- ---------------------------------------------------------------------------
-- Por que o corte por data, e nao apenas `where rating_no_momento = 6.0`
-- ---------------------------------------------------------------------------
--
-- Na escala nova, 6,0 e um valor legitimo: corresponde a 3,4 estrelas. Um
-- `update ... where rating_no_momento = 6.0` sem limite de data funcionaria
-- hoje e, se esta migracao fosse rodada de novo daqui a um mes, rebaixaria
-- para 5,0 o rating de quem tivesse tirado exatamente 6,0 -- silenciosamente.
--
-- O corte e um instante fixo, posterior a todas as partidas que existiam
-- quando esta migracao foi escrita e anterior a qualquer partida futura. Com
-- ele, rodar de novo nao alcanca nada que nao devia.

update public.partida_jogadores pj
set rating_no_momento = 5.0
from public.partidas p
where p.id = pj.partida_id
  and pj.rating_no_momento = 6.0
  and p.criado_em < timestamptz '2026-08-20 14:30:00+00';
