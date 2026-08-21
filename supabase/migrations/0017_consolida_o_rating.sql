-- Consolida o rating: uma definicao vigente, e os numeros num lugar so.
--
-- ---------------------------------------------------------------------------
-- O problema
-- ---------------------------------------------------------------------------
--
-- `ratings_dos_jogadores()` foi redefinida cinco vezes -- 0007, 0010, 0012,
-- 0015 e 0016 --, cada uma com o corpo inteiro copiado. Como cada copia traz os
-- oito pesos, o prior, o peso do prior e o piso, o repositorio guarda quarenta
-- constantes de peso, das quais trinta e duas estao obsoletas.
--
-- Isso e caro de duas maneiras. A obvia: mudar um peso obriga a reescrever uma
-- funcao de cento e trinta linhas, e cada reescrita e uma chance nova de errar
-- uma linha da agregacao. A traicoeira: o cabecalho da 0007 afirma que aqueles
-- valores sao "a unica fonte deles no sistema". Era verdade quando foi escrito
-- e ha muito nao e -- e e exatamente o tipo de comentario que faz alguem editar
-- o arquivo errado com confianca.
--
-- ---------------------------------------------------------------------------
-- O que muda
-- ---------------------------------------------------------------------------
--
-- Os numeros saem da funcao de agregacao e passam a viver em
-- `rating_parametros()`, que nao faz nada alem de devolve-los. A partir daqui,
-- mudar um peso e substituir uma funcao de dez linhas; a agregacao nao e
-- tocada, e nao ha o que quebrar nela.
--
-- A formula NAO muda. A agregacao e a mesma da 0016, linha por linha, com os
-- literais trocados pelos campos da configuracao. Nenhum rating deve se mexer
-- por causa desta migracao -- e isso e conferivel, porque o rating nunca e
-- gravado: basta comparar a saida antes e depois.
--
-- A decisao de fundo continua valendo e nao esta em discussao aqui: estes
-- numeros vivem no banco e nao no TypeScript, porque peso no cliente e peso
-- forjavel, e porque o app nao consegue -- nem deve conseguir -- somar voto
-- alheio.
--
-- Idempotente: pode rodar de novo sem quebrar.

-- ---------------------------------------------------------------------------
-- Os numeros
--
-- `immutable` porque devolve constantes: o planejador pode chamar uma vez e
-- reaproveitar.
--
-- Sem privilegio para ninguem. Quem le isto e `ratings_dos_jogadores()`, que e
-- `security definer` e roda como dona do banco -- nao precisa de grant. E
-- revogar das tres origens de uma vez, porque privilegio de funcao vem de duas
-- fontes neste banco e revogar de uma so deixa a outra passar.
-- ---------------------------------------------------------------------------

create or replace function public.rating_parametros()
returns table (
  prior numeric,
  peso_do_prior numeric,
  piso int,
  p_ataque numeric,
  p_defesa numeric,
  p_passe numeric,
  p_saque numeric,
  p_bloqueio numeric,
  p_agilidade numeric,
  p_leitura numeric,
  p_equipe numeric,
  nota_minima numeric,
  nota_maxima numeric
)
language sql
immutable
set search_path = ''
as $$
  select
    -- O meio da escala de estrelas, e o valor de quem ainda nao tem votos.
    3::numeric,
    -- Quanto o prior vale, em votos equivalentes.
    5::numeric,
    -- Minimo de avaliadores DISTINTOS para o numero sair calculado.
    5,
    -- Os oito pesos. Somam 1 -- e ha um bloco no fim deste arquivo que recusa a
    -- migracao se algum dia deixarem de somar.
    0.20::numeric,  -- ataque
    0.20::numeric,  -- defesa
    0.15::numeric,  -- passe
    0.10::numeric,  -- saque
    0.10::numeric,  -- bloqueio
    0.10::numeric,  -- agilidade
    0.10::numeric,  -- leitura
    0.05::numeric,  -- equipe
    -- Os limites da escala de estrelas, para a conversao para 0-10 nao ficar
    -- com numeros soltos no meio da conta.
    1::numeric,
    5::numeric;
$$;

