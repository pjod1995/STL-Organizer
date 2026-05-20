import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { Upload, Search, FolderPlus, Tag, Trash2, Box, Download, Eye, Plus, X, Archive, HardDrive, Database, Pencil, Check, Library, ListFilter } from "lucide-react";

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

async function deleteStoredFile(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    const store = transaction.objectStore(FILE_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function clearStoredFiles() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    const store = transaction.objectStore(FILE_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function getStoredFolders() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readonly");
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get("folders");
    request.onsuccess = () => resolve(request.result?.value || DEFAULT_FOLDERS);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function saveStoredFolders(folders) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.put({ key: "folders", value: folders });
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
        <a
          href={selected.url}
          download={selected.name}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
        >
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

export default function STLStorageOrganizerViewer() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("All");
  const [newFolder, setNewFolder] = useState("");
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [activeFolder, setActiveFolder] = useState("Unsorted");
  const [tagInput, setTagInput] = useState("");
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [storageMessage, setStorageMessage] = useState("Loading local library...");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderEditValue, setFolderEditValue] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [browserFolder, setBrowserFolder] = useState("All");
  const [newFolderParent, setNewFolderParent] = useState("Root");

  useEffect(() => {
    let mounted = true;

    async function loadLibrary() {
      try {
        const [storedFiles, storedFolders] = await Promise.all([getAllStoredFiles(), getStoredFolders()]);
        if (!mounted) return;

        const initialFolders = storedFolders && storedFolders.length > 0 ? storedFolders : DEFAULT_FOLDERS;
        await saveStoredFolders(initialFolders);
        setFolders(initialFolders);

        setFiles(storedFiles.map(createFileView).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
        setStorageMessage("IndexedDB storage active. Default folders are saved and files persist in this browser after refresh.");
      } catch (error) {
        console.error(error);
        setStorageMessage("IndexedDB could not be loaded in this browser.");
      } finally {
        if (mounted) setIsLoadingLibrary(false);
      }
    }

    loadLibrary();

    return () => {
      mounted = false;
      setFiles((current) => {
        current.forEach((file) => file.url && URL.revokeObjectURL(file.url));
        return current;
      });
    };
  }, []);

  const selected = files.find((f) => f.id === selectedId) || null;

  const libraryStats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const folderCount = new Set(files.map((file) => file.folder)).size;
    return { totalSize, folderCount, fileCount: files.length };
  }, [files]);

  const folderCounts = useMemo(() => {
    const counts = { All: files.length };
    folders.forEach((folder) => {
      counts[folder] = files.filter((file) => file.folder === folder || file.folder.startsWith(`${folder}/`)).length;
    });
    return counts;
  }, [files, folders]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeFilter = browserFolder !== "All" ? browserFolder : folderFilter;

    const result = files.filter((file) => {
      const matchesFolder = activeFilter === "All" || file.folder === activeFilter || file.folder.startsWith(`${activeFilter}/`);
      const matchesQuery = !q || file.name.toLowerCase().includes(q) || file.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesFolder && matchesQuery;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "nameAsc") return a.name.localeCompare(b.name);
      if (sortMode === "nameDesc") return b.name.localeCompare(a.name);
      if (sortMode === "sizeDesc") return b.size - a.size;
      if (sortMode === "sizeAsc") return a.size - b.size;
      if (sortMode === "oldest") return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });
  }, [files, folderFilter, browserFolder, query, sortMode]);

  async function handleUpload(event) {
    const incoming = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith(".stl"));
    const next = incoming.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      folder: activeFolder,
      tags: [],
      uploadedAt: new Date().toISOString(),
      blob: file,
    }));

    try {
      await Promise.all(next.map(saveStoredFile));
      const viewFiles = next.map(createFileView);
      setFiles((current) => [...viewFiles, ...current]);
      if (viewFiles[0]) setSelectedId(viewFiles[0].id);
      setStorageMessage(`${next.length} STL file${next.length === 1 ? "" : "s"} saved to IndexedDB.`);
    } catch (error) {
      console.error(error);
      setStorageMessage("Upload failed. Browser storage may be full or unavailable.");
    }

    event.target.value = "";
  }

  async function addFolder() {
    const folderName = newFolder.trim().replace(/^\/+|\/+$/g, "");
    if (!folderName) return;

    const folder = newFolderParent === "Root" ? folderName : `${newFolderParent}/${folderName}`;
    if (folders.includes(folder)) return;

    const nextFolders = [...folders, folder].sort((a, b) => a.localeCompare(b));
    setFolders(nextFolders);
    setActiveFolder(folder);
    setBrowserFolder(folder);
    setFolderFilter(folder);
    setNewFolder("");
    setNewFolderParent("Root");
    await saveStoredFolders(nextFolders);
    setStorageMessage(`Folder "${folder}" created.`);
  }

  function startEditingFolder(folder) {
    setEditingFolder(folder);
    setFolderEditValue(folder);
  }

  function cancelFolderEdit() {
    setEditingFolder(null);
    setFolderEditValue("");
  }

  async function saveFolderEdit(oldFolder) {
    const newName = folderEditValue.trim().replace(/^\/+|\/+$/g, "");
    if (!newName || folders.includes(newName)) return;

    const nextFolders = folders.map((folder) => {
      if (folder === oldFolder) return newName;
      if (folder.startsWith(`${oldFolder}/`)) return folder.replace(`${oldFolder}/`, `${newName}/`);
      return folder;
    });
    const updatedFiles = files.map((file) => {
      if (file.folder === oldFolder) return { ...file, folder: newName };
      if (file.folder.startsWith(`${oldFolder}/`)) return { ...file, folder: file.folder.replace(`${oldFolder}/`, `${newName}/`) };
      return file;
    });

    await saveStoredFolders(nextFolders);
    await Promise.all(updatedFiles.map((file) => {
      const { url, ...storedRecord } = file;
      return saveStoredFile(storedRecord);
    }));

    setFolders(nextFolders);
    setFiles(updatedFiles);
    if (activeFolder === oldFolder) setActiveFolder(newName);
    if (folderFilter === oldFolder) setFolderFilter(newName);
    if (browserFolder === oldFolder || browserFolder.startsWith(`${oldFolder}/`)) {
      setBrowserFolder(browserFolder.replace(oldFolder, newName));
    }
    setEditingFolder(null);
    setFolderEditValue("");
    setStorageMessage(`Folder renamed to "${newName}".`);
  }

  async function deleteAllFolders() {
    const confirmed = window.confirm("Delete ALL folders including defaults? All files will be moved to a recreated Unsorted folder.");
    if (!confirmed) return;

    const resetFolders = ["Unsorted"];
    const updatedFiles = files.map((file) => ({ ...file, folder: "Unsorted" }));

    await saveStoredFolders(resetFolders);

    await Promise.all(updatedFiles.map((file) => {
      const { url, ...storedRecord } = file;
      return saveStoredFile(storedRecord);
    }));

    setFolders(resetFolders);
    setFiles(updatedFiles);
    setActiveFolder("Unsorted");
    setFolderFilter("All");
    setBrowserFolder("All");
    setEditingFolder(null);
    setFolderEditValue("");
    setStorageMessage("All folders deleted. Files moved to Unsorted.");
  }

  async function deleteFolder(folderToDelete) {
    const confirmed = window.confirm(`Delete folder "${folderToDelete}"? Files in this folder will be moved to Unsorted.`);
    if (!confirmed) return;

    const nextFolders = folders.filter((folder) => folder !== folderToDelete && !folder.startsWith(`${folderToDelete}/`));
    const finalFolders = nextFolders.includes("Unsorted") ? nextFolders : [...nextFolders, "Unsorted"];
    const updatedFiles = files.map((file) => (file.folder === folderToDelete || file.folder.startsWith(`${folderToDelete}/`)) ? { ...file, folder: "Unsorted" } : file);

    await saveStoredFolders(finalFolders);
    await Promise.all(updatedFiles.map((file) => {
      const { url, ...storedRecord } = file;
      return saveStoredFile(storedRecord);
    }));

    setFolders(finalFolders);
    setFiles(updatedFiles);
    if (activeFolder === folderToDelete) setActiveFolder("Unsorted");
    if (folderFilter === folderToDelete) setFolderFilter("All");
    if (browserFolder === folderToDelete || browserFolder.startsWith(`${folderToDelete}/`)) setBrowserFolder("All");
    setEditingFolder(null);
    setFolderEditValue("");
    setStorageMessage(`Folder "${folderToDelete}" deleted. Files moved to Unsorted.`);
  }

  async function deleteFile(id) {
    const target = files.find((file) => file.id === id);
    if (target?.url) URL.revokeObjectURL(target.url);
    await deleteStoredFile(id);
    setFiles((current) => current.filter((file) => file.id !== id));
    if (selectedId === id) setSelectedId(null);
    setStorageMessage("File removed from IndexedDB.");
  }

  async function moveFile(id, folder) {
    const target = files.find((file) => file.id === id);
    if (!target) return;
    const updated = { ...target, folder };
    const { url, ...storedRecord } = updated;
    await saveStoredFile(storedRecord);
    setFiles((current) => current.map((file) => file.id === id ? updated : file));
  }

  function startRenaming(file) {
    setRenamingId(file.id);
    setRenameValue(file.name.replace(/\.stl$/i, ""));
  }

  async function saveRename(id) {
    const target = files.find((file) => file.id === id);
    if (!target) return;

    const cleanName = renameValue.trim();
    if (!cleanName) return;

    const finalName = cleanName.toLowerCase().endsWith(".stl") ? cleanName : `${cleanName}.stl`;
    const updated = { ...target, name: finalName };
    const { url, ...storedRecord } = updated;

    await saveStoredFile(storedRecord);
    setFiles((current) => current.map((file) => file.id === id ? updated : file));
    setRenamingId(null);
    setRenameValue("");
    setStorageMessage("File renamed and saved to IndexedDB.");
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function addTagToSelected() {
    const tag = tagInput.trim();
    if (!tag || !selected || selected.tags.includes(tag)) return;
    const updated = { ...selected, tags: [...selected.tags, tag] };
    const { url, ...storedRecord } = updated;
    await saveStoredFile(storedRecord);
    setFiles((current) => current.map((file) => file.id === selected.id ? updated : file));
    setTagInput("");
  }

  async function removeTag(fileId, tag) {
    const target = files.find((file) => file.id === fileId);
    if (!target) return;
    const updated = { ...target, tags: target.tags.filter((t) => t !== tag) };
    const { url, ...storedRecord } = updated;
    await saveStoredFile(storedRecord);
    setFiles((current) => current.map((file) => file.id === fileId ? updated : file));
  }

  async function clearLibrary() {
    const confirmed = window.confirm("This will permanently remove all STL files from this browser's IndexedDB storage. Continue?");
    if (!confirmed) return;
    await clearStoredFiles();
    files.forEach((file) => file.url && URL.revokeObjectURL(file.url));
    setFiles([]);
    setSelectedId(null);
    setStorageMessage("Local IndexedDB library cleared.");
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white shadow-lg shadow-purple-950/40 hover:bg-purple-500"
          >
            <Upload className="h-5 w-5" /> Upload STL Files
          </button>
          <input ref={fileInputRef} type="file" accept=".stl" multiple onChange={handleUpload} className="hidden" />
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Files Stored</span></div>
            <p className="mt-2 text-2xl font-bold text-white">{libraryStats.fileCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3"><FolderPlus className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Active Folders</span></div>
            <p className="mt-2 text-2xl font-bold text-white">{libraryStats.folderCount || 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3"><Box className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Library Size</span></div>
            <p className="mt-2 text-2xl font-bold text-white">{formatBytes(libraryStats.totalSize)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3"><Database className="h-5 w-5 text-purple-300" /><span className="text-sm text-zinc-400">Storage Mode</span></div>
            <p className="mt-2 text-sm font-semibold text-white">IndexedDB</p>
          </div>
        </section>

        <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
            <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xs text-purple-100">
              {isLoadingLibrary ? "Loading saved STL files..." : storageMessage}
            </div>

            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Library className="h-4 w-4 text-purple-300" />
                <h3 className="text-sm font-semibold text-white">Library Browser</h3>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or tag..."
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="nameAsc">Name A-Z</option>
                  <option value="nameDesc">Name Z-A</option>
                  <option value="sizeDesc">Largest First</option>
                  <option value="sizeAsc">Smallest First</option>
                </select>

                <button
                  onClick={() => {
                    setBrowserFolder("All");
                    setFolderFilter("All");
                    setQuery("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <ListFilter className="h-4 w-4" /> Reset
                </button>
              </div>

              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1">
                {["All", ...folders].map((folder) => (
                  <button
                    key={folder}
                    onClick={() => {
                      setBrowserFolder(folder);
                      setFolderFilter(folder);
                    }}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${browserFolder === folder ? "border-purple-500 bg-purple-500/10 text-purple-100" : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"}`}
                  >
                    <span className="truncate">{folder}</span>
                    <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{folderCounts[folder] || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <select value={activeFolder} onChange={(e) => setActiveFolder(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                {folders.map((folder) => <option key={folder}>{folder}</option>)}
              </select>
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <option>All</option>
                {folders.map((folder) => <option key={folder}>{folder}</option>)}
              </select>
            </div>

            <div className="mb-4 grid gap-2">
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="Root">Root Folder</option>
                {folders.map((folder) => <option key={folder} value={folder}>Inside {folder}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFolder()}
                  placeholder="New folder or subfolder"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
                />
                <button onClick={addFolder} className="rounded-xl bg-zinc-800 px-3 py-2 hover:bg-zinc-700"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Manage Folders</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">edit / delete</span>
                  <button
                    onClick={deleteAllFolders}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    Delete All
                  </button>
                </div>
              </div>
              <div className="max-h-44 space-y-2 overflow-auto pr-1">
                {folders.map((folder) => (
                  <div key={folder} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-2 py-2">
                    {editingFolder === folder ? (
                      <>
                        <input
                          value={folderEditValue}
                          onChange={(e) => setFolderEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveFolderEdit(folder);
                            if (e.key === "Escape") cancelFolderEdit();
                          }}
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-purple-500/40 bg-zinc-950 px-2 py-1 text-xs text-white outline-none"
                        />
                        <button onClick={() => saveFolderEdit(folder)} className="rounded-lg p-1 text-green-300 hover:bg-green-500/10"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={cancelFolderEdit} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800"><X className="h-3.5 w-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{folder}</span>
                        <button onClick={() => startEditingFolder(folder)} className="rounded-lg p-1 text-zinc-500 hover:bg-purple-500/10 hover:text-purple-300"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteFolder(folder)} className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Library</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{filteredFiles.length} shown</span>
                {files.length > 0 && (
                  <button onClick={clearLibrary} className="text-xs text-red-300 hover:text-red-200">Clear All</button>
                )}
              </div>
            </div>

            <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
              {filteredFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">No STL files found.</div>
              ) : filteredFiles.map((file) => (
                <div key={file.id} className={`rounded-2xl border p-3 transition ${selectedId === file.id ? "border-purple-500 bg-purple-500/10" : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {renamingId === file.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(file.id);
                              if (e.key === "Escape") cancelRename();
                            }}
                            autoFocus
                            className="min-w-0 flex-1 rounded-lg border border-purple-500/40 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none"
                          />
                          <button onClick={() => saveRename(file.id)} className="rounded-lg p-1.5 text-green-300 hover:bg-green-500/10"><Check className="h-4 w-4" /></button>
                          <button onClick={cancelRename} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setSelectedId(file.id)} className="min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 shrink-0 text-purple-300" />
                            <p className="truncate font-medium text-white">{file.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{file.folder} · {formatBytes(file.size)}</p>
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => startRenaming(file)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-purple-500/10 hover:text-purple-300"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteFile(file.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <select value={file.folder} onChange={(e) => moveFile(file.id, e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300">
                      {folders.map((folder) => <option key={folder}>{folder}</option>)}
                    </select>
                  </div>

                  {file.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {file.tags.map((tag) => (
                        <button key={tag} onClick={() => removeTag(file.id, tag)} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
                          {tag}<X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <Viewer selected={selected} />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-300" />
                <h3 className="font-semibold text-white">Tags for Selected File</h3>
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTagToSelected()}
                  disabled={!selected}
                  placeholder={selected ? "Add tags like 28mm, terrain, infantry..." : "Select a file first"}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                />
                <button disabled={!selected} onClick={addTagToSelected} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500">Add Tag</button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">IndexedDB keeps files on this device and browser. Files persist after refresh, but they do not sync across devices and are not uploaded to Vercel, GitHub, or any server.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
