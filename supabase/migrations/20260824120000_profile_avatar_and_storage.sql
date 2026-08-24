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
-- file_size_limit/allowed_mime_types are a second, storage-engine-level backstop behind the
-- application-level checks in lib/actions/profile/avatar.ts (MAX_AVATAR_BYTES /
-- AVATAR_EXTENSION_BY_TYPE) — defense in depth in case a future code path ever uploads to
-- this bucket without going through that Server Action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB, matches MAX_AVATAR_BYTES in lib/actions/profile/avatar.ts
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Object path convention: avatars/<user_id>/<uuid>.<ext> — every policy below checks that the
-- first path segment matches the caller's own auth.uid(), so a user can only ever
-- read/insert/replace/delete Storage-API rows inside their own folder, never another user's.
--
-- This does NOT make avatars unreadable to other users or logged-out visitors: this bucket is
-- `public` (see above), so the actual read path this app uses — getPublicUrl(), rendered as a
-- plain <img src> — is served straight from `/storage/v1/object/public/avatars/...` and
-- bypasses RLS entirely, by design, regardless of this policy. What this `select` policy
-- *does* gate is the Storage API's other read operations (`list()`, `download()`,
-- `createSignedUrl()`), which query storage.objects and are subject to RLS like any other
-- table. Nothing in this app calls those, and a wide-open `using (bucket_id = 'avatars')`
-- policy here would let anyone with the (necessarily public) anon key call `list()` and
-- enumerate every user's folder name (their auth.uid()) and every avatar filename directly —
-- quietly defeating the "the URL itself isn't guessable" reasoning above. Scoping this to the
-- caller's own folder, like every other operation, closes that without touching the public
-- read path at all.
create policy "Users can list and read their own avatar files via the Storage API"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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
