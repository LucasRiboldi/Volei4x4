-- Corrige a promocao a administrador, que falhou em silencio.
--
-- ---------------------------------------------------------------------------
-- O que aconteceu
-- ---------------------------------------------------------------------------
--
-- A 0009 terminava com:
--
--   update public.jogadores set admin = true
--   where id = (select id from auth.users where email = '...');
--
-- A conta existia em `auth.users`, mas nao tinha linha em `public.jogadores`:
-- o gatilho da 0003 nunca chegou a ser instalado, e a conta foi criada pela API
-- sem nunca abrir o aplicativo -- que e onde `garantirMeuPerfil()` cria o
-- perfil.
--
-- Resultado: o update casou com zero linhas. E zero linhas nao e erro. A
-- migracao passou verde e ninguem virou administrador.
--
-- E a mesma armadilha que ja apareceu neste projeto com o PostgREST: operacao
-- que nao encontra alvo e sucesso, nao falha. A correcao abaixo tem duas
-- partes: preencher o que falta, e nunca mais deixar isso passar calado.

-- ---------------------------------------------------------------------------
-- 1. Perfil para toda conta que nao tem
--
-- Resolve a causa, e nao so o caso: qualquer conta criada antes do gatilho, ou
-- por fora do aplicativo, ganha sua linha.
-- ---------------------------------------------------------------------------

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
where not exists (select 1 from public.jogadores j where j.id = u.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. A promocao, que saiu daqui
--
-- Esta migracao terminava com um bloco que promovia um e-mail fixo e levantava
-- excecao se a conta nao existisse. Falhar alto estava certo -- era o remedio
-- para o defeito da 0009. Errado era a condicao morar numa migracao.
--
-- Num projeto Supabase novo nao existe conta nenhuma, entao a excecao disparava
-- e a cadeia parava aqui, na 11 de 15. O README manda aplicar as migracoes em
-- ordem num projeto novo, e isso simplesmente nao funcionava: o projeto nao era
-- instalavel a partir das proprias instrucoes. O remedio para uma falha
-- silenciosa tinha virado uma falha bloqueante para todo mundo que nao fosse o
-- autor.
--
-- A promocao agora vive em `supabase/manual/promover-admin.sql`, com a mesma
-- verificacao barulhenta e sem e-mail versionado. A parte 1 acima fica: criar
-- perfil para conta que nao tem e generico, vale em qualquer instalacao, e e
-- justamente o que fazia o update casar com zero linhas.
--
-- Removido de uma migracao ja aplicada, o que normalmente nao se faz. Vale aqui
-- porque nao desfaz nada: quem ja foi promovido continua admin.
-- ---------------------------------------------------------------------------
