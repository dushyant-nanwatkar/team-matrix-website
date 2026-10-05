"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import type { WorkItem } from "@/data/works";
import type { Member, Department } from "@/data/members";
import type { SponsorEntry } from "@/app/api/sponsors/route";
import type { ProjectItem, ProjectStat } from "@/data/projects";
import ModelViewer from "@/components/ModelViewer";
import { getAssetUrl } from "@/lib/asset-url";

type AuthState = "checking" | "login" | "dashboard";
type Tab = "projects" | "achievements" | "gallery" | "sponsors" | "members";

const DEPARTMENTS: Department[] = ["Leadership", "Mechanical", "Electronics", "Algorithms", "Management"];

export default function AdminPanel() {
  const [auth, setAuth] = useState<AuthState>("checking");

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data: { authenticated: boolean }) => setAuth(data.authenticated ? "dashboard" : "login"))
      .catch(() => setAuth("login"));
  }, []);

  if (auth === "checking") {
    return <Centered>Checking session…</Centered>;
  }
  if (auth === "login") {
    return <LoginForm onSuccess={() => setAuth("dashboard")} />;
  }
  return <Dashboard onLoggedOut={() => setAuth("login")} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-black text-slate-400 flex items-center justify-center font-sans text-sm">
      {children}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-[#0d0d14]/90 border border-white/10 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Admin</h1>
        <p className="text-xs text-slate-400 mb-6">Team Matrix content panel</p>

        <label className="block text-xs font-medium text-slate-300 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm outline-none focus:border-red-500/50 mb-4"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {submitting ? "Checking…" : "Log In"}
        </button>
      </form>
    </div>
  );
}

function BlobSyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSync = async () => {
    if (status === "syncing") return;
    if (!confirm("Transfer all local images, 3D models (.glb), and JSON data to Vercel Blob?")) return;

    setStatus("syncing");
    setMsg("");
    try {
      const parse = async (r: Response) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return {
            error:
              r.status === 504
                ? "Migration timed out on the server. Try again — already-uploaded files are overwritten safely."
                : `Server returned ${r.status} ${r.statusText || ""}`.trim(),
          };
        }
      };

      let res = await fetch("/api/admin/migrate", { method: "POST" });
      let data = await parse(res);

      if (!res.ok && data.code === "BLOB_NOT_CONFIGURED") {
        const inputToken = window.prompt(
          "BLOB_READ_WRITE_TOKEN is not configured for this environment.\n\n" +
          "Paste your token from Vercel Dashboard (Storage → Blob → .env.local tab):\n" +
          "(starts with vercel_blob_rw_...)"
        );

        if (!inputToken || !inputToken.trim()) {
          setStatus("idle");
          setMsg("");
          return;
        }

        setStatus("syncing");
        setMsg("Uploading with provided token...");
        res = await fetch("/api/admin/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inputToken.trim() }),
        });
        data = await parse(res);
      }

      if (!res.ok) throw new Error(data.error || "Sync failed");
      setStatus("done");
      setMsg(`Synced ${data.stats?.uploadedFiles ?? 0} files & ${data.stats?.uploadedJsons ?? 0} datasets!`);
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("error");
      setMsg((err as Error).message);
      setTimeout(() => setStatus("idle"), 6000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className={`text-xs ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>
          {msg}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-950/40 disabled:opacity-50 transition-colors flex items-center gap-1.5"
      >
        <span>☁️</span>
        <span>{status === "syncing" ? "Syncing..." : "Transfer to Blob"}</span>
      </button>
    </div>
  );
}

function Dashboard({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [tab, setTab] = useState<Tab>("projects");

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLoggedOut();
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/90 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight text-white">Team Matrix — Admin</h1>
        <div className="flex items-center gap-3">
          <BlobSyncButton />
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-full text-xs font-medium border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <nav className="flex gap-2 px-6 py-4 border-b border-white/5 overflow-x-auto">
        {(["projects", "achievements", "gallery", "sponsors", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-red-600/90 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {tab === "projects" && <ProjectsTab />}
        {tab === "achievements" && <AchievementsTab />}
        {tab === "gallery" && <GalleryTab />}
        {tab === "sponsors" && <SponsorsTab />}
        {tab === "members" && <MembersTab />}
      </main>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#0d0d14]/80 border border-white/10 p-5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-300 mb-1.5">{children}</label>;
}

const inputClass =
  "w-full px-3.5 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm outline-none focus:border-red-500/50";

function DeleteButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-500/30 text-red-300 hover:bg-red-950/50 disabled:opacity-40 transition-colors"
    >
      {busy ? "…" : "Remove"}
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/15 text-slate-300 hover:bg-white/10 transition-colors"
    >
      Edit
    </button>
  );
}

// ── Achievements tab ─────────────────────────────────────────────────────

interface AchievementAdminItem {
  id: string;
  file: string;
  caption: string;
  note?: string;
  image: string;
}

function AchievementsTab() {
  const [items, setItems] = useState<AchievementAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Add form state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFilePreview, setEditFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = () => {
    fetch("/api/admin/achievements")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.achievements)) {
          setItems(data.achievements);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Update file preview when file changes
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!editFile) {
      setEditFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(editFile);
    setEditFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editFile]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !caption.trim()) return;
    setAdding(true);
    setError("");
    const form = new FormData();
    form.append("image", file);
    form.append("caption", caption.trim());
    if (note.trim()) form.append("note", note.trim());

    try {
      const res = await fetch("/api/admin/achievements", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      setAdding(false);
      if (!res.ok) {
        setError(data.error || "Failed to add achievement");
        return;
      }
      setFile(null);
      setCaption("");
      setNote("");
      load();
    } catch {
      setAdding(false);
      setError("Network error while adding achievement");
    }
  };

  const handleRemove = async (id: string, captionText: string) => {
    const preview = captionText.length > 40 ? captionText.slice(0, 40) + "…" : captionText;
    if (!confirm(`Are you sure you want to remove this achievement?\n"${preview}"`)) return;
    setRemovingId(id);
    try {
      await fetch(`/api/admin/achievements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch {
      alert("Failed to remove achievement");
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (item: AchievementAdminItem) => {
    setEditingId(item.id);
    setEditCaption(item.caption);
    setEditNote(item.note ?? "");
    setEditFile(null);
    setEditFilePreview(null);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFile(null);
    setEditFilePreview(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || !editCaption.trim()) return;
    setSaving(true);
    setEditError("");
    const form = new FormData();
    form.append("id", editingId);
    form.append("caption", editCaption.trim());
    form.append("note", editNote.trim());
    if (editFile) form.append("image", editFile);

    try {
      const res = await fetch("/api/admin/achievements", { method: "PATCH", body: form });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setEditError(data.error || "Failed to save changes");
        return;
      }
      setEditingId(null);
      setEditFile(null);
      setEditFilePreview(null);
      load();
    } catch {
      setSaving(false);
      setEditError("Network error while saving changes");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);

    try {
      await fetch("/api/admin/achievements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newItems.map((i) => i.id) }),
      });
    } catch {
      load();
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.caption.toLowerCase().includes(q) ||
      (item.note && item.note.toLowerCase().includes(q)) ||
      item.file.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-[#0d0d14]/80 to-[#0d0d14]/80 border border-red-500/20">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Achievements Showcase</span>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-200">
              {items.length} cards
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage the photo slides and captions featured in the 3D Depth Carousel on the homepage. Edit text, replace images, adjust carousel sequence, or add new achievements.
          </p>
        </div>
      </div>

      {/* Add Achievement Form */}
      <SectionCard>
        <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
          <span>Add New Achievement</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">Upload a photo and provide the headline caption.</p>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Photo (WEBP / PNG / JPEG)</FieldLabel>
              <input
                type="file"
                accept="image/webp,image/png,image/jpeg,image/avif"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-600/80 file:text-white hover:file:bg-red-500 cursor-pointer"
              />
              {filePreview && (
                <div className="mt-3 relative aspect-video w-44 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Upload preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded">
                    Selected
                  </span>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Internal / Deck Note (Optional)</FieldLabel>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
                placeholder="e.g. Verified with prize cheque; AIR 1 Sumo Robo"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">For documentation or verification notes.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Caption (Displayed in bold beneath the carousel)</FieldLabel>
              <span className="text-[11px] text-slate-500 font-mono">{caption.length} chars</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="e.g. AIR 1, Autonomous Sumo Robo — 1st & 2nd Position, Robotex."
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs bg-red-950/40 border border-red-500/30 p-2.5 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={!file || !caption.trim() || adding}
            className="px-6 py-2.5 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-red-900/20"
          >
            {adding ? "Uploading photo…" : "Add Achievement"}
          </button>
        </form>
      </SectionCard>

      {/* Current Achievements List */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-semibold text-white">Current Carousel Slides ({items.length})</h3>
            <p className="text-xs text-slate-400">Order from top to bottom matches carousel cycle sequence</p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by caption, file or note…"
              className="w-full px-3.5 py-1.5 text-xs rounded-full bg-black/60 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm py-8 text-center">Loading achievements…</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">
            {search ? "No achievements match your filter." : "No achievements found."}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const actualIndex = items.findIndex((i) => i.id === item.id);
              const isFirst = actualIndex === 0;
              const isLast = actualIndex === items.length - 1;

              if (editingId === item.id) {
                return (
                  <form
                    key={item.id}
                    onSubmit={handleSaveEdit}
                    className="rounded-2xl bg-black/70 border border-red-500/50 p-5 space-y-4 shadow-xl shadow-red-950/20"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-200 text-xs font-mono font-bold">
                          Editing #{actualIndex + 1}
                        </span>
                        <span className="text-xs text-slate-400 font-mono truncate max-w-xs">{item.file}</span>
                      </div>
                      <span className="text-xs text-slate-500">ID: {item.id}</span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                      {/* Image Preview & Replacement */}
                      <div className="space-y-2">
                        <FieldLabel>Current / Replacement Image</FieldLabel>
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/15 bg-black">
                          {editFilePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={editFilePreview} alt="New replacement" className="w-full h-full object-cover" />
                          ) : (
                            <Image src={item.image} alt={item.caption} fill unoptimized className="object-cover" />
                          )}
                          {editFilePreview && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold">
                              New image selected
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/webp,image/png,image/jpeg,image/avif"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                          className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-white/10 file:text-slate-200 hover:file:bg-white/20 cursor-pointer"
                        />
                        <p className="text-[11px] text-slate-500">Leave blank to keep existing image</p>
                      </div>

                      {/* Text Fields */}
                      <div className="md:col-span-2 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <FieldLabel>Caption (Headline)</FieldLabel>
                            <span className="text-[11px] text-slate-500 font-mono">{editCaption.length} chars</span>
                          </div>
                          <textarea
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            rows={3}
                            className={inputClass}
                            required
                          />
                        </div>

                        <div>
                          <FieldLabel>Note / Context (Optional)</FieldLabel>
                          <input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Prize details, deck remarks..."
                          />
                        </div>
                      </div>
                    </div>

                    {editError && (
                      <p className="text-red-400 text-xs bg-red-950/40 border border-red-500/30 p-2.5 rounded-lg">
                        {editError}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={saving || !editCaption.trim()}
                        className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                      >
                        {saving ? "Saving changes…" : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-5 py-2 rounded-full border border-white/15 text-slate-300 hover:bg-white/10 text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={item.id}
                  className="group rounded-2xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/15 p-4 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  {/* Order Index & Reorder Controls */}
                  <div className="flex sm:flex-col items-center gap-1 shrink-0 self-center sm:self-center">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(actualIndex, "up")}
                      title="Move up in carousel order"
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                    >
                      ▲
                    </button>
                    <span className="font-mono text-xs font-bold text-slate-400 px-1.5 py-0.5">
                      #{actualIndex + 1}
                    </span>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(actualIndex, "down")}
                      title="Move down in carousel order"
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-video w-36 sm:w-44 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-black/80">
                    <Image src={item.image} alt={item.caption} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 144px, 176px" />
                  </div>

                  {/* Caption & Note Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-white leading-snug break-words">
                      {item.caption}
                    </p>
                    {item.note && (
                      <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md inline-block max-w-full truncate">
                        <span className="font-semibold text-amber-300">Note: </span>
                        {item.note}
                      </p>
                    )}
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {item.file}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <EditButton onClick={() => startEdit(item)} />
                    <DeleteButton
                      onClick={() => handleRemove(item.id, item.caption)}
                      busy={removingId === item.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Gallery tab ──────────────────────────────────────────────────────────

function GalleryTab() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingImg, setRemovingImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [editingImg, setEditingImg] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStory, setEditStory] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = () => {
    fetch("/api/works")
      .then((r) => r.json())
      .then((data: WorkItem[]) => setItems(data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setAdding(true);
    setError("");
    const form = new FormData();
    form.append("image", file);
    form.append("title", title);
    form.append("story", story);
    const res = await fetch("/api/admin/gallery", { method: "POST", body: form });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add photo");
      return;
    }
    setFile(null);
    setTitle("");
    setStory("");
    load();
  };

  const handleRemove = async (img: string) => {
    setRemovingImg(img);
    await fetch(`/api/admin/gallery?img=${encodeURIComponent(img)}`, { method: "DELETE" });
    setRemovingImg(null);
    load();
  };

  const startEdit = (item: WorkItem) => {
    setEditingImg(item.img);
    setEditTitle(item.title ?? "");
    setEditStory(item.story ?? "");
    setEditFile(null);
    setEditError("");
  };

  const cancelEdit = () => setEditingImg(null);

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingImg) return;
    setSaving(true);
    setEditError("");
    const form = new FormData();
    form.append("img", editingImg);
    form.append("title", editTitle);
    form.append("story", editStory);
    if (editFile) form.append("image", editFile);
    const res = await fetch("/api/admin/gallery", { method: "PATCH", body: form });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "Failed to save changes");
      return;
    }
    setEditingImg(null);
    load();
  };

  return (
    <div className="space-y-6">
      <SectionCard>
        <h2 className="font-semibold mb-4">Add a photo</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <FieldLabel>Image (WEBP / PNG / JPEG)</FieldLabel>
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Optional — derived from filename if blank" />
          </div>
          <div>
            <FieldLabel>Content (story shown when expanded)</FieldLabel>
            <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={3} className={inputClass} />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!file || adding}
            className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {adding ? "Uploading…" : "Add Photo"}
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="font-semibold mb-4">Current photos ({items.length})</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) =>
              editingImg === item.img ? (
                <form
                  key={item.img}
                  onSubmit={handleSaveEdit}
                  className="col-span-2 sm:col-span-3 md:col-span-4 rounded-xl bg-black/40 border border-red-500/30 p-4 space-y-3"
                >
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden">
                      <Image src={item.img} alt={item.title ?? ""} fill unoptimized className="object-cover" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <FieldLabel>Replace image (optional)</FieldLabel>
                        <input
                          type="file"
                          accept="image/webp,image/png,image/jpeg"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                          className="text-sm text-slate-300"
                        />
                      </div>
                      <div>
                        <FieldLabel>Title</FieldLabel>
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Content</FieldLabel>
                        <textarea value={editStory} onChange={(e) => setEditStory(e.target.value)} rows={3} className={inputClass} />
                      </div>
                    </div>
                  </div>
                  {editError && <p className="text-red-400 text-xs">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2 rounded-full border border-white/15 text-slate-300 hover:bg-white/10 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div key={item.img} className="relative rounded-xl overflow-hidden bg-black/40 border border-white/5">
                  <div className="relative aspect-square">
                    <Image src={item.img} alt={item.title ?? ""} fill unoptimized className="object-cover" />
                  </div>
                  <div className="p-2 space-y-1.5">
                    <p className="text-xs text-slate-300 truncate">{item.title}</p>
                    <div className="flex gap-1.5">
                      <EditButton onClick={() => startEdit(item)} />
                      <DeleteButton onClick={() => handleRemove(item.img)} busy={removingImg === item.img} />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Sponsors tab ─────────────────────────────────────────────────────────

function SponsorsTab() {
  const [items, setItems] = useState<SponsorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = () => {
    fetch("/api/sponsors")
      .then((r) => r.json())
      .then((data: SponsorEntry[]) => setItems(data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !alt) return;
    setAdding(true);
    setError("");
    const form = new FormData();
    form.append("logo", file);
    form.append("alt", alt);
    const res = await fetch("/api/admin/sponsors", { method: "POST", body: form });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add sponsor");
      return;
    }
    setFile(null);
    setAlt("");
    load();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await fetch(`/api/admin/sponsors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setRemovingId(null);
    load();
  };

  const startEdit = (item: SponsorEntry) => {
    setEditingId(item.id);
    setEditAlt(item.alt);
    setEditFile(null);
    setEditError("");
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError("");
    const form = new FormData();
    form.append("id", editingId);
    form.append("alt", editAlt);
    if (editFile) form.append("logo", editFile);
    const res = await fetch("/api/admin/sponsors", { method: "PATCH", body: form });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "Failed to save changes");
      return;
    }
    setEditingId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <SectionCard>
        <h2 className="font-semibold mb-4">Add a sponsor</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <FieldLabel>Logo (WEBP / PNG / JPEG)</FieldLabel>
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
          <div>
            <FieldLabel>Sponsor name</FieldLabel>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!file || !alt || adding}
            className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {adding ? "Uploading…" : "Add Sponsor"}
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="font-semibold mb-4">Current sponsors ({items.length})</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) =>
              editingId === item.id ? (
                <form
                  key={item.id}
                  onSubmit={handleSaveEdit}
                  className="col-span-2 sm:col-span-3 md:col-span-4 rounded-xl bg-black/40 border border-red-500/30 p-4 space-y-3"
                >
                  <div className="flex gap-4">
                    <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden bg-white">
                      <Image src={item.src} alt={item.alt} fill unoptimized className="object-contain p-1.5" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <FieldLabel>Replace logo (optional)</FieldLabel>
                        <input
                          type="file"
                          accept="image/webp,image/png,image/jpeg"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                          className="text-sm text-slate-300"
                        />
                      </div>
                      <div>
                        <FieldLabel>Sponsor name</FieldLabel>
                        <input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                  {editError && <p className="text-red-400 text-xs">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2 rounded-full border border-white/15 text-slate-300 hover:bg-white/10 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div key={item.id} className="rounded-xl overflow-hidden bg-black/40 border border-white/5 p-3 flex flex-col items-center gap-2">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white">
                    <Image src={item.src} alt={item.alt} fill unoptimized className="object-contain p-1.5" />
                  </div>
                  <p className="text-xs text-slate-300 truncate w-full text-center">{item.alt}</p>
                  <div className="flex gap-1.5">
                    <EditButton onClick={() => startEdit(item)} />
                    <DeleteButton onClick={() => handleRemove(item.id)} busy={removingId === item.id} />
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Members tab ──────────────────────────────────────────────────────────

function MembersTab() {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState("Active");
  const [department, setDepartment] = useState<Department>("Mechanical");
  const [lead, setLead] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editDepartment, setEditDepartment] = useState<Department>("Mechanical");
  const [editLead, setEditLead] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = () => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data: Member[]) => setItems(data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !name || !title) return;
    setAdding(true);
    setError("");
    const form = new FormData();
    form.append("avatar", file);
    form.append("name", name);
    form.append("title", title);
    form.append("handle", handle);
    form.append("status", status);
    form.append("department", department);
    form.append("lead", String(lead));
    const res = await fetch("/api/admin/members", { method: "POST", body: form });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add member");
      return;
    }
    setFile(null);
    setName("");
    setTitle("");
    setHandle("");
    setStatus("Active");
    setDepartment("Mechanical");
    setLead(false);
    load();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await fetch(`/api/admin/members?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setRemovingId(null);
    load();
  };

  const startEdit = (item: Member) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditTitle(item.title);
    setEditHandle(item.handle);
    setEditStatus(item.status);
    setEditDepartment(item.department);
    setEditLead(!!item.lead);
    setEditFile(null);
    setEditError("");
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError("");
    const form = new FormData();
    form.append("id", editingId);
    form.append("name", editName);
    form.append("title", editTitle);
    form.append("handle", editHandle);
    form.append("status", editStatus);
    form.append("department", editDepartment);
    form.append("lead", String(editLead));
    if (editFile) form.append("avatar", editFile);
    const res = await fetch("/api/admin/members", { method: "PATCH", body: form });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "Failed to save changes");
      return;
    }
    setEditingId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <SectionCard>
        <h2 className="font-semibold mb-4">Add a member</h2>
        <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <FieldLabel>Photo (WEBP / PNG / JPEG)</FieldLabel>
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Title / Role</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Handle (no @)</FieldLabel>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} className={inputClass} placeholder="placeholder" />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <input value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className={inputClass}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={lead} onChange={(e) => setLead(e.target.checked)} />
            Show in Leadership filter
          </label>

          {error && <p className="text-red-400 text-xs sm:col-span-2">{error}</p>}

          <button
            type="submit"
            disabled={!file || !name || !title || adding}
            className="sm:col-span-2 px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {adding ? "Uploading…" : "Add Member"}
          </button>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="font-semibold mb-4">Current members ({items.length})</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) =>
              editingId === item.id ? (
                <form
                  key={item.id}
                  onSubmit={handleSaveEdit}
                  className="col-span-2 sm:col-span-3 md:col-span-4 rounded-xl bg-black/40 border border-red-500/30 p-4 space-y-3"
                >
                  <div className="flex gap-4">
                    <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden">
                      <Image src={item.avatarUrl} alt={item.name} fill unoptimized className="object-cover" />
                    </div>
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <FieldLabel>Replace photo (optional)</FieldLabel>
                        <input
                          type="file"
                          accept="image/webp,image/png,image/jpeg"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                          className="text-sm text-slate-300"
                        />
                      </div>
                      <div>
                        <FieldLabel>Name</FieldLabel>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Title / Role</FieldLabel>
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Handle (no @)</FieldLabel>
                        <input value={editHandle} onChange={(e) => setEditHandle(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <FieldLabel>Department</FieldLabel>
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value as Department)}
                          className={inputClass}
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={editLead} onChange={(e) => setEditLead(e.target.checked)} />
                        Show in Leadership filter
                      </label>
                    </div>
                  </div>
                  {editError && <p className="text-red-400 text-xs">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-full bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2 rounded-full border border-white/15 text-slate-300 hover:bg-white/10 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div key={item.id} className="rounded-xl overflow-hidden bg-black/40 border border-white/5 p-3 flex flex-col items-center gap-2">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden">
                    <Image src={item.avatarUrl} alt={item.name} fill unoptimized className="object-cover" />
                  </div>
                  <p className="text-xs text-slate-200 truncate w-full text-center">{item.name}</p>
                  <p className="text-[11px] text-slate-500 truncate w-full text-center">{item.title}</p>
                  <div className="flex gap-1.5">
                    <EditButton onClick={() => startEdit(item)} />
                    <DeleteButton onClick={() => handleRemove(item.id)} busy={removingId === item.id} />
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Projects Tab (3D CAD Objects & Model Viewer) ───────────────────────────

interface PublicFile {
  name: string;
  path: string;
  size: number;
  ext: string;
}

function ProjectsTab() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [availableFiles, setAvailableFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Form states for Add Project
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("RoboCup Soccer");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [modelMode, setModelMode] = useState<"existing" | "upload">("existing");
  const [selectedModelPath, setSelectedModelPath] = useState("");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [mtlMode, setMtlMode] = useState<"none" | "existing" | "upload">("existing");
  const [selectedMtlPath, setSelectedMtlPath] = useState("");
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [tags, setTags] = useState("");
  const [stat1Label, setStat1Label] = useState("Speed");
  const [stat1Value, setStat1Value] = useState("");
  const [stat2Label, setStat2Label] = useState("Weight");
  const [stat2Value, setStat2Value] = useState("");
  const [featured, setFeatured] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editModelUrl, setEditModelUrl] = useState("");
  const [editMtlUrl, setEditMtlUrl] = useState("");
  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  const [editPreviewFile, setEditPreviewFile] = useState<File | null>(null);
  const [editRemovePreview, setEditRemovePreview] = useState(false);
  const [editTags, setEditTags] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const refresh = () => {
    setLoading(true);
    fetch("/api/admin/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setItems(data.projects || []);
          const files: PublicFile[] = data.availableFiles || [];
          setAvailableFiles(files);
          const objFiles = files.filter((f) => f.ext === ".obj" || f.ext === ".glb");
          if (objFiles.length > 0 && !selectedModelPath) {
            setSelectedModelPath(objFiles[0].path);
          }
          const mtlFiles = files.filter((f) => f.ext === ".mtl");
          if (mtlFiles.length > 0 && !selectedMtlPath) {
            setSelectedMtlPath(mtlFiles[0].path);
          }
        }
      })
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }

    setAdding(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("category", category);
      fd.append("year", year);
      fd.append("description", description);
      fd.append("tags", tags);
      fd.append("featured", String(featured));

      if (modelMode === "upload" && modelFile) {
        fd.append("modelFile", modelFile);
      } else {
        fd.append("modelUrl", selectedModelPath);
      }

      if (mtlMode === "upload" && mtlFile) {
        fd.append("mtlFile", mtlFile);
      } else if (mtlMode === "existing" && selectedMtlPath) {
        fd.append("mtlUrl", selectedMtlPath);
      }

      const stats: ProjectStat[] = [];
      if (stat1Label.trim() && stat1Value.trim()) {
        stats.push({ label: stat1Label.trim(), value: stat1Value.trim() });
      }
      if (stat2Label.trim() && stat2Value.trim()) {
        stats.push({ label: stat2Label.trim(), value: stat2Value.trim() });
      }
      if (stats.length > 0) {
        fd.append("stats", JSON.stringify(stats));
      }

      if (previewFile) {
        fd.append("previewFile", previewFile);
      }

      const res = await fetch("/api/admin/projects", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add 3D project");
        setAdding(false);
        return;
      }

      // Reset form
      setTitle("");
      setDescription("");
      setTags("");
      setStat1Value("");
      setStat2Value("");
      setModelFile(null);
      setMtlFile(null);
      setPreviewFile(null);
      setFeatured(false);

      refresh();
    } catch {
      setError("Network error while adding project");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this 3D project?")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (p: ProjectItem) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditCategory(p.category || "Robotics");
    setEditYear(p.year || new Date().getFullYear().toString());
    setEditDescription(p.description);
    setEditModelUrl(p.modelUrl);
    setEditMtlUrl(p.mtlUrl || "");
    setEditPreviewUrl(p.previewImage || "");
    setEditPreviewFile(null);
    setEditRemovePreview(false);
    setEditTags((p.tags || []).join(", "));
    setEditFeatured(Boolean(p.featured));
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setEditError("");

    try {
      const fd = new FormData();
      fd.append("id", editingId);
      fd.append("title", editTitle);
      fd.append("category", editCategory);
      fd.append("year", editYear);
      fd.append("description", editDescription);
      fd.append("modelUrl", editModelUrl);
      fd.append("mtlUrl", editMtlUrl);
      fd.append("tags", editTags);
      fd.append("featured", String(editFeatured));

      if (editRemovePreview) {
        fd.append("removePreviewImage", "true");
      } else if (editPreviewFile) {
        fd.append("previewFile", editPreviewFile);
      }

      const res = await fetch("/api/admin/projects", { method: "PATCH", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update project");
        setSaving(false);
        return;
      }

      setEditingId(null);
      refresh();
    } catch {
      setEditError("Network error while updating");
    } finally {
      setSaving(false);
    }
  };

  const objOptions = availableFiles.filter((f) => f.ext === ".obj" || f.ext === ".glb");
  const mtlOptions = availableFiles.filter((f) => f.ext === ".mtl");

  return (
    <div className="flex flex-col gap-8">
      {/* ── ADD 3D PROJECT CARD ───────────────────────────────────────────── */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Add 3D Project / Object
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Add robotic CAD models (.obj / .glb) and assign interactive 3D viewing with title &amp; description
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-950/60 text-red-300 border border-red-500/30">
            ReactBits ModelViewer
          </span>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Project Title *</FieldLabel>
              <input
                type="text"
                placeholder="e.g. Golden Claw Soccar"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel>Category</FieldLabel>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="RoboCup Soccer">RoboCup Soccer</option>
                <option value="Combat Sumo">Combat Sumo</option>
                <option value="Exploration Rover">Exploration Rover</option>
                <option value="Autonomous Drones">Autonomous Drones</option>
                <option value="Robotics Research">Robotics Research</option>
              </select>
            </div>

            <div>
              <FieldLabel>Year</FieldLabel>
              <input
                type="text"
                placeholder="2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Project Description / Architecture *</FieldLabel>
            <textarea
              placeholder="Detailed overview of mechanical design, chassis, drive-train, actuators, sensors, and competitive purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* 3D Model Selection / Upload */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <FieldLabel>3D Model Source (.obj, .glb)</FieldLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModelMode("existing")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    modelMode === "existing"
                      ? "bg-red-600/90 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Select from /public/objects/
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode("upload")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    modelMode === "upload"
                      ? "bg-red-600/90 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Upload New File
                </button>
              </div>
            </div>

            {modelMode === "existing" ? (
              <div>
                {objOptions.length > 0 ? (
                  <select
                    value={selectedModelPath}
                    onChange={(e) => setSelectedModelPath(e.target.value)}
                    className={inputClass}
                  >
                    {objOptions.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-400">
                    No .obj or .glb files found in /public/objects. Use &quot;Upload New File&quot; above.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".obj,.glb,.gltf"
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                  required={modelMode === "upload"}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-600/80 file:text-white hover:file:bg-red-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* MTL Material Selection */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Material File (.mtl) (Optional)</FieldLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMtlMode("existing")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    mtlMode === "existing"
                      ? "bg-red-600/90 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setMtlMode("upload")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    mtlMode === "upload"
                      ? "bg-red-600/90 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Upload MTL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMtlMode("none");
                    setSelectedMtlPath("");
                    setMtlFile(null);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    mtlMode === "none"
                      ? "bg-red-600/90 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  None
                </button>
              </div>
            </div>

            {mtlMode === "existing" && (
              <select
                value={selectedMtlPath}
                onChange={(e) => setSelectedMtlPath(e.target.value)}
                className={inputClass}
              >
                <option value="">-- None / Default PBR Shaders --</option>
                {mtlOptions.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {mtlMode === "upload" && (
              <input
                type="file"
                accept=".mtl"
                onChange={(e) => setMtlFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
            )}
          </div>

          {/* Static Preview Image Upload */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-2">
            <FieldLabel>Static Preview Image (Optional)</FieldLabel>
            <p className="text-xs text-slate-400">
              Upload an image to show as the card preview before the user taps to launch 3D view
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
            />
          </div>

          {/* Tags and Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Tags (Comma-Separated)</FieldLabel>
              <input
                type="text"
                placeholder="Omni-Drive, Ball Manipulation, RoboCup"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Spec 1 (Label &amp; Value)</FieldLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Speed"
                  value={stat1Label}
                  onChange={(e) => setStat1Label(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
                />
                <input
                  type="text"
                  placeholder="3.8 m/s"
                  value={stat1Value}
                  onChange={(e) => setStat1Value(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Spec 2 (Label &amp; Value)</FieldLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Weight"
                  value={stat2Label}
                  onChange={(e) => setStat2Label(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
                />
                <input
                  type="text"
                  placeholder="2.4 kg"
                  value={stat2Value}
                  onChange={(e) => setStat2Value(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured-checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="accent-red-600 rounded cursor-pointer"
            />
            <label htmlFor="featured-checkbox" className="text-xs text-slate-300 font-medium cursor-pointer">
              Mark as Featured Project
            </label>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={adding}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(239,68,68,0.35)]"
          >
            {adding ? "Saving 3D Project…" : "+ Add 3D Project"}
          </button>
        </form>
      </SectionCard>

      {/* ── EXISTING 3D OBJECTS LIST ──────────────────────────────────────── */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Current 3D Robotics Fleet ({items.length})
          </h2>
          <button
            onClick={refresh}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading 3D models…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No 3D projects added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) =>
              editingId === item.id ? (
                <form
                  key={item.id}
                  onSubmit={handleSaveEdit}
                  className="rounded-2xl bg-black/80 border border-red-500/40 p-5 flex flex-col gap-3 md:col-span-2"
                >
                  <h3 className="text-base font-semibold text-white">
                    Edit {item.title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Title</FieldLabel>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Year</FieldLabel>
                      <input
                        type="text"
                        value={editYear}
                        onChange={(e) => setEditYear(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-y`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Model Path</FieldLabel>
                      <input
                        type="text"
                        value={editModelUrl}
                        onChange={(e) => setEditModelUrl(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel>Material (.mtl) Path</FieldLabel>
                      <input
                        type="text"
                        value={editMtlUrl}
                        onChange={(e) => setEditMtlUrl(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Static Preview Image Management */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
                    <FieldLabel>Static Preview Image</FieldLabel>

                    {editPreviewUrl && !editRemovePreview ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/60">
                          <img
                            src={getAssetUrl(editPreviewUrl)}
                            alt="Current Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-slate-300 break-all">
                            {editPreviewUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditRemovePreview(true);
                              setEditPreviewUrl("");
                              setEditPreviewFile(null);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-left w-fit transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Remove Preview Image</span>
                          </button>
                        </div>
                      </div>
                    ) : editRemovePreview ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs font-medium text-red-300">
                            Preview image will be removed on save
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditRemovePreview(false);
                            setEditPreviewUrl(item.previewImage || "");
                          }}
                          className="text-xs font-medium text-slate-300 hover:text-white underline"
                        >
                          Undo
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No static preview image currently set.
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-400">
                        {editPreviewUrl ? "Replace preview image:" : "Upload preview image:"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setEditPreviewFile(f);
                          if (f) setEditRemovePreview(false);
                        }}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Tags</FieldLabel>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`edit-featured-${item.id}`}
                      checked={editFeatured}
                      onChange={(e) => setEditFeatured(e.target.checked)}
                      className="accent-red-600 rounded cursor-pointer"
                    />
                    <label htmlFor={`edit-featured-${item.id}`} className="text-xs text-slate-300 font-medium">
                      Mark as Featured
                    </label>
                  </div>

                  {editError && <p className="text-xs text-red-400">{editError}</p>}

                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:bg-white/10 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={item.id}
                  className="rounded-2xl bg-black/50 border border-white/10 p-4 flex flex-col gap-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-300 border border-red-500/30">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">{item.year}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-white tracking-tight">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* 3D Model Preview in Admin (Click to initiate) */}
                  <div className="w-full rounded-xl overflow-hidden border border-white/10 my-1">
                    <ModelViewer
                      url={getAssetUrl(item.modelUrl)}
                      mtlUrl={item.mtlUrl ? getAssetUrl(item.mtlUrl) : undefined}
                      previewImage={item.previewImage ? getAssetUrl(item.previewImage) : undefined}
                      title={item.title}
                      height={240}
                      interactiveOnlyOnClick={true}
                    />
                  </div>

                  <div className="text-xs text-slate-400 break-all flex flex-col gap-1">
                    <div>
                      Model: <span className="text-slate-300">{item.modelUrl}</span>
                    </div>
                    {item.mtlUrl && (
                      <div>MTL: <span className="text-slate-400">{item.mtlUrl}</span></div>
                    )}
                    <div className="flex items-center gap-1.5">
                      Preview:
                      {item.previewImage ? (
                        <span className="text-emerald-400">✓ Set ({item.previewImage.split("/").pop()})</span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    <span className="text-xs text-slate-400 font-medium">
                      {item.featured ? "★ Featured" : "Standard"}
                    </span>
                    <div className="flex gap-2">
                      <EditButton onClick={() => startEdit(item)} />
                      <DeleteButton
                        onClick={() => handleRemove(item.id)}
                        busy={removingId === item.id}
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

