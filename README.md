# STL Storage Organizer Viewer

A local-browser STL organizer and 3D viewer built with React, Vite, Three.js, React Three Fiber, and Tailwind CSS.

## Local testing

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Deploy to Vercel

1. Create a new GitHub repository.
2. Upload this project folder to the repository.
3. Go to Vercel and choose **Add New Project**.
4. Import the GitHub repository.
5. Use these settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**.

## Deploy to Netlify

1. Upload the folder to GitHub.
2. Create a new Netlify site from Git.
3. Use these settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
4. Click **Deploy**.

## Important note

This version stores uploaded STL files in the current browser session only. Refreshing the page clears uploaded files. For permanent cloud storage, connect Supabase Storage, Firebase Storage, or another backend.
