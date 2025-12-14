/* eslint-disable no-irregular-whitespace */
// src/components/AdminPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"; // ADDED useRef
import VideoPlayer from "./VideoPlayer";

/* ===========================
    UI primitives using Tailwind (Compacted Design)
    =========================== */

// ModalBase - Reduced size and padding
const ModalBase = ({ title, onClose, children, size = "max-w-xl" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-50 w-full ${size} rounded-lg border border-sky-700/50 bg-slate-900 p-4 shadow-xl shadow-sky-900/50`}>
      <div className="mb-3 flex items-center justify-between border-b border-slate-700/50 pb-2">
        <h3 className="text-lg font-bold text-sky-400">{title}</h3>
        <button onClick={onClose} className="rounded-full h-7 w-7 flex items-center justify-center border border-slate-700 bg-transparent text-slate-400 transition hover:bg-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* LibraryCard - Reduced spacing, smaller thumbnail, smaller fonts */
function LibraryCard({ item, index, selected, setSelected, toggleSelect, selectedIds, handleDragStart, handleDragOver, handleDrop, isDragging, isSortable, permanentOrder }) {
  const thumb = item.thumbnail_url || item.public_url || item.external_url || null;
  const active = selected && selected.id === item.id;
  const isSelectedForBulk = selectedIds.has(item.id);

  return (
    <div
      onClick={() => setSelected(item)}
      // Drag and drop properties are active only when isSortable
      draggable={isSortable}
      onDragStart={isSortable ? (e) => handleDragStart(e, item.id) : undefined}
      onDragOver={isSortable ? handleDragOver : undefined}
      onDrop={isSortable ? (e) => handleDrop(e, item.id) : undefined}
      // Tailwind classes (Compacted)
      className={`
        flex gap-2 p-2 rounded-lg cursor-pointer items-center transition duration-200
        bg-slate-800 border
        ${active ? "border-sky-500 shadow-md shadow-sky-900/20" : "border-slate-700/70 hover:border-slate-600"}
        ${isSelectedForBulk ? "ring-2 ring-offset-2 ring-sky-600/50 ring-offset-slate-800" : ""}
        ${isSortable ? "cursor-grab" : ""}
        ${isDragging ? "opacity-30 border-dashed border-2 border-amber-400" : ""}
      `}
    >
      {/* Index is now ALWAYS visible for context, and the structure ensures consistent alignment. */}
      <div className="flex items-center gap-1 flex-shrink-0">
          {/* Index (w-4) is always rendered, using the permanentOrder which is the item's position in the full list. */}
          <span className="font-bold text-sm text-sky-400 w-4 flex-shrink-0 text-right">{permanentOrder}.</span>
          
          {/* Drag Handle is visible only when sortable */}
          {isSortable ? (
              <div className="text-slate-500 hover:text-amber-400 cursor-grab px-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
          ) : (
              // Placeholder to maintain the same space for the drag handle when sorting is disabled, preventing UI jump
              <div className="w-3 flex-shrink-0 px-0.5"></div>
          )}
      </div>

      <div className="w-14 h-9 flex-shrink-0 rounded-md overflow-hidden bg-slate-700 relative">
        {thumb ? <img src={thumb} alt={item.title || item.id} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-500 text-[10px] text-center p-0.5">No thumb</div>}
        <div className="absolute top-0 right-0 m-0.5 flex gap-0.5">
            {item.is_featured && <span className="text-[10px] bg-amber-400/90 text-slate-900 rounded px-0.5 leading-tight shadow">⭐</span>}
            {item.is_public !== false && <span className="text-[10px] bg-emerald-500/90 text-slate-900 rounded px-0.5 leading-tight shadow">PUB</span>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold truncate text-xs">{item.title || `#${item.id}`}</div>
        <div className="text-[10px] text-slate-400 mt-0.5 flex gap-1 items-center">
            <span className="text-sky-400">{item.category}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-500">{item.source_type}</span>
        </div>
      </div>

      {/* Selection button is always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
        className={`px-2 py-0.5 text-[10px] rounded-md transition flex-shrink-0 w-12
          ${isSelectedForBulk ? "bg-sky-500 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}
        aria-pressed={isSelectedForBulk}
      >
        {isSelectedForBulk ? "✓ Bulk" : "Select"}
      </button>
    </div>
  );
}

// Custom hook to manage the tab state
const useTabState = (defaultTab) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const TabButton = ({ tab, children }) => (
        <button
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-semibold border-b-2 transition 
                ${activeTab === tab 
                ? "border-sky-400 text-sky-400" 
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700/70"
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
    onAddExternal = async (e, position) => { e?.preventDefault?.(); console.warn("onAddExternal not provided or needs position arg"); },
    onUpload = async (e, position) => { e?.preventDefault?.(); console.warn("onUpload not provided or needs position arg"); },
    onDeleteVideo = async (id) => console.warn("onDeleteVideo not provided", id),
    onUpdateVideo = async (id, fields) => console.warn("onUpdateVideo not provided", id, fields),
    onUpdateThumbnail = async (video, sec) => console.warn("onUpdateThumbnail not provided", video?.id, sec),
    onTogglePublic = async (id) => console.warn("onTogglePublic not provided", id),
    onToggleFeatured = async (id) => console.warn("onToggleFeatured not provided", id),
    onReorder = (ids) => console.warn("onReorder not provided or needs ids arg"),
    onVideoPlayed = () => {},
    isAdminAuthed = false, onAdminLogin = () => {}, onRemoveThumbnail, onUploadCustomThumbnail, 
  } = props;

  // -------------------------
  // Local UI state
  // -------------------------
  const [localVideos, setLocalVideos] = useState(Array.isArray(videos) ? videos.slice() : []);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editFields, setEditFields] = useState({ title: "", description: "", category: "", tags: "", external_url: "" });
  const [editSaving, setEditSaving] = useState(false);
  
  // Positional Add State
  const [upPosition, setUpPosition] = useState("");
  const [extPosition, setExtPosition] = useState("");

  // Reorder State
  const [reorderConfirmed, setReorderConfirmed] = useState(false);
  const [draggedItemIds, setDraggedItemIds] = useState([]); // Array of IDs being moved (single or bulk)
  const [showReorderModal, setShowReorderModal] = useState(false); // NEW STATE FOR REORDER MENU

  // Positional Edit State
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

  // Local state for status filter
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Resizer State
  // Initialize widths for a 25.5/49/25.5 split (Reduced center panel by 1%)
  const [leftWidth, setLeftWidth] = useState(25.5); // Modified from 25
  const [rightWidth, setRightWidth] = useState(25.5); // Modified from 25
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizer, setActiveResizer] = useState(null); // 'left' or 'right'

  // FIX 1: Refs to hold latest widths. This prevents the 'stale closure' issue
  // by allowing the mousemove handler to read the current state for clamping.
  const leftWidthRef = useRef(leftWidth);
  const rightWidthRef = useRef(rightWidth);
  const animationRef = useRef(null); // FIX 2: For requestAnimationFrame throttling

  // FIX 1: Sync refs with state
  useEffect(() => {
    leftWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    rightWidthRef.current = rightWidth;
  }, [rightWidth]);

  // Resizer Logic
  const stopResize = useCallback(() => {
    setIsResizing(false);
    setActiveResizer(null);
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // FIX 2: Clear any pending frame on stop
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
    }
  }, []);

  const handleResize = useCallback((e) => {
    // FIX 2: Implement requestAnimationFrame throttling to fix lag/choppy.
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(() => {
        if (!isResizing || !activeResizer) return;

        // Get the main container to calculate boundaries and total width
        const mainContainer = document.querySelector('.main-three-pane-container');
        if (!mainContainer) return;
        
        const containerRect = mainContainer.getBoundingClientRect();
        const totalWidth = containerRect.width;

        // Minimum width for any panel (10% of container)
        const minPanelWidth = 10;
        
        if (activeResizer === 'left') {
            const newWidthPx = e.clientX - containerRect.left;
            let newWidthPercent = (newWidthPx / totalWidth) * 100;

            // FIX 1: Use REF for rightWidth to get the latest value
            newWidthPercent = Math.max(minPanelWidth, Math.min(newWidthPercent, 100 - rightWidthRef.current - minPanelWidth));
            
            setLeftWidth(newWidthPercent);
        } else if (activeResizer === 'right') {
            const newWidthPx = containerRect.right - e.clientX;
            let newWidthPercent = (newWidthPx / totalWidth) * 100;
            
            // FIX 1: Use REF for leftWidth to get the latest value
            newWidthPercent = Math.max(minPanelWidth, Math.min(newWidthPercent, 100 - leftWidthRef.current - minPanelWidth));

            setRightWidth(newWidthPercent);
        }

        animationRef.current = null;
    });
    // NOTE: Removed leftWidth and rightWidth from dependencies, as the values are now read from the refs.
    // This fixes the stale closure issue, making the resize smooth and reliable.
  }, [isResizing, activeResizer]);

  const startResize = useCallback((e, resizer) => {
    // Only allow resizing on large screens and up, where the three-pane layout is visible
    if (window.innerWidth < 1024) return;
    
    e.preventDefault();
    setIsResizing(true);
    setActiveResizer(resizer);
    
    // Set cursor on body to prevent cursor change when dragging over elements
    document.body.style.cursor = 'col-resize'; 
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }, [handleResize, stopResize]);
  
  // Clean up effect for unmounting
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      // FIX 2: Ensure RAF is also cancelled on unmount
      if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleResize, stopResize]); 

  // Calculate center width
  const centerWidth = 100 - leftWidth - rightWidth;

  // Stabilized List State Sync
  useEffect(() => {
    setLocalVideos(Array.isArray(videos) ? videos.slice() : []);
    setReorderConfirmed(false); // Reset confirmation on external sync
  }, [videos]);

  // Ensure selection state is handled correctly
  useEffect(() => {
    if (!selected && Array.isArray(localVideos) && localVideos.length > 0) setSelected(localVideos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideos]);
  useEffect(() => {
    setEditingVideo(null);
    setThumbFile(null);
    setFilePreview(null);
    setThumbMsg("");
    if (selected) setActiveTab('metadata');
  }, [selected]);


  // Derived state (Filter/Search, and Sortability)
  const { total, filtered, isSortable } = useMemo(() => {
    const total = Array.isArray(rawVideos) ? rawVideos.length : 0;
    const q = (search || "").trim().toLowerCase();
    
    // Check if the current state allows sorting: ONLY if all filters are default
    const isSortable = !q && filterType === "all" && filterStatus === "all"; 

    // Filtering logic uses localVideos for sorting stability when sortable, otherwise uses the synced videos list
    const sourceList = isSortable ? localVideos : (Array.isArray(videos) ? videos : []);
    
    const filteredList = sourceList.filter((v) => {
      const hay = `${v.title || ""} ${v.description || ""} ${v.tags || ""}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesType = filterType === "all" || v.source_type === filterType;

      // STATUS FILTERING LOGIC
      let matchesStatus = true;
      if (filterStatus === 'public') {
          // Public is defined as is_public is true or null
          matchesStatus = v.is_public !== false;
      } else if (filterStatus === 'private') {
          // Private is defined as is_public is explicitly false
          matchesStatus = v.is_public === false;
      } else if (filterStatus === 'featured') {
          // Featured is defined as is_featured is explicitly true
          matchesStatus = v.is_featured === true;
      } else if (filterStatus === 'unfeatured') {
          // Unfeatured is defined as is_featured is false or null
          matchesStatus = v.is_featured !== true; 
      }
      
      return matchesSearch && matchesType && matchesStatus;
    });
    
    return { total, filtered: filteredList, isSortable };
  }, [rawVideos, videos, localVideos, search, filterType, filterStatus]);


  // Drag and Drop (Bulk Redesign)
  const handleDragStart = (e, id) => {
    if (!isSortable) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    const isBulkSelected = selectedIds.has(id);
    if (isBulkSelected && selectedIds.size > 1) {
        // Bulk drag: find all selected items in their current list order
        const bulkIds = localVideos.filter(v => selectedIds.has(v.id)).map(v => v.id);
        setDraggedItemIds(bulkIds);
    } else {
        // Single drag (and clear bulk selection if dragging an unselected item)
        setSelectedIds(new Set());
        setDraggedItemIds([id]);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  // Robust handleDrop for Single and Bulk Reordering
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const draggedIds = draggedItemIds;
    setDraggedItemIds([]); // Clear dragging state

    if (draggedIds.length === 0 || draggedIds.includes(targetId) || !isSortable) return;

    // 1. Separate the dragged items from the rest of the list
    const movedItems = localVideos.filter(v => draggedIds.includes(v.id));
    const remainingVideos = localVideos.filter(v => !draggedIds.includes(v.id));

    // 2. Find necessary indices from the original localVideos list to determine direction
    const targetOriginalIndex = localVideos.findIndex(v => v.id === targetId);
    const firstDraggedItemOriginalIndex = localVideos.findIndex(v => v.id === draggedIds[0]);
    
    // Find the position of the target item in the 'remaining' list
    const targetIndexInRemaining = remainingVideos.findIndex(v => v.id === targetId);

    let insertionIndex;

    // Determine insertion index in the *remaining* array
    if (targetIndexInRemaining === -1) {
        // Dropped at the very end
        insertionIndex = remainingVideos.length; 
    } else {
        // If the dragged item was originally BEFORE the target (i.e., dragging DOWN)
        if (firstDraggedItemOriginalIndex < targetOriginalIndex) {
            insertionIndex = targetIndexInRemaining + 1; // Insert AFTER the target
        } 
        // If the dragged item was originally AFTER the target (i.e., dragging UP)
        else {
            insertionIndex = targetIndexInRemaining; // Insert BEFORE the target
        }
    }
    
    // 3. Insert the moved items into the 'remaining' list
    const newVideos = [
        ...remainingVideos.slice(0, insertionIndex),
        ...movedItems,
        ...remainingVideos.slice(insertionIndex),
    ];
    
    // 4. Update state
    setLocalVideos(newVideos);
    setReorderConfirmed(false); // Force re-confirmation after every manual change
  };
  
  const saveOrder = async () => {
    if (!isSortable) return;
    if (!reorderConfirmed) { alert("Please confirm the order change by checking the box in the modal."); return; }

    // Construct the correct payload with sequential order_index (0, 1, 2, ...)
    const reorderPayload = localVideos.map((v, index) => ({
      id: v.id,
      order_index: index, // New order_index is simply the array index
    }));

    try {
      // Pass the structured payload to onReorder
      const res = onReorder(reorderPayload); 
      await Promise.resolve(res); 
      alert("Order saved successfully.");
      setReorderConfirmed(false); // Reset confirmation
      setShowReorderModal(false); // Close the modal
    } catch (err) { 
      console.error("saveOrder failed", err); 
      // Enhanced error message to guide user to fix their App.jsx implementation
      alert("Failed saving order (see console). \n\nIMPORTANT: If this is a Supabase 400 error, you MUST ensure the 'onReorder' function in App.jsx is prepared to receive and bulk-upsert an array of {id, order_index} objects."); 
    }
  };


  // Upload/Add Handlers (With Positional Add)
  const onHeaderFilePicked = (file) => {
    if (!file) return; setPendingUploadFile(file); setPendingUploadName(file.name);
    const nameNoExt = file.name.replace(/\.[^/.]+$/, "");
    setUpTitle(nameNoExt); setUpDescription(""); setUpCategory(""); setUpTags(""); setUpPosition(""); setShowUploadModal(true);
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
      setUpFile(null); setUpTitle(""); setUpDescription(""); setUpCategory(""); setUpTags(""); setUpPosition(""); 
    } catch (err) { console.error("header upload failed", err); alert("Upload failed (see console)."); }
  };
  // Helper for Add External
  const submitExternalAdd = async (e) => {
    e.preventDefault();
    const position = Number(extPosition) || 0;
    await onAddExternal(e, position); 
    setShowAddModal(false); 
    setExtPosition(""); 
  };
  
  // Toggle public/featured (Preserved)
  const onTogglePublicWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id); if (idx === -1) return;
    const prev = localVideos[idx]; const next = { ...prev, is_public: prev.is_public === false ? true : false };
    const copy = localVideos.slice(); copy[idx] = next; setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);
    try {
      await Promise.resolve(onTogglePublic(prev)); 
    } catch (err) {
      console.error("togglePublic failed", err);
      const rollback = localVideos.slice(); rollback[idx] = prev; setLocalVideos(rollback);
      if (selected?.id === id) setSelected(prev); alert("Failed to toggle public (see console).");
    }
  };
  const onToggleFeaturedWrapper = async (id) => {
    const idx = localVideos.findIndex((v) => v.id === id); if (idx === -1) return;
    const prev = localVideos[idx]; const next = { ...prev, is_featured: !prev.is_featured };
    const copy = localVideos.slice(); copy[idx] = next; setLocalVideos(copy);
    if (selected?.id === id) setSelected(next);
    try {
      await Promise.resolve(onToggleFeatured(prev)); 
    } catch (err) {
      console.error("toggleFeatured failed", err);
      const rollback = localVideos.slice(); rollback[idx] = prev; setLocalVideos(rollback);
      if (selected?.id === id) setSelected(prev); alert("Failed to toggle featured (see console).");
    }
  };

  // Bulk Handlers (Preserved)
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev); if (copy.has(id)) copy.delete(id); else copy.add(id); return copy;
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
        if (action === "delete") await onDeleteVideo(video);
        else if (action === "feature") await onToggleFeaturedWrapper(id);
        else if (action === "public") await onTogglePublicWrapper(id);
      }
      clearSelection();
    } catch (err) { console.error("bulk action failed", err); alert("Bulk action failed (see console)."); }
  };

  // Login Handlers (Preserved)
  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!envPass) { setLoginError("VITE_ADMIN_PASSWORD not set"); return; }
    if (inputPassword === envPass) { setLoginError(""); setInputPassword(""); onAdminLogin && onAdminLogin(); }
    else setLoginError("Incorrect password");
  };

  // Delete Handlers (Preserved)
  const handleDeleteVideoAndClose = (video) => { 
    if (!window.confirm(`Are you sure you want to delete "${video.title || video.id}"? This cannot be undone.`)) return;
    onDeleteVideo(video); 
    setSelected(null);
  };
  
  // Edit logic (With position initialization)
  const openEdit = (video) => {
    setEditingVideo(video);
    setEditFields({
      title: video?.title || "", description: video?.description || "", category: video?.category || "", tags: video?.tags || "", external_url: video?.external_url || "",
    });
    // Initialize position for in-place move
    const currentIndex = localVideos.findIndex(v => v.id === video.id);
    setNewPosition(currentIndex !== -1 ? String(currentIndex + 1) : String(localVideos.length + 1));
  };
  const setEditField = (k, v) => setEditFields((p) => ({ ...p, [k]: v }));
  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editingVideo) return;
    setEditSaving(true);
    const payload = {
      title: editFields.title?.trim() || null, description: editFields.description?.trim() || null, category: editFields.category?.trim() || null, tags: editFields.tags?.trim() || null,
    };
    if (editingVideo.source_type === "external") payload.external_url = editFields.external_url?.trim() || null;
    try {
      await onUpdateVideo(editingVideo.id, payload);
      setLocalVideos((prev) => prev.map((p) => (p.id === editingVideo.id ? { ...p, ...payload } : p)));
      if (selected?.id === editingVideo.id) setSelected((s) => (s ? { ...s, ...payload } : s));
      setEditingVideo(null); 
    } catch (err) { console.error("save edit", err); alert("Failed to save changes (see console)."); } 
    finally { setEditSaving(false); }
  };
  
  // Handle Move function
  const handleMoveVideo = () => {
    if (!editingVideo || !isSortable) {
        alert(isSortable ? "No video selected for movement." : "Cannot move video while search or filters are active. Clear them first.");
        return;
    }
    const current1BasedIndex = localVideos.findIndex(v => v.id === editingVideo.id) + 1;
    const new1BasedIndex = Number(newPosition);

    if (isNaN(new1BasedIndex) || new1BasedIndex < 1 || new1BasedIndex > localVideos.length) {
      alert(`Position must be a number between 1 and ${localVideos.length}.`);
      return;
    }

    if (current1BasedIndex === new1BasedIndex) {
      alert("Video is already at that position.");
      return;
    }
    
    // Convert 1-based index to 0-based index
    const targetIndex = new1BasedIndex - 1;
    
    // 1. Remove the video from its current position
    const videoToMove = localVideos.find(v => v.id === editingVideo.id);
    const listWithoutVideo = localVideos.filter(v => v.id !== editingVideo.id);

    // 2. Insert the video into the new position
    const newVideos = [
        ...listWithoutVideo.slice(0, targetIndex),
        videoToMove,
        ...listWithoutVideo.slice(targetIndex),
    ];

    // 3. Update state locally
    setLocalVideos(newVideos);
    setReorderConfirmed(false); 
    
    // Update the selection to the moved item to reflect the new order in the list visually
    setSelected(videoToMove); 
    
    alert(`Video moved locally to position ${new1BasedIndex}. Remember to click '💾 Save New Order' in the Reorder Menu to make it permanent.`);
  };

  // Thumbnail Handlers (Preserved)
  const handleThumbnailCaptureClick = async () => {
    if (!selected || !onUpdateThumbnail) return;
    try { await onUpdateThumbnail(selected, Number(thumbSecond) || 7); setThumbMsg("Thumbnail capture requested. Check back soon for update."); }
    catch (err) { console.error("capture thumbnail", err); setThumbMsg("Capture failed (see console)."); }
  };
  const handleThumbFile = (file) => {
    setThumbFile(file || null); setThumbMsg(""); setFilePreview(null);
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setFilePreview(String(r.result));
    r.onerror = () => setThumbMsg("Unable to preview file");
    r.readAsDataURL(file);
  };
  const handleCustomThumbUpload = async () => {
    if (!thumbFile) { setThumbMsg("Select image first."); return; }
    if (!selected) { setThumbMsg("Select a video first."); return; }
    if (typeof onUploadCustomThumbnail === "function") {
      try { await onUploadCustomThumbnail(selected.id, thumbFile); setThumbMsg("Upload succeeded. Refreshing preview..."); setThumbFile(null); setFilePreview(null); }
      catch (err) { console.error("onUploadCustomThumbnail failed", err); setThumbMsg("Upload failed (see console)."); } return;
    }
    console.warn("onUploadCustomThumbnail not provided by parent. Implement onUploadCustomThumbnail(videoId, file) in App.jsx to enable custom thumbnail uploads.");
    setThumbMsg("Implement onUploadCustomThumbnail(videoId, file) in App.jsx to enable this.");
  };
  const handleRemoveThumbnail = async () => {
    if (!selected) return;
    if (typeof onRemoveThumbnail === "function") {
      try { await onRemoveThumbnail(selected.id); setThumbMsg("Thumbnail removed. Refreshing preview..."); }
      catch (err) { console.error("onRemoveThumbnail failed", err); setThumbMsg("Failed to remove thumbnail (see console)."); }
    } else {
      console.warn("onRemoveThumbnail not implemented in App.jsx — provide it to delete thumbnail file from storage and clear DB path.");
      setThumbMsg("Implement onRemoveThumbnail(selectedId) in App.jsx to remove thumbnail files.");
    }
  };
  
  // REORDER MODAL Component (Compacted)
  const ReorderModal = () => (
    <ModalBase title="Reorder Asset List" onClose={() => setShowReorderModal(false)} size="max-w-xs">
        <div className="flex flex-col gap-3">
            
            <div className="p-3 rounded-lg border border-amber-500/50 bg-slate-900/50 space-y-2">
                
                {/* Header with Icon and Title */}
                <div className="flex items-center gap-2 pb-2 border-b border-amber-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7M9 6h7M9 18h7" /></svg>
                    <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-amber-300 leading-tight">Reordering Mode Active</div>
                        <div className="text-xs text-amber-500">
                            Drag and drop items in the list.
                        </div>
                    </div>
                </div>

                {/* Confirmation */}
                <div className="p-2 rounded-lg bg-slate-800 border border-amber-800/50">
                    <label className="flex items-center gap-2 text-xs font-semibold text-amber-100 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={reorderConfirmed} 
                            onChange={(e) => setReorderConfirmed(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-amber-500 bg-slate-700 border-slate-500 rounded focus:ring-amber-500"
                        />
                        I confirm the new list order is correct.
                    </label>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                    <button 
                        onClick={saveOrder} 
                        className={`w-full px-3 py-2 text-xs rounded-lg font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400
                            ${reorderConfirmed ? "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-md shadow-amber-900/50" : "bg-slate-700 text-slate-400"}`
                        }
                        disabled={!reorderConfirmed}
                    >
                        💾 Save New Order
                    </button>
                    <button 
                        onClick={() => { setLocalVideos((p) => p.slice().reverse()); setReorderConfirmed(false); }} 
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-700"
                    >
                        Local: Reverse List Order
                    </button>
                    <button 
                        onClick={() => setShowReorderModal(false)} 
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800"
                    >
                        Close Menu
                    </button>
                </div>
            </div>
        </div>
    </ModalBase>
);

  // -------------------------
  // Render
  // -------------------------
  
  if (!isAdminAuthed) { /* Login Screen (Compacted) */
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-sm p-5 rounded-lg border border-sky-700/50 bg-slate-900 shadow-xl shadow-sky-900/50">
          <h2 className="text-xl font-extrabold text-sky-400">NEXUS Admin Console</h2>
          <p className="mt-1 text-slate-400 text-sm">Sign in to manage the catalog</p>
          <form onSubmit={handleLoginSubmit} className="mt-4 flex flex-col gap-3">
            <input
              value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder="Admin password"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="password"
            />
            {loginError && <div className="text-rose-500 text-xs">{loginError}</div>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-2 text-sm rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400">Unlock</button>
              <button type="button" onClick={() => alert("Contact support")} className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800">Help</button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Modals (Compacted Forms) */}
      {showUploadModal && ( /* Upload Modal */
        <ModalBase title="Upload video details" onClose={() => setShowUploadModal(false)}>
          <form onSubmit={submitHeaderUpload} className="flex flex-col gap-3">
            <div className="p-2 rounded-lg bg-sky-900/40 text-sm border border-sky-700/50">File: <strong className="text-sky-300">{pendingUploadName}</strong></div>
            <input placeholder="Title" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" required />
            <div className="grid grid-cols-2 gap-3">
                <input placeholder="Category" value={upCategory} onChange={(e) => setUpCategory(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
                <input placeholder="Tags (comma)" value={upTags} onChange={(e) => setUptags(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
            </div>
            <textarea placeholder="Description" value={upDescription} onChange={(e) => setUpDescription(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 h-20 text-sm" />
            
            {/* Position input for upload */}
            <input 
                type="number" 
                placeholder={`Position (1-${total + 1} or blank for end)`} 
                value={upPosition} 
                onChange={(e) => setUpPosition(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" 
                min="1" max={total + 1} 
            />
            
            <div className="flex gap-3 mt-3">
              <button type="submit" className="flex-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold transition hover:bg-purple-500 text-sm" disabled={!pendingUploadFile || !upTitle || uploading}>{uploading ? "Uploading…" : "Start Upload"}</button>
              <button type="button" onClick={() => { setShowUploadModal(false); setPendingUploadFile(null); setPendingUploadName(""); }} className="px-3 py-1.5 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800 text-sm">Cancel</button>
            </div>
          </form>
        </ModalBase>
      )}

      {showAddModal && ( /* External Add Modal */
        <ModalBase title="Add external video" onClose={() => setShowAddModal(false)}>
          <form onSubmit={submitExternalAdd} className="flex flex-col gap-3">
            <input placeholder="External URL" value={extUrl} onChange={(e) => setExtUrl(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" required />
            <input placeholder="Title" value={extTitle} onChange={(e) => setExtTitle(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" required />
            <div className="grid grid-cols-2 gap-3">
                <input placeholder="Category" value={extCategory} onChange={(e) => setExtCategory(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
                <input placeholder="Tags (comma)" value={extTags} onChange={(e) => setExtTags(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
            </div>
            <textarea placeholder="Description" value={extDescription} onChange={(e) => setExtDescription(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 h-20 text-sm" />
            
            {/* Position input for external add */}
            <input 
                type="number" 
                placeholder={`Position (1-${total + 1} or blank for end)`} 
                value={extPosition} 
                onChange={(e) => setExtPosition(e.target.value)} 
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" 
                min="1" max={total + 1} 
            />
            
            <div className="flex gap-3 mt-3">
              <button type="submit" className="flex-1 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400 text-sm" disabled={savingExternal}>{savingExternal ? "Adding…" : "Add video"}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-lg border border-slate-700/70 bg-transparent text-slate-400 transition hover:bg-slate-800 text-sm">Cancel</button>
            </div>
          </form>
        </ModalBase>
      )}

      {showReorderModal && isSortable && <ReorderModal />}
      
      {/* TOP HEADER / NAV BAR (Compacted) */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-sky-700/50 shadow z-10">
        <div className="text-xl font-extrabold text-sky-400">NEXUS ASSET MANAGER</div>
        <div className="flex gap-2 items-center">
            <div className="text-xs text-slate-400 hidden sm:block">Total Assets: <span className="text-sky-300 font-bold">{total}</span></div>

            <label htmlFor="top-upload" className="px-2 py-1 text-xs rounded-md bg-purple-600 text-white font-semibold cursor-pointer transition hover:bg-purple-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload
            </label>
            <input id="top-upload" type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] || null; if (f) onHeaderFilePicked(f); e.currentTarget.value = ""; }} />
            <button onClick={() => setShowAddModal(true)} className="px-2 py-1 text-xs rounded-md bg-sky-500 text-slate-900 font-semibold transition hover:bg-sky-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                External
            </button>
        </div>
      </header>
      
      {/* MAIN 3-PANE CONTENT AREA (Compacted) */}
      <div 
        className="flex-1 flex overflow-hidden main-three-pane-container" 
        // This container will switch to vertical stacking on small screens (md and below)
      >
        
        {/* 1. LEFT SIDEBAR (Library) */}
        <aside 
            style={{ width: `${leftWidth}%` }} 
            // FIX: Added min-w-0 to allow the panel to shrink correctly within the flex container.
            className="flex-shrink-0 p-3 flex flex-col bg-slate-900 overflow-y-auto relative border-r border-slate-700/70 hidden lg:flex min-w-0" 
        >
          
          <div className="flex-shrink-0 mb-3">
            <div className="text-sm font-bold text-slate-300 mb-2">Filter & Search</div>
            <input 
                value={search} onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search assets..." 
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm focus:ring-sky-400 focus:border-sky-400"
            />
            {/* Display Type Filter */}
            <select 
                value={filterType} onChange={(e) => setFilterType(e.target.value)} 
                className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100"
            >
                <option className="bg-slate-900" value="all">Type: All</option>
                <option className="bg-slate-900" value="uploaded">Type: Uploaded</option>
                <option className="bg-slate-900" value="external">Type: External</option>
            </select>
            {/* Status Filter */}
            <select 
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} 
                className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100"
            >
                <option className="bg-slate-900" value="all">Status: All</option>
                <option className="bg-slate-900" value="public">Public</option>
                <option className="bg-slate-900" value="private">Private</option>
                <option className="bg-slate-900" value="featured">Featured</option>
                <option className="bg-slate-900" value="unfeatured">Unfeatured</option>
            </select>
            
            {/* Reorder Button */}
            <button 
                onClick={() => setShowReorderModal(true)} 
                className={`mt-3 w-full px-2 py-1.5 text-xs rounded-lg font-semibold transition 
                    ${isSortable ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50"}`}
                disabled={!isSortable}
                title={isSortable ? "Open Reorder Menu" : "Clear search and filters to enable reordering"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7M9 6h7M9 18h7" /></svg>
                Reorder Menu
            </button>
          </div>

          {/* Bulk actions (Visible whenever items are selected) */}
          {selectedIds.size > 0 && (
            <div className="p-2 mb-3 rounded-lg border border-sky-700/50 bg-slate-800 flex-shrink-0">
              <div className="font-bold text-xs text-sky-300 mb-2">Bulk Actions ({selectedIds.size} Selected)</div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => applyBulk("public")} className="px-1.5 py-0.5 text-[10px] rounded-sm bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400">Public</button>
                <button onClick={() => applyBulk("feature")} className="px-1.5 py-0.5 text-[10px] rounded-sm bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300">Feature</button>
                <button onClick={selectAllVisible} className="px-1.5 py-0.5 text-[10px] rounded-sm border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-700">Select All</button>
                <button onClick={clearSelection} className="px-1.5 py-0.5 text-[10px] rounded-sm border border-slate-700/70 bg-transparent text-slate-400 hover:bg-slate-700">Clear</button>
                <button onClick={() => applyBulk("delete")} className="px-1.5 py-0.5 text-[10px] rounded-sm bg-rose-700 text-white font-semibold hover:bg-rose-600">Delete</button>
              </div>
            </div>
          )}
          
          {/* Library List (Scrollable) */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="text-xs text-slate-500 border-b border-slate-800 pb-1 flex justify-between">
                <span>Asset List ({filtered.length})</span>
                {isSortable && <span className="text-amber-500 font-semibold">Drag to Reorder</span>}
            </div>
            {loading && <div className="text-sky-400 animate-pulse text-center p-3 text-sm">Loading Data Stream...</div>}
            {fetchError && <div className="text-rose-500 text-center p-3 text-sm">Error: {String(fetchError)}</div>}
            {filtered.length === 0 && !loading && <div className="text-slate-500 text-center p-3 text-sm">No assets found.</div>}
            {filtered.map((v, i) => {
              // FIX: Calculate the permanent order index from the full localVideos list.
              const permanentIndex = localVideos.findIndex(item => item.id === v.id);
              // Use 1-based index for display. Fallback to the filtered index if somehow not found.
              const displayOrder = permanentIndex !== -1 ? permanentIndex + 1 : i + 1;

              return (
                <LibraryCard
                  key={v.id} item={v} index={i} selected={selected} setSelected={setSelected} toggleSelect={toggleSelect}
                  selectedIds={selectedIds} 
                  handleDragStart={handleDragStart} handleDragOver={handleDragOver} handleDrop={handleDrop}
                  isDragging={draggedItemIds.includes(v.id)} isSortable={isSortable}
                  permanentOrder={displayOrder} // Pass the calculated permanent order
                />
              );
            })}
          </div>
        </aside>
        
        {/* Left Resizer Handle */}
        <div 
            className="w-2 cursor-col-resize bg-slate-700/50 hover:bg-sky-500 transition-colors z-20 hidden lg:block"
            onMouseDown={(e) => startResize(e, 'left')}
            title="Resize Left Panel"
        />


        {/* 2. CENTER STAGE (Player/Preview) (Compacted) */}
        <div 
            style={{ width: `${centerWidth}%` }} 
            className="flex-1 min-w-0 flex flex-col p-3 bg-slate-900 overflow-y-auto relative"
        >
          
          <div className="flex-1 p-3 rounded-lg border border-sky-700/50 bg-slate-800 shadow-xl shadow-sky-900/20 flex flex-col">
            {selected ? (
              <>
                {/* Asset Header (Text size reduced here as requested previously) */}
                <div className="mb-3 flex justify-between items-start flex-shrink-0">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-xl font-extrabold text-sky-400 break-words">{selected.title || `#${selected.id}`}</div>
                    <div className="text-slate-400 mt-0.5 text-xs">{selected.description || "No description provided."}</div>
                    <div className="text-slate-500 text-xs mt-1">ID: {selected.id} | Views: {Number(selected.view_count || 0)}</div>
                  </div>
                </div>

                {/* Video Player */}
                <div className="aspect-video w-full flex-shrink-0 rounded-md overflow-hidden border border-slate-700/50 bg-black">
                  <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-lg font-medium">
                  <span className="animate-pulse">← Select an asset from the Library to view.</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Resizer Handle */}
        <div 
            className="w-2 cursor-col-resize bg-slate-700/50 hover:bg-sky-500 transition-colors z-20 hidden lg:block"
            onMouseDown={(e) => startResize(e, 'right')}
            title="Resize Right Panel"
        />

        {/* 3. RIGHT INSPECTOR (Editor/Tools) (Compacted) */}
        <div 
            style={{ width: `${rightWidth}%` }} 
            // FIX: Added flex-col and min-w-0 to ensure vertical layout and allow the panel to shrink below content width.
            className="flex-shrink-0 p-3 bg-slate-900 overflow-y-auto relative border-l border-slate-700/70 hidden lg:flex flex-col min-w-0" 
        >
          
          {selected ? (
              <>
                  <div className="text-lg font-extrabold text-sky-400 mb-3 border-b border-slate-700/70 pb-2">
                      ASSET INSPECTOR
                  </div>
                  
                  {/* Global Asset Controls */}
                  <div className="flex flex-col gap-2 p-2 rounded-lg border border-slate-700/70 bg-slate-800/50 mb-3 flex-shrink-0">
                      <div className="text-sm font-semibold text-sky-300">Admin Actions</div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => onTogglePublicWrapper(selected.id)} 
                              className={`flex-1 px-2 py-1 text-xs rounded-md transition ${selected?.is_public !== false ? "bg-emerald-500 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}
                          >
                              {selected?.is_public !== false ? "SET PRIVATE" : "SET PUBLIC"}
                          </button>

                          <button 
                              onClick={() => onToggleFeaturedWrapper(selected.id)} 
                              className={`flex-1 px-2 py-1 text-xs rounded-md transition ${selected?.is_featured ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"}`}
                          >
                              {selected?.is_featured ? "UN-FEATURE" : "FEATURE"}
                          </button>
                      </div>
                      <button 
                          onClick={() => handleDeleteVideoAndClose(selected)} 
                          className="w-full px-2 py-1 text-xs rounded-md bg-rose-700 text-white font-semibold transition hover:bg-rose-600 mt-1"
                      >
                          PERMANENTLY DELETE
                      </button>
                  </div>
                  
                  {/* Inspector Tabs */}
                  <div className="flex border-b border-slate-700/70 mb-3 flex-shrink-0">
                      <TabButton key="metadata" tab="metadata">Metadata</TabButton>
                      <TabButton key="thumbnail" tab="thumbnail">Thumbnail</TabButton>
                      <TabButton key="raw" tab="raw">Raw</TabButton>
                  </div>
                  
                  <div className="pt-0 flex-1 min-h-0 overflow-y-auto">
                      {activeTab === 'metadata' && (
                          <div className="flex flex-col gap-3">
                              
                              {/* Current Data Summary */}
                              <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-800/50 flex-shrink-0">
                                  <div className="text-xs text-slate-400 mb-1 font-semibold">Current State:</div>
                                  <div className="text-xs text-slate-500">Source: <span className="text-sky-300">{selected.source_type}</span> | Category: <span className="text-sky-300">{selected.category || 'N/A'}</span></div>
                                  <div className="text-xs text-slate-500 mt-0.5 truncate">Tags: <span className="text-sky-300">{selected.tags || 'None'}</span></div>
                              </div>
                              
                              {/* Edit Button Toggle */}
                              <button 
                                  onClick={() => editingVideo ? setEditingVideo(null) : openEdit(selected)} 
                                  className={`w-full px-3 py-1.5 rounded-lg font-bold text-sm transition flex-shrink-0
                                      ${editingVideo ? "bg-amber-400/20 border border-amber-400 text-amber-300 hover:bg-amber-400/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                              >
                                  {editingVideo ? "Close Editor" : "Open Editor"}
                              </button>

                              {/* Edit Form (Inline) */}
                              {editingVideo && (
                                  <div className="p-3 rounded-lg border border-amber-400/50 bg-slate-800/50 flex-shrink-0">
                                      <div className="text-xs font-bold text-amber-400 mb-2">Editing: {editingVideo.title || editingVideo.id}</div>
                                      <form onSubmit={handleEditSubmit} className="flex flex-col gap-2">
                                          <input value={editFields.title} onChange={(e) => setEditField("title", e.target.value)} placeholder="Title" className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
                                          <textarea value={editFields.description} onChange={(e) => setEditField("description", e.target.value)} rows={2} placeholder="Description" className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 h-14 text-sm" /> 
                                          <div className="grid grid-cols-2 gap-2">
                                              <input value={editFields.category} onChange={(e) => setEditField("category", e.target.value)} placeholder="Category" className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
                                              <input value={editFields.tags} onChange={(e) => setEditField("tags", e.target.value)} placeholder="Tags (comma)" className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />
                                          </div>
                                          {editingVideo.source_type === "external" && <input value={editFields.external_url} onChange={(e) => setEditField("external_url", e.target.value)} placeholder="External URL" className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" />}
                                          
                                          {/* Position Input for In-Place Move */}
                                          <div className="flex gap-2 items-center">
                                              <input 
                                                  type="number" 
                                                  value={newPosition} 
                                                  onChange={(e) => setNewPosition(e.target.value)} 
                                                  placeholder={`Position (1-${localVideos.length})`}
                                                  min="1" max={localVideos.length}
                                                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/70 text-slate-100 text-sm" 
                                                  disabled={!isSortable}
                                              />
                                              <button 
                                                  type="button" 
                                                  onClick={handleMoveVideo} 
                                                  disabled={!isSortable || newPosition === String(localVideos.findIndex(v => v.id === editingVideo.id) + 1) || !newPosition.trim()}
                                                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold transition hover:bg-purple-500 text-sm disabled:opacity-50"
                                              >
                                                  Move
                                              </button>
                                          </div>

                                          <button type="submit" disabled={editSaving} className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-900 font-bold transition hover:bg-sky-400 text-sm mt-1">
                                              {editSaving ? "Saving…" : "Save changes"}
                                          </button>
                                      </form>
                                  </div>
                              )}
                          </div>
                      )}
                      
                      {activeTab === 'thumbnail' && (
                          <div className="flex flex-col gap-3">
                              
                              {/* Current Thumbnail Preview */}
                              <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-800/50 flex-shrink-0">
                                  <div className="text-xs font-semibold text-sky-300 mb-1">Current Thumbnail</div>
                                  <div className="w-full aspect-video rounded-md overflow-hidden border border-slate-700/70 bg-slate-900">
                                      <img src={selected.thumbnail_url || selected.public_url || selected.external_url || "https://placehold.co/160x90?text=No+Thumb"} alt="Current Thumbnail" className="w-full h-full object-cover" />
                                  </div>
                              </div>
                              
                              {/* Capture from Video */}
                              <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-800/50 flex-shrink-0">
                                  <div className="text-xs font-semibold text-sky-300 mb-1">Capture from Player</div>
                                  <div className="flex gap-2">
                                      <input type="number" value={thumbSecond} onChange={(e) => setThumbSecond(e.target.value)} placeholder="Sec" min="0" className="w-16 px-2 py-1 text-xs rounded-md bg-slate-800 border border-slate-700/70 text-slate-100" />
                                      <button onClick={handleThumbnailCaptureClick} className="flex-1 px-2 py-1 text-xs rounded-md bg-purple-600 text-white font-semibold transition hover:bg-purple-500 disabled:opacity-50" disabled={!onUpdateThumbnail}>
                                          Capture Frame
                                      </button>
                                  </div>
                              </div>

                              {/* Upload Custom Thumbnail */}
                              <div className="p-2 rounded-lg border border-slate-700/70 bg-slate-800/50 flex-shrink-0">
                                  <div className="text-xs font-semibold text-sky-300 mb-1">Custom Upload</div>
                                  {filePreview && (
                                      <div className="w-full aspect-video rounded-md overflow-hidden border-2 border-amber-400/70 bg-slate-900 mb-1">
                                          <img src={filePreview} alt="Upload Preview" className="w-full h-full object-cover" />
                                      </div>
                                  )}
                                  <div className="flex gap-2">
                                      <label htmlFor="thumb-file" className="px-2 py-1 text-xs rounded-md border border-slate-700/70 bg-slate-800 text-slate-400 hover:bg-slate-700 cursor-pointer flex-1 text-center py-1">
                                          {thumbFile ? `✓ ${thumbFile.name.substring(0, 10)}...` : "Choose Image"}
                                      </label>
                                      <input id="thumb-file" type="file" accept="image/*" className="hidden" onChange={(e) => { handleThumbFile(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                                      <button onClick={handleCustomThumbUpload} className="px-2 py-1 text-xs rounded-md bg-sky-500 text-slate-900 font-semibold transition hover:bg-sky-400 disabled:opacity-50 w-20" disabled={!thumbFile || !onUploadCustomThumbnail}>
                                          Upload
                                      </button>
                                  </div>
                              </div>
                              
                              {thumbMsg && <div className="text-xs text-center p-1.5 rounded-lg bg-sky-900/50 text-sky-400 border border-sky-700/50">{thumbMsg}</div>}
                              <button 
                                  onClick={handleRemoveThumbnail} 
                                  className="w-full px-3 py-1.5 text-xs rounded-md bg-rose-700 text-white font-semibold transition hover:bg-rose-600 mt-1"
                              >
                                  Remove Current Thumbnail
                              </button>
                          </div>
                      )}

                      {/* Raw Data Tab */}
                      {activeTab === 'raw' && (
                          <div className="p-2 rounded-lg border border-rose-700/50 bg-slate-900/70 flex-shrink-0">
                              <div className="text-xs font-semibold text-rose-300 mb-1">Selected Asset Raw JSON</div>
                              <pre className="text-[10px] text-slate-300 overflow-x-auto p-2 rounded bg-slate-950 border border-slate-800 max-h-64">
                                  {JSON.stringify(selected, null, 2)}
                              </pre>
                          </div>
                      )}
                  </div>
              </>
          ) : (
               <div className="h-full flex items-center justify-center text-slate-500 text-center text-sm">
                  Asset details will appear here once selected.
              </div>
          )}
        </div>
      </div>
    </main>
  );
}