revoke all on function public.rating_parametros() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A agregacao
--
-- Mesma formula da 0016. O retorno tambem e o mesmo, entao `create or replace`
-- basta -- nao ha tipo de retorno mudando, que foi o que obrigou a 0016 a
-- derrubar a funcao antes de recria-la.
--
-- A variavel da configuracao se chama `cfg`, e nao `p`: `p` ja e o alias de
-- `avaliacoes_de_partida` la embaixo, e plpgsql resolveria a favor da variavel.
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
    from public.avaliacoes a
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
grant execute on function public.ratings_dos_jogadores() to authenticated;

-- ---------------------------------------------------------------------------
-- criar_partida(): o `coalesce(r.rating, 0)` sai
--
-- A escalacao era gravada assim, um jogador por vez:
--
--     insert into public.partida_jogadores (...)
--     select v_partida, v_id, 'A', coalesce(r.rating, 0)
--     from public.ratings_dos_jogadores() r
--     where r.jogador_id = v_id;
--
-- Dois defeitos, e o segundo e o serio.
--
-- O `coalesce` sugere proteger contra rating nulo, mas nao e isso que pode
-- faltar: se `ratings_dos_jogadores()` nao devolvesse linha para aquele id, o
-- `insert ... select` gravaria ZERO LINHAS. Nao um zero -- linha nenhuma. A
-- partida nasceria com menos de oito jogadores, calada, e so apareceria depois,
-- quando a avaliacao pos-partida recusasse quem "nao participou". E a armadilha
-- ja catalogada: operacao que nao acha alvo e sucesso.
--
-- E chamava `ratings_dos_jogadores()` OITO vezes, uma por jogador, e cada
-- chamada agrega a tabela inteira de avaliacoes.
--
-- Agora e uma chamada so, e a contagem de linhas e conferida: se nao gravar
-- exatamente oito, levanta excecao e a transacao inteira volta -- inclusive a
-- linha em `partidas`.
--
-- O resto da funcao e identico ao da 0008.
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
  v_linhas int;
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

  -- O rating de cada um no momento do sorteio, tirado da funcao oficial: o
  -- numero gravado e o mesmo que a tela mostrou, e nao um enviado pelo cliente.
  with r as (
    select * from public.ratings_dos_jogadores()
  ),
  escalacao as (
    select t.id as jogador_id, 'A'::char(1) as time_da_partida from unnest(p_time_a) as t(id)
    union all
    select t.id as jogador_id, 'B'::char(1) as time_da_partida from unnest(p_time_b) as t(id)
  )
  insert into public.partida_jogadores (partida_id, jogador_id, time_da_partida, rating_no_momento)
  select v_partida, e.jogador_id, e.time_da_partida, r.rating
  from escalacao e
  join r on r.jogador_id = e.jogador_id;

  get diagnostics v_linhas = row_count;

  if v_linhas <> 8 then
    raise exception 'Esperava gravar 8 jogadores na escalacao, gravei %.', v_linhas;
  end if;

  return v_partida;
end;
$$;

revoke all on function public.criar_partida(timestamptz, uuid[], uuid[]) from public, anon;
grant execute on function public.criar_partida(timestamptz, uuid[], uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- A trava: os pesos precisam somar 1
--
-- Agora que mudar um peso e mexer numa funcao pequena, ficou facil mexer em um
-- e esquecer de rebalancear o resto. O efeito seria silencioso: todos os
-- ratings deslocados, nenhum erro em lugar nenhum, e a ordenacao entre
-- jogadores parecendo plausivel.
--
-- Este bloco recusa a migracao nesse caso. Toda alteracao futura de peso passa
-- por aqui de graca, desde que a proxima migracao o repita.
-- ---------------------------------------------------------------------------

do $$
declare
  v_soma numeric;
begin
  select p_ataque + p_defesa + p_passe + p_saque
       + p_bloqueio + p_agilidade + p_leitura + p_equipe
  into v_soma
  from public.rating_parametros();

  if abs(v_soma - 1) > 0.000001 then
    raise exception 'Os pesos do rating somam %, e precisam somar 1.', v_soma;
  end if;

  raise notice 'Pesos conferidos: somam %.', v_soma;
end;
$$;
