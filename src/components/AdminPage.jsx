/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence } from "framer-motion";

// --- SKELETON LOADER FOR LIBRARY ---
const LibraryListSkeleton = () => (
  <div className="space-y-2">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="flex gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse">
        <div className="w-5 h-5 bg-white/5 rounded-md flex-shrink-0" />
        <div className="w-14 h-9 bg-white/5 rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 bg-white/5 rounded w-3/4" />
          <div className="h-1.5 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * UI PRIMITIVES: GLASS MODAL (Compacted)
 */
const ModalBase = ({ title, onClose, children, size = "max-w-lg" }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" 
      onClick={onClose} 
    />
    <motion.div 
      initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`relative z-[110] w-full ${size} rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-emerald-900/20 backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors">✕</button>
      </div>
      {children}
    </motion.div>
  </div>
);

/**
 * UI PRIMITIVES: LIBRARY CARD
 */
function LibraryCard({ item, selected, setSelected, toggleSelect, selectedIds, handleDragStart, handleDragOver, handleDrop, isDragging, isSortable, permanentOrder }) {
  const thumb = item.thumbnail_url || item.public_url || item.external_url || null;
  const active = selected && selected.id === item.id;
  const isSelectedForBulk = selectedIds.has(item.id);

  return (
    <div
      onClick={() => setSelected(item)}
      draggable={isSortable}
      onDragStart={isSortable ? (e) => handleDragStart(e, item.id) : undefined}
      onDragOver={isSortable ? handleDragOver : undefined}
      onDrop={isSortable ? (e) => handleDrop(e, item.id) : undefined}
      className={`group flex gap-3 p-2 rounded-xl cursor-pointer items-center transition-all duration-200 border relative select-none
        ${active ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/5"}
        ${isSelectedForBulk ? "ring-1 ring-emerald-500 bg-emerald-500/5" : ""}
        ${isDragging ? "opacity-30 border-dashed border-emerald-500 scale-95" : ""}
      `}
    >
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-6">
        <span className="text-[9px] font-black text-slate-500 w-full text-center tabular-nums">{permanentOrder}</span>
        {isSortable && <div className="text-slate-600 group-hover:text-emerald-500 transition-colors text-[10px] cursor-grab active:cursor-grabbing">⠿</div>}
      </div>

      <div className="w-16 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-black relative ring-1 ring-white/10 shadow-sm">
        {thumb ? (
            <img src={thumb} alt={item.title || item.id} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[8px] text-slate-500 font-mono">NO IMG</div>
        )}
        <div className="absolute top-0 right-0 m-0.5 flex gap-0.5">
            {item.is_featured && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]" />}
            {item.is_public !== false && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`font-bold truncate text-[11px] leading-tight ${active ? "text-emerald-400" : "text-slate-200"}`}>{item.title || `#${item.id}`}</div>
        <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1 flex gap-2 items-center">
            <span className="text-emerald-500/60 truncate max-w-[80px]">{item.category || "General"}</span>
            <span className="opacity-20">|</span>
            <span className="truncate">{item.source_type}</span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border text-[10px]
          ${isSelectedForBulk ? "bg-emerald-500 border-emerald-500 text-slate-950 font-black" : "bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10"}`}
      >
        {isSelectedForBulk ? "✓" : "+"}
      </button>
    </div>
  );
}

// Tab Hook
const useTabState = (defaultTab) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const TabButton = ({ tab, children }) => (
        <button
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all 
                ${activeTab === tab 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" 
                : "text-slate-500 hover:text-white hover:bg-white/5"
            }`}
        >
            {children}
        </button>
    );
    return { activeTab, setActiveTab, TabButton };
};

/* ===========================
    Main AdminPage component
   =========================== */
