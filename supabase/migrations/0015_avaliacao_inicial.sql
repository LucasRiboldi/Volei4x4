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

-- A avaliacao inicial: uma vez por par, sem depender de partida.
--
-- ---------------------------------------------------------------------------
-- O problema que ela resolve
-- ---------------------------------------------------------------------------
--
-- Com so a avaliacao pos-partida, um grupo novo trava: ninguem tem rating ate
-- jogar, e o sorteio precisa de rating para equilibrar. A primeira partida sai
-- com todo mundo no valor neutro, ou seja, no acaso.
--
-- A saida e permitir UMA avaliacao livre de cada pessoa, por cada pessoa. Feita
-- essa, aquele par so volta a se avaliar depois de uma partida que os dois
-- jogaram, dentro da janela -- que e a regra normal do produto.
--
-- ---------------------------------------------------------------------------
-- Por que a tabela `avaliacoes`, e nao uma nova
-- ---------------------------------------------------------------------------
--
-- Ela ja existe, com a chave primaria `(avaliador_id, avaliado_id)`. Essa chave
-- E a regra "uma vez por par": nao ha como inserir a segunda. Nao preciso de
-- coluna de controle nem de verificacao no aplicativo -- o banco recusa
-- sozinho, e recusa tambem para quem chamar a API na mao.
--
-- Ela tinha sido aposentada na 0010, que revogou insert e update. Aqui o insert
-- volta; o update NAO volta, e isso e deliberado: "uma vez" quer dizer uma vez.
-- Corrigir a impressao inicial e o que a avaliacao pos-partida faz.
--
-- Idempotente: pode rodar de novo sem quebrar.

-- ---------------------------------------------------------------------------
-- Escrita: so a primeira, so em nome proprio
-- ---------------------------------------------------------------------------

drop policy if exists "avaliacoes_dou_so_em_meu_nome" on public.avaliacoes;
create policy "avaliacoes_dou_so_em_meu_nome"
  on public.avaliacoes for insert to authenticated
  with check (
    avaliador_id = (select auth.uid())
    and avaliado_id <> (select auth.uid())
  );

-- A policy de update sai de cena. Sem ela, `upsert` vindo do cliente tambem nao
-- consegue sobrescrever: o `on conflict do update` precisaria de direito de
-- update, e nao ha.
drop policy if exists "avaliacoes_corrijo_so_as_minhas" on public.avaliacoes;

grant insert on public.avaliacoes to authenticated;
revoke update on public.avaliacoes from authenticated;

-- ---------------------------------------------------------------------------
-- O rating passa a somar as duas fontes
--
-- Peso igual, de proposito. A media bayesiana ja comprime tudo enquanto ha
-- poucos votos, entao um palpite inicial ruim pesa pouco e vai diluindo
-- conforme as partidas acontecem. Peso diferente exigiria mais uma constante
-- para justificar e testar, sem ganho claro.
--
-- `avaliadores` conta PESSOAS distintas nas duas tabelas somadas: quem te
-- avaliou no inicio e depois em tres partidas continua sendo um avaliador.
-- ---------------------------------------------------------------------------

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
  c_nota_minima constant numeric := 1;
  c_nota_maxima constant numeric := 5;
begin
  if (select auth.uid()) is null then
    raise exception 'Precisa estar logado.';
  end if;

  return query
  with todas as (
    -- A inicial e a de partida entram na mesma pilha, com o mesmo peso.
    select a.avaliador_id, a.avaliado_id, a.ataque, a.defesa, a.passe, a.saque,
           a.bloqueio, a.agilidade, a.leitura, a.equipe
    from public.avaliacoes a
    union all
    select p.avaliador_id, p.avaliado_id, p.ataque, p.defesa, p.passe, p.saque,
           p.bloqueio, p.agilidade, p.leitura, p.equipe
    from public.avaliacoes_de_partida p
  ),
  recebidas as (
    select
      t.avaliado_id as quem,
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
