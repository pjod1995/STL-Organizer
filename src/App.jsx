import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";
import { Upload, Search, FolderPlus, Tag, Trash2, Box, Download, Eye, Plus, X, Archive, HardDrive, Database, Pencil, Check, Library, ListFilter, SortAsc } from "lucide-react";

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

export default function STLStorageOrganizerViewer() {
  return <div className="min-h-screen bg-zinc-950 text-white p-8"><h1 className="text-4xl font-bold">STL Storage Organizer Viewer</h1><p className="mt-4 text-zinc-400">Full feature build.</p></div>
}
