// src/components/SidebarLibrary.jsx
import React, { useState } from "react";

export default function SidebarLibrary({
  videos,
  selected,
  setSelected,
  loading,
  search,
  setSearch,
  filterType,
  setFilterType,
  canDelete,
  canEdit,
  canTogglePublic,
  canToggleFeatured,
  canReorder,
  onDeleteVideo,
  onEditClick,
  onTogglePublic,
  onToggleFeatured,
  onReorder,
  isAdminView,
}) {
  const [draggingId, setDraggingId] = useState(null);

  const handleDragStart = (id) => { if (canReorder) setDraggingId(id); };
  const handleDragOver = (e) => { if (canReorder) e.preventDefault(); };

  const handleDropOnItem = (e, targetId) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;
    const srcIndex = videos.findIndex((v) => v.id === draggingId);
    const tgtIndex = videos.findIndex((v) => v.id === targetId);
    if (srcIndex === -1 || tgtIndex === -1) return;
    const arr = [...videos];
    const [m] = arr.splice(srcIndex, 1);
    arr.splice(tgtIndex, 0, m);
    onReorder(arr);
    setDraggingId(null);
  };

  const handleDropEnd = (e) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!draggingId) return;
    const srcIndex = videos.findIndex((v) => v.id === draggingId);
    const arr = [...videos];
    const [m] = arr.splice(srcIndex, 1);
    arr.push(m);
    onReorder(arr);
    setDraggingId(null);
  };

  return (
    <aside className="w-full p-4 md:w-1/3">
      <div className="mb-3 space-y-2">
        <input className="w-full rounded-md bg-slate-950 border border-slate-800 px-2 py-1 text-xs" placeholder={isAdminView ? "Search title, desc, tags…" : "Search videos…"} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2 text-[11px]">
          <button onClick={() => setFilterType("all")} className={`flex-1 rounded-full px-2 py-1 ${filterType==="all" ? "bg-emerald-500/10 border-emerald-400 text-emerald-300" : "bg-slate-950 border-slate-700 text-slate-400"}`}>All</button>
          <button onClick={() => setFilterType("uploaded")} className={`flex-1 rounded-full px-2 py-1 ${filterType==="uploaded" ? "bg-sky-500/10 border-sky-400 text-sky-300" : "bg-slate-950 border-slate-700 text-slate-400"}`}>Uploaded</button>
          <button onClick={() => setFilterType("external")} className={`flex-1 rounded-full px-2 py-1 ${filterType==="external" ? "bg-purple-500/10 border-purple-400 text-purple-300" : "bg-slate-950 border-slate-700 text-slate-400"}`}>External</button>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-100">{isAdminView ? "Admin library" : "Library"} {isAdminView && canReorder && <span className="text-[10px] text-slate-400 ml-2">Drag to reorder</span>}</h2>

      {loading ? <p className="text-xs text-slate-400">Loading…</p> : videos.length === 0 ? <p className="text-xs text-slate-500">No videos found.</p> : (
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1" onDragOver={handleDragOver}>
          {videos.map((video) => {
            const isActive = selected && selected.id === video.id;
            const isUploaded = video.source_type === "uploaded";
            const thumb = video.thumbnail_url || (isUploaded ? video.public_url : video.external_url);
            const hidden = video.is_public === false;
            const featured = !!video.is_featured;
            return (
              <div key={video.id} draggable={canReorder} onDragStart={() => handleDragStart(video.id)} onDrop={(e) => handleDropOnItem(e, video.id)} className={`flex gap-2 rounded-xl border p-2 text-xs ${isActive ? "border-emerald-400 bg-emerald-500/8" : "border-slate-800 bg-slate-950/90"}`}>
                <button onClick={() => setSelected(video)} className="flex gap-2 flex-1 text-left">
                  <div className="aspect-video h-16 w-28 overflow-hidden rounded-md bg-black">
                    {thumb ? <img src={thumb} alt={video.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-slate-800" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-2 text-[11px] font-semibold text-slate-100">{video.title}</p>
                      {featured && <span className="text-[10px] text-yellow-300">★</span>}
                    </div>
                    {video.description && <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">{video.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {video.category && <span className="inline-flex rounded-full bg-slate-900 px-2 py-[2px] text-[9px] text-emerald-300">{video.category}</span>}
                      <span className={`inline-flex rounded-full px-2 py-[2px] text-[9px] ${isUploaded ? "bg-sky-500/15 text-sky-300" : "bg-purple-500/15 text-purple-300"}`}>{isUploaded ? "Uploaded" : "External"}</span>
                      <span className="inline-flex rounded-full bg-slate-800 px-2 py-[2px] text-[9px] text-slate-300">{Number(video.view_count || 0)} views</span>
                      {hidden && isAdminView && <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-[2px] text-[9px] text-amber-300">Hidden</span>}
                    </div>
                  </div>
                </button>

                {(canDelete || canEdit || canTogglePublic || canToggleFeatured) && (
                  <div className="flex flex-col gap-1 self-start">
                    {canTogglePublic && <button onClick={() => onTogglePublic(video)} className="rounded-md border px-2 py-[2px] text-[10px]"> {video.is_public === false ? "👁" : "🚫"}</button>}
                    {canToggleFeatured && <button onClick={() => onToggleFeatured(video)} className="rounded-md border px-2 py-[2px] text-[10px]">{video.is_featured ? "★" : "☆"}</button>}
                    {canEdit && <button onClick={() => onEditClick(video)} className="rounded-md border px-2 py-[2px] text-[10px]">✏</button>}
                    {canDelete && <button onClick={() => onDeleteVideo(video)} className="rounded-md border px-2 py-[2px] text-[10px]">🗑</button>}
                  </div>
                )}
              </div>
            );
          })}
          {canReorder && <div onDrop={handleDropEnd} onDragOver={handleDragOver} className="mt-1 h-6 rounded-md border border-dashed border-slate-700 text-[10px] text-center text-slate-500 flex items-center justify-center">Drop here to move to end</div>}
        </div>
      )}
    </aside>
  );
}
