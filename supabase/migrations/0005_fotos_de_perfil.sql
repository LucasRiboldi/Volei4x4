-- Etapa 02 -- Foto de perfil.
--
-- Cria o bucket onde as fotos vivem e as regras de quem pode escrever nele.
--
-- O bucket e publico para leitura, e isso e deliberado: a foto aparece na lista
-- de jogadores e no sorteio, telas que carregam dezenas de imagens de uma vez.
-- URL assinada para cada uma custaria uma ida ao servidor por foto, e a foto de
-- perfil de um grupo de volei nao e segredo. O que precisa de regra e a
-- ESCRITA, e ela esta amarrada abaixo.
--
-- O caminho do arquivo e `<uid>/avatar.<ext>`. A primeira pasta ser o uid da
-- pessoa e o que torna a regra simples e verificavel: quem escreve so alcanca a
-- propria pasta.
--
-- Idempotente: pode rodar de novo sem quebrar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  -- 5 MB. Foto de perfil nao precisa de mais, e o limite no bucket e a unica
  -- barreira que o cliente nao consegue contornar.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Quem pode mexer nos arquivos
--
-- `storage.foldername(name)` devolve as pastas do caminho. O primeiro elemento
-- precisa ser o uid de quem esta chamando -- e o que impede alguem de escrever
-- na pasta de outro.
-- ---------------------------------------------------------------------------

drop policy if exists "avatares_leitura_publica" on storage.objects;
create policy "avatares_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'avatares');

drop policy if exists "avatares_envia_o_proprio" on storage.objects;
create policy "avatares_envia_o_proprio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares_troca_o_proprio" on storage.objects;
create policy "avatares_troca_o_proprio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares_apaga_o_proprio" on storage.objects;
create policy "avatares_apaga_o_proprio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
