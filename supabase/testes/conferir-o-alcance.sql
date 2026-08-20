-- Confere de uma vez o que protege o banco: RLS ligada, grant de tabela, quem
-- executa cada funcao e `security definer` sem search_path.
--
-- NAO e migracao. Cole no SQL Editor e leia a coluna `veredito` de cada bloco:
-- so 'ok' passa. Rode depois de toda migracao nova, e sempre que escrever um
-- `grant` ou um `revoke` -- privilegio de funcao vem de duas fontes neste
-- banco, e revoke que pega so uma falha calado.
--
-- O que este arquivo nao alcanca: as policies do Storage, que vivem em
-- `storage.objects` e valem para o bucket `avatares`; e a RLS em si, que so se
-- prova pedindo pela API REST sem sessao. Privilegio e o que se confere aqui.

-- ---------------------------------------------------------------------------
-- 1. RLS ligada, e quantas policies cada tabela tem
--
-- Toda tabela de `public` responde pela API, entao toda tabela precisa das
-- duas travas. Zero policy com RLS ligada nao e erro de sintaxe: e uma tabela
-- que simplesmente nao devolve linha nenhuma, calada.
-- ---------------------------------------------------------------------------

select
  c.relname as tabela,
  c.relrowsecurity as rls_ligada,
  count(p.polname) as policies,
  case
    when not c.relrowsecurity then 'FALHOU: RLS desligada'
    when count(p.polname) = 0 then 'CONFIRA: RLS ligada e nenhuma policy'
    else 'ok'
  end as veredito
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by veredito desc, tabela;

-- ---------------------------------------------------------------------------
-- 2. Grant de tabela -- a trava que some sem dizer o nome
--
-- Sem privilegio de tabela para `authenticated`, o PostgREST nao inclui a
-- tabela no cache de schema e responde PGRST205, que parece tabela
-- inexistente. `grant` decide SE a tabela e alcancavel; RLS decide QUAIS
-- LINHAS. A 0004 deixou um `alter default privileges` para as tabelas novas,
-- mas ele so vale para o que for criado pelo mesmo dono depois dele -- entao
-- conferir continua valendo.
--
-- `anon` aparece so como informacao: o app inteiro fica atras de login, entao
-- anon com select e coisa para olhar, nao necessariamente erro.
-- ---------------------------------------------------------------------------

select
  c.relname as tabela,
  has_table_privilege('authenticated', c.oid, 'SELECT') as autenticado_le,
  has_table_privilege('authenticated', c.oid, 'INSERT') as autenticado_grava,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_le,
  case
    when not has_table_privilege('authenticated', c.oid, 'SELECT')
      then 'FALHOU: some da API com PGRST205'
    when has_table_privilege('anon', c.oid, 'SELECT')
      then 'CONFIRA: anon alcanca a tabela'
    else 'ok'
  end as veredito
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by veredito desc, tabela;

-- ---------------------------------------------------------------------------
-- 3. Quem executa cada funcao
--
-- has_function_privilege soma o grant explicito e o que vem de PUBLIC, entao
-- ele responde a pergunta que ler o `proacl` sozinho nao responde.
--
-- Gatilho nao e chamado por ninguem de fora: `marcar_atualizado_em` e
-- `criar_jogador_do_novo_usuario` ficam fechados para os tres.
-- ---------------------------------------------------------------------------

with esperado (nome, quem_executa) as (
  values
    ('marcar_atualizado_em',            'ninguem'),
    ('criar_jogador_do_novo_usuario',   'ninguem'),
    ('ratings_dos_jogadores',           'authenticated'),
    ('criar_partida',                   'authenticated'),
    ('avaliacao_esta_aberta',           'authenticated'),
    ('participou_da_partida',           'authenticated'),
    ('e_admin',                         'authenticated')
)
select
  p.oid::regprocedure as funcao,
  coalesce(e.quem_executa, '?') as esperado,
  has_function_privilege('anon', p.oid, 'execute') as anon_executa,
  has_function_privilege('authenticated', p.oid, 'execute') as autenticado_executa,
  case
    when e.nome is null then 'CONFIRA: funcao fora da lista deste arquivo'
    when has_function_privilege('anon', p.oid, 'execute') then 'FALHOU: anon executa'
    when e.quem_executa = 'ninguem'
     and has_function_privilege('authenticated', p.oid, 'execute')
      then 'FALHOU: authenticated executa o que nao devia'
    when e.quem_executa = 'authenticated'
     and not has_function_privilege('authenticated', p.oid, 'execute')
      then 'FALHOU: o app nao consegue executar'
    else 'ok'
  end as veredito
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join esperado e on e.nome = p.proname
where n.nspname = 'public'
order by veredito desc, funcao;

-- ---------------------------------------------------------------------------
-- 4. security definer sem search_path fixo
--
-- A funcao roda como dona do banco; sem o search_path preso, um schema no
-- caminho de busca pode sequestrar a resolucao de nome. O Advisors do painel
-- tambem acusa, mas aqui sai junto com o resto.
-- ---------------------------------------------------------------------------

select
  p.oid::regprocedure as funcao,
  case
    when p.proconfig is null then 'FALHOU: security definer sem search_path'
    when not exists (
      select 1 from unnest(p.proconfig) as c(item) where c.item like 'search\_path=%'
    ) then 'FALHOU: security definer sem search_path'
    else 'ok'
  end as veredito
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by veredito desc, funcao;
