// src/App.jsx
import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";

import {
  generateThumbnailWithRetries,
  dataURLToBlob,
  uploadThumbnailBlob,
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
} from "./utils/thumbnails";

const VIDEO_BUCKET = "videos";

/* -------------------------------------------------------
   TOP BAR
------------------------------------------------------- */
function TopBar({ videosCount, onRefresh, isAdminAuthed, onLogoutAdmin }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 p-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">Stream Studio</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <nav className="flex rounded-full border bg-slate-900 p-[2px]">
          <Link
            to="/"
            className={`px-3 py-1 rounded-full ${
              !isAdmin ? "bg-emerald-400 text-black" : "text-slate-200"
            }`}
          >
            Viewer
          </Link>

        <Link
            to="/admin"
            className={`px-3 py-1 rounded-full ${
              isAdmin ? "bg-emerald-400 text-black" : "text-slate-200"
            }`}
          >
            {isAdmin ? "Admin" : "Admin 🔒"}
          </Link>
        </nav>

        <span className="hidden sm:inline text-slate-400">
          {videosCount} video{videosCount === 1 ? "" : "s"}
        </span>

        <button onClick={onRefresh} className="border rounded-md px-3 py-1">
          Refresh
        </button>

        {isAdminAuthed && (
          <button
            onClick={onLogoutAdmin}
            className="border rounded-md px-3 py-1 text-rose-400"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

/* -------------------------------------------------------
   MAIN APP
------------------------------------------------------- */
export default function App() {
  const navigate = useNavigate();

  /* ----------------------------
     ADMIN AUTH
  ---------------------------- */
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => {
    try {
      return localStorage.getItem("ms_admin") === "1";
    } catch {
      return false;
    }
  });

  const handleAdminLogin = useCallback(() => {
    localStorage.setItem("ms_admin", "1");
    setIsAdminAuthed(true);
    navigate("/admin", { replace: true });
  }, [navigate]);

  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem("ms_admin");
    setIsAdminAuthed(false);
    navigate("/", { replace: true });
  }, [navigate]);

  /* ----------------------------
     VIDEO STATES
  ---------------------------- */
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  /* ----------------------------
     FILTER STATES
  ---------------------------- */
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  /* ----------------------------
     ADMIN FORM STATES
  ---------------------------- */
  const [extTitle, setExtTitle] = useState("");
  const [extDescription, setExtDescription] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [extCategory, setExtCategory] = useState("");
  const [extTags, setExtTags] = useState("");
  const [savingExternal, setSavingExternal] = useState(false);

  const [upTitle, setUpTitle] = useState("");
  const [upDescription, setUpDescription] = useState("");
  const [upCategory, setUpCategory] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upFile, setUpFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* ----------------------------
     ATTACH PUBLIC URLS
  ---------------------------- */
  const attachUrls = useCallback((video) => {
    const v = { ...video };
    if (v.source_type === "uploaded" && v.file_path) {
      v.public_url = getPublicUrlForVideoPath(v.file_path);
    }
    if (v.thumbnail_path) {
      v.thumbnail_url = getPublicUrlForThumbPath(v.thumbnail_path);
    }
    return v;
  }, []);

  /* ----------------------------
     LOAD VIDEOS
  ---------------------------- */
  const loadVideos = useCallback(async () => {
    setLoading(true);
    setFetchError("");

    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("order_index", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data || []).map(attachUrls);
      setVideos(list);

      // keep previous selection if possible, else pick first
      setSelected((prev) => {
        if (prev && list.some((v) => v.id === prev.id)) return prev;
        return list[0] || null;
      });
    } catch (err) {
      console.error(err);
      setFetchError("Failed to load videos");
      setVideos([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [attachUrls]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  /* ----------------------------
     RESET FORMS
  ---------------------------- */
  const resetExternalForm = () => {
    setExtTitle("");
    setExtDescription("");
    setExtUrl("");
    setExtCategory("");
    setExtTags("");
  };

  const resetUploadForm = () => {
    setUpTitle("");
    setUpDescription("");
    setUpCategory("");
    setUpTags("");
    setUpFile(null);
  };

  /* ----------------------------
     ADD EXTERNAL VIDEO
  ---------------------------- */
  const handleAddExternal = async (e) => {
    e.preventDefault();
    if (!extTitle.trim() || !extUrl.trim()) {
      alert("Title + URL required");
      return;
    }

    setSavingExternal(true);

    try {
      let thumbnail_path = null;

      const thumbData = await generateThumbnailWithRetries(extUrl.trim());
      if (thumbData) {
        const blob = dataURLToBlob(thumbData);
        thumbnail_path = await uploadThumbnailBlob(blob, null);
      }

      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: extTitle.trim(),
          description: extDescription.trim() || null,
          source_type: "external",
          external_url: extUrl.trim(),
          category: extCategory.trim() || null,
          tags: extTags.trim() || null,
          thumbnail_path,
          is_public: true,
          is_featured: false,
          view_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newVid = attachUrls(data);
      setVideos((p) => [newVid, ...p]);
      setSelected(newVid);
      resetExternalForm();
    } catch (err) {
      console.error(err);
      alert("Failed to add video");
    } finally {
      setSavingExternal(false);
    }
  };

  /* ----------------------------
     UPLOAD VIDEO
  ---------------------------- */
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!upTitle.trim() || !upFile) {
      alert("Title + file required");
      return;
    }

    setUploading(true);

    try {
      const ext = upFile.name.split(".").pop();
      const filename = `${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(filename, upFile);

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(filename);

      const fileURL = pub?.publicUrl;
      let thumbnail_path = null;

      if (fileURL) {
        const t = await generateThumbnailWithRetries(fileURL);
        if (t) {
          const blob = dataURLToBlob(t);
          thumbnail_path = await uploadThumbnailBlob(blob, null);
        }
      }

      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: upTitle.trim(),
          description: upDescription.trim() || null,
          source_type: "uploaded",
          file_path: filename,
          category: upCategory.trim() || null,
          tags: upTags.trim() || null,
          thumbnail_path,
          is_public: true,
          is_featured: false,
          view_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newVid = attachUrls(data);
      setVideos((p) => [newVid, ...p]);
      setSelected(newVid);
      resetUploadForm();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ----------------------------
     DELETE VIDEO
  ---------------------------- */
  const handleDeleteVideo = async (video) => {
    if (!confirm(`Delete "${video.title}"?`)) return;

    try {
      if (video.source_type === "uploaded" && video.file_path) {
        await supabase.storage.from(VIDEO_BUCKET).remove([video.file_path]);
      }
      if (video.thumbnail_path) {
        await supabase.storage.from("thumbnails").remove([video.thumbnail_path]);
      }
      await supabase.from("videos").delete().eq("id", video.id);

      setVideos((p) => p.filter((v) => v.id !== video.id));
      setSelected((prev) => (prev?.id === video.id ? null : prev));
    } catch (err) {
      console.error(err);
      alert("Failed to delete");
    }
  };

  /* ----------------------------
     UPDATE VIDEO
  ---------------------------- */
  const handleUpdateVideo = async (id, fields) => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .update(fields)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const updated = attachUrls(data);

      setVideos((p) => p.map((v) => (v.id === id ? updated : v)));
      setSelected((prev) => (prev?.id === id ? updated : prev));
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  /* ----------------------------
     UPDATE THUMBNAIL
  ---------------------------- */
  const handleUpdateThumbnail = async (video, second = 7) => {
    try {
      const src =
        video.source_type === "uploaded" ? video.public_url : video.external_url;

      const dataUrl = await generateThumbnailWithRetries(src, second);
      if (!dataUrl) {
        alert("Failed to generate thumbnail");
        return;
      }

      const blob = dataURLToBlob(dataUrl);
      const newpath = await uploadThumbnailBlob(
        blob,
        video.thumbnail_path || null
      );

      const { data } = await supabase
        .from("videos")
        .update({ thumbnail_path: newpath })
        .eq("id", video.id)
        .select()
        .single();

      const updated = attachUrls(data);
      setVideos((p) => p.map((v) => (v.id === video.id ? updated : v)));
      setSelected((prev) => (prev?.id === video.id ? updated : prev));
    } catch (err) {
      console.error(err);
      alert("Thumbnail update failed");
    }
  };

  /* ----------------------------
     PUBLIC / FEATURED TOGGLES
  ---------------------------- */
  const handleTogglePublic = (v) =>
    handleUpdateVideo(v.id, { is_public: !v.is_public });

  const handleToggleFeatured = (v) =>
    handleUpdateVideo(v.id, { is_featured: !v.is_featured });

  /* ----------------------------
     REORDER DRAG & DROP
  ---------------------------- */
  const handleReorder = async (newList) => {
    try {
      await Promise.all(
        newList.map((v, i) =>
          supabase.from("videos").update({ order_index: i }).eq("id", v.id)
        )
      );
      setVideos(newList);
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  /* ----------------------------
     INCREMENT VIEW COUNT
  ---------------------------- */
  const handleVideoPlayed = async (video) => {
    try {
      const newCount = (video.view_count || 0) + 1;

      await supabase
        .from("videos")
        .update({ view_count: newCount })
        .eq("id", video.id);

      setVideos((p) =>
        p.map((v) => (v.id === video.id ? { ...v, view_count: newCount } : v))
      );
      setSelected((prev) =>
        prev?.id === video.id ? { ...prev, view_count: newCount } : prev
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ----------------------------
     FILTERS
  ---------------------------- */
  const applyFilters = (list) =>
    list.filter((video) => {
      if (filterType !== "all" && video.source_type !== filterType) return false;

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const hay = `${video.title || ""} ${video.description || ""} ${
        video.category || ""
      } ${video.tags || ""}`.toLowerCase();

      return hay.includes(q);
    });

  const visibleVideos = videos.filter((v) => v.is_public !== false);

  const filteredViewerVideos = applyFilters(visibleVideos);
  const filteredAdminVideos = applyFilters(videos);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <TopBar
        videosCount={videos.length}
        onRefresh={loadVideos}
        isAdminAuthed={isAdminAuthed}
        onLogoutAdmin={handleAdminLogout}
      />

      <Routes>
        {/* Viewer */}
        <Route
          path="/"
          // eslint-disable-next-line no-constant-binary-expression
          element={{
            /* ViewerPage handles its own dark/light + animation */
          } && (
            <ViewerPage
              videos={filteredViewerVideos}
              selected={selected}
              setSelected={setSelected}
              loading={loading}
              fetchError={fetchError}
              search={search}
              setSearch={setSearch}
              filterType={filterType}
              setFilterType={setFilterType}
              onVideoPlayed={handleVideoPlayed}
            />
          )}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminPage
              videos={filteredAdminVideos}
              rawVideos={videos}
              selected={selected}
              setSelected={setSelected}
              loading={loading}
              fetchError={fetchError}
              search={search}
              setSearch={setSearch}
              filterType={filterType}
              setFilterType={setFilterType}
              extTitle={extTitle}
              setExtTitle={setExtTitle}
              extDescription={extDescription}
              setExtDescription={setExtDescription}
              extUrl={extUrl}
              setExtUrl={setExtUrl}
              extCategory={extCategory}
              setExtCategory={setExtCategory}
              extTags={extTags}
              setExtTags={setExtTags}
              savingExternal={savingExternal}
              upTitle={upTitle}
              setUpTitle={setUpTitle}
              upDescription={upDescription}
              setUpDescription={setUpDescription}
              upCategory={upCategory}
              setUpCategory={setUpCategory}
              upTags={upTags}
              setUpTags={setUpTags}
              setUpFile={setUpFile}
              uploading={uploading}
              onAddExternal={handleAddExternal}
              onUpload={handleUpload}
              onDeleteVideo={handleDeleteVideo}
              onUpdateVideo={handleUpdateVideo}
              onUpdateThumbnail={handleUpdateThumbnail}
              onTogglePublic={handleTogglePublic}
              onToggleFeatured={handleToggleFeatured}
              onReorder={handleReorder}
              onVideoPlayed={handleVideoPlayed}
              isAdminAuthed={isAdminAuthed}
              onAdminLogin={handleAdminLogin}
            />
          }
        />
      </Routes>
    </div>
  );
}
