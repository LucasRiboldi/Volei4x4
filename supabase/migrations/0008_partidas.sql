-- Etapa 07 -- Partidas e times.
--
-- O sorteio deixa de ser efemero: cada partida fica registrada, com quem jogou
-- e em que time. E o que permite o historico e, principalmente, a avaliacao
-- pos-partida -- que so autoriza quem participou daquela partida especifica.
--
-- ---------------------------------------------------------------------------
-- A janela de avaliacao, e por que ela e gravada e nao calculada na hora
-- ---------------------------------------------------------------------------
--
-- A regra: a avaliacao NAO abre 24h apos a partida. Ela abre na virada para o
-- dia seguinte a data do jogo, e fecha na virada seguinte. Partida as 08:00 e
-- partida as 22:30 do mesmo dia tem exatamente a mesma janela.
--
-- O fuso e o da aplicacao -- America/Sao_Paulo --, nunca o do aparelho de quem
-- usa. Quem decide que dia e hoje e o servidor.
--
-- Os dois instantes sao calculados uma vez, na criacao, e gravados. Nao sao
-- coluna gerada porque `at time zone` nao e imutavel: as regras de fuso de um
-- pais mudam por lei, e coluna gerada exige funcao imutavel. Gravar tambem e
-- mais honesto -- a janela combinada nao deveria se mover se a lei mudar depois.
--
-- Nao ha cron: se a janela esta aberta e uma comparacao entre now() e esses
-- dois instantes, feita a cada consulta.
--
-- Idempotente: pode rodar de novo sem quebrar.

create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  criada_por uuid not null references public.jogadores (id) on delete cascade,
  -- Quando a partida acontece. Guardado como timestamptz: o instante e absoluto,
  -- a apresentacao e que converte para o fuso da aplicacao.
  jogada_em timestamptz not null,
  avaliacao_abre_em timestamptz not null,
  avaliacao_fecha_em timestamptz not null,
  -- Placar, quando informado. Nulo enquanto a partida nao tem resultado.
  placar_a smallint check (placar_a is null or placar_a between 0 and 99),
  placar_b smallint check (placar_b is null or placar_b between 0 and 99),
  criado_em timestamptz not null default now(),
  constraint partidas_janela_coerente check (avaliacao_fecha_em > avaliacao_abre_em),
  -- Ou os dois placares, ou nenhum. Meio resultado nao diz nada.
  constraint partidas_placar_completo check (
    (placar_a is null and placar_b is null) or (placar_a is not null and placar_b is not null)
  )
);

create index if not exists partidas_jogada_em_idx on public.partidas (jogada_em desc);

