-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.stl_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder text not null default 'Unsorted',
  tags text[] not null default '{}',
  size bigint not null default 0,
  storage_path text not null unique,
  owner_id uuid references auth.users(id) on delete cascade,
  uploader_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stl_files enable row level security;

drop policy if exists "Anyone signed in can read STL records" on public.stl_files;
create policy "Anyone signed in can read STL records"
on public.stl_files
for select
to authenticated
using (true);

drop policy if exists "Anyone signed in can insert STL records" on public.stl_files;
create policy "Anyone signed in can insert STL records"
on public.stl_files
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Anyone signed in can update STL records" on public.stl_files;
create policy "Anyone signed in can update STL records"
on public.stl_files
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Anyone signed in can delete STL records" on public.stl_files;
create policy "Anyone signed in can delete STL records"
on public.stl_files
for delete
to authenticated
using (true);

-- Create a private storage bucket named stl-files in the Supabase dashboard first.
-- Storage policies for bucket: stl-files

drop policy if exists "Authenticated users can read STL storage" on storage.objects;
create policy "Authenticated users can read STL storage"
on storage.objects
for select
to authenticated
using (bucket_id = 'stl-files');

drop policy if exists "Authenticated users can upload STL storage" on storage.objects;
create policy "Authenticated users can upload STL storage"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'stl-files');

drop policy if exists "Authenticated users can update STL storage" on storage.objects;
create policy "Authenticated users can update STL storage"
on storage.objects
for update
to authenticated
using (bucket_id = 'stl-files')
with check (bucket_id = 'stl-files');

drop policy if exists "Authenticated users can delete STL storage" on storage.objects;
create policy "Authenticated users can delete STL storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'stl-files');
