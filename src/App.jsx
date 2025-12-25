// src/App.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion"; // Ensure framer-motion is installed

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";

import {
  generateThumbnailWithRetries,
  dataURLToBlob,
  uploadThumbnailBlob,
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
  deleteThumbnail,
} from "./utils/thumbnails";

const VIDEO_BUCKET = "videos";

/* -------------------------------------------------------
    INITIAL SPLASH SCREEN
------------------------------------------------------- */
const InitialLoader = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center"
  >
    <div className="relative">
      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full animate-pulse" />
      <div className="w-20 h-20 bg-[#0B1120] border border-white/10 rounded-2xl flex items-center justify-center relative z-10 shadow-2xl shadow-emerald-500/20">
        <span className="text-4xl">S</span>
      </div>
    </div>
    <h2 className="mt-6 text-white font-black tracking-[0.3em] uppercase text-sm animate-pulse">Initializing Studio</h2>
  </motion.div>
);

/* -------------------------------------------------------
    TOP BAR
------------------------------------------------------- */
function TopBar({ onRefresh, isAdminAuthed, onLogoutAdmin, isRefreshing }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-6 h-16 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]">S</div>
        <h1 className="text-sm font-black tracking-widest text-white uppercase hidden sm:block">Stream <span className="text-emerald-500">Studio</span></h1>
      </div>

      <div className="flex items-center gap-4">
        <nav className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
          <Link
            to="/"
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!isAdmin ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
          >
            Viewer
          </Link>
          <Link
            to="/admin"
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isAdmin ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
          >
            Console
          </Link>
        </nav>

        <div className="h-4 w-px bg-white/10 mx-1"></div>

        {isAdmin && isAdminAuthed && (
          <button onClick={onLogoutAdmin} className="px-4 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
            Logout
          </button>
        )}
        
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className={`p-2 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-all ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} 
          title="Refresh Data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
        </button>
      </div>
    </header>
  );
}

/* -------------------------------------------------------
    APP COMPONENT
------------------------------------------------------- */
export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true); // Internal loading state
  const [initialLoad, setInitialLoad] = useState(true); // For Splash Screen
  const [fetchError, setFetchError] = useState(null);
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => localStorage.getItem("isAdminAuthed") === "true");
  
  // Admin UI State
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [externalVideo, setExternalVideo] = useState({ title: "", description: "", category: "", tags: "", url: "" });
  const [uploadedVideo, setUploadedVideo] = useState({ title: "", description: "", category: "", tags: "", file: null });
  const [savingExternal, setSavingExternal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resetExternalForm = () => setExternalVideo({ title: "", description: "", category: "", tags: "", url: "" });
  const resetUploadForm = () => setUploadedVideo({ title: "", description: "", category: "", tags: "", file: null });

  const handleAdminLogin = () => { setIsAdminAuthed(true); localStorage.setItem("isAdminAuthed", "true"); };
  const handleLogoutAdmin = () => { setIsAdminAuthed(false); localStorage.removeItem("isAdminAuthed"); };

  const handleUpdateVideo = async (id, fields) => {
    try {
      const { error } = await supabase.from("videos").update(fields).eq("id", id);
      if (error) throw error;
      await fetchVideos(false); // Background update
      return { success: true };
    } catch (error) {
      alert(`Update failed: ${error?.message || String(error)}`);
      return { success: false, error };
    }
  };

  // --- Data Fetching (Optimized with Artificial Delay for UX) ---
  const fetchVideos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError(null);
    
    const startTime = Date.now();
    let currentSelectedId = selected?.id; 

    try {
      let { data, error } = await supabase
        .from("videos")
        .select(`*`)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedVideos = (data || []).map((v) => ({
        ...v,
        public_url: v.file_path ? getPublicUrlForVideoPath(v.file_path) : v.external_url,
        thumbnail_url: v.thumbnail_path ? getPublicUrlForThumbPath(v.thumbnail_path) : null,
      }));

      // Force a minimum loading time of 800ms if showLoading is true (better UX for refresh)
      if (showLoading) {
        const elapsed = Date.now() - startTime;
        const minLoadTime = 800; 
        if (elapsed < minLoadTime) {
            await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
        }
      }

      setVideos(processedVideos);
      
      if (currentSelectedId) {
        const newSelected = processedVideos.find(v => v.id === currentSelectedId);
        setSelected(newSelected || null);
      } else if (processedVideos.length > 0) {
        setSelected(processedVideos[0]);
      } else {
        setSelected(null);
      }

    } catch (error) {
      console.error("Error fetching videos:", error);
      setFetchError(error?.message || String(error));
    } finally {
      setLoading(false);
      setInitialLoad(false); // Disable splash screen after first load
    }
  }, [selected?.id]); 

  // Initial Load
  useEffect(() => {
    fetchVideos(true);
    const channel = supabase
      .channel("videos_list_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => fetchVideos(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  
  // Explicit Refresh Handler
  const onRefreshClick = () => {
      fetchVideos(true);
  };

  // ... (Keep handleAddExternal, handleUpload, handleDeleteVideo, etc. exactly as they were in previous code)
  // Re-pasting handlers for brevity - ensure you keep your existing handlers here:
  const handleAddExternal = async (e, position) => {
    e.preventDefault();
    if (!externalVideo.title || !externalVideo.url) return;
    setSavingExternal(true);
    try {
      const { error } = await supabase.from("videos").insert({
        title: externalVideo.title.trim(),
        description: externalVideo.description.trim() || null,
        category: externalVideo.category.trim() || null,
        tags: externalVideo.tags.trim() || null,
        source_type: "external",
        external_url: externalVideo.url.trim(),
        order_index: position,
      });
      if (error) throw error;
      resetExternalForm();
      await fetchVideos(false);
    } catch (error) {
      alert(`Error adding external video: ${error?.message || String(error)}`);
    } finally {
      setSavingExternal(false);
    }
  };

  const handleUpload = async (e, position) => {
    e?.preventDefault?.();
    const { file, title, description, category, tags } = uploadedVideo;
    if (!file) return;
    setUploading(true);
    let filePath = null;
    try {
      const fileExt = (file.name || "").split(".").pop() || "mp4";
      filePath = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from(VIDEO_BUCKET).upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: videoData, error: dbError } = await supabase.from("videos").insert({
          title: title.trim(), description: description.trim() || null, category: category.trim() || null, tags: tags.trim() || null, source_type: "uploaded", file_path: filePath, order_index: position,
        }).select().single();
      if (dbError) throw dbError;
      const videoPublicUrl = getPublicUrlForVideoPath(filePath);
      const thumbnailDataUrl = await generateThumbnailWithRetries(videoPublicUrl, 7);
      if (thumbnailDataUrl) {
        const thumbBlob = dataURLToBlob(thumbnailDataUrl);
        const thumbPath = await uploadThumbnailBlob(thumbBlob, null); 
        if (thumbPath) await handleUpdateVideo(videoData.id, { thumbnail_path: thumbPath });
      }
      resetUploadForm();
      await fetchVideos(false); 
    } catch (error) {
      alert(`Upload failed: ${error?.message || String(error)}`);
      // eslint-disable-next-line no-unused-vars
      if (filePath) try { await supabase.storage.from(VIDEO_BUCKET).remove([filePath]); } catch (e) { /* ignore */ }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (video) => {
    if (!video) return;
    if (!window.confirm(`Delete: ${video.title || "#"+video.id}?`)) return;
    try {
      const { error: dbError } = await supabase.from("videos").delete().eq("id", video.id);
      if (dbError) throw dbError;
      // eslint-disable-next-line no-unused-vars
      if (video.file_path) try { await supabase.storage.from(VIDEO_BUCKET).remove([video.file_path]); } catch (e) { /* ignore */ }
      // eslint-disable-next-line no-unused-vars
      if (video.thumbnail_path) try { await deleteThumbnail(video.thumbnail_path); } catch (e) { /* ignore */ }
      await fetchVideos(false);
    } catch (error) { alert(`Deletion failed: ${error?.message || String(error)}`); }
  };
  
  const handleUpdateThumbnail = async (video, seconds) => {
    if (!video?.public_url) return { success: false, error: { message: "No Video URL" } };
    try {
      const thumbnailDataUrl = await generateThumbnailWithRetries(video.public_url, seconds);
      if (!thumbnailDataUrl) throw new Error("Could not capture frame.");
      const thumbBlob = dataURLToBlob(thumbnailDataUrl);
      const newPath = await uploadThumbnailBlob(thumbBlob, video.thumbnail_path || null);
      if (!newPath) throw new Error("Upload failed.");
      return handleUpdateVideo(video.id, { thumbnail_path: newPath });
    } catch (error) { return { success: false, error }; }
  };
  
  const handleTogglePublic = async (video) => {
    if (!video || !video.id) return { success: false, error: { message: "Invalid video" } };
    const newPublic = video.is_public === false ? true : false;
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_public: newPublic } : v)));
    const result = await handleUpdateVideo(video.id, { is_public: newPublic });
    if (!result.success) setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_public: video.is_public } : v)));
    return result;
  };

  const handleToggleFeatured = async (video) => {
    if (!video || !video.id) return { success: false, error: { message: "Invalid video" } };
    const newFeatured = !video.is_featured;
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: newFeatured } : v)));
    const result = await handleUpdateVideo(video.id, { is_featured: newFeatured });
    if (!result.success) setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: video.is_featured } : v)));
    return result;
  };

  const handleUploadCustomThumbnail = async (videoId, file) => {
    if (!videoId || !file) return { success: false };
    try {
        const video = videos.find(v => v.id === videoId);
        const newPath = await uploadThumbnailBlob(file, video?.thumbnail_path || null);
        if (!newPath) throw new Error("Upload failed");
        return handleUpdateVideo(videoId, { thumbnail_path: newPath });
    } catch (error) { return { success: false, error: { message: error.message } }; }
  };
  
  const onRemoveThumbnail = async (videoId) => {
    const video = videos.find(v => v.id === videoId);
    if (video?.thumbnail_path) {
        try { await deleteThumbnail(video.thumbnail_path); return handleUpdateVideo(videoId, { thumbnail_path: null }); } catch (err) { return { success: false, error: err }; }
    }
    return { success: true };
  };

  const handleReorder = async (newVideos) => {
    try {
      setVideos(newVideos);
      const updates = newVideos.map((video, index) => ({ id: video.id, order_index: index }));
      const { error } = await supabase.from("videos").upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      await fetchVideos(false); 
    } catch (err) { console.error("reorder failed", err); alert("Failed to save new order."); await fetchVideos(false); }
  };

  const handleVideoPlayed = async (videoId) => {
      try { const { error } = await supabase.rpc('increment_view_count', { video_id: videoId }); if (error) throw error; } catch (err) { console.error("increment view count failed", err); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pt-16">
      <AnimatePresence>
        {initialLoad && <InitialLoader />}
      </AnimatePresence>

      <TopBar 
        onRefresh={onRefreshClick} 
        isAdminAuthed={isAdminAuthed} 
        onLogoutAdmin={handleLogoutAdmin} 
        isRefreshing={loading && !initialLoad} // Pass Refresh state for spinning icon
      />
      
      <Routes>
        <Route path="/" element={
          <ViewerPage 
            videos={videos.filter(v => v.is_public !== false)} 
            loading={loading} // Pass loading state
            fetchError={fetchError} 
            onVideoPlayed={handleVideoPlayed} 
            search={search}
            setSearch={setSearch}
            filterType={filterType}
            setFilterType={setFilterType}
          />
        } />
        <Route path="/admin" element={
            <AdminPage
              videos={videos}
              rawVideos={videos}
              selected={selected}
              setSelected={setSelected}
              loading={loading} // Pass loading state
              
              search={search} setSearch={setSearch}
              filterType={filterType} setFilterType={setFilterType}

              // Mapped State
              extTitle={externalVideo.title} 
              setExtTitle={(title) => setExternalVideo(p => ({...p, title}))}
              extDescription={externalVideo.description}
              setExtDescription={(description) => setExternalVideo(p => ({...p, description}))}
              extCategory={externalVideo.category}
              setExtCategory={(category) => setExternalVideo(p => ({...p, category}))}
              extTags={externalVideo.tags}
              setExtTags={(tags) => setExternalVideo(p => ({...p, tags}))}
              extUrl={externalVideo.url}
              setExtUrl={(url) => setExternalVideo(p => ({...p, url}))}
              savingExternal={savingExternal}

              upTitle={uploadedVideo.title} 
              setUpTitle={(title) => setUploadedVideo(p => ({...p, title}))}
              upDescription={uploadedVideo.description} 
              setUpDescription={(description) => setUploadedVideo(p => ({...p, description}))}
              upCategory={uploadedVideo.category} 
              setUpCategory={(category) => setUploadedVideo(p => ({...p, category}))}
              upTags={uploadedVideo.tags} 
              setUpTags={(tags) => setUploadedVideo(p => ({...p, tags}))}
              setUpFile={(file) => setUploadedVideo(p => ({...p, file}))}
              uploading={uploading}

              // Handlers
              onAddExternal={handleAddExternal}
              onUpload={handleUpload}
              onDeleteVideo={handleDeleteVideo}
              onUpdateVideo={handleUpdateVideo}
              onUpdateThumbnail={handleUpdateThumbnail}
              onUploadCustomThumbnail={handleUploadCustomThumbnail}
              onRemoveThumbnail={onRemoveThumbnail}
              onReorder={handleReorder}

              onTogglePublic={handleTogglePublic}
              onToggleFeatured={handleToggleFeatured}
              
              isAdminAuthed={isAdminAuthed}
              onAdminLogin={handleAdminLogin}
            />
          }
        />
      </Routes>
    </div>
  );
}
