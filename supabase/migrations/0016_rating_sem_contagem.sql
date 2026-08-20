-- O agregado deixa de devolver a contagem de avaliadores.
--
-- ---------------------------------------------------------------------------
-- O vazamento
-- ---------------------------------------------------------------------------
--
-- `ratings_dos_jogadores()` devolvia a coluna `avaliadores`, e a lista mostrava
-- "7 avaliadores" embaixo do rating. Isso desfaz, sozinho, a promessa central
-- do produto: ninguem descobre quem deu qual nota.
--
-- O ataque nao precisa de acesso ao banco nem de conta privilegiada -- basta
-- olhar a tela duas vezes. Quem anota o par (contagem, rating) antes de uma
-- partida e depois dela tem tudo o que falta:
--
--     soma_depois = media_depois * (peso_do_prior + n_depois) - peso_do_prior * prior
--     soma_antes  = media_antes  * (peso_do_prior + n_antes)  - peso_do_prior * prior
--     voto_que_entrou = soma_depois - soma_antes
--
-- A formula e publica -- esta neste repositorio --, entao a media bayesiana nao
-- protege nada aqui: ela e inversivel. Com um voto novo entre as duas leituras,
-- a conta fecha de primeira e devolve a nota exata que aquela pessoa deu.
--
-- E o piso de confianca nao cobre esse buraco: ele decide se o NUMERO aparece,
-- e a contagem aparecia de qualquer jeito.
--
-- ---------------------------------------------------------------------------
-- O que fica no lugar
-- ---------------------------------------------------------------------------
--
-- `confiavel`, que ja existe e ja basta. Ele responde a unica pergunta que a
-- interface faz -- mostrar o numero ou mostrar um traco -- e carrega um bit que
-- nao e voto de ninguem: "ha avaliadores suficientes ou nao".
--
-- Abaixo do piso a funcao continua devolvendo o prior puro, e nao a media
-- parcial. Valor fixo nao vaza nada e ainda serve ao sorteio.
--
-- A contagem continua sendo calculada aqui dentro: ela e o que decide o piso.
-- O que muda e que ela nao sai mais da funcao.
--
-- ---------------------------------------------------------------------------
-- Por que `drop` antes de `create`
-- ---------------------------------------------------------------------------
--
-- `create or replace function` NAO consegue mudar o tipo de retorno, e tirar
-- uma coluna de um `returns table` e exatamente isso -- o Postgres recusa com
-- "cannot change return type of existing function". Por isso a funcao e
-- derrubada antes.
--
-- Derrubar e seguro: corpo de funcao plpgsql nao entra no grafo de dependencias,
-- entao `criar_partida()` nao impede o drop. Ela le `r.rating` por nome e
-- segue funcionando com o retorno menor.
--
-- Esta e a quinta definicao desta funcao (0007, 0010, 0012, 0015, 0016). Cada
-- uma repete os oito pesos, o prior e o piso -- e a consolidacao disso e um
-- item proprio, para nao misturar com a correcao de privacidade.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- ---------------------------------------------------------------------------

drop function if exists public.ratings_dos_jogadores();

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
      a.quem, a.passou,
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
    e.passou
  from exibidas e;
end;
$$;

revoke all on function public.ratings_dos_jogadores() from public, anon;
grant execute on function public.ratings_dos_jogadores() to authenticated;
