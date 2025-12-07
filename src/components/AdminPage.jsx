/* eslint-disable no-irregular-whitespace */
// src/components/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";

/* ===========================
   UI primitives using Tailwind
   =========================== */

// ModalBase - Converted to Tailwind
const ModalBase = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-5 md:p-10">
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-50 w-full max-w-2xl rounded-xl border border-sky-700/50 bg-slate-900 p-5 shadow-2xl shadow-sky-900/50">
      <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-2">
        <h3 className="text-xl font-bold text-sky-400">{title}</h3>
        <button onClick={onClose} className="rounded-md border border-slate-700 bg-transparent px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-800">Close</button>
      </div>
      {children}
    </div>
  </div>
);

/* LibraryCard - Converted to Tailwind and integrated Drag-and-Drop handlers */
function LibraryCard({ item, selected, setSelected, toggleSelect, selectedIds, onTogglePublicWrapper, onToggleFeaturedWrapper, handleDragStart, handleDragOver, handleDrop, isDragging }) {
  const thumb = item.thumbnail_url || item.public_url || item.external_url || null;
  const active = selected && selected.id === item.id;

  return (
    <div
      onClick={() => setSelected(item)}
      // Drag and drop properties
      draggable="true"
      onDragStart={(e) => handleDragStart(e, item.id)}
      onDragOver={handleDragOver} // Allows an element to be dropped
      onDrop={(e) => handleDrop(e, item.id)}
      // Tailwind classes
      className={`
        flex gap-3 p-3 rounded-xl cursor-pointer items-center transition duration-200
        bg-slate-900/50 border
        ${active ? "border-sky-500 shadow-lg shadow-sky-900/20" : "border-slate-700/70 hover:border-slate-600"}
        ${isDragging ? "opacity-30 border-dashed border-2 border-amber-400" : ""}
      `}
    >
      <div className="w-24 h-14 md:w-32 md:h-16 flex-shrink-0 rounded-md overflow-hidden bg-slate-800">
        {thumb ? <img src={thumb} alt={item.title || item.id} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No thumb</div>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold truncate text-sm md:text-base">{item.title || `#${item.id}`}</div>
        <div className="text-xs text-slate-400 mt-1">{item.category || item.tags || item.source_type}</div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
            className={`px-2 py-1 text-xs rounded-md transition ${selectedIds.has(item.id) ? "bg-sky-500 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}
            aria-pressed={selectedIds.has(item.id)}
          >
            {selectedIds.has(item.id) ? "✓ Selected" : "Select"}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onTogglePublicWrapper(item.id); }}
            className={`px-2 py-1 text-xs rounded-md transition ${item.is_public !== false ? "bg-emerald-500 text-slate-900 font-semibold" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            title="Toggle public"
          >
            {item.is_public !== false ? "Public" : "Private"}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleFeaturedWrapper(item.id); }}
            className={`px-2 py-1 text-xs rounded-md transition ${item.is_featured ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            title="Toggle featured"
          >
            {item.is_featured ? "⭐ Featured" : "Feature"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Main AdminPage component
   =========================== */
export default function AdminPage(props) {
  // Props API (keeps compatibility with your App.jsx)
  const {
    videos = [], rawVideos = [], selected = null, setSelected = () => {}, loading = false, fetchError = null,
    search = "", setSearch = () => {}, filterType = "all", setFilterType = () => {},
    extTitle = "", setExtTitle = () => {}, extDescription = "", setExtDescription = () => {}, extCategory = "", setExtCategory = () => {}, extTags = "", setExtTags = () => {}, extUrl = "", setExtUrl = () => {}, savingExternal = false,
    upTitle = "", setUpTitle = () => {}, upDescription = "", setUpDescription = () => {}, upCategory = "", setUpCategory = () => {}, upTags = "", setUpTags = () => {}, setUpFile = () => {}, uploading = false,
    onAddExternal = async (e) => { e?.preventDefault?.(); console.warn("onAddExternal not provided"); },
    onUpload = async (e) => { e?.preventDefault?.(); console.warn("onUpload not provided"); },
    onDeleteVideo = async (id) => console.warn("onDeleteVideo not provided", id),
    onUpdateVideo = async (id, fields) => console.warn("onUpdateVideo not provided", id, fields),
    onUpdateThumbnail = async (video, sec) => console.warn("onUpdateThumbnail not provided", video?.id, sec),
    onTogglePublic = async (id) => console.warn("onTogglePublic not provided", id),
    onToggleFeatured = async (id) => console.warn("onToggleFeatured not provided", id),
    onReorder = () => console.warn("onReorder not provided"),
    onVideoPlayed = () => {},
    isAdminAuthed = false,
    onAdminLogin = () => {},
    onRemoveThumbnail, // (videoId) => Promise
    // FIX: Using the correct prop name passed from App.jsx
    onUploadCustomThumbnail, // (videoId, file) => Promise
  } = props;

  // -------------------------
  // Local UI state
  // -------------------------
  const [localVideos, setLocalVideos] = useState(Array.isArray(videos) ? videos.slice() : []);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editFields, setEditFields] = useState({ title: "", description: "", category: "", tags: "", external_url: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [inputPassword, setInputPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingUploadName, setPendingUploadName] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [thumbSecond, setThumbSecond] = useState(7);
  const [thumbFile, setThumbFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [thumbMsg, setThumbMsg] = useState("");
  
  // DRAG AND DROP STATE
  const [draggedItemId, setDraggedItemId] = useState(null);

  // Keep localVideos in sync with incoming videos (so reorder is optimistic)
  useEffect(() => setLocalVideos(Array.isArray(videos) ? videos.slice() : []), [videos]);

  // Ensure selected isn't null when videos arrive
  useEffect(() => {
    if (!selected && Array.isArray(localVideos) && localVideos.length > 0) setSelected(localVideos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideos]);

  // Derived counts & filtered (based on localVideos)
  const { total, publicCount, featuredCount, filtered } = useMemo(() => {
    const total = Array.isArray(rawVideos) ? rawVideos.length : 0;
    const publicCount = Array.isArray(rawVideos) ? rawVideos.filter((v) => v.is_public !== false).length : 0;
    const featuredCount = Array.isArray(rawVideos) ? rawVideos.filter((v) => v.is_featured).length : 0;
    const q = (search || "").trim().toLowerCase();
    const filteredList = (Array.isArray(localVideos) ? localVideos : []).filter((v) => {
      if (filterType !== "all" && v.source_type !== filterType) return false;
      if (!q) return true;
      const hay = `${v.title || ""} ${v.description || ""} ${v.tags || ""}`.toLowerCase();
      return hay.includes(q);
    });
    return { total, publicCount, featuredCount, filtered: filteredList };
  }, [rawVideos, localVideos, search, filterType]);

  // -------------------------
  // Helpers: edit
  // -------------------------
  const openEdit = (video) => {
    setEditingVideo(video);
    setEditFields({
      title: video?.title || "",
      description: video?.description || "",
      category: video?.category || "",
      tags: video?.tags || "",
      external_url: video?.external_url || "",
    });
    setThumbFile(null);
    setFilePreview(null);
    setThumbMsg("");
  };
  const setEditField = (k, v) => setEditFields((p) => ({ ...p, [k]: v }));

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editingVideo) return;
    setEditSaving(true);
    const payload = {
      title: editFields.title?.trim() || null,
      description: editFields.description?.trim() || null,
      category: editFields.category?.trim() || null,
      tags: editFields.tags?.trim() || null,
    };
    if (editingVideo.source_type === "external") payload.external_url = editFields.external_url?.trim() || null;
    try {
      await onUpdateVideo(editingVideo.id, payload);
      // optimistic: update localVideos item
      setLocalVideos((prev) => prev.map((p) => (p.id === editingVideo.id ? { ...p, ...payload } : p)));
      if (selected?.id === editingVideo.id) setSelected((s) => (s ? { ...s, ...payload } : s));
      setEditingVideo(null);
    } catch (err) {
      console.error("save edit", err);
      alert("Failed to save changes (see console).");
    } finally {
      setEditSaving(false);
    }
  };

  // -------------------------
  // Toggle public/featured (wrappers with optimistic UI + rollback)
  // -------------------------
  const onTogglePublicWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id);
    if (idx === -1) return;
    const prev = localVideos[idx];
    const next = { ...prev, is_public: prev.is_public === false ? true : false };
    const copy = localVideos.slice();
    copy[idx] = next;
    setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);

    try {
      await Promise.resolve(onTogglePublic(prev)); // Pass the whole object as expected by App.jsx
    } catch (err) {
      console.error("togglePublic failed", err);
      // rollback
      const rollback = localVideos.slice();
      rollback[idx] = prev;
      setLocalVideos(rollback);
      if (selected?.id === id) setSelected(prev);
      alert("Failed to toggle public (see console).");
    }
  };

  const onToggleFeaturedWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id);
    if (idx === -1) return;
    const prev = localVideos[idx];
    const next = { ...prev, is_featured: !prev.is_featured };
    const copy = localVideos.slice();
    copy[idx] = next;
    setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);

    try {
      await Promise.resolve(onToggleFeatured(prev)); // Pass the whole object as expected by App.jsx
    } catch (err) {
      console.error("toggleFeatured failed", err);
      const rollback = localVideos.slice();
      rollback[idx] = prev;
      setLocalVideos(rollback);
      if (selected?.id === id) setSelected(prev);
      alert("Failed to toggle featured (see console).");
    }
  };

  // -------------------------
  // Drag and Drop Reorder Handlers
  // -------------------------
  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow a drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = draggedItemId;
    if (!sourceId || sourceId === targetId) {
      setDraggedItemId(null);
      return;
    }

    const sourceIndex = localVideos.findIndex(v => v.id === sourceId);
    const targetIndex = localVideos.findIndex(v => v.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    // Perform reorder (splice out and then splice in)
    const newVideos = Array.from(localVideos);
    const [movedItem] = newVideos.splice(sourceIndex, 1);
    newVideos.splice(targetIndex, 0, movedItem);

    setLocalVideos(newVideos);
    setDraggedItemId(null);
  };

  const saveOrder = async () => {
    try {
      const res = onReorder.length >= 1 ? onReorder(localVideos) : onReorder();
      await Promise.resolve(res);
      alert("Order saved successfully.");
      // parent should update video record and stream new thumbnail back via videos prop
    } catch (err) {
      console.error("saveOrder failed", err);
      alert("Failed saving order (see console).");
    }
  };

  // -------------------------
  // Header upload helpers
  // -------------------------
  const onHeaderFilePicked = (file) => {
    if (!file) return;
    setPendingUploadFile(file);
    setPendingUploadName(file.name);
    const nameNoExt = file.name.replace(/\.[^/.]+$/, "");
    setUpTitle(nameNoExt);
    setUpDescription("");
    setUpCategory("");
    setUpTags("");
    setShowUploadModal(true);
  };

  const submitHeaderUpload = async () => {
    if (!pendingUploadFile) return;
    try {
      setUpFile(pendingUploadFile);
    } catch (err) {
      console.warn("setUpFile failed", err);
    }
    try {
      // call onUpload with a fake event if parent expects an event
      const res = onUpload.length >= 1 ? onUpload({ preventDefault: () => {} }) : onUpload();
      await Promise.resolve(res);
      // on success, close modal
      setShowUploadModal(false);
      setPendingUploadFile(null);
      setPendingUploadName("");
      setUpFile(null);
      setUpTitle("");
      setUpDescription("");
      setUpCategory("");
      setUpTags("");
    } catch (err) {
      console.error("header upload failed", err);
      alert("Upload failed (see console).");
    }
  };

  // -------------------------
  // Thumbnail capture & upload
  // -------------------------
  const handleThumbnailCaptureClick = async () => {
    if (!selected || !onUpdateThumbnail) return;
    try {
      await onUpdateThumbnail(selected, Number(thumbSecond) || 7);
      setThumbMsg("Thumbnail capture requested. Check back soon for update.");
      // parent should update video record and stream new thumbnail back via videos prop
    } catch (err) {
      console.error("capture thumbnail", err);
      setThumbMsg("Capture failed (see console).");
    }
  };

  const handleThumbFile = (file) => {
    setThumbFile(file || null);
    setThumbMsg("");
    setFilePreview(null);
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setFilePreview(String(r.result));
    r.onerror = () => setThumbMsg("Unable to preview file");
    r.readAsDataURL(file);
  };

  const handleCustomThumbUpload = async () => {
    if (!thumbFile) { setThumbMsg("Select image first."); return; }
    if (!selected) { setThumbMsg("Select a video first."); return; }

    // FIX: Check for the correct prop name: onUploadCustomThumbnail
    if (typeof onUploadCustomThumbnail === "function") {
      try {
        // FIX: Use the correct prop name: onUploadCustomThumbnail
        await onUploadCustomThumbnail(selected.id, thumbFile); 
        setThumbMsg("Upload succeeded. Refreshing preview...");
        setThumbFile(null);
        setFilePreview(null);
      } catch (err) {
        console.error("onUploadCustomThumbnail failed", err);
        setThumbMsg("Upload failed (see console).");
      }
      return;
    }

    console.warn("onUploadCustomThumbnail not provided by parent. Implement onUploadCustomThumbnail(videoId, file) in App.jsx to enable custom thumbnail uploads.");
    setThumbMsg("Implement onUploadCustomThumbnail(videoId, file) in App.jsx to enable this.");
  };

  const handleRemoveThumbnail = async () => {
    if (!selected) return;
    if (typeof onRemoveThumbnail === "function") {
      try {
        await onRemoveThumbnail(selected.id);
        setThumbMsg("Thumbnail removed. Refreshing preview...");
      } catch (err) {
        console.error("onRemoveThumbnail failed", err);
        setThumbMsg("Failed to remove thumbnail (see console).");
      }
    } else {
      console.warn("onRemoveThumbnail not implemented in App.jsx — provide it to delete thumbnail file from storage and clear DB path.");
      setThumbMsg("Implement onRemoveThumbnail(selectedId) in App.jsx to remove thumbnail files.");
    }
  };

  // -------------------------
  // Bulk selection handlers
  // -------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(filtered.map((v) => v.id)));

  const applyBulk = async (action) => {
    if (selectedIds.size === 0) { alert("No items selected"); return; }
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.size} item(s)?`)) return;
    try {
      for (const id of selectedIds) {
        const video = localVideos.find(v => v.id === id);
        if (!video) continue;

        if (action === "delete") await onDeleteVideo(video); // onDeleteVideo expects full video object
        else if (action === "feature") await onToggleFeaturedWrapper(id);
        else if (action === "public") await onTogglePublicWrapper(id);
      }
      clearSelection();
    } catch (err) {
      console.error("bulk action failed", err);
      alert("Bulk action failed (see console).");
    }
  };

  // -------------------------
  // Login
  // -------------------------
  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!envPass) { setLoginError("VITE_ADMIN_PASSWORD not set"); return; }
    if (inputPassword === envPass) {
      setLoginError(""); setInputPassword("");
      onAdminLogin && onAdminLogin();
    } else setLoginError("Incorrect password");
  };

  // -------------------------
  // Delete a video and close preview
  // -------------------------
  const handleDeleteVideoAndClose = (video) => { // video is the selected object
    onDeleteVideo(video); // onDeleteVideo is called with the full video object
    setSelected(null);
  };

  // -------------------------
  // Render
  // -------------------------
  if (!isAdminAuthed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-md p-6 rounded-xl border border-sky-700/50 bg-slate-900 shadow-2xl shadow-sky-900/50">
          <h2 className="text-2xl font-extrabold text-sky-400">NEXUS Admin Console</h2>
          <p className="mt-2 text-slate-400">Sign in to manage the catalog</p>
          <form onSubmit={handleLoginSubmit} className="mt-5 flex flex-col gap-4">
            <input
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="Admin password"
              // FIX: Changed bg-transparent to bg-slate-800
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="password"
            />
            {loginError && <div className="text-rose-500 text-sm">{loginError}</div>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400">Unlock</button>
              <button type="button" onClick={() => alert("Contact support")} className="flex-1 px-4 py-2 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Help</button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Upload/Add Modals */}
      {showUploadModal && (
        <ModalBase title="Upload video details" onClose={() => setShowUploadModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-sky-900/40 text-sm border border-sky-700/50">
              File: <strong className="text-sky-300">{pendingUploadName}</strong>
            </div>
            {/* FIX: Changed bg-transparent to bg-slate-800 */}
            <input placeholder="Title" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <input placeholder="Category" value={upCategory} onChange={(e) => setUpCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <input placeholder="Tags (comma)" value={upTags} onChange={(e) => setUpTags(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <textarea placeholder="Description" value={upDescription} onChange={(e) => setUpDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 h-24" />
            <div className="flex gap-3 mt-2">
              <button onClick={submitHeaderUpload} className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-bold transition hover:bg-purple-500" disabled={!pendingUploadFile || !upTitle || uploading}>{uploading ? "Uploading…" : "Start Upload"}</button>
              <button type="button" onClick={() => { setShowUploadModal(false); setPendingUploadFile(null); setPendingUploadName(""); }} className="px-4 py-2 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Cancel</button>
            </div>
          </div>
        </ModalBase>
      )}

      {showAddModal && (
        <ModalBase title="Add external video" onClose={() => setShowAddModal(false)}>
          <form onSubmit={async (e) => { e.preventDefault(); await onAddExternal(e); setShowAddModal(false); }} className="flex flex-col gap-3">
            {/* FIX: Changed bg-transparent to bg-slate-800 */}
            <input placeholder="External URL" value={extUrl} onChange={(e) => setExtUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" required />
            <input placeholder="Title" value={extTitle} onChange={(e) => setExtTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" required />
            <input placeholder="Category" value={extCategory} onChange={(e) => setExtCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <textarea placeholder="Description" value={extDescription} onChange={(e) => setExtDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 h-20" />
            <input placeholder="Tags (comma)" value={extTags} onChange={(e) => setExtTags(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <div className="flex gap-3 mt-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400" disabled={savingExternal}>{savingExternal ? "Adding…" : "Add video"}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Cancel</button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Layout */}
      <aside className="w-full md:w-96 flex-shrink-0 p-5 border-r border-slate-700/70 flex flex-col gap-4">
        {/* Header actions */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-2xl font-extrabold text-sky-400">NEXUS ADMIN</div>
            <div className="flex gap-2">
              <label htmlFor="top-upload" className="px-3 py-1 text-sm rounded-lg bg-purple-600 text-white font-semibold cursor-pointer transition hover:bg-purple-500">Upload</label>
              <input id="top-upload" type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] || null; if (f) onHeaderFilePicked(f); e.currentTarget.value = ""; }} />
              <button onClick={() => setShowAddModal(true)} className="px-3 py-1 text-sm rounded-lg bg-sky-500 text-slate-900 font-semibold transition hover:bg-sky-400">External</button>
            </div>
          </div>

          <div className="mt-4">
            {/* FIX: Changed bg-transparent to bg-slate-800 */}
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, tags..." className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
            <div className="mt-2 flex gap-2">
              {/* FIX: Changed bg-transparent to bg-slate-800 */}
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1 text-sm rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100">
                <option className="bg-slate-900" value="all">All</option>
                <option className="bg-slate-900" value="uploaded">Uploaded</option>
                <option className="bg-slate-900" value="external">External</option>
              </select>
              <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1 text-sm rounded-lg border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-800">Clear Sel</button>
              <button onClick={selectAllVisible} className="px-3 py-1 text-sm rounded-lg border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-800">Select All</button>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="p-3 rounded-xl border border-sky-700/50 bg-slate-900/50">
            <div className="font-bold text-lg text-sky-300">Bulk Actions ({selectedIds.size})</div>
            <div className="mt-2 flex gap-3">
              <button onClick={() => applyBulk("public")} className="px-3 py-1 text-xs rounded-md bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400">Make Public</button>
              <button onClick={() => applyBulk("feature")} className="px-3 py-1 text-xs rounded-md bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300">Feature</button>
              <button onClick={() => applyBulk("delete")} className="px-3 py-1 text-xs rounded-md bg-rose-600 text-white font-semibold hover:bg-rose-500">Delete</button>
            </div>
            </div>
        )}

        {/* Library */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          {loading && <div className="text-sky-400 animate-pulse text-center">Loading Data Stream...</div>}
          {fetchError && <div className="text-rose-500 text-center">Error: {String(fetchError)}</div>}
          {filtered.length === 0 && !loading && <div className="text-slate-500 text-center">No videos found.</div>}
          {filtered.map((v) => (
            <LibraryCard
              key={v.id}
              item={v}
              selected={selected}
              setSelected={setSelected}
              toggleSelect={toggleSelect}
              selectedIds={selectedIds}
              onTogglePublicWrapper={onTogglePublicWrapper}
              onToggleFeaturedWrapper={onToggleFeaturedWrapper}
              // DND Props
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              isDragging={v.id === draggedItemId}
            />
          ))}
        </div>

        {/* Footer Reorder Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-700/50">
          <button onClick={saveOrder} className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400">Save New Order</button>
          <button onClick={() => setLocalVideos((p) => p.slice().reverse())} className="px-4 py-2 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Reverse List</button>
        </div>
      </aside>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
        {/* top stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl border border-slate-700/70 bg-slate-900/50 text-center">
            <div className="text-slate-400 text-sm">Total Assets</div>
            <div className="text-2xl font-extrabold mt-1 text-sky-300">{total}</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-700/70 bg-slate-900/50 text-center">
            <div className="text-slate-400 text-sm">Public Stream</div>
            <div className="text-2xl font-extrabold mt-1 text-emerald-500">{publicCount}</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-700/70 bg-slate-900/50 text-center">
            <div className="text-slate-400 text-sm">Featured Assets</div>
            <div className="text-2xl font-extrabold mt-1 text-amber-400">{featuredCount}</div>
          </div>
        </div>

        {/* preview */}
        <div className="p-4 rounded-xl border border-sky-700/50 bg-slate-900 shadow-xl shadow-sky-900/20 min-h-[360px]">
          {selected ? (
            <>
              <div className="mb-3 flex justify-between items-start">
                <div>
                  <div className="text-2xl font-extrabold text-sky-400">{selected.title || `#${selected.id}`}</div>
                  <div className="text-slate-400 mt-1 text-sm">{selected.description || "No description"}</div>
                </div>
                <div className="text-slate-500 text-sm flex-shrink-0 ml-4">Views: {Number(selected.view_count || 0)}</div>
              </div>

              <div className="aspect-video rounded-lg overflow-hidden border border-slate-700/50 bg-black">
                <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">Select an asset to preview data stream</div>
          )}
        </div>

        {/* inspector */}
        {selected && (
          <div className="p-4 rounded-xl border border-slate-700/70 bg-slate-900 flex flex-col gap-4">
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <div className="text-xl font-bold text-sky-400">Asset Details</div>
                <div className="mt-2 text-sm text-slate-400">
                  **ID:** {selected.id}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onTogglePublicWrapper(selected.id)} className={`px-3 py-1 text-sm rounded-md transition ${selected?.is_public !== false ? "bg-emerald-500 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}>
                    {selected?.is_public !== false ? "Public" : "Private"}
                  </button>

                  <button onClick={() => onToggleFeaturedWrapper(selected.id)} className={`px-3 py-1 text-sm rounded-md transition ${selected?.is_featured ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}>
                    {selected?.is_featured ? "⭐ Featured" : "Feature"}
                  </button>

                  <button onClick={() => openEdit(selected)} className="px-3 py-1 text-sm rounded-md border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-800">Edit Metadata</button>
                  <button onClick={() => handleDeleteVideoAndClose(selected)} className="px-3 py-1 text-sm rounded-md bg-rose-600 text-white font-semibold transition hover:bg-rose-500">Delete Asset</button>
                </div>
              </div>

              <div className="w-40 flex-shrink-0">
                <div className="text-slate-400 text-sm mb-1">Current thumbnail</div>
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-700/70 bg-slate-800">
                  <img src={selected.thumbnail_url || selected.public_url || selected.external_url || "https://placehold.co/160x90?text=No+Thumb"} alt="thumb" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* thumbnail tools */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-700/50 pt-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Capture from Video</div>
                <div className="flex gap-2">
                  {/* FIX: Changed bg-transparent to bg-slate-800 */}
                  <input
                    type="number"
                    value={thumbSecond}
                    onChange={(e) => setThumbSecond(e.target.value)}
                    placeholder="Time (sec)"
                    className="w-20 px-2 py-1 text-sm rounded-md bg-slate-800 border border-slate-700/70 text-slate-100"
                  />
                  <button onClick={handleThumbnailCaptureClick} className="flex-1 px-3 py-1 text-sm rounded-md bg-purple-600 text-white font-semibold transition hover:bg-purple-500" disabled={!onUpdateThumbnail}>Capture</button>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-sm mb-1">Upload Custom Thumbnail</div>
                <div className="flex gap-2">
                  <label htmlFor="thumb-file" className="px-3 py-1 text-sm rounded-md border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-800 cursor-pointer">Choose Image</label>
                  <input id="thumb-file" type="file" accept="image/*" className="hidden" onChange={(e) => { handleThumbFile(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                  {/* FIX: Check for the correct prop name: onUploadCustomThumbnail */}
                  <button onClick={handleCustomThumbUpload} className="flex-1 px-3 py-1 text-sm rounded-md bg-sky-500 text-slate-900 font-semibold transition hover:bg-sky-400" disabled={!thumbFile || !onUploadCustomThumbnail}>Upload</button>
                </div>
              </div>
              
              <div className="row-span-2">
                {filePreview && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden border-2 border-amber-400/70 bg-slate-800 mb-2">
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <button onClick={handleRemoveThumbnail} className="w-full px-3 py-1 text-sm rounded-md border border-rose-600/70 bg-transparent text-rose-500 hover:bg-slate-800 mt-1" disabled={!onRemoveThumbnail}>Remove Current Thumbnail</button>
              </div>

            </div>
            {thumbMsg && <div className="text-sm text-center mt-2 text-sky-400">{thumbMsg}</div>}

            {/* Edit Modal Inline */}
            {editingVideo && (
              <div className="mt-4 p-4 rounded-xl border border-amber-400/50 bg-slate-800/50">
                <div className="text-lg font-bold text-amber-400 mb-3">Editing Metadata</div>
                <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
                  {/* FIX: Changed bg-transparent to bg-slate-800 */}
                  <input value={editFields.title} onChange={(e) => setEditField("title", e.target.value)} placeholder="Title" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
                  <textarea value={editFields.description} onChange={(e) => setEditField("description", e.target.value)} rows={3} placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
                  <div className="flex gap-3">
                    <input value={editFields.category} onChange={(e) => setEditField("category", e.target.value)} placeholder="Category" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
                    <input value={editFields.tags} onChange={(e) => setEditField("tags", e.target.value)} placeholder="Tags (comma)" className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />
                  </div>
                  {editingVideo.source_type === "external" && <input value={editFields.external_url} onChange={(e) => setEditField("external_url", e.target.value)} placeholder="External URL" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100" />}
                  <div className="flex gap-3 mt-2">
                    <button type="submit" disabled={editSaving} className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400">
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                    <button type="button" onClick={() => setEditingVideo(null)} className="px-4 py-2 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Close</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
