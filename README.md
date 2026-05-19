# STL Storage Organizer Shared Cloud Library

This version uses Supabase for a persistent multi-user STL library.

## Features

- Multi-user email magic-link sign-in
- Shared persistent STL library
- Upload STL files to Supabase Storage
- Download and preview STL files from cloud storage
- 3D STL viewer with orbit controls
- Shared folders
- Rename folders
- Delete folders
- Delete all folders
- Move files between folders
- Rename STL files
- Delete STL files
- Add/remove tags
- Search by name, tag, or uploader
- Sort by newest, oldest, name, or size
- Folder browser with counts
- Shared cloud statistics

## Supabase Setup

1. Create a Supabase project.
2. Create a private storage bucket named:

```txt
stl-files
```

3. Open Supabase SQL Editor.
4. Run the SQL in:

```txt
supabase-schema.sql
```

5. In Supabase Auth settings, enable email login / magic links.
6. In your deployed site settings, add environment variables:

```txt
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Vercel Deploy Settings

Build command:

```bash
npm run build
```

Output directory:

```txt
dist
```

## Local Development

Copy `.env.example` to `.env`, fill in the values, then run:

```bash
npm install
npm run dev
```

## Permissions Note

The included SQL lets any signed-in user read, upload, edit, and delete shared library records. For a private club/store library, this is simple and collaborative. For production moderation, tighten the RLS policies to only allow owners/admins to delete.
