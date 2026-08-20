-- Promove uma conta a administradora.
--
-- NAO e migracao, e nao deve virar uma. Ficou fora da pasta `migrations/` de
-- proposito -- ver "Por que isto saiu das migracoes", abaixo.
--
-- Uso: troque o e-mail na linha marcada, cole no SQL Editor do Supabase e rode.
--      A conta precisa existir antes: cadastre-se pelo aplicativo primeiro.
--
-- ---------------------------------------------------------------------------
-- Por que promover e um ato manual
-- ---------------------------------------------------------------------------
--
-- Nao existe -- e nao deve existir -- caminho pela API para alguem virar
-- administrador. A defesa nao esta na policy, e sim no GRANT: `authenticated`
-- recebe update apenas nas colunas de perfil, e `admin` fica de fora, entao o
-- PostgREST recusa a escrita antes mesmo de a RLS ser consultada. Ver a 0009.
--
-- Isso quer dizer que promover exige uma conexao privilegiada, que e o SQL
-- Editor do painel. Este arquivo e essa operacao, escrita uma vez.
--
-- ---------------------------------------------------------------------------
-- Por que isto saiu das migracoes
-- ---------------------------------------------------------------------------
--
-- A promocao morava no fim da 0009 e, depois, num bloco da 0011. As duas
-- traziam um e-mail fixo no proprio arquivo, e isso custava duas coisas:
--
--   1. O repositorio e publico. Um e-mail pessoal em texto puro nao precisa
--      estar la.
--
--   2. A 0011 levantava excecao se a conta nao existisse. Num projeto Supabase
--      novo nao existe conta nenhuma, entao a cadeia de migracoes parava na 11
--      de 15 -- ou seja, o projeto nao podia ser instalado a partir das
--      proprias instrucoes. A 0011 estava certa em falhar alto, e nunca deveria
--      ter carregado uma condicao que so vale na maquina de uma pessoa.
--
-- Migracao descreve o ESQUEMA, que e igual em todo projeto. Quem e o
-- administrador e dado, e dado varia de instalacao para instalacao.
--
-- ---------------------------------------------------------------------------
-- Idempotente: rodar de novo com o mesmo e-mail nao muda nada.
-- ---------------------------------------------------------------------------

do $$
declare
  -- ======================= TROQUE ESTA LINHA =======================
  c_email constant text := 'preencha@com.seu.email';
  -- =================================================================
  v_id uuid;
  v_linhas int;
begin
  if c_email = 'preencha@com.seu.email' then
    raise exception 'Troque o e-mail na linha marcada antes de rodar.';
  end if;

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(c_email);

  if v_id is null then
    raise exception 'Nao existe conta com o e-mail %. Cadastre-se pelo aplicativo antes de promover.', c_email;
  end if;

  -- A linha em `jogadores` pode faltar se a conta nasceu pela API e nunca abriu
  -- o aplicativo: o gatilho de `auth.users` nem sempre pode ser instalado, e e
  -- `garantirMeuPerfil()` que cria o perfil no primeiro acesso. Sem esta rede,
  -- o update abaixo casaria com zero linhas -- que, no Postgres, e sucesso.
  insert into public.jogadores (id, nome)
  select
    u.id,
    left(coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(u.email, '@', 1), ''),
      'Jogador'
    ), 60)
  from auth.users u
  where u.id = v_id
  on conflict (id) do nothing;

  update public.jogadores set admin = true where id = v_id;
  get diagnostics v_linhas = row_count;

  -- Confere em voz alta. Update que nao acha alvo e sucesso para o Postgres, e
  -- foi assim que a primeira tentativa de promocao passou verde sem promover
  -- ninguem. Onde a recusa precisa ser visivel, ela tem de ser levantada.
  if v_linhas <> 1 then
    raise exception 'Esperava promover 1 jogador, mas foram % linhas.', v_linhas;
  end if;

  raise notice 'Administrador definido: % (%)', c_email, v_id;
end;
$$;
