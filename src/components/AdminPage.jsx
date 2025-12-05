// src/components/AdminPage.jsx
import { useEffect, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import SidebarLibrary from "./SidebarLibrary";

/**
 * AdminPage - robust implementation that never changes hook order.
 *
 * Props (many are passed from App.jsx):
 *  - videos, rawVideos, selected, setSelected, loading, fetchError,
 *    search, setSearch, filterType, setFilterType,
 *    extTitle, setExtTitle, extDescription, setExtDescription, extUrl, setExtUrl,
 *    extCategory, setExtCategory, extTags, setExtTags, savingExternal,
 *    upTitle, setUpTitle, upDescription, setUpDescription, upCategory, setUpCategory,
 *    upTags, setUpTags, setUpFile, uploading, onAddExternal, onUpload,
 *    onDeleteVideo, onUpdateVideo, onUpdateThumbnail, onTogglePublic, onToggleFeatured,
 *    onReorder, onVideoPlayed, isAdminAuthed, onAdminLogin
 */

export default function AdminPage(props) {
  // destructure props for readability
  const {
    videos,
    rawVideos = [],
    selected,
    setSelected,
    loading,
    fetchError,
    search,
    setSearch,
    filterType,
    setFilterType,
    extTitle,
    setExtTitle,
    extDescription,
    setExtDescription,
    extUrl,
    setExtUrl,
    extCategory,
    setExtCategory,
    extTags,
    setExtTags,
    savingExternal,
    upTitle,
    setUpTitle,
    upDescription,
    setUpDescription,
    upCategory,
    setUpCategory,
    upTags,
    setUpTags,
    setUpFile,
    uploading,
    onAddExternal,
    onUpload,
    onDeleteVideo,
    onUpdateVideo,
    onUpdateThumbnail,
    onTogglePublic,
    onToggleFeatured,
    onReorder,
    onVideoPlayed,
    isAdminAuthed,
    onAdminLogin,
  } = props;

  // -------------------------
  // Hooks (UNCONDITIONAL)
  // -------------------------
  const [editingVideo, setEditingVideo] = useState(null);
  const [editFields, setEditFields] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    external_url: "",
    thumbSecond: 7,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Login form state (hooks must be present regardless of login UI)
  const [inputPassword, setInputPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Keep selected in sync when videos change
  useEffect(() => {
    if (!selected && videos && videos.length > 0) {
      setSelected(videos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  // -------------------------
  // Login handling (no extra hooks)
  // -------------------------
  const handleLoginSubmit = (e) => {
    e.preventDefault();

    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!envPass) {
      setLoginError(
        "Admin password not configured. Set VITE_ADMIN_PASSWORD in .env."
      );
      return;
    }

    if (inputPassword === envPass) {
      setLoginError("");
      setInputPassword("");
      // lift login to parent (App.jsx handles localStorage & navigate)
      onAdminLogin && onAdminLogin();
    } else {
      setLoginError("Incorrect password");
    }
  };

  // -------------------------
  // Edit helpers
  // -------------------------
  const openEdit = (video) => {
    setEditingVideo(video);
    setEditFields({
      title: video.title || "",
      description: video.description || "",
      category: video.category || "",
      tags: video.tags || "",
      external_url: video.external_url || "",
      thumbSecond: 7,
    });
  };

  const handleEditChange = (field, value) =>
    setEditFields((p) => ({ ...p, [field]: value }));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVideo) return;
    setEditSaving(true);

    const payload = {
      title: editFields.title.trim() || null,
      description: editFields.description.trim() || null,
      category: editFields.category.trim() || null,
      tags: editFields.tags.trim() || null,
    };

    if (editingVideo.source_type === "external") {
      payload.external_url = editFields.external_url.trim() || null;
    }

    try {
      await onUpdateVideo(editingVideo.id, payload);
      setEditingVideo(null);
    } catch (err) {
      console.error("Edit save error", err);
      alert("Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleThumbnailUpdateClick = async () => {
    if (!editingVideo) return;
    const sec = Number(editFields.thumbSecond) || 7;
    await onUpdateThumbnail(editingVideo, sec);
  };

  // -------------------------
  // Admin stats derived from rawVideos
  // -------------------------
  const total = rawVideos.length;
  const publicCount = rawVideos.filter((v) => v.is_public !== false).length;
  const hiddenCount = total - publicCount;
  const uploadedCount = rawVideos.filter((v) => v.source_type === "uploaded").length;
  const externalCount = rawVideos.filter((v) => v.source_type === "external").length;
  const featuredCount = rawVideos.filter((v) => v.is_featured).length;

  // -------------------------
  // If not authed: show login UI (no hooks here)
  // -------------------------
  if (!isAdminAuthed) {
    return (
      <main className="flex flex-1 items-center justify-center w-full p-4">
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-sm rounded-2xl border bg-slate-950 p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold">Admin login</h2>

          <input
            type="password"
            className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs"
            placeholder="Admin password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            autoFocus
          />

          {loginError && <p className="text-xs text-rose-300">{loginError}</p>}

          <button
            type="submit"
            className="w-full rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium"
          >
            Unlock admin
          </button>

          <p className="text-[11px] text-slate-400 mt-2">
            Hint: password comes from <code>VITE_ADMIN_PASSWORD</code> in your
            `.env` file.
          </p>
        </form>
      </main>
    );
  }

  // -------------------------
  // Admin UI (authenticated)
  // -------------------------
  return (
    <main className="flex flex-1 flex-col md:flex-row w-full">
      {/* Left: stats + player + forms */}
      <div className="w-full border-b md:w-2/3 md:border-r p-4 space-y-4">
        {/* Stats */}
        <section className="rounded-2xl border p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-400">Total</p>
            <p className="font-semibold">{total}</p>
          </div>
          <div>
            <p className="text-slate-400">Public</p>
            <p className="font-semibold">{publicCount}</p>
          </div>
          <div>
            <p className="text-slate-400">Hidden</p>
            <p className="font-semibold">{hiddenCount}</p>
          </div>
          <div>
            <p className="text-slate-400">Featured</p>
            <p className="font-semibold">{featuredCount}</p>
          </div>
          <div>
            <p className="text-slate-400">Uploaded</p>
            <p className="font-semibold">{uploadedCount}</p>
          </div>
          <div>
            <p className="text-slate-400">External</p>
            <p className="font-semibold">{externalCount}</p>
          </div>
        </section>

        {/* Player */}
        <section>
          {selected ? (
            <div className="rounded-2xl border p-3">
              <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed">
              Select a video from the right or add a new one.
            </div>
          )}
        </section>

        {/* Add video forms */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Add new video</h2>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* External link */}
            <form onSubmit={onAddExternal} className="rounded-2xl border p-3 space-y-2">
              <h3 className="text-xs font-semibold">External video</h3>
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Title" value={extTitle} onChange={(e) => setExtTitle(e.target.value)} />
              <textarea className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" rows={2} placeholder="Description" value={extDescription} onChange={(e) => setExtDescription(e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Category" value={extCategory} onChange={(e) => setExtCategory(e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Tags" value={extTags} onChange={(e) => setExtTags(e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="https://..." value={extUrl} onChange={(e) => setExtUrl(e.target.value)} />
              <button type="submit" disabled={savingExternal} className="w-full rounded-md bg-emerald-500 px-3 py-1 text-xs">
                {savingExternal ? "Adding…" : "Add external"}
              </button>
            </form>

            {/* Upload */}
            <form onSubmit={onUpload} className="rounded-2xl border p-3 space-y-2">
              <h3 className="text-xs font-semibold">Upload video</h3>
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Title" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} />
              <textarea className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" rows={2} placeholder="Description" value={upDescription} onChange={(e) => setUpDescription(e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Category" value={upCategory} onChange={(e) => setUpCategory(e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Tags" value={upTags} onChange={(e) => setUpTags(e.target.value)} />
              <input type="file" accept="video/*" onChange={(e) => setUpFile(e.target.files[0] || null)} className="block w-full text-[11px]" />
              <button type="submit" disabled={uploading} className="w-full rounded-md bg-sky-500 px-3 py-1 text-xs">
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
          </div>
        </section>

        {/* Edit form */}
        {editingVideo && (
          <section className="rounded-2xl border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit – {editingVideo.title}</h3>
              <button onClick={() => setEditingVideo(null)} className="text-xs">Cancel</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-2">
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" value={editFields.title} onChange={(e) => handleEditChange("title", e.target.value)} />
              <textarea className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" rows={2} value={editFields.description} onChange={(e) => handleEditChange("description", e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Category" value={editFields.category} onChange={(e) => handleEditChange("category", e.target.value)} />
              <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" placeholder="Tags" value={editFields.tags} onChange={(e) => handleEditChange("tags", e.target.value)} />
              {editingVideo.source_type === "external" && (
                <input className="w-full rounded-md bg-slate-900 border px-2 py-1 text-xs" value={editFields.external_url} onChange={(e) => handleEditChange("external_url", e.target.value)} />
              )}

              <div className="mt-2">
                <label className="text-xs">Thumbnail time: <strong>{editFields.thumbSecond}s</strong></label>
                <input type="range" min="1" max="60" value={editFields.thumbSecond} onChange={(e) => handleEditChange("thumbSecond", e.target.value)} className="w-full" />
                <button type="button" onClick={handleThumbnailUpdateClick} className="mt-1 rounded-md bg-purple-500 px-3 py-1 text-xs">Update thumbnail</button>
              </div>

              <button type="submit" disabled={editSaving} className="mt-2 rounded-md bg-emerald-500 px-3 py-1 text-xs">
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>
        )}

        {fetchError && <p className="text-xs text-rose-300">{fetchError}</p>}
      </div>

      {/* Right: sidebar */}
      <SidebarLibrary
        videos={videos}
        selected={selected}
        setSelected={setSelected}
        loading={loading}
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        canDelete={true}
        canEdit={true}
        canTogglePublic={true}
        canToggleFeatured={true}
        canReorder={true}
        onDeleteVideo={onDeleteVideo}
        onEditClick={(v) => {
          openEdit(v);
          setSelected(v);
        }}
        onTogglePublic={onTogglePublic}
        onToggleFeatured={onToggleFeatured}
        onReorder={onReorder}
        isAdminView={true}
      />
    </main>
  );
}