create table if not exists public.partida_jogadores (
  partida_id uuid not null references public.partidas (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  time_da_partida char(1) not null check (time_da_partida in ('A', 'B')),
  -- O rating que a pessoa tinha quando o sorteio rodou. Congelado de proposito:
  -- o rating de hoje nao explica um time montado ha tres semanas.
  rating_no_momento numeric not null,
  primary key (partida_id, jogador_id)
);

-- A PK ja cobre a busca por partida. Este indice cobre o outro lado, que a tela
-- de avaliacoes pendentes usa: "de quais partidas fulano participou".
create index if not exists partida_jogadores_jogador_idx
  on public.partida_jogadores (jogador_id);

alter table public.partidas enable row level security;
alter table public.partida_jogadores enable row level security;

-- O historico e do grupo: todo mundo logado ve as partidas e as escalacoes.
-- Nao ha nada sensivel aqui -- nota e avaliacao vivem em outra tabela, com
-- regra propria.
drop policy if exists "partidas_todo_logado_ve" on public.partidas;
create policy "partidas_todo_logado_ve"
  on public.partidas for select to authenticated using (true);

drop policy if exists "partida_jogadores_todo_logado_ve" on public.partida_jogadores;
create policy "partida_jogadores_todo_logado_ve"
  on public.partida_jogadores for select to authenticated using (true);

-- Sem policy de INSERT em nenhuma das duas: quem cria e a funcao abaixo, em uma
-- transacao so. Insert direto abriria espaco para partida sem escalacao, ou com
-- nove jogadores, ou com a janela de avaliacao inventada pelo cliente.

-- ---------------------------------------------------------------------------
-- Registrar o placar
-- ---------------------------------------------------------------------------

drop policy if exists "partidas_placar_de_quem_jogou" on public.partidas;
create policy "partidas_placar_de_quem_jogou"
  on public.partidas for update to authenticated
  using (
    exists (
      select 1 from public.partida_jogadores pj
      where pj.partida_id = partidas.id
        and pj.jogador_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.partida_jogadores pj
      where pj.partida_id = partidas.id
        and pj.jogador_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Criar a partida
--
-- Recebe a escalacao pronta -- o motor de balanceamento roda no aplicativo,
-- onde e testavel sem banco. O que esta funcao faz e nao aceitar escalacao
-- invalida: e a fronteira que o cliente nao contorna.
-- ---------------------------------------------------------------------------

create or replace function public.criar_partida(
  p_jogada_em timestamptz,
  p_time_a uuid[],
  p_time_b uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_fuso constant text := 'America/Sao_Paulo';
  v_eu uuid := (select auth.uid());
  v_todos uuid[];
  v_dia date;
  v_abre timestamptz;
  v_fecha timestamptz;
  v_partida uuid;
  v_id uuid;
begin
  if v_eu is null then
    raise exception 'Precisa estar logado para registrar uma partida.';
  end if;

  if array_length(p_time_a, 1) is distinct from 4
     or array_length(p_time_b, 1) is distinct from 4 then
    raise exception 'Cada time precisa de exatamente 4 jogadores.';
  end if;

  v_todos := p_time_a || p_time_b;

  -- Oito ids distintos: repetido viraria jogador em dois times ao mesmo tempo.
  if (select count(distinct t.id) from unnest(v_todos) as t(id)) <> 8 then
    raise exception 'Os 8 jogadores precisam ser diferentes entre si.';
  end if;

  -- Todos precisam existir. Sem isto, daria para registrar partida com id
  -- inventado e, depois, ninguem conseguiria avaliar aquela linha.
  if (select count(*) from public.jogadores j where j.id = any(v_todos)) <> 8 then
    raise exception 'Algum dos jogadores escolhidos nao existe.';
  end if;

  -- A janela: da virada do dia seguinte a virada do dia posterior, no fuso da
  -- aplicacao. O horario da partida nao entra na conta -- so a data.
  v_dia := (p_jogada_em at time zone c_fuso)::date;
  v_abre := ((v_dia + 1)::timestamp) at time zone c_fuso;
  v_fecha := ((v_dia + 2)::timestamp) at time zone c_fuso;

  insert into public.partidas (criada_por, jogada_em, avaliacao_abre_em, avaliacao_fecha_em)
  values (v_eu, p_jogada_em, v_abre, v_fecha)
  returning id into v_partida;

  -- O rating de cada um no momento do sorteio, tirado da funcao oficial: assim
  -- o numero gravado e o mesmo que a tela mostrou, e nao um enviado pelo cliente.
  foreach v_id in array p_time_a loop
    insert into public.partida_jogadores (partida_id, jogador_id, time_da_partida, rating_no_momento)
    select v_partida, v_id, 'A', coalesce(r.rating, 0)
    from public.ratings_dos_jogadores() r
    where r.jogador_id = v_id;
  end loop;

  foreach v_id in array p_time_b loop
    insert into public.partida_jogadores (partida_id, jogador_id, time_da_partida, rating_no_momento)
    select v_partida, v_id, 'B', coalesce(r.rating, 0)
    from public.ratings_dos_jogadores() r
    where r.jogador_id = v_id;
  end loop;

  return v_partida;
end;
$$;

-- ---------------------------------------------------------------------------
-- A janela esta aberta?
--
-- Uma funcao so, para a regra existir em um lugar. Tela, autorizacao e teste
-- perguntam para ela, em vez de cada um repetir a comparacao.
-- ---------------------------------------------------------------------------

create or replace function public.avaliacao_esta_aberta(p_partida uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partidas p
    where p.id = p_partida
      and now() >= p.avaliacao_abre_em
      and now() < p.avaliacao_fecha_em
  );
$$;

-- ---------------------------------------------------------------------------
-- Permissoes
-- ---------------------------------------------------------------------------

grant select on public.partidas to authenticated;
grant update (placar_a, placar_b) on public.partidas to authenticated;
grant select on public.partida_jogadores to authenticated;

revoke all on function public.criar_partida(timestamptz, uuid[], uuid[]) from public, anon;
grant execute on function public.criar_partida(timestamptz, uuid[], uuid[]) to authenticated;

revoke all on function public.avaliacao_esta_aberta(uuid) from public, anon;
grant execute on function public.avaliacao_esta_aberta(uuid) to authenticated;
