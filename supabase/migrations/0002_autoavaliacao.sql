-- Etapa 02 -- Autoavaliacao do jogador.
--
-- Tabela separada das avaliacoes que os outros fazem, e isso e deliberado: o
-- documento do projeto e explicito em que a nota que a pessoa da a si mesma
-- NAO vale o mesmo que a recebida. Guardar as duas na mesma tabela convidaria
-- a soma-las por engano em alguma consulta futura.
--
-- O que a autoavaliacao faz e servir de ponto de partida enquanto o jogador
-- ainda nao tem avaliacoes suficientes. Quem decide esse peso e a etapa 05.
--
-- Idempotente: pode rodar de novo sem quebrar.

create table if not exists public.autoavaliacoes (
  jogador_id uuid primary key references public.jogadores (id) on delete cascade,
  ataque smallint not null check (ataque between 1 and 5),
  defesa smallint not null check (defesa between 1 and 5),
  passe smallint not null check (passe between 1 and 5),
  saque smallint not null check (saque between 1 and 5),
  bloqueio smallint not null check (bloqueio between 1 and 5),
  agilidade smallint not null check (agilidade between 1 and 5),
  leitura smallint not null check (leitura between 1 and 5),
  equipe smallint not null check (equipe between 1 and 5),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.autoavaliacoes enable row level security;

-- A autoavaliacao e privada de quem a escreveu. Ela alimenta o rating, e o
-- rating e publico; o palpite cru sobre si mesmo nao precisa ser.
drop policy if exists "autoavaliacoes_so_a_propria" on public.autoavaliacoes;
create policy "autoavaliacoes_so_a_propria"
  on public.autoavaliacoes for select to authenticated
  using (jogador_id = (select auth.uid()));

drop policy if exists "autoavaliacoes_cria_a_propria" on public.autoavaliacoes;
create policy "autoavaliacoes_cria_a_propria"
  on public.autoavaliacoes for insert to authenticated
  with check (jogador_id = (select auth.uid()));

drop policy if exists "autoavaliacoes_edita_a_propria" on public.autoavaliacoes;
create policy "autoavaliacoes_edita_a_propria"
  on public.autoavaliacoes for update to authenticated
  using (jogador_id = (select auth.uid()))
  with check (jogador_id = (select auth.uid()));

-- Sem policy de DELETE: apagar a autoavaliacao nao e uma acao do produto, e ela
-- morre junto com o jogador por cascata.

-- ---------------------------------------------------------------------------
-- atualizado_em
--
-- No gatilho e nao na aplicacao: o valor precisa ser verdade mesmo quando a
-- escrita vier de outro lugar, e o cliente nao deve poder mentir a data.
-- ---------------------------------------------------------------------------

create or replace function public.marcar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists ao_atualizar_autoavaliacao on public.autoavaliacoes;
create trigger ao_atualizar_autoavaliacao
  before update on public.autoavaliacoes
  for each row execute function public.marcar_atualizado_em();

drop trigger if exists ao_atualizar_jogador on public.jogadores;
create trigger ao_atualizar_jogador
  before update on public.jogadores
  for each row execute function public.marcar_atualizado_em();

revoke all on function public.marcar_atualizado_em() from public, anon, authenticated;
