create extension if not exists "pgcrypto";

create table if not exists public.stl_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder text not null default 'Unsorted',
  tags text[] not null default '{}',
  size bigint not null default 0,
  storage_path text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  uploader_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stl_files enable row level security;

drop policy if exists "Signed in users can read STL records" on public.stl_files;
create policy "Signed in users can read STL records" on public.stl_files for select to authenticated using (true);

drop policy if exists "Signed in users can insert STL records" on public.stl_files;
create policy "Signed in users can insert STL records" on public.stl_files for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "Signed in users can update STL records" on public.stl_files;
create policy "Signed in users can update STL records" on public.stl_files for update to authenticated using (true) with check (true);

drop policy if exists "Signed in users can delete STL records" on public.stl_files;
create policy "Signed in users can delete STL records" on public.stl_files for delete to authenticated using (true);

drop policy if exists "Signed in users can read STL objects" on storage.objects;
create policy "Signed in users can read STL objects" on storage.objects for select to authenticated using (bucket_id = 'stl-files');

drop policy if exists "Signed in users can upload STL objects" on storage.objects;
create policy "Signed in users can upload STL objects" on storage.objects for insert to authenticated with check (bucket_id = 'stl-files');

drop policy if exists "Signed in users can update STL objects" on storage.objects;
create policy "Signed in users can update STL objects" on storage.objects for update to authenticated using (bucket_id = 'stl-files') with check (bucket_id = 'stl-files');

drop policy if exists "Signed in users can delete STL objects" on storage.objects;
create policy "Signed in users can delete STL objects" on storage.objects for delete to authenticated using (bucket_id = 'stl-files');
