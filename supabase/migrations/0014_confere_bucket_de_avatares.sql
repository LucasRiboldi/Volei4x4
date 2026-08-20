-- Garante o bucket de avatares, e confirma em voz alta que ele existe.
--
-- ---------------------------------------------------------------------------
-- Por que esta migracao existe
-- ---------------------------------------------------------------------------
--
-- A 0005 cria o bucket `avatares` e as policies do Storage. Ela foi dada como
-- aplicada, e nao estava: o envio de foto falhava com
--
--     {"error":"Bucket not found","code":"NoSuchBucket"}
--
-- A verificacao que me convenceu do contrario era ruim. Eu tinha chamado
--
--     POST /storage/v1/object/list/avatares
--
-- e recebido `[]`, e li isso como "bucket vazio, logo existe". Mas esse
-- endpoint devolve `[]` para bucket inexistente tambem -- confirmei depois
-- pedindo a listagem de um nome inventado e recebendo a mesma resposta.
-- Faltou o teste de controle.
--
-- Esta migracao repete o que a 0005 faz, de forma idempotente, e termina
-- conferindo. Se o bucket nao existir ao final, ela levanta excecao em vez de
-- passar verde -- porque foi exatamente o "passou verde sem fazer nada" que
-- custou caro aqui, com a promocao a administrador e agora com o bucket.
--
-- Idempotente: pode rodar de novo sem quebrar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- As policies do Storage
--
-- `storage.foldername(name)` devolve as pastas do caminho. O primeiro elemento
-- precisa ser o uid de quem chama -- e o que impede alguem de escrever na pasta
-- de outro.
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

-- ---------------------------------------------------------------------------
-- A conferencia
-- ---------------------------------------------------------------------------

do $$
declare
  v_publico boolean;
  v_policies int;
begin
  select public into v_publico from storage.buckets where id = 'avatares';

  if v_publico is null then
    raise exception 'O bucket `avatares` nao existe depois desta migracao. Algo impediu a criacao.';
  end if;

  if not v_publico then
    raise exception 'O bucket `avatares` existe mas nao esta publico; as fotos nao apareceriam.';
  end if;

  select count(*) into v_policies
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname like 'avatares_%';

  if v_policies < 4 then
    raise exception 'Esperava 4 policies de avatares no storage, encontrei %.', v_policies;
  end if;

  raise notice 'Bucket `avatares` pronto: publico, com % policies.', v_policies;
end;
$$;
