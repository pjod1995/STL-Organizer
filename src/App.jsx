import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { Upload, Search, FolderPlus, Tag, Trash2, Box, Download, Eye, Plus, X, Archive, HardDrive, Database, Pencil, Check } from "lucide-react";

const DB_NAME = "stl-storage-organizer-db";
const DB_VERSION = 1;
const FILE_STORE = "stlFiles";
const SETTINGS_STORE = "settings";
const DEFAULT_FOLDERS = ["Miniatures", "Terrain", "Bases", "Bits", "Unsorted"];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllStoredFiles() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readonly");
    const store = transaction.objectStore(FILE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function saveStoredFile(fileRecord) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    const store = transaction.objectStore(FILE_STORE);
    const request = store.put(fileRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

function createFileView(record) {
  return {
    ...record,
    url: URL.createObjectURL(record.blob),
  };
}

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
      <mesh geometry={centeredGeometry}>
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
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <div className="h-[520px] w-full">
        <Canvas camera={{ position: [85, 65, 85], fov: 45 }}>
          <ambientLight intensity={0.45} />
          <directionalLight position={[8, 12, 8]} intensity={1.1} />

          <React.Suspense fallback={<Html center><div className="text-white">Loading STL...</div></Html>}>
            <STLModel url={selected.url} />
          </React.Suspense>

          <Grid infiniteGrid sectionColor="#7c3aed" cellColor="#3f3f46" />
          <OrbitControls makeDefault />
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
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [activeFolder, setActiveFolder] = useState("Unsorted");
  const [newFolder, setNewFolder] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    async function loadLibrary() {
      const storedFiles = await getAllStoredFiles();
      setFiles(storedFiles.map(createFileView));
    }

    loadLibrary();
  }, []);

  const selected = files.find((f) => f.id === selectedId);

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(query.toLowerCase())
  );

  async function handleUpload(event) {
    const incoming = Array.from(event.target.files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".stl")
    );

    const next = incoming.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      folder: activeFolder,
      tags: [],
      uploadedAt: new Date().toISOString(),
      blob: file,
    }));

    await Promise.all(next.map(saveStoredFile));

    const viewFiles = next.map(createFileView);

    setFiles((current) => [...viewFiles, ...current]);

    if (viewFiles[0]) setSelectedId(viewFiles[0].id);
  }

  async function addFolder() {
    if (!newFolder.trim()) return;
    setFolders((current) => [...current, newFolder.trim()]);
    setNewFolder("");
  }

  async function saveRename(id) {
    const target = files.find((file) => file.id === id);
    if (!target) return;

    const updated = {
      ...target,
      name: renameValue.endsWith(".stl")
        ? renameValue
        : `${renameValue}.stl`,
    };

    const { url, ...stored } = updated;

    await saveStoredFile(stored);

    setFiles((current) =>
      current.map((file) => (file.id === id ? updated : file))
    );

    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <h1 className="text-4xl font-bold text-white">
              STL Storage Organizer
            </h1>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white"
          >
            Upload STL Files
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".stl"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </header>

        <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <Search className="h-4 w-4 text-zinc-500" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search STL files..."
                className="w-full bg-transparent outline-none"
              />
            </div>

            <div className="mb-4 flex gap-2">
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="New folder"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
              />

              <button
                onClick={addFolder}
                className="rounded-xl bg-zinc-800 px-3 py-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {renamingId === file.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="flex-1 rounded-lg border border-purple-500 bg-zinc-900 px-2 py-1"
                          />

                          <button onClick={() => saveRename(file.id)}>
                            <Check className="h-4 w-4 text-green-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedId(file.id)}
                          className="text-left"
                        >
                          <p className="truncate font-medium text-white">
                            {file.name}
                          </p>

                          <p className="text-xs text-zinc-500">
                            {file.folder} · {formatBytes(file.size)}
                          </p>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setRenamingId(file.id);
                        setRenameValue(file.name.replace(/\\.stl$/i, ""));
                      }}
                    >
                      <Pencil className="h-4 w-4 text-purple-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <Viewer selected={selected} />
        </main>
      </div>
    </div>
  );
}