export default function AdminPage(props) {
  const {
    videos = [], rawVideos = [], selected = null, setSelected = () => {}, loading = false, fetchError = null,
    search = "", setSearch = () => {}, filterType = "all", setFilterType = () => {},
    extTitle = "", setExtTitle = () => {}, extDescription = "", setExtDescription = () => {}, extCategory = "", setExtCategory = () => {}, extTags = "", setExtTags = () => {}, extUrl = "", setExtUrl = () => {}, savingExternal = false,
    upTitle = "", setUpTitle = () => {}, upDescription = "", setUpDescription = () => {}, upCategory = "", setUpCategory = () => {}, upTags = "", setUptags = () => {}, setUpFile = () => {}, uploading = false,
    onAddExternal, onUpload, onDeleteVideo, onUpdateVideo, onUpdateThumbnail, onTogglePublic, onToggleFeatured, onReorder, isAdminAuthed, onAdminLogin, onRemoveThumbnail, onUploadCustomThumbnail,
    setUpPosition, upPosition, setExtPosition, extPosition,
    onVideoPlayed = () => {}
  } = props;

  // --- Local State ---
  const [localVideos, setLocalVideos] = useState(Array.isArray(videos) ? videos.slice() : []);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editFields, setEditFields] = useState({ title: "", description: "", category: "", tags: "", external_url: "", file_path: "", thumbnail_path: "" });
  const [editSaving, setEditSaving] = useState(false);
  
  const [reorderConfirmed, setReorderConfirmed] = useState(false);
  const [draggedItemIds, setDraggedItemIds] = useState([]); 
  const [showReorderModal, setShowReorderModal] = useState(false);

  const [newPosition, setNewPosition] = useState(""); 

  const [inputPassword, setInputPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingUploadName, setPendingUploadName] = useState("");

  const [thumbSecond, setThumbSecond] = useState(7);
  const [thumbFile, setThumbFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [thumbMsg, setThumbMsg] = useState("");
  
  const { activeTab, setActiveTab, TabButton } = useTabState('metadata');
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Resizer State
  const [leftWidth, setLeftWidth] = useState(30); 
  const [rightWidth, setRightWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizer, setActiveResizer] = useState(null); 

  const leftWidthRef = useRef(leftWidth);
  const rightWidthRef = useRef(rightWidth);
  const animationRef = useRef(null); 

  useEffect(() => { leftWidthRef.current = leftWidth; }, [leftWidth]);
  useEffect(() => { rightWidthRef.current = rightWidth; }, [rightWidth]);

  // Resizer Logic
  const stopResize = useCallback(() => {
    setIsResizing(false); setActiveResizer(null); document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleResize); document.removeEventListener('mouseup', stopResize);
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
  }, []);

  const handleResize = useCallback((e) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => {
        if (!isResizing || !activeResizer) return;
        const mainContainer = document.querySelector('.main-three-pane-container');
        if (!mainContainer) return;
        const containerRect = mainContainer.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const minPanelWidth = 10;
        
        if (activeResizer === 'left') {
            const p = ((e.clientX - containerRect.left) / totalWidth) * 100;
            setLeftWidth(Math.max(minPanelWidth, Math.min(p, 100 - rightWidthRef.current - minPanelWidth)));
        } else if (activeResizer === 'right') {
            const p = ((containerRect.right - e.clientX) / totalWidth) * 100;
            setRightWidth(Math.max(minPanelWidth, Math.min(p, 100 - leftWidthRef.current - minPanelWidth)));
        }
        animationRef.current = null;
    });
  }, [isResizing, activeResizer]);

  const startResize = useCallback((e, resizer) => {
    if (window.innerWidth < 1024) return;
    e.preventDefault(); setIsResizing(true); setActiveResizer(resizer);
    document.body.style.cursor = 'col-resize'; 
    document.addEventListener('mousemove', handleResize); document.addEventListener('mouseup', stopResize);
  }, [handleResize, stopResize]);
  
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize); document.removeEventListener('mouseup', stopResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [handleResize, stopResize]); 

  // Stabilized List Sync
  useEffect(() => {
    setLocalVideos(Array.isArray(videos) ? videos.slice() : []);
    setReorderConfirmed(false); 
  }, [videos]);

  useEffect(() => {
    if (!selected && Array.isArray(localVideos) && localVideos.length > 0) setSelected(localVideos[0]);
  }, [localVideos]);

  // Editor Reset
  useEffect(() => {
    setEditingVideo(null); setThumbFile(null); setFilePreview(null); setThumbMsg("");
    if (selected) setActiveTab('metadata');
  }, [selected?.id]);

  // Filtering
  const { total, filtered, isSortable } = useMemo(() => {
    const total = Array.isArray(rawVideos) ? rawVideos.length : 0;
    const q = (search || "").trim().toLowerCase();
    const isSortable = !q && filterType === "all" && filterStatus === "all"; 
    const sourceList = isSortable ? localVideos : (Array.isArray(videos) ? videos : []);
    
    const filteredList = sourceList.filter((v) => {
      const hay = `${v.title || ""} ${v.description || ""} ${v.tags || ""}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesType = filterType === "all" || v.source_type === filterType;
      let matchesStatus = true;
      if (filterStatus === 'public') matchesStatus = v.is_public !== false;
      else if (filterStatus === 'private') matchesStatus = v.is_public === false;
      else if (filterStatus === 'featured') matchesStatus = v.is_featured === true;
      else if (filterStatus === 'unfeatured') matchesStatus = v.is_featured !== true; 
      return matchesSearch && matchesType && matchesStatus;
    });
    return { total, filtered: filteredList, isSortable };
  }, [rawVideos, videos, localVideos, search, filterType, filterStatus]);

  // Drag and Drop
  const handleDragStart = (e, id) => {
    if (!isSortable) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id);
    if (selectedIds.has(id) && selectedIds.size > 1) {
        setDraggedItemIds(localVideos.filter(v => selectedIds.has(v.id)).map(v => v.id));
    } else {
        setSelectedIds(new Set()); setDraggedItemIds([id]);
    }
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, targetId) => {
    e.preventDefault(); const draggedIds = draggedItemIds; setDraggedItemIds([]); 
    if (draggedIds.length === 0 || draggedIds.includes(targetId) || !isSortable) return;
    const movedItems = localVideos.filter(v => draggedIds.includes(v.id));
    const remainingVideos = localVideos.filter(v => !draggedIds.includes(v.id));
    const targetIndex = remainingVideos.findIndex(v => v.id === targetId);
    let insertionIndex = targetIndex === -1 ? remainingVideos.length : targetIndex;
    
    setLocalVideos([...remainingVideos.slice(0, insertionIndex), ...movedItems, ...remainingVideos.slice(insertionIndex)]);
    setReorderConfirmed(false);
  };
  
  const saveOrder = async () => {
    if (!isSortable) return;
    if (!reorderConfirmed) { alert("Please confirm the order change."); return; }
    const reorderPayload = localVideos.map((v, index) => ({ id: v.id, order_index: index }));
    try { await Promise.resolve(onReorder(reorderPayload)); alert("Order saved."); setReorderConfirmed(false); setShowReorderModal(false); } 
    catch (err) { console.error("saveOrder failed", err); alert("Failed saving order."); }
  };

  // Upload/Add
  const onHeaderFilePicked = (file) => {
    if (!file) return; setPendingUploadFile(file); setPendingUploadName(file.name);
    setUpTitle(file.name.replace(/\.[^/.]+$/, ""));
    setShowUploadModal(true);
  };
  const submitHeaderUpload = async (e) => {
    e.preventDefault();
    if (!pendingUploadFile) return;
    try { setUpFile(pendingUploadFile); } catch (err) { console.warn("setUpFile failed", err); }
    try {
      const position = Number(upPosition) || 0;
      const res = onUpload.length >= 2 ? onUpload({ preventDefault: () => {} }, position) : onUpload();
      await Promise.resolve(res);
      setShowUploadModal(false); setPendingUploadFile(null); setPendingUploadName("");
    } catch (err) { console.error("header upload failed", err); alert("Upload failed."); }
  };
  const submitExternalAdd = async (e) => {
    e.preventDefault();
    const position = Number(extPosition) || 0;
    await onAddExternal(e, position); setShowAddModal(false); setExtPosition(""); 
  };
  
  // Toggles
  const onTogglePublicWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id); if (idx === -1) return;
    const prev = localVideos[idx]; const next = { ...prev, is_public: prev.is_public === false ? true : false };
    const copy = localVideos.slice(); copy[idx] = next; setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);
    try { await Promise.resolve(onTogglePublic(prev)); } 
    catch (err) { setLocalVideos(localVideos); if (selected?.id === id) setSelected(prev); alert("Failed to toggle public."); }
  };
  const onToggleFeaturedWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id); if (idx === -1) return;
    const prev = localVideos[idx]; const next = { ...prev, is_featured: !prev.is_featured };
    const copy = localVideos.slice(); copy[idx] = next; setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);
    try { await Promise.resolve(onToggleFeatured(prev)); } 
    catch (err) { setLocalVideos(localVideos); if (selected?.id === id) setSelected(prev); alert("Failed to toggle featured."); }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const clearSelection = () => setSelectedIds(new Set());
  const applyBulk = async (action) => {
    if (selectedIds.size === 0) { alert("No items selected"); return; }
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.size} item(s)?`)) return;
    try {
      for (const id of selectedIds) {
        const video = localVideos.find(v => v.id === id);
        if (!video) continue;
        if (action === "delete") await onDeleteVideo(video);
        else if (action === "feature") await onToggleFeaturedWrapper(id);
        else if (action === "public") await onTogglePublicWrapper(id);
      }
      clearSelection();
    } catch (err) { console.error("bulk action failed", err); alert("Bulk action failed."); }
  };

  // Login Handler
  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!envPass) { setLoginError("VITE_ADMIN_PASSWORD not set"); return; }
    if (inputPassword === envPass) { setLoginError(""); setInputPassword(""); onAdminLogin && onAdminLogin(); }
    else setLoginError("Incorrect password");
  };

  const handleDeleteVideoAndClose = (video) => { 
    if (!window.confirm(`Are you sure you want to delete "${video.title || video.id}"? This cannot be undone.`)) return;
    onDeleteVideo(video); setSelected(null);
  };
  
  // Edit logic
  const openEdit = (video) => {
    setEditingVideo(video);
    setEditFields({
      title: video?.title || "", description: video?.description || "", category: video?.category || "", tags: video?.tags || "", external_url: video?.external_url || "",
      file_path: video?.file_path || "", thumbnail_path: video?.thumbnail_path || ""
    });
    const currentIndex = localVideos.findIndex(v => v.id === video.id);
    setNewPosition(currentIndex !== -1 ? String(currentIndex + 1) : String(localVideos.length + 1));
  };
  const setEditField = (k, v) => setEditFields((p) => ({ ...p, [k]: v }));
  
  const handleEditSubmit = async (e) => {
    e?.preventDefault(); if (!editingVideo) return;
    setEditSaving(true);
    const payload = {
      title: editFields.title?.trim() || null, description: editFields.description?.trim() || null, category: editFields.category?.trim() || null, tags: editFields.tags?.trim() || null,
    };
    if (editingVideo.source_type === "external") payload.external_url = editFields.external_url?.trim() || null;
    if (editFields.thumbnail_path !== undefined) payload.thumbnail_path = editFields.thumbnail_path.trim() || null;
    if (editFields.file_path !== undefined) payload.file_path = editFields.file_path.trim() || null;

    try {
      await onUpdateVideo(editingVideo.id, payload);
      setLocalVideos((prev) => prev.map((p) => (p.id === editingVideo.id ? { ...p, ...payload } : p)));
      if (selected?.id === editingVideo.id) setSelected((s) => (s ? { ...s, ...payload } : s));
      setEditingVideo(null); 
    } catch (err) { console.error("save edit", err); alert("Failed to save changes."); } 
    finally { setEditSaving(false); }
  };

  const handleMoveVideo = () => {
    if (!editingVideo || !isSortable) { alert(isSortable ? "No video selected." : "Clear filters first."); return; }
    const current1BasedIndex = localVideos.findIndex(v => v.id === editingVideo.id) + 1;
    const new1BasedIndex = Number(newPosition);
    if (isNaN(new1BasedIndex) || new1BasedIndex < 1 || new1BasedIndex > localVideos.length) return alert(`Invalid position.`);
    if (current1BasedIndex === new1BasedIndex) return alert("Same position.");
    const targetIndex = new1BasedIndex - 1;
    const videoToMove = localVideos.find(v => v.id === editingVideo.id);
    const listWithoutVideo = localVideos.filter(v => v.id !== editingVideo.id);
    const newVideos = [...listWithoutVideo.slice(0, targetIndex), videoToMove, ...listWithoutVideo.slice(targetIndex)];
    setLocalVideos(newVideos); setReorderConfirmed(false); setSelected(videoToMove); alert(`Moved locally. Save Order to persist.`);
  };

  const handleThumbnailCaptureClick = async () => {
    if (!selected || !onUpdateThumbnail) return;
    try { await onUpdateThumbnail(selected, Number(thumbSecond) || 7); setThumbMsg("Capture requested."); }
    catch (err) { console.error("capture thumbnail", err); setThumbMsg("Capture failed."); }
  };
  const handleThumbFile = (file) => {
    setThumbFile(file || null); setThumbMsg(""); setFilePreview(null);
    if (!file) return;
    const r = new FileReader(); r.onload = () => setFilePreview(String(r.result)); r.readAsDataURL(file);
  };
  const handleCustomThumbUpload = async () => {
    if (!thumbFile || !selected) { setThumbMsg("Select image/video."); return; }
    if (typeof onUploadCustomThumbnail === "function") {
      try { await onUploadCustomThumbnail(selected.id, thumbFile); setThumbMsg("Upload succeeded."); setThumbFile(null); setFilePreview(null); }
      catch (err) { console.error("onUploadCustomThumbnail failed", err); setThumbMsg("Upload failed."); } return;
    }
    setThumbMsg("onUploadCustomThumbnail not implemented.");
  };
  const handleRemoveThumbnail = async () => {
    if (!selected) return;
    if (typeof onRemoveThumbnail === "function") {
      try { await onRemoveThumbnail(selected.id); setThumbMsg("Thumbnail removed."); }
      catch (err) { console.error("onRemoveThumbnail failed", err); setThumbMsg("Failed remove."); }
    } else setThumbMsg("onRemoveThumbnail not implemented.");
  };
  
  // ==========================================
  //  LOGIN SCREEN
  // ==========================================
  if (!isAdminAuthed) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617] text-slate-100 relative overflow-hidden font-sans selection:bg-emerald-500/30">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-md p-8 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-2xl shadow-2xl shadow-emerald-900/20"
        >
          <div className="flex flex-col items-center mb-8">
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-2">Restricted Access</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input 
              type="password" 
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)} 
              placeholder="Enter Access Key" 
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white placeholder:text-slate-600 focus:border-emerald-500/50 outline-none transition-all tracking-widest"
              autoFocus
            />
            
            {loginError && (
              <div className="text-rose-500 text-xs text-center font-bold uppercase tracking-wide bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              Authenticate
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  //  MAIN DASHBOARD
  // ==========================================
  return (
    <main className="h-screen flex flex-col bg-[#020617] text-slate-100 overflow-hidden relative isolate font-sans selection:bg-emerald-500/30">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-slate-950/40 border-b border-white/5 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="text-lg font-black tracking-tighter uppercase text-white"> <span className="text-emerald-500 text-sm">Admin Terminal</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="px-6 py-2.5 rounded-full bg-[#0B1120] border border-white/10 hover:border-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">Link External</button>
          <label className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            Upload Asset
            <input type="file" accept="video/*" className="hidden" onChange={(e) => onHeaderFilePicked(e.target.files[0])} />
          </label>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden main-three-pane-container">
        
        {/* LEFT: LIBRARY */}
        <aside style={{ width: `${leftWidth}%` }} className="flex flex-col bg-slate-950/20 border-r border-white/5 backdrop-blur-sm p-4 overflow-hidden min-w-[220px]">
          <div className="mb-4 space-y-2">
            <div className="relative">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter library..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600" />
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">🔍</span>
            </div>
            <div className="flex gap-2">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-2 py-2 text-[10px] font-black uppercase text-slate-400 outline-none cursor-pointer hover:bg-white/10">
                    <option value="all" className="bg-slate-900">All Sources</option>
                    <option value="uploaded" className="bg-slate-900">Uploaded</option>
                    <option value="external" className="bg-slate-900">External</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-2 py-2 text-[10px] font-black uppercase text-slate-400 outline-none cursor-pointer hover:bg-white/10">
                    <option value="all" className="bg-slate-900">All Status</option>
                    <option value="public" className="bg-slate-900">Public</option>
                    <option value="private" className="bg-slate-900">Private</option>
                    <option value="featured" className="bg-slate-900">Featured</option>
                </select>
            </div>
            <button onClick={() => setShowReorderModal(true)} className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${isSortable ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-500 opacity-50 cursor-not-allowed'}`} disabled={!isSortable}>
                {isSortable ? "Save Grid Order" : "Clear Filters to Reorder"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? <LibraryListSkeleton /> : (
                filtered.map((v, i) => {
                   const permIndex = localVideos.findIndex(lv => lv.id === v.id) + 1;
                   return (
                    <LibraryCard key={v.id} item={v} selected={selected} setSelected={setSelected} toggleSelect={toggleSelect} selectedIds={selectedIds} isSortable={isSortable} permanentOrder={permIndex} handleDragStart={handleDragStart} handleDragOver={(e)=>e.preventDefault()} handleDrop={handleDrop} isDragging={draggedItemIds.includes(v.id)} />
                   );
                })
            )}
          </div>

          {selectedIds.size > 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
               <div className="text-[10px] font-black uppercase text-emerald-400 mb-2">{selectedIds.size} Assets Selected</div>
               <div className="flex gap-1">
                 <button onClick={() => applyBulk('public')} className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[9px] font-black uppercase hover:bg-emerald-400 transition-colors">Public</button>
                 <button onClick={() => applyBulk('delete')} className="flex-1 py-1.5 rounded-lg bg-rose-500 text-white text-[9px] font-black uppercase hover:bg-rose-600 transition-colors">Delete</button>
                 <button onClick={() => setSelectedIds(new Set())} className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-[9px] font-black uppercase hover:bg-white/20 transition-colors">Clear</button>
               </div>
            </motion.div>
          )}
        </aside>

        <div className="w-1.5 cursor-col-resize bg-transparent hover:bg-emerald-500/50 transition-colors z-20" onMouseDown={(e) => startResize(e, 'left')} />

        {/* CENTER: STAGE */}
        <section className="flex-1 min-w-0 flex flex-col p-6 bg-slate-950/10 overflow-y-auto">
          {selected ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto w-full space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest">{selected.source_type}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest">ID: {selected.id}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight max-w-2xl">{selected.title}</h2>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                   <button onClick={() => onTogglePublicWrapper(selected.id)} className={`p-2 rounded-lg border transition-all ${selected.is_public !== false ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>👁️</button>
                   <button onClick={() => onToggleFeaturedWrapper(selected.id)} className={`p-2 rounded-lg border transition-all ${selected.is_featured ? 'bg-amber-400 border-amber-400 text-slate-950' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>⭐</button>
                   <button onClick={() => handleDeleteVideoAndClose(selected)} className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>

              <div className="rounded-[2rem] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl shadow-black/50 aspect-video">
                <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center backdrop-blur-sm">
                  <div className="text-lg font-black text-white">{selected.view_count || 0}</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Registry Hits</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center backdrop-blur-sm">
                  <div className="text-lg font-black text-white truncate px-2">{selected.category || 'N/A'}</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Class</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center backdrop-blur-sm">
                  <div className="text-lg font-black text-white uppercase">{new Date(selected.created_at).getFullYear()}</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Era</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Select Asset to Inspect</div>
          )}
        </section>

        <div className="w-1.5 cursor-col-resize bg-transparent hover:bg-emerald-500/50 transition-colors z-20" onMouseDown={(e) => startResize(e, 'right')} />

        {/* RIGHT: EXPANDED INSPECTOR */}
        <aside style={{ width: `${rightWidth}%` }} className="flex flex-col bg-slate-950/20 border-l border-white/5 backdrop-blur-sm p-4 overflow-hidden min-w-[220px]">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2 text-right">Data Inspector</div>
          
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-4">
            {['metadata', 'thumbnail', 'raw'].map(t => (
              <TabButton key={t} tab={t}>{t}</TabButton>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {selected && activeTab === 'metadata' && (
              <div className="space-y-6">
                <button onClick={() => editingVideo ? handleEditSubmit() : openEdit(selected)} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${editingVideo ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {editingVideo ? (editSaving ? 'Syncing...' : '💾 Commit Changes') : '✎ Modify Metadata'}
                </button>
                
                {editingVideo && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Primary Info */}
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-600 uppercase ml-2 tracking-widest">Asset Name</label>
                        <input value={editFields.title} onChange={(e) => setEditFields({...editFields, title: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs outline-none focus:border-emerald-500/50 transition-colors" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-600 uppercase ml-2 tracking-widest">Summary</label>
                        <textarea value={editFields.description} onChange={(e) => setEditFields({...editFields, description: e.target.value})} rows={3} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs outline-none resize-none focus:border-emerald-500/50 transition-colors" />
                    </div>
                    
                    {/* EXPANDED FIELDS (Links/Paths) */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-emerald-500 uppercase ml-2 tracking-widest">Video URL (External)</label>
                            <input value={editFields.external_url} onChange={(e) => setEditFields({...editFields, external_url: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-slate-400 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-emerald-500 uppercase ml-2 tracking-widest">Storage File Path</label>
                            <input value={editFields.file_path} onChange={(e) => setEditFields({...editFields, file_path: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-slate-400 outline-none" />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-sky-500 uppercase ml-2 tracking-widest">Thumb URL (Read-only)</label>
                            <input value={selected.thumbnail_url || ""} readOnly className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-slate-500 outline-none cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-sky-500 uppercase ml-2 tracking-widest">Thumb Storage Path</label>
                            <input value={editFields.thumbnail_path} onChange={(e) => setEditField("thumbnail_path", e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-slate-400 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-600 uppercase ml-2 tracking-widest">Class</label>
                          <input value={editFields.category} onChange={(e) => setEditField("category", e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-600 uppercase ml-2 tracking-widest">Tags</label>
                          <input value={editFields.tags} onChange={(e) => setEditFields({...editFields, tags: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs outline-none" />
                       </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-1">
                        <label className="text-[8px] font-black text-purple-500 uppercase ml-2 tracking-widest">List Rank Position</label>
                        <div className="flex gap-2">
                            <input type="number" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} className="w-20 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs outline-none text-center" />
                            <button onClick={handleMoveVideo} className="flex-1 py-2 rounded-lg bg-purple-600/20 text-purple-400 text-[9px] font-black uppercase border border-purple-500/20 hover:bg-purple-600/40 transition-all">Move Asset</button>
                        </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
            {selected && activeTab === 'thumbnail' && (
              <div className="space-y-4">
                 <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative shadow-lg">
                   <img src={filePreview || selected.thumbnail_url || selected.public_url || selected.external_url} className="w-full h-full object-cover" alt="Preview" />
                 </div>
                 <div className="space-y-3">
                    <div className="flex gap-1">
                      <input type="number" value={thumbSecond} onChange={(e) => setThumbSecond(e.target.value)} className="w-12 px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-xs outline-none text-center" />
                      <button onClick={handleThumbnailCaptureClick} className="flex-1 py-2 rounded-lg bg-emerald-500 text-slate-950 text-[9px] font-black uppercase hover:bg-emerald-400 transition-colors">Capture from Video</button>
                    </div>
                    <div className="flex gap-1">
                        <label className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-[9px] font-black uppercase text-center cursor-pointer hover:bg-white/10 transition-all">
                          {thumbFile ? `✓ ${thumbFile.name.substring(0, 10)}...` : 'Upload File'}
                          <input type="file" className="hidden" onChange={(e) => handleThumbFile(e.target.files[0])} />
                        </label>
                        {thumbFile && (
                           <button onClick={handleCustomThumbUpload} className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20">Push</button>
                        )}
                    </div>
                    <button onClick={handleRemoveThumbnail} className="w-full py-2.5 rounded-lg bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20">Purge Thumbnail</button>
                 </div>
                 {thumbMsg && <div className="p-3 rounded-xl bg-white/5 text-slate-400 text-[10px] text-center font-bold">{thumbMsg}</div>}
              </div>
            )}

            {selected && activeTab === 'raw' && (
                <pre className="text-[9px] p-4 rounded-2xl bg-black/40 border border-white/5 text-emerald-400/70 overflow-x-auto custom-scrollbar font-mono">
                    {JSON.stringify(selected, null, 2)}
                </pre>
            )}
          </div>
        </aside>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showAddModal && (
          <ModalBase title="Link External Asset" onClose={() => setShowAddModal(false)}>
            <form onSubmit={submitExternalAdd} className="space-y-3">
              <input value={extUrl} onChange={(e) => setExtUrl(e.target.value)} placeholder="Video Stream URL" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-emerald-500 outline-none" required />
              <input value={extTitle} onChange={(e) => setExtTitle(e.target.value)} placeholder="Display Title" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-emerald-500 outline-none" required />
              <textarea value={extDescription} onChange={(e) => setExtDescription(e.target.value)} placeholder="Asset Summary" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-emerald-500 outline-none resize-none" />
              
              <div className="grid grid-cols-2 gap-3">
                  <input value={extCategory} onChange={(e) => setExtCategory(e.target.value)} placeholder="Category" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
                  <input type="number" value={extPosition} onChange={(e) => setExtPosition(e.target.value)} placeholder="Rank" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
              </div>

              <div className="pt-3 border-t border-white/5">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Optional Thumbnail</p>
                 <input value={editFields.thumbnail_url} onChange={(e) => setEditFields({...editFields, thumbnail_url: e.target.value})} placeholder="Thumbnail URL" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none mb-2" />
                 <label className="block w-full py-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-[10px] font-black text-center cursor-pointer hover:bg-white/10 uppercase tracking-widest">
                    {thumbFile ? `✓ ${thumbFile.name}` : "Upload Custom Frame"}
                    <input type="file" className="hidden" onChange={(e) => setThumbFile(e.target.files[0])} />
                 </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 shadow-lg shadow-emerald-500/20">{savingExternal ? 'Syncing...' : 'Initialize Asset'}</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/10">Abort</button>
              </div>
            </form>
          </ModalBase>
        )}

        {showUploadModal && (
          <ModalBase title="Local Pipeline Upload" onClose={() => setShowUploadModal(false)}>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 uppercase font-bold tracking-widest">Target: <span className="text-white">{pendingUploadName}</span></div>
              <input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} placeholder="Asset Title" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
              <div className="grid grid-cols-2 gap-3">
                  <input value={upCategory} onChange={(e) => setUpCategory(e.target.value)} placeholder="Category" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
                  <input type="number" value={upPosition} onChange={(e) => setUpPosition(e.target.value)} placeholder="Rank" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none" />
              </div>
              <textarea value={upDescription} onChange={(e) => setUpDescription(e.target.value)} placeholder="Summary" rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none resize-none" />
              <button onClick={submitHeaderUpload} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">{uploading ? 'Transferring...' : 'Deploy Asset'}</button>
            </div>
          </ModalBase>
        )}

        {showReorderModal && (
          <ModalBase title="Commit Sequence" onClose={() => setShowReorderModal(false)} size="max-w-sm">
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-black uppercase tracking-widest leading-loose">
                Manual reorder overwrites server indices.
              </div>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <input type="checkbox" checked={reorderConfirmed} onChange={(e) => setReorderConfirmed(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-800 text-emerald-500" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">I verify sequence</span>
              </label>
              <button onClick={saveOrder} disabled={!reorderConfirmed} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-30 transition-all">💾 Update Registry</button>
            </div>
          </ModalBase>
        )}
      </AnimatePresence>
    </main>
  );
}
