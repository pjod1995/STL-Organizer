# STL Storage Organizer Viewer

A Vite + React prototype for uploading, organizing, tagging, searching, downloading, and previewing STL files in the browser.

## Local testing

```bash
npm install
npm run dev
```

## Vercel settings

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Notes

This prototype keeps STL files in the browser session using object URLs. Refreshing the page clears the uploaded files. For permanent cloud storage, connect Supabase, Firebase, Appwrite, or another backend.
