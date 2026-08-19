-- Etapa 01 -- Identidade e perfil do jogador.
--
-- A separacao entre identidade e jogador e o ponto central deste arquivo, e o
-- que permite acrescentar login com Google depois sem tocar em nada:
--
--   auth.users   e a identidade. Quem cuida dela e o Supabase Auth: senha com
--                hash, e-mail, e a lista de provedores em auth.identities.
--   jogadores    e a pessoa dentro do jogo: nome, apelido, foto, cidade.
--
-- O e-mail nunca e chave de nada. A chave e o uuid interno, e ele nao muda se
-- a pessoa trocar de e-mail ou passar a entrar pelo Google.
--
-- Este arquivo NAO toca no schema `auth`. O gatilho que cria o perfil no
-- cadastro vive na migracao 0003, sozinho, porque mexer em `auth.users` exige
-- privilegio que nem todo projeto concede -- e o editor de SQL do Supabase roda
-- o script inteiro em uma transacao, entao um erro la derrubaria estas tabelas
-- junto.
--
-- Idempotente: pode rodar de novo sem quebrar.

create table if not exists public.jogadores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 60),
  apelido text check (apelido is null or length(trim(apelido)) between 1 and 30),
  cidade text check (cidade is null or length(trim(cidade)) <= 60),
  foto_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.jogadores enable row level security;

-- Todo mundo que entrou enxerga a lista de jogadores: e o que a tela de
-- Jogadores e a de Sorteio precisam. Nao ha nada sensivel aqui -- nota e
-- avaliacao vivem em outra tabela, com regra propria.
drop policy if exists "jogadores_todo_logado_ve" on public.jogadores;
create policy "jogadores_todo_logado_ve"
  on public.jogadores for select to authenticated
  using (true);

-- Cada um edita so o proprio perfil.
drop policy if exists "jogadores_cada_um_edita_o_seu" on public.jogadores;
create policy "jogadores_cada_um_edita_o_seu"
  on public.jogadores for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Cada um cria so a propria linha, e so com o proprio id.
--
-- Esta policy e a rede de seguranca do gatilho da 0003: se ele nao puder ser
-- instalado, o aplicativo cria o perfil no primeiro acesso. O `with check`
-- amarra a linha ao dono, entao ninguem inventa perfil para terceiro.
drop policy if exists "jogadores_cria_o_proprio" on public.jogadores;
create policy "jogadores_cria_o_proprio"
  on public.jogadores for insert to authenticated
  with check (id = (select auth.uid()));

-- Sem policy de DELETE: o perfil morre junto com a conta, por cascata.
