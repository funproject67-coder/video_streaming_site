// src/App.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";

import {
  // Functions imported from utils/thumbnails
  generateThumbnailWithRetries,
  dataURLToBlob,
  uploadThumbnailBlob,
  uploadThumbnailFile,
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
  deleteThumbnail,
} from "./utils/thumbnails";

const VIDEO_BUCKET = "videos";

/* -------------------------------------------------------
    TOP BAR
------------------------------------------------------- */
function TopBar({ onRefresh, isAdminAuthed, onLogoutAdmin }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 p-3 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-sky-400">Stream Studio</h1>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <nav className="flex rounded-full border border-slate-700 bg-slate-900 p-[2px]">
          <Link
            to="/"
            className={`px-3 py-1 rounded-full text-sm transition-colors ${!isAdmin ? "bg-emerald-400 text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-100"}`}
          >
            Viewer
          </Link>
          <Link
            to="/admin"
            className={`px-3 py-1 rounded-full text-sm transition-colors ${isAdmin ? "bg-sky-500 text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-100"}`}
          >
            Admin
          </Link>
        </nav>
        {isAdmin && isAdminAuthed && (
          <button onClick={onLogoutAdmin} className="px-3 py-1 text-xs rounded-lg border border-rose-600 text-rose-400 hover:bg-rose-900/50">
            Logout
          </button>
        )}
        <button onClick={onRefresh} className="px-2 py-1 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800" title="Refresh data">
          🔄
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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => localStorage.getItem("isAdminAuthed") === "true");
  
  // Admin UI State
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  // --- Consolidated input states ---
  const [externalVideo, setExternalVideo] = useState({
    title: "", description: "", category: "", tags: "", url: ""
  });
  const [uploadedVideo, setUploadedVideo] = useState({
    title: "", description: "", category: "", tags: "", file: null
  });

  const [savingExternal, setSavingExternal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Helper for cleaning up state
  const resetExternalForm = () => setExternalVideo({ title: "", description: "", category: "", tags: "", url: "" });
  const resetUploadForm = () => setUploadedVideo({ title: "", description: "", category: "", tags: "", file: null });

  // --- Auth ---
  const handleAdminLogin = () => {
    setIsAdminAuthed(true);
    localStorage.setItem("isAdminAuthed", "true");
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthed(false);
    localStorage.removeItem("isAdminAuthed");
  };

  // --- Core Update Logic (Optimized for centralization) ---
  const handleUpdateVideo = async (id, fields) => {
    try {
      const { error } = await supabase.from("videos").update(fields).eq("id", id);
      if (error) throw error;
      // --- Optimization: Refresh data after successful update ---
      await fetchVideos();
      return { success: true };
    } catch (error) {
      alert(`Update failed: ${error?.message || String(error)}`);
      return { success: false, error };
    }
  };


  // --- Data Fetching ---
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    let currentSelectedId = selected?.id; // Capture ID before state change
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

      setVideos(processedVideos);
      
      // Update selection based on the new data
      if (currentSelectedId) {
        const newSelected = processedVideos.find(v => v.id === currentSelectedId);
        setSelected(newSelected || null);
      } else if (processedVideos.length > 0) {
        // Default to first video if nothing was selected
        setSelected(processedVideos[0]);
      } else {
        setSelected(null);
      }

    } catch (error) {
      console.error("Error fetching videos:", error);
      setFetchError(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  }, [selected?.id]); // Only depend on selected's ID for fetch

  useEffect(() => {
    fetchVideos();
    const channel = supabase
      .channel("videos_list_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => fetchVideos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchVideos]);
  
  // --- Video Handlers (Preserved from your code) ---

  const handleAddExternal = async (e) => {
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
      });
      if (error) throw error;
      resetExternalForm();
      await fetchVideos();
    } catch (error) {
      alert(`Error adding external video: ${error?.message || String(error)}`);
    } finally {
      setSavingExternal(false);
    }
  };

  const handleUpload = async (e) => {
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

      const { data: videoData, error: dbError } = await supabase
        .from("videos")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          tags: tags.trim() || null,
          source_type: "uploaded",
          file_path: filePath,
        })
        .select().single();

      if (dbError) throw dbError;

      // Auto-generate thumbnail
      const videoPublicUrl = getPublicUrlForVideoPath(filePath);
      const thumbnailDataUrl = await generateThumbnailWithRetries(videoPublicUrl, 7);
      if (thumbnailDataUrl) {
        const thumbBlob = dataURLToBlob(thumbnailDataUrl);
        const thumbPath = await uploadThumbnailBlob(thumbBlob, null); 
        if (thumbPath) {
            await handleUpdateVideo(videoData.id, { thumbnail_path: thumbPath });
        }
      }

      resetUploadForm();
      await fetchVideos(); 
    } catch (error) {
      alert(`Upload failed: ${error?.message || String(error)}`);
      if (filePath) {
        // Attempt cleanup of the file if the DB insertion failed
        // eslint-disable-next-line no-unused-vars
        try { await supabase.storage.from(VIDEO_BUCKET).remove([filePath]); } catch (e) { /* ignore cleanup error */ }
      }
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
      
      // Cleanup files
      if (video.file_path) {
        // eslint-disable-next-line no-unused-vars
        try { await supabase.storage.from(VIDEO_BUCKET).remove([video.file_path]); } catch (e) { /* ignore */ }
      }
      if (video.thumbnail_path) {
        // eslint-disable-next-line no-unused-vars
        try { await deleteThumbnail(video.thumbnail_path); } catch (e) { /* ignore */ }
      }

      await fetchVideos();
    } catch (error) {
      alert(`Deletion failed: ${error?.message || String(error)}`);
    }
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
    } catch (error) {
      console.error("Update thumbnail failed:", error);
      return { success: false, error };
    }
  };
  
  const handleTogglePublic = async (video) => {
    if (!video || !video.id) return { success: false, error: { message: "Invalid video" } };
    const newPublic = video.is_public === false ? true : false;
    
    // optimistic UI update
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_public: newPublic } : v)));
    
    const result = await handleUpdateVideo(video.id, { is_public: newPublic });
    
    if (!result.success) {
      // rollback
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_public: video.is_public } : v)));
    }
    return result;
  };

  const handleToggleFeatured = async (video) => {
    if (!video || !video.id) return { success: false, error: { message: "Invalid video" } };
    const newFeatured = !video.is_featured;

    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: newFeatured } : v)));

    const result = await handleUpdateVideo(video.id, { is_featured: newFeatured });

    if (!result.success) {
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: video.is_featured } : v)));
    }
    return result;
  };

  const handleUploadCustomThumbnail = async (videoId, file) => {
    if (!videoId || !file) return { success: false };
    try {
        const video = videos.find(v => v.id === videoId);
        const newPath = await uploadThumbnailFile(file, video?.thumbnail_path || null);
        if (!newPath) throw new Error("Upload failed");

        return handleUpdateVideo(videoId, { thumbnail_path: newPath });
    } catch (error) {
      console.error("Upload custom thumbnail failed:", error);
      return { success: false, error: { message: error.message } };
    }
  };
  
  const onRemoveThumbnail = async (videoId) => {
    const video = videos.find(v => v.id === videoId);
    if (video?.thumbnail_path) {
        try {
          await deleteThumbnail(video.thumbnail_path);
          return handleUpdateVideo(videoId, { thumbnail_path: null });
        } catch (err) {
          console.error("remove thumbnail failed", err);
          return { success: false, error: err };
        }
    }
    return { success: true };
  };

  const handleReorder = async (newVideos) => {
    try {
      // Optimistic update
      setVideos(newVideos);
      const updates = newVideos.map((video, index) => ({ id: video.id, order_index: index }));
      const { error } = await supabase.from("videos").upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      await fetchVideos(); // Re-fetch to confirm server state
    } catch (err) {
      console.error("reorder failed", err);
      alert("Failed to save new order (see console).");
      await fetchVideos(); // Rollback by re-fetching the current server state
    }
  };

  const handleVideoPlayed = async (videoId) => {
      try {
        // Calls a PostgreSQL function to safely increment the view count
        const { error } = await supabase.rpc('increment_view_count', { video_id: videoId });
        if (error) throw error;
      } catch (err) {
        // non-fatal
        console.error("increment view count failed", err);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar onRefresh={fetchVideos} isAdminAuthed={isAdminAuthed} onLogoutAdmin={handleLogoutAdmin} />
      <Routes>
        <Route path="/" element={
          <ViewerPage 
            videos={videos.filter(v => v.is_public !== false)} 
            loading={loading} 
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
              loading={loading}
              
              search={search} setSearch={setSearch}
              filterType={filterType} setFilterType={setFilterType}

              // FIX: Map consolidated state properties to individual props expected by AdminPage
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
              // END FIX

              // Handlers (All handlers are kept as provided)
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
