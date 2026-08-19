-- Etapa 04 -- Avaliacoes entre jogadores.
--
-- Um voto por par, corrigivel. A chave primaria composta e o que garante isso:
-- avaliar de novo a mesma pessoa nao empilha voto, substitui o anterior.
--
-- ---------------------------------------------------------------------------
-- Quem enxerga o que
-- ---------------------------------------------------------------------------
--
-- Voce le apenas as avaliacoes que VOCE deu. Ninguem le a de ninguem, nem o
-- proprio avaliado. O documento do projeto pede que o app nao vire ranking
-- social, e a forma de garantir isso e no banco: se a linha crua nao sai daqui,
-- nao ha tela que possa vaza-la por descuido.
--
-- O que o grupo vera, na etapa 05, e o agregado -- media por jogador, nunca
-- quem deu qual nota.
--
-- Por que existe policy de SELECT, sendo o objetivo esconder: sem ela a policy
-- de UPDATE seria letra morta. Todo update vindo do cliente precisa de um
-- `where` para achar a linha, e isso faz valer as policies de SELECT junto com
-- as de UPDATE. Sem nenhuma de SELECT, o update casaria com zero linhas -- em
-- silencio, porque zero linhas e sucesso para o PostgREST, e a tela diria que
-- salvou. A policy abaixo e estreita: so as proprias linhas.
--
-- Idempotente: pode rodar de novo sem quebrar.

create table if not exists public.avaliacoes (
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
  primary key (avaliador_id, avaliado_id),
  constraint avaliacoes_ninguem_se_autoavalia check (avaliador_id <> avaliado_id)
);

-- A chave primaria ja cobre a busca por avaliador, que e "as notas que eu dei".
-- Este indice cobre o outro lado, que a etapa 05 usa em toda leitura: "todas as
-- notas recebidas por fulano".
create index if not exists avaliacoes_avaliado_idx on public.avaliacoes (avaliado_id);

alter table public.avaliacoes enable row level security;

drop policy if exists "avaliacoes_leio_so_as_minhas" on public.avaliacoes;
create policy "avaliacoes_leio_so_as_minhas"
  on public.avaliacoes for select to authenticated
  using (avaliador_id = (select auth.uid()));

drop policy if exists "avaliacoes_dou_so_em_meu_nome" on public.avaliacoes;
create policy "avaliacoes_dou_so_em_meu_nome"
  on public.avaliacoes for insert to authenticated
  with check (
    avaliador_id = (select auth.uid())
    and avaliado_id <> (select auth.uid())
  );

drop policy if exists "avaliacoes_corrijo_so_as_minhas" on public.avaliacoes;
create policy "avaliacoes_corrijo_so_as_minhas"
  on public.avaliacoes for update to authenticated
  using (avaliador_id = (select auth.uid()))
  with check (avaliador_id = (select auth.uid()));

-- Sem policy de DELETE: apagar voto nao e acao do produto -- corrige-se a nota,
-- nao se retira. E some por cascata quando a conta e removida.

-- ---------------------------------------------------------------------------
-- atualizado_em
-- ---------------------------------------------------------------------------

drop trigger if exists ao_atualizar_avaliacao on public.avaliacoes;
create trigger ao_atualizar_avaliacao
  before update on public.avaliacoes
  for each row execute function public.marcar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Permissoes
--
-- Sem isto a tabela some da API com PGRST205, que parece tabela inexistente e
-- nao falta de permissao. `grant` decide SE a tabela e alcancavel; a RLS acima
-- decide QUAIS LINHAS. As duas sao necessarias.
-- ---------------------------------------------------------------------------

grant select, insert, update on public.avaliacoes to authenticated;
