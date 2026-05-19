# STL Storage Organizer

A local browser-based STL storage, organizer, and viewer.

## Features

- Upload multiple STL files
- View STL files in a 3D viewer
- Orbit controls
- IndexedDB local browser storage
- Files persist after refresh
- Download stored STL files
- Delete individual STL files
- Clear full library
- Create folders
- Rename folders
- Delete any folder, including defaults
- Delete all folders
- Automatic fallback Unsorted folder
- Move files between folders
- Rename files inline
- Add and remove tags
- Search by file name or tag
- Library browser with folder counts
- Sort by newest, oldest, name, or size
- Library stats dashboard

## Vercel Deploy Settings

- Build command: `npm run build`
- Output directory: `dist`

## Local Development

```bash
npm install
npm run dev
```

## Important

Files are stored locally in the browser with IndexedDB. They are not uploaded to GitHub, Vercel, or any server.
