import React, { useMemo, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { Upload, Search, FolderPlus, Tag, Trash2, Box, Download, Eye, Plus, X, Archive, HardDrive } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function STLModel({ url }) {
  const geometry = useLoader(STLLoader, url);

  const centeredGeometry = useMemo(() => {
    const g = geometry.clone();
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.center();
    return g;
  }, [geometry]);

  return (
    <Center>
      <mesh geometry={centeredGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#c7c7d1" roughness={0.42} metalness={0.08} />
      </mesh>
    </Center>
  );
}

function Viewer({ selected }) {
  if (!selected) {
    return (
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 p-8 text-center">
        <div>
          <Box className="mx-auto mb-4 h-14 w-14 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">No STL selected</h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">Upload STL files, then select one from the library to preview it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="font-semibold text-white">{selected.name}</h2>
          <p className="text-xs text-zinc-500">{selected.folder} · {formatBytes(selected.size)}</p>
        </div>
        <a href={selected.url} download={selected.name} className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700">
          <Download className="h-4 w-4" /> Download
        </a>
      </div>
      <div className="h-[520px] w-full">
        <Canvas camera={{ position: [85, 65, 85], fov: 45 }} shadows>
          <ambientLight intensity={0.45} />
          <directionalLight position={[8, 12, 8]} intensity={1.1} castShadow />
          <directionalLight position={[-8, 4, -8]} intensity={0.45} />
          <React.Suspense fallback={<Html center><div className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">Loading STL...</div></Html>}>
            <STLModel url={selected.url} />
          </React.Suspense>
          <Grid infiniteGrid sectionColor="#7c3aed" cellColor="#3f3f46" fadeDistance={420} fadeStrength={2} />
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Canvas>
      </div>
    </div>
  );
}

export default function App() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("All");
  const [newFolder, setNewFolder] = useState("");
  const [folders, setFolders] = useState(["Miniatures", "Terrain", "Bases", "Bits", "Unsorted"]);
  const [activeFolder, setActiveFolder] = useState("Unsorted");
  const [tagInput, setTagInput] = useState("");

  const selected = files.find((f) => f.id === selectedId) || null;

  const libraryStats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const folderCount = new Set(files.map((file) => file.folder)).size;
    return { totalSize, folderCount, fileCount: files.length };
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesFolder = folderFilter === "All" || file.folder === folderFilter;
      const matchesQuery = !q || file.name.toLowerCase().includes(q) || file.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesFolder && matchesQuery;
    });
  }, [files, folderFilter, query]);

  function handleUpload(event) {
    const incoming = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith(".stl"));
    const next = incoming.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      folder: activeFolder,
      tags: [],
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    }));
    setFiles((current) => [...next, ...current]);
    if (next[0]) setSelectedId(next[0].id);
    event.target.value = "";
  }

  function addFolder() {
    const folder = newFolder.trim();
    if (!folder || folders.includes(folder)) return;
    setFolders((current) => [...current, folder]);
    setActiveFolder(folder);
    setNewFolder("");
  }

  function deleteFile(id) {
    const target = files.find((file) => file.id === id);
    if (target?.url) URL.revokeObjectURL(target.url);
    setFiles((current) => current.filter((file) => file.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveFile(id, folder) {
    setFiles((current) => current.map((file) => file.id === id ? { ...file, folder } : file));
  }

  function addTagToSelected() {
    const tag = tagInput.trim();
    if (!tag || !selected) return;
    setFiles((current) => current.map((file) => {
      if (file.id !== selected.id || file.tags.includes(tag)) return file;
      return { ...file, tags: [...file.tags, tag] };
    }));
    setTagInput("");
  }

  function removeTag(fileId, tag) {
    setFiles((current) => current.map((file) => file.id === fileId ? { ...file, tags: file.tags.filter((t) => t !== tag) } : file));
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 grid gap-4 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
              <Archive className="h-3.5 w-3.5" /> Local STL Library
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">STL Storage, Organizer, and Viewer</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Upload STL files, organize them by folder and tags, search your collection, and preview models in a built-in 3D viewer.</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white shadow-lg shadow-purple-950/40 hover:bg-purple-500">
            <Upload className="h-5 w-5" /> Upload STL Files
          </button>
          <input ref={fileInputRef} type="file" accept=".stl" multiple onChange={handleUpload} className="hidden" />
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"><div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Files Stored</span></div><p className="mt-2 text-2xl font-bold text-white">{libraryStats.fileCount}</p></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"><div className="flex items-center gap-3"><FolderPlus className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Active Folders</span></div><p className="mt-2 text-2xl font-bold text-white">{libraryStats.folderCount || 0}</p></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"><div className="flex items-center gap-3"><Box className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Library Size</span></div><p className="mt-2 text-2xl font-bold text-white">{formatBytes(libraryStats.totalSize)}</p></div>
        </section>

        <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"><Search className="h-4 w-4 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or tag..." className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" /></div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select value={activeFolder} onChange={(e) => setActiveFolder(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">{folders.map((folder) => <option key={folder}>{folder}</option>)}</select>
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><option>All</option>{folders.map((folder) => <option key={folder}>{folder}</option>)}</select>
            </div>
            <div className="mb-4 flex gap-2"><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="New folder" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600" /><button onClick={addFolder} className="rounded-xl bg-zinc-800 px-3 py-2 hover:bg-zinc-700"><Plus className="h-4 w-4" /></button></div>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Library</h2><span className="text-xs text-zinc-500">{filteredFiles.length} shown</span></div>
            <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
              {filteredFiles.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">No STL files found.</div> : filteredFiles.map((file) => (
                <div key={file.id} className={`rounded-2xl border p-3 transition ${selectedId === file.id ? "border-purple-500 bg-purple-500/10" : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"}`}>
                  <div className="flex items-start justify-between gap-3"><button onClick={() => setSelectedId(file.id)} className="min-w-0 text-left"><div className="flex items-center gap-2"><Eye className="h-4 w-4 shrink-0 text-purple-300" /><p className="truncate font-medium text-white">{file.name}</p></div><p className="mt-1 text-xs text-zinc-500">{file.folder} · {formatBytes(file.size)}</p></button><button onClick={() => deleteFile(file.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-3 flex items-center gap-2"><select value={file.folder} onChange={(e) => moveFile(file.id, e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300">{folders.map((folder) => <option key={folder}>{folder}</option>)}</select></div>
                  {file.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{file.tags.map((tag) => <button key={tag} onClick={() => removeTag(file.id, tag)} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700">{tag}<X className="h-3 w-3" /></button>)}</div>}
                </div>
              ))}
            </div>
          </aside>
          <section className="space-y-4">
            <Viewer selected={selected} />
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"><div className="mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-purple-300" /><h3 className="font-semibold text-white">Tags for Selected File</h3></div><div className="flex gap-2"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTagToSelected()} disabled={!selected} placeholder={selected ? "Add tags like 28mm, terrain, infantry..." : "Select a file first"} className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none disabled:opacity-50" /><button disabled={!selected} onClick={addTagToSelected} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500">Add Tag</button></div><p className="mt-3 text-xs text-zinc-500">Prototype note: this version stores uploaded STL files in memory for the browser session. For permanent storage, connect it to IndexedDB, local file system access, Firebase, Supabase, or a private server.</p></div>
          </section>
        </main>
      </div>
    </div>
  );
}
