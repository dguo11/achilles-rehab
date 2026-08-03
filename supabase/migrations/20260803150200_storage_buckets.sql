-- Private storage buckets for user-uploaded protocol documents and
-- generated .fit exports. Both are scoped per-user by folder path
-- (`{user_id}/...`) and neither bucket is public.

insert into storage.buckets (id, name, public)
values
  ('protocol-uploads', 'protocol-uploads', false),
  ('fit-exports', 'fit-exports', false);

create policy "protocol_uploads_owner_access"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'protocol-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'protocol-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fit_exports_owner_access"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'fit-exports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fit-exports' and (storage.foldername(name))[1] = auth.uid()::text);
