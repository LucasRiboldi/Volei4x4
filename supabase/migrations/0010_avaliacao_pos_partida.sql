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

-- Avaliacao pos-partida.
--
-- A nota deixa de ser opiniao solta sobre uma pessoa e passa a ser observacao
-- do desempenho dela numa partida concreta. Isso muda a chave: nao e mais um
-- voto por par, e sim um voto por par POR PARTIDA.
--
-- ---------------------------------------------------------------------------
-- As quatro condicoes, e por que elas vivem na policy
-- ---------------------------------------------------------------------------
--
-- Para uma avaliacao ser aceita:
--
--   1. quem avalia participou daquela partida;
--   2. quem e avaliado participou da MESMA partida;
--   3. os dois sao pessoas diferentes;
--   4. o instante atual esta dentro da janela daquela partida.
--
-- As quatro estao na policy, e nao numa funcao que a tela chama. A diferenca
-- importa: policy vale para QUALQUER caminho -- inclusive um curl com a anon
-- key montado a mao, trocando partida_id, avaliador_id ou avaliado_id. Se a
-- regra morasse so numa funcao, bastaria escrever na tabela por outra porta.
--
-- Nao ha o que o cliente possa enviar para contornar: `avaliador_id` e
-- comparado com `auth.uid()`, que vem do token e nao do corpo da requisicao.
--
-- Idempotente: pode rodar de novo sem quebrar.

create table if not exists public.avaliacoes_de_partida (
  partida_id uuid not null references public.partidas (id) on delete cascade,
  avaliador_id uuid not null references public.jogadores (id) on delete cascade,
  avaliado_id uuid not null references public.jogadores (id) on delete cascade,
  ataque smallint not null check (ataque between 1 and 5),
  defesa smallint not null check (defesa between 1 and 5),
  passe smallint not null check (passe between 1 and 5),
  saque smallint not null check (saque between 1 and 5),
  bloqueio smallint not null check (bloqueio between 1 and 5),
  agilidade smallint not null check (agilidade between 1 and 5),
  leitura smallint not null check (leitura between 1 and 5),
  equipe smallint not null check (equipe between 1 and 5),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Uma avaliacao por par, por partida. E o que impede voto duplicado e o que
  -- torna a correcao uma atualizacao, e nao uma linha nova.
  primary key (partida_id, avaliador_id, avaliado_id),
  constraint avaliacoes_de_partida_sem_autoavaliacao check (avaliador_id <> avaliado_id)
);

-- A PK cobre a busca por partida e por avaliador. Este indice cobre o lado que
-- o rating usa: todas as notas recebidas por alguem, em todas as partidas.
create index if not exists avaliacoes_de_partida_avaliado_idx
  on public.avaliacoes_de_partida (avaliado_id);

alter table public.avaliacoes_de_partida enable row level security;

-- ---------------------------------------------------------------------------
-- Participou?
-- ---------------------------------------------------------------------------

create or replace function public.participou_da_partida(p_partida uuid, p_jogador uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partida_jogadores pj
    where pj.partida_id = p_partida and pj.jogador_id = p_jogador
  );
$$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Le apenas o que voce mesmo deu. Nem o avaliado alcanca a linha -- o §25 pede
-- que ninguem consiga dizer "fulano me deu nota 2".
--
-- Existe policy de SELECT mesmo sendo o objetivo esconder porque, sem ela, a de
-- UPDATE seria letra morta: update precisa de um `where` para achar a linha, o
-- que faz valer as policies de SELECT junto. Sem nenhuma, o update casaria com
-- zero linhas em silencio, e a tela diria que salvou.
drop policy if exists "avaliacoes_de_partida_leio_as_minhas" on public.avaliacoes_de_partida;
create policy "avaliacoes_de_partida_leio_as_minhas"
  on public.avaliacoes_de_partida for select to authenticated
  using (avaliador_id = (select auth.uid()));

drop policy if exists "avaliacoes_de_partida_insercao" on public.avaliacoes_de_partida;
create policy "avaliacoes_de_partida_insercao"
  on public.avaliacoes_de_partida for insert to authenticated
  with check (
    avaliador_id = (select auth.uid())
    and avaliado_id <> (select auth.uid())
    and public.participou_da_partida(partida_id, (select auth.uid()))
    and public.participou_da_partida(partida_id, avaliado_id)
    and public.avaliacao_esta_aberta(partida_id)
  );

-- Corrigir vale enquanto a janela estiver aberta. Depois que fecha, o que foi
-- salvo permanece e nada mais entra.
drop policy if exists "avaliacoes_de_partida_correcao" on public.avaliacoes_de_partida;
create policy "avaliacoes_de_partida_correcao"
  on public.avaliacoes_de_partida for update to authenticated
  using (
    avaliador_id = (select auth.uid())
    and public.avaliacao_esta_aberta(partida_id)
  )
  with check (
    avaliador_id = (select auth.uid())
    and public.avaliacao_esta_aberta(partida_id)
  );

-- Sem policy de DELETE: o §24 pede que o historico nao seja sobrescrito nem
-- apagado. Corrige-se a nota; nao se retira.

drop trigger if exists ao_atualizar_avaliacao_de_partida on public.avaliacoes_de_partida;
create trigger ao_atualizar_avaliacao_de_partida
  before update on public.avaliacoes_de_partida
  for each row execute function public.marcar_atualizado_em();

grant select, insert, update on public.avaliacoes_de_partida to authenticated;

-- ---------------------------------------------------------------------------
-- A avaliacao global sai de cena
--
-- A tabela `avaliacoes` da etapa 04 permitia avaliar qualquer um, a qualquer
-- hora. Essa regra foi substituida. A tabela fica -- apagar dado nao devolve
-- nada a ninguem --, mas perde a escrita, para nao acumular linha que o rating
-- ja nao le.
-- ---------------------------------------------------------------------------

revoke insert, update on public.avaliacoes from authenticated;

-- ---------------------------------------------------------------------------
-- O rating passa a ler das partidas
--
-- Mesma formula da 0007 -- media bayesiana, piso de confianca, pesos --, so
-- muda a fonte. O §23 e explicito: a avaliacao pos-partida e a fonte principal
-- do rating.
--
-- `avaliadores` conta PESSOAS distintas, e nao linhas: quem jogou cinco
-- partidas com voce e avaliou nas cinco continua sendo um avaliador so. Contar
-- linhas deixaria o piso de confianca ser atingido por uma pessoa insistente.
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
    round(
      (e.ataque * c_p_ataque + e.defesa * c_p_defesa + e.passe * c_p_passe
       + e.saque * c_p_saque + e.bloqueio * c_p_bloqueio + e.agilidade * c_p_agilidade
       + e.leitura * c_p_leitura + e.equipe * c_p_equipe) * 2.0, 2
    ),
    e.pessoas,
    e.passou
  from exibidas e;
end;
$$;

revoke all on function public.participou_da_partida(uuid, uuid) from public, anon;
grant execute on function public.participou_da_partida(uuid, uuid) to authenticated;
revoke all on function public.ratings_dos_jogadores() from public, anon;
grant execute on function public.ratings_dos_jogadores() to authenticated;
