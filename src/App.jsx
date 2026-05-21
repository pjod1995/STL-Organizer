import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { createClient } from "@supabase/supabase-js";
import {
  Archive,
  Box,
  Check,
  Cloud,
  Download,
  Eye,
  FolderPlus,
  HardDrive,
  Library,
  ListFilter,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_BUCKET = "stl-files";
const DEFAULT_FOLDERS = ["Miniatures", "Terrain", "Bases", "Bits", "Unsorted"];

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

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
  if (!selected?.previewUrl) {
    return (
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 p-8 text-center">
        <div>
          <Box className="mx-auto mb-4 h-14 w-14 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">No STL selected</h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Select an STL from the Supabase library to download and preview it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="font-semibold text-white">{selected.name}</h2>
          <p className="text-xs text-zinc-500">
            {selected.folder} · {formatBytes(selected.size)}
          </p>
        </div>

        <a
          href={selected.previewUrl}
          download={selected.name}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <div className="h-[520px] w-full">
        <Canvas camera={{ position: [85, 65, 85], fov: 45 }} shadows>
          <ambientLight intensity={0.45} />
          <directionalLight position={[8, 12, 8]} intensity={1.1} castShadow />
          <directionalLight position={[-8, 4, -8]} intensity={0.45} />

          <React.Suspense
            fallback={
              <Html center>
                <div className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">
                  Loading STL...
                </div>
              </Html>
            }
          >
            <STLModel url={selected.previewUrl} />
          </React.Suspense>

          <Grid
            infiniteGrid
            sectionColor="#7c3aed"
            cellColor="#3f3f46"
            fadeDistance={420}
            fadeStrength={2}
          />

          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Canvas>
      </div>
    </div>
  );
}

export default function App() {
  const fileInputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signIn");
  const [authMessage, setAuthMessage] = useState("");

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState(null);

  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("All");
  const [browserFolder, setBrowserFolder] = useState("All");
  const [activeFolder, setActiveFolder] = useState("Unsorted");
  const [newFolder, setNewFolder] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("Root");

  const [tagInput, setTagInput] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [editingFolder, setEditingFolder] = useState(null);
  const [folderEditValue, setFolderEditValue] = useState("");

  const [status, setStatus] = useState(
    supabase
      ? "Sign in to load the Supabase STL library."
      : "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
  const [isLoading, setIsLoading] = useState(false);

  const user = session?.user || null;

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;

    loadEverything();

    const filesChannel = supabase
      .channel("stl-files-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stl_files" },
        () => loadEverything()
      )
      .subscribe();

    const foldersChannel = supabase
      .channel("folders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "folders" },
        () => loadEverything()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(foldersChannel);
    };
  }, [session]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  async function signInWithPassword() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim() || !password) {
      setAuthMessage("Enter both email and password.");
      return;
    }

    setIsLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthMessage(error.message);
      setStatus(`Sign in failed: ${error.message}`);
    } else {
      setSession(data.session);
      setStatus("Signed in.");
      await loadEverything();
    }

    setIsLoading(false);
  }

  async function signUpWithPassword() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim() || !password) {
      setAuthMessage("Enter both email and password.");
      return;
    }

    setIsLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthMessage(error.message);
      setStatus(`Sign up failed: ${error.message}`);
    } else if (data.session) {
      setSession(data.session);
      setStatus("Account created and signed in.");
      await loadEverything();
    } else {
      setAuthMessage("Account created. Check your email if confirmation is enabled.");
      setStatus("Account created. Confirm your email if required, then sign in.");
    }

    setIsLoading(false);
  }

  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    setFiles([]);
    setSelectedId(null);

    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);

    setSelectedPreviewUrl(null);
    setStatus("Signed out.");
  }

  async function loadEverything() {
    await Promise.all([loadCloudLibrary(), loadFolders()]);
  }

  async function loadCloudLibrary() {
    if (!supabase) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("stl_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Could not load STL files: ${error.message}`);
    } else {
      setFiles(data || []);
      setStatus("Supabase STL library loaded.");
    }

    setIsLoading(false);
  }

  async function loadFolders() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("folders")
      .select("folder,parent_folder")
      .order("folder", { ascending: true });

    if (error) {
      setStatus(`Could not load folders: ${error.message}`);
      setFolders(DEFAULT_FOLDERS);
      return;
    }

    const folderSet = new Set(DEFAULT_FOLDERS);

    (data || []).forEach((row) => {
      if (!row.folder) return;
      if (row.parent_folder) {
        folderSet.add(`${row.parent_folder}/${row.folder}`);
      } else {
        folderSet.add(row.folder);
      }
    });

    files.forEach((file) => {
      if (!file.folder) return;
      const parts = file.folder.split("/");
      let current = "";
      parts.forEach((part) => {
        current = current ? `${current}/${part}` : part;
        folderSet.add(current);
      });
    });

    setFolders(Array.from(folderSet).sort((a, b) => a.localeCompare(b)));
  }

  const selected = useMemo(() => {
    const file = files.find((item) => item.id === selectedId);
    return file ? { ...file, previewUrl: selectedPreviewUrl } : null;
  }, [files, selectedId, selectedPreviewUrl]);

  const libraryStats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const folderCount = new Set(files.map((file) => file.folder || "Unsorted")).size;
    return { totalSize, folderCount, fileCount: files.length };
  }, [files]);

  const folderCounts = useMemo(() => {
    const counts = { All: files.length };

    folders.forEach((folder) => {
      counts[folder] = files.filter(
        (file) => file.folder === folder || file.folder?.startsWith(`${folder}/`)
      ).length;
    });

    return counts;
  }, [files, folders]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeFilter = browserFolder !== "All" ? browserFolder : folderFilter;

    const result = files.filter((file) => {
      const tags = Array.isArray(file.tags) ? file.tags : [];

      const matchesFolder =
        activeFilter === "All" ||
        file.folder === activeFilter ||
        file.folder?.startsWith(`${activeFilter}/`);

      const matchesQuery =
        !q ||
        file.name.toLowerCase().includes(q) ||
        tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (file.uploader_email || "").toLowerCase().includes(q);

      return matchesFolder && matchesQuery;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "nameAsc") return a.name.localeCompare(b.name);
      if (sortMode === "nameDesc") return b.name.localeCompare(a.name);
      if (sortMode === "sizeDesc") return Number(b.size || 0) - Number(a.size || 0);
      if (sortMode === "sizeAsc") return Number(a.size || 0) - Number(b.size || 0);
      if (sortMode === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [files, folders, folderFilter, browserFolder, query, sortMode]);

  async function handleUpload(event) {
    if (!supabase || !user) {
      setStatus("Sign in first to upload to the Supabase library.");
      return;
    }

    const incoming = Array.from(event.target.files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".stl")
    );

    if (incoming.length === 0) return;

    setIsLoading(true);

    for (const file of incoming) {
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\- ()]/g, "_");
      const storagePath = `${user.id}/${id}-${safeName}`;

      const uploadResult = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "model/stl",
        });

      if (uploadResult.error) {
        setStatus(`Upload failed for ${file.name}: ${uploadResult.error.message}`);
        continue;
      }

      const insertResult = await supabase.from("stl_files").insert({
        id,
        name: file.name,
        folder: activeFolder || "Unsorted",
        tags: [],
        size: file.size,
        storage_path: storagePath,
        owner_id: user.id,
        uploader_email: user.email,
      });

      if (insertResult.error) {
        setStatus(`Metadata save failed for ${file.name}: ${insertResult.error.message}`);
      } else {
        setStatus(`${file.name} uploaded to Supabase.`);
      }
    }

    event.target.value = "";
    await loadEverything();
    setIsLoading(false);
  }

  async function previewFile(file) {
    if (!supabase) return;

    setSelectedId(file.id);
    setStatus(`Downloading preview for ${file.name}...`);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(file.storage_path);

    if (error) {
      setStatus(`Preview download failed: ${error.message}`);
      return;
    }

    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);

    const objectUrl = URL.createObjectURL(data);
    setSelectedPreviewUrl(objectUrl);
    setStatus(`Preview loaded: ${file.name}`);
  }

  async function deleteFile(file) {
    if (!supabase || !user) return;

    const confirmed = window.confirm(`Delete "${file.name}" from Supabase?`);
    if (!confirmed) return;

    const storageResult = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([file.storage_path]);

    if (storageResult.error) {
      setStatus(`Storage delete failed: ${storageResult.error.message}`);
      return;
    }

    const dbResult = await supabase.from("stl_files").delete().eq("id", file.id);

    if (dbResult.error) {
      setStatus(`Database delete failed: ${dbResult.error.message}`);
      return;
    }

    if (selectedId === file.id) {
      setSelectedId(null);
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedPreviewUrl(null);
    }

    setStatus(`Deleted ${file.name}.`);
    await loadEverything();
  }

  async function updateFileRecord(id, updates, successMessage) {
    if (!supabase) return false;

    const { error } = await supabase
      .from("stl_files")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setStatus(error.message);
      return false;
    }

    setStatus(successMessage);
    await loadEverything();
    return true;
  }

  async function moveFile(id, folder) {
    await updateFileRecord(id, { folder }, "File moved.");
  }

  function startRenaming(file) {
    setRenamingId(file.id);
    setRenameValue(file.name.replace(/\.stl$/i, ""));
  }

  async function saveRename(id) {
    const cleanName = renameValue.trim();
    if (!cleanName) return;

    const finalName = cleanName.toLowerCase().endsWith(".stl")
      ? cleanName
      : `${cleanName}.stl`;

    const ok = await updateFileRecord(id, { name: finalName }, "File renamed.");

    if (ok) {
      setRenamingId(null);
      setRenameValue("");
    }
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function addTagToSelected() {
    if (!selected) return;

    const tag = tagInput.trim();
    if (!tag) return;

    const tags = Array.isArray(selected.tags) ? selected.tags : [];
    if (tags.includes(tag)) return;

    const ok = await updateFileRecord(
      selected.id,
      { tags: [...tags, tag] },
      "Tag added."
    );

    if (ok) setTagInput("");
  }

  async function removeTag(file, tag) {
    const tags = Array.isArray(file.tags) ? file.tags : [];

    await updateFileRecord(
      file.id,
      { tags: tags.filter((item) => item !== tag) },
      "Tag removed."
    );
  }

  async function addFolder() {
    if (!supabase || !user) return;

    const folderName = newFolder.trim().replace(/^\/+|\/+$/g, "");
    if (!folderName) return;

    const parentFolder = newFolderParent === "Root" ? null : newFolderParent;
    const folderPath = parentFolder ? `${parentFolder}/${folderName}` : folderName;

    const { error } = await supabase.from("folders").insert({
      folder: folderName,
      parent_folder: parentFolder,
    });

    if (error && !error.message.includes("duplicate")) {
      setStatus(`Folder save failed: ${error.message}`);
      return;
    }

    setActiveFolder(folderPath);
    setBrowserFolder(folderPath);
    setFolderFilter(folderPath);
    setNewFolder("");
    setNewFolderParent("Root");
    setStatus(`Folder "${folderPath}" created in Supabase.`);
    await loadEverything();
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
    if (!supabase || !user) return;

    const newName = folderEditValue.trim().replace(/^\/+|\/+$/g, "");
    if (!newName || newName === oldFolder) return;

    const matchingFiles = files.filter(
      (file) => file.folder === oldFolder || file.folder?.startsWith(`${oldFolder}/`)
    );

    for (const file of matchingFiles) {
      const updatedFolder =
        file.folder === oldFolder
          ? newName
          : file.folder.replace(`${oldFolder}/`, `${newName}/`);

      await updateFileRecord(file.id, { folder: updatedFolder }, "Folder updated.");
    }

    const oldParts = oldFolder.split("/");
    const oldFolderName = oldParts[oldParts.length - 1];
    const oldParent = oldParts.length > 1 ? oldParts.slice(0, -1).join("/") : null;

    await supabase
      .from("folders")
      .update({ folder: newName, parent_folder: null })
      .eq("folder", oldFolderName)
      .eq("parent_folder", oldParent);

    if (activeFolder === oldFolder) setActiveFolder(newName);
    if (folderFilter === oldFolder) setFolderFilter(newName);
    if (browserFolder === oldFolder) setBrowserFolder(newName);

    setEditingFolder(null);
    setFolderEditValue("");
    setStatus(`Folder "${oldFolder}" renamed to "${newName}".`);
    await loadEverything();
  }

  async function deleteFolder(folderToDelete) {
    if (!supabase || !user) return;

    const confirmed = window.confirm(
      `Delete folder "${folderToDelete}"? Files in this folder and its subfolders will be moved to Unsorted.`
    );
    if (!confirmed) return;

    const matchingFiles = files.filter(
      (file) => file.folder === folderToDelete || file.folder?.startsWith(`${folderToDelete}/`)
    );

    for (const file of matchingFiles) {
      await updateFileRecord(file.id, { folder: "Unsorted" }, "Folder updated.");
    }

    const parts = folderToDelete.split("/");
    const folderName = parts[parts.length - 1];
    const parentFolder = parts.length > 1 ? parts.slice(0, -1).join("/") : null;

    await supabase
      .from("folders")
      .delete()
      .eq("folder", folderName)
      .eq("parent_folder", parentFolder);

    if (activeFolder === folderToDelete) setActiveFolder("Unsorted");
    if (folderFilter === folderToDelete) setFolderFilter("All");
    if (browserFolder === folderToDelete) setBrowserFolder("All");

    setStatus(`Folder "${folderToDelete}" deleted. Files moved to Unsorted.`);
    await loadEverything();
  }

  async function deleteAllFolders() {
    if (!supabase || !user) return;

    const confirmed = window.confirm(
      "Delete all folders? All files will be moved to Unsorted."
    );
    if (!confirmed) return;

    for (const file of files) {
      if (file.folder !== "Unsorted") {
        await updateFileRecord(file.id, { folder: "Unsorted" }, "Folder updated.");
      }
    }

    await supabase.from("folders").delete().neq("folder", "Unsorted");

    setActiveFolder("Unsorted");
    setFolderFilter("All");
    setBrowserFolder("All");
    setStatus("All folders removed. Files moved to Unsorted.");
    await loadEverything();
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 grid gap-4 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
              <Archive className="h-3.5 w-3.5" />
              Supabase STL Library
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              STL Storage, Organizer, and Viewer
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Supabase-only STL uploads, downloads, persistent folders, subfolders,
              tags, search, sorting, and 3D previews.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            {!supabase ? (
              <p className="max-w-sm text-xs text-red-300">
                Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </p>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                />

                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Password"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={authMode === "signIn" ? signInWithPassword : signUpWithPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500"
                  >
                    <LogIn className="h-4 w-4" />
                    {authMode === "signIn" ? "Sign In" : "Create Account"}
                  </button>

                  <button
                    onClick={() => {
                      setAuthMode(authMode === "signIn" ? "signUp" : "signIn");
                      setAuthMessage("");
                    }}
                    className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
                  >
                    {authMode === "signIn" ? "Need an account?" : "Have an account?"}
                  </button>
                </div>

                {authMessage && <p className="text-xs text-purple-200">{authMessage}</p>}
              </div>
            )}
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-purple-300" />
              <span className="text-sm text-zinc-400">Files Stored</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{libraryStats.fileCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3">
              <FolderPlus className="h-5 w-5 text-purple-300" />
              <span className="text-sm text-zinc-400">Active Folders</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{libraryStats.folderCount || 0}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-purple-300" />
              <span className="text-sm text-zinc-400">Library Size</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{formatBytes(libraryStats.totalSize)}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-purple-300" />
              <span className="text-sm text-zinc-400">Storage Mode</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-white">Supabase Only</p>
          </div>
        </section>

        <main className="grid gap-6 lg:grid-cols-[440px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
            <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xs text-purple-100">
              {isLoading ? "Loading..." : status}
            </div>

            <button
              disabled={!user}
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500"
            >
              <Upload className="h-5 w-5" />
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

            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Library className="h-4 w-4 text-purple-300" />
                <h3 className="text-sm font-semibold text-white">Library Browser</h3>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, tag, or uploader..."
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
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
                  <ListFilter className="h-4 w-4" />
                  Reset
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
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      browserFolder === folder
                        ? "border-purple-500 bg-purple-500/10 text-purple-100"
                        : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span className="truncate">{folder}</span>
                    <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      {folderCounts[folder] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <select
                value={activeFolder}
                onChange={(event) => setActiveFolder(event.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              >
                {folders.map((folder) => (
                  <option key={folder}>{folder}</option>
                ))}
              </select>

              <select
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              >
                <option>All</option>
                {folders.map((folder) => (
                  <option key={folder}>{folder}</option>
                ))}
              </select>
            </div>

            <div className="mb-4 grid gap-2">
              <select
                value={newFolderParent}
                onChange={(event) => setNewFolderParent(event.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="Root">Root Folder</option>
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    Inside {folder}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <input
                  value={newFolder}
                  onChange={(event) => setNewFolder(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addFolder()}
                  placeholder="New folder or subfolder"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
                />

                <button
                  disabled={!user}
                  onClick={addFolder}
                  className="rounded-xl bg-zinc-800 px-3 py-2 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Manage Folders</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">edit / delete</span>
                  <button
                    disabled={!user}
                    onClick={deleteAllFolders}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/20"
                  >
                    Delete All
                  </button>
                </div>
              </div>

              <div className="max-h-44 space-y-2 overflow-auto pr-1">
                {folders.map((folder) => (
                  <div
                    key={folder}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-2 py-2"
                  >
                    {editingFolder === folder ? (
                      <>
                        <input
                          value={folderEditValue}
                          onChange={(event) => setFolderEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveFolderEdit(folder);
                            if (event.key === "Escape") cancelFolderEdit();
                          }}
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-purple-500/40 bg-zinc-950 px-2 py-1 text-xs text-white outline-none"
                        />

                        <button
                          disabled={!user}
                          onClick={() => saveFolderEdit(folder)}
                          className="rounded-lg p-1 text-green-300 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={cancelFolderEdit}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">
                          {folder}
                        </span>

                        <button
                          disabled={!user}
                          onClick={() => startEditingFolder(folder)}
                          className="rounded-lg p-1 text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500/10 hover:text-purple-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          disabled={!user}
                          onClick={() => deleteFolder(folder)}
                          className="rounded-lg p-1 text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Supabase Library</h2>
              <span className="text-xs text-zinc-500">{filteredFiles.length} shown</span>
            </div>

            <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
              {filteredFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">
                  No STL files found.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const tags = Array.isArray(file.tags) ? file.tags : [];

                  return (
                    <div
                      key={file.id}
                      className={`rounded-2xl border p-3 transition ${
                        selectedId === file.id
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {renamingId === file.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={renameValue}
                                onChange={(event) => setRenameValue(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") saveRename(file.id);
                                  if (event.key === "Escape") cancelRename();
                                }}
                                autoFocus
                                className="min-w-0 flex-1 rounded-lg border border-purple-500/40 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none"
                              />

                              <button
                                disabled={!user}
                                onClick={() => saveRename(file.id)}
                                className="rounded-lg p-1.5 text-green-300 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Check className="h-4 w-4" />
                              </button>

                              <button
                                onClick={cancelRename}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => previewFile(file)}
                              className="min-w-0 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 shrink-0 text-purple-300" />
                                <p className="truncate font-medium text-white">{file.name}</p>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {file.folder} · {formatBytes(file.size)}
                              </p>
                              <p className="mt-1 truncate text-[10px] text-zinc-600">
                                Uploaded by {file.uploader_email || "unknown"}
                              </p>
                            </button>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            disabled={!user}
                            onClick={() => startRenaming(file)}
                            className="rounded-lg p-1.5 text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500/10 hover:text-purple-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            disabled={!user}
                            onClick={() => deleteFile(file)}
                            className="rounded-lg p-1.5 text-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={file.folder}
                          disabled={!user}
                          onChange={(event) => moveFile(file.id, event.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
                        >
                          {folders.map((folder) => (
                            <option key={folder}>{folder}</option>
                          ))}
                        </select>
                      </div>

                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <button
                              key={tag}
                              disabled={!user}
                              onClick={() => removeTag(file, tag)}
                              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-50 hover:bg-zinc-700"
                            >
                              {tag}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addTagToSelected()}
                  disabled={!selected || !user}
                  placeholder={
                    selected
                      ? "Add tags like 28mm, terrain, infantry..."
                      : "Select a file first"
                  }
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                />

                <button
                  disabled={!selected || !user}
                  onClick={addTagToSelected}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-purple-500"
                >
                  Add Tag
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Supabase-only mode. The app reads files from stl_files, folders from folders,
                and STL objects from the stl-files Storage bucket.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
