# STL Organizer Supabase Login Full Build

## Includes
- Email magic-link login
- Supabase shared cloud storage
- Multi-user upload/download
- STL 3D viewer
- Folder and subfolder paths
- Rename files
- Delete files
- Folder rename/delete/delete all
- Tags
- Search
- Sorting
- Folder browser

## Setup
1. Create a Supabase project.
2. Create a private storage bucket named `stl-files`.
3. Run `supabase-schema.sql` in Supabase SQL Editor.
4. Add these environment variables to Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Enable Email auth in Supabase Authentication > Providers.
6. Deploy to Vercel.

## Vercel
Build command: `npm run build`
Output directory: `dist`
