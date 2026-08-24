-- Adds an optional profile picture: a nullable column on profiles, plus a public Storage
-- bucket + policies so a user can upload/replace/remove their own avatar file. See
-- openspec/changes/add-profile-settings/design.md for why this bucket is public (the one
-- deliberate exception in this template — every other user file/table stays behind RLS or
-- service_role) and .claude/skills/supabase-security/SKILL.md.

alter table public.profiles add column avatar_url text;

-- Public bucket: avatar files are served directly by their URL, the same way most SaaS
-- products treat profile pictures, rather than needing a signed URL refreshed on every page
-- load. Filenames are random UUIDs inside a per-user folder (see the upload Server Action),
-- never the user's id or email, so the URL itself isn't guessable from public information.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Object path convention: avatars/<user_id>/<uuid>.<ext> — every write policy below checks
-- that the first path segment matches the caller's own auth.uid(), so a user can only ever
-- insert/replace/delete files inside their own folder, never another user's.
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can remove their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
