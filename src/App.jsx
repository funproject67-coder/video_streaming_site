import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { supabase } from "./supabaseClient";
import VideoPlayer from "./components/VideoPlayer";

const VIDEO_BUCKET = "videos";
const THUMBNAIL_BUCKET = "thumbnails";
const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

/* ---------- Helpers: thumbnail generation + upload ---------- */

function generateThumbnailFromVideo(src, timeSeconds = 7) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = src;
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      video.addEventListener("loadedmetadata", () => {
        if (isNaN(video.duration) || video.duration === Infinity) {
          cleanup();
          resolve(null);
          return;
        }
        const targetTime =
          video.duration > timeSeconds
            ? timeSeconds
            : Math.max(1, video.duration / 3);
        video.currentTime = targetTime;
      });

      video.addEventListener("error", () => {
        cleanup();
        resolve(null);
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          cleanup();
          resolve(dataUrl);
        } catch (e) {
          console.error("Thumbnail generation error", e);
          cleanup();
          resolve(null);
        }
      });
    } catch (e) {
      console.error("Thumbnail generation setup error", e);
      resolve(null);
    }
  });
}

function dataURLToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function uploadThumbnailBlob(blob, existingPath) {
  try {
    const path = existingPath || `${crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(path, blob, {
        upsert: true,
      });

    if (error) {
      console.error("Error uploading thumbnail:", error);
      return null;
    }

    return path;
  } catch (e) {
    console.error("Unexpected thumbnail upload error", e);
    return null;
  }
}

/* ---------- Root App ---------- */

function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | uploaded | external

  // Simple admin auth
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);

  // External link form (admin)
  const [extTitle, setExtTitle] = useState("");
  const [extDescription, setExtDescription] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [extCategory, setExtCategory] = useState("");
  const [extTags, setExtTags] = useState("");
  const [savingExternal, setSavingExternal] = useState(false);

  // Upload form (admin)
  const [upTitle, setUpTitle] = useState("");
  const [upDescription, setUpDescription] = useState("");
  const [upCategory, setUpCategory] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upFile, setUpFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Helper: attach URLs
  const attachUrls = useCallback((video) => {
    let v = { ...video };

    if (v.source_type === "uploaded" && v.file_path) {
      const { data } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(v.file_path);
      v.public_url = data?.publicUrl || "";
    }

    if (v.thumbnail_path) {
      const { data } = supabase.storage
        .from(THUMBNAIL_BUCKET)
        .getPublicUrl(v.thumbnail_path);
      v.thumbnail_url = data?.publicUrl || "";
    }

    return v;
  }, []);

  // Load videos
  const loadVideos = useCallback(async () => {
    setLoading(true);
    setFetchError("");

    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("order_index", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        setFetchError("Failed to load videos. Check console for details.");
        setVideos([]);
        setSelected(null);
        return;
      }

      const processed = (data || []).map(attachUrls);
      setVideos(processed);
      setSelected((prev) => prev || processed[0] || null);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
      setFetchError("Unexpected error while loading videos.");
      setVideos([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [attachUrls]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  /* ---------- Admin handlers: add / upload ---------- */

  const resetExternalForm = () => {
    setExtTitle("");
    setExtDescription("");
    setExtUrl("");
    setExtCategory("");
    setExtTags("");
  };

  const handleAddExternal = async (e) => {
    e.preventDefault();
    if (!extTitle.trim() || !extUrl.trim()) {
      alert("Please provide both title and URL for the external video.");
      return;
    }

    setSavingExternal(true);
    try {
      const url = extUrl.trim();
      const thumbDataUrl = await generateThumbnailFromVideo(url, 7);
      let thumbnailPath = null;

      if (thumbDataUrl) {
        const blob = dataURLToBlob(thumbDataUrl);
        thumbnailPath = await uploadThumbnailBlob(blob, null);
      }

      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: extTitle.trim(),
          description: extDescription.trim(),
          source_type: "external",
          external_url: url,
          category: extCategory.trim() || null,
          tags: extTags.trim() || null,
          thumbnail_path: thumbnailPath,
          is_public: true,
          is_featured: false,
          view_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding external video:", error);
        alert("Failed to add external video. Check console for details.");
        return;
      }

      const newVideo = attachUrls(data);
      setVideos((prev) => [newVideo, ...prev]);
      setSelected(newVideo);
      resetExternalForm();
    } catch (err) {
      console.error("Unexpected error adding external video:", err);
      alert("Unexpected error while adding external video.");
    } finally {
      setSavingExternal(false);
    }
  };

  const resetUploadForm = () => {
    setUpTitle("");
    setUpDescription("");
    setUpCategory("");
    setUpTags("");
    setUpFile(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!upTitle.trim() || !upFile) {
      alert("Please provide a title and select a video file.");
      return;
    }

    setUploading(true);
    try {
      const ext = upFile.name.split(".").pop();
      const name = `${crypto.randomUUID()}.${ext}`;
      const filePath = name;

      const { error: uploadError } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(filePath, upFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Failed to upload file to storage.");
        return;
      }

      const { data: vpub } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(filePath);
      const videoUrl = vpub?.publicUrl;

      let thumbnailPath = null;
      if (videoUrl) {
        const thumbDataUrl = await generateThumbnailFromVideo(videoUrl, 7);
        if (thumbDataUrl) {
          const blob = dataURLToBlob(thumbDataUrl);
          thumbnailPath = await uploadThumbnailBlob(blob, null);
        }
      }

      const { data: row, error: insertError } = await supabase
        .from("videos")
        .insert({
          title: upTitle.trim(),
          description: upDescription.trim(),
          source_type: "uploaded",
          file_path: filePath,
          category: upCategory.trim() || null,
          tags: upTags.trim() || null,
          thumbnail_path: thumbnailPath,
          is_public: true,
          is_featured: false,
          view_count: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        alert("Failed to save video details to database.");
        return;
      }

      const newVideo = attachUrls(row);
      setVideos((prev) => [newVideo, ...prev]);
      setSelected(newVideo);
      resetUploadForm();
    } catch (err) {
      console.error("Unexpected upload error:", err);
      alert("Unexpected error while uploading video.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Admin handlers: delete / update / visibility / featured / thumbnail ---------- */

  const handleDeleteVideo = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      if (video.source_type === "uploaded" && video.file_path) {
        const { error: storageError } = await supabase.storage
          .from(VIDEO_BUCKET)
          .remove([video.file_path]);
        if (storageError)
          console.error("Error deleting video file:", storageError);
      }

      if (video.thumbnail_path) {
        const { error: thumbErr } = await supabase.storage
          .from(THUMBNAIL_BUCKET)
          .remove([video.thumbnail_path]);
        if (thumbErr) console.error("Error deleting thumbnail:", thumbErr);
      }

      const { error: dbError } = await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (dbError) {
        console.error("Error deleting video row:", dbError);
        alert("Failed to delete video from database.");
        return;
      }

      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setSelected((prev) => (prev && prev.id === video.id ? null : prev));
    } catch (err) {
      console.error("Unexpected delete error:", err);
      alert("Unexpected error while deleting video.");
    }
  };

  const handleUpdateVideo = async (id, fields) => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .update(fields)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating video:", error);
        alert("Failed to update video.");
        return;
      }

      const updated = attachUrls(data);
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updated } : v))
      );
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      console.error("Unexpected update error:", err);
      alert("Unexpected error while updating video.");
    }
  };

  const handleUpdateThumbnail = async (video, timeSeconds) => {
    try {
      const src =
        video.source_type === "uploaded"
          ? video.public_url
          : video.external_url;
      if (!src) {
        alert("No video source to generate thumbnail.");
        return;
      }

      const thumbDataUrl = await generateThumbnailFromVideo(src, timeSeconds);
      if (!thumbDataUrl) {
        alert("Failed to generate thumbnail from video.");
        return;
      }

      const blob = dataURLToBlob(thumbDataUrl);
      const path = await uploadThumbnailBlob(
        blob,
        video.thumbnail_path || null
      );
      if (!path) {
        alert("Failed to upload thumbnail.");
        return;
      }

      const { data, error } = await supabase
        .from("videos")
        .update({ thumbnail_path: path })
        .eq("id", video.id)
        .select()
        .single();

      if (error) {
        console.error("Error saving thumbnail_path:", error);
        alert("Failed to save thumbnail.");
        return;
      }

      const updated = attachUrls(data);
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, ...updated } : v))
      );
      setSelected((prev) => (prev && prev.id === video.id ? updated : prev));
    } catch (err) {
      console.error("Unexpected thumbnail update error:", err);
      alert("Unexpected error while updating thumbnail.");
    }
  };

  const handleTogglePublic = async (video) => {
    const newValue = video.is_public === false ? true : false;
    await handleUpdateVideo(video.id, { is_public: newValue });
  };

  const handleToggleFeatured = async (video) => {
    const newValue = !video.is_featured;
    await handleUpdateVideo(video.id, { is_featured: newValue });
  };

  // Drag & drop reorder (admin)
  const handleReorder = async (newOrderList) => {
    setVideos((prev) => {
      const map = new Map(prev.map((v) => [v.id, v]));
      const reordered = newOrderList
        .map((v) => map.get(v.id))
        .filter(Boolean);
      const remaining = prev.filter(
        (v) => !newOrderList.some((nv) => nv.id === v.id)
      );
      return [...reordered, ...remaining];
    });

    try {
      await Promise.all(
        newOrderList.map((video, index) =>
          supabase
            .from("videos")
            .update({ order_index: index })
            .eq("id", video.id)
        )
      );
    } catch (err) {
      console.error("Error saving new order:", err);
      alert("Failed to save new order. Check console.");
    }
  };

  // View count – called when VideoPlayer reports a play
  const handleVideoPlayed = async (video) => {
    try {
      const current = Number(video.view_count || 0);
      const newCount = current + 1;

      // Optimistic UI
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, view_count: newCount } : v
        )
      );
      setSelected((prev) =>
        prev && prev.id === video.id ? { ...prev, view_count: newCount } : prev
      );

      const { error } = await supabase
        .from("videos")
        .update({ view_count: newCount })
        .eq("id", video.id);

      if (error) {
        console.error("Error updating view count:", error);
      }
    } catch (err) {
      console.error("Unexpected error updating view count:", err);
    }
  };

  /* ---------- Filtered lists for viewer vs admin ---------- */

  const applyFilters = (list) =>
    list.filter((video) => {
      if (filterType !== "all" && video.source_type !== filterType) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const haystack = [
        video.title || "",
        video.description || "",
        video.category || "",
        video.tags || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

  const viewerVideos = videos.filter((v) => v.is_public !== false);
  const filteredViewerVideos = applyFilters(viewerVideos);
  const filteredAdminVideos = applyFilters(videos);

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 overflow-x-hidden flex flex-col">
      <TopBar
        videosCount={videos.length}
        onRefresh={loadVideos}
        isAdminAuthed={isAdminAuthed}
        onLogoutAdmin={() => setIsAdminAuthed(false)}
      />

      <Routes>
        <Route
          path="/"
          element={
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
          }
        />
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
              onAdminLogin={() => setIsAdminAuthed(true)}
            />
          }
        />
      </Routes>
    </div>
  );
}

/* ---------- Layout components ---------- */

function TopBar({ videosCount, onRefresh, isAdminAuthed, onLogoutAdmin }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur flex items-center justify-between px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 text-xs font-bold shadow-lg shadow-emerald-500/30">
          VS
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            MyStream Studio
          </h1>
          <p className="text-[11px] text-slate-400">
            Tiny personal streaming hub · Supabase powered
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <nav className="flex rounded-full border border-slate-700/80 bg-slate-900/60 p-[2px] shadow-sm">
          <NavLinkButton to="/" active={!isAdmin}>
            Viewer
          </NavLinkButton>
          <NavLinkButton to="/admin" active={isAdmin}>
            {isAdminAuthed ? "Admin" : "Admin 🔒"}
          </NavLinkButton>
        </nav>

        <span className="hidden text-slate-400 sm:inline">
          {videosCount} video{videosCount === 1 ? "" : "s"}
        </span>
        {isAdminAuthed && (
          <button
            onClick={onLogoutAdmin}
            className="hidden sm:inline rounded-md border border-rose-500/70 px-3 py-1 text-xs text-rose-100 hover:bg-rose-500/15"
          >
            Logout
          </button>
        )}
        <button
          onClick={onRefresh}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800/80"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}

function NavLinkButton({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1 rounded-full text-[11px] transition ${
        active
          ? "bg-emerald-400 text-slate-950 font-semibold shadow-sm"
          : "text-slate-200 hover:bg-slate-800/80"
      }`}
    >
      {children}
    </Link>
  );
}

/* ---------- Viewer page (tabs + share + counts) ---------- */

function ViewerPage({
  videos,
  selected,
  setSelected,
  loading,
  fetchError,
  search,
  setSearch,
  filterType,
  setFilterType,
  onVideoPlayed,
}) {
  const [tab, setTab] = useState("recent"); // "recent" | "popular"

  // Sort videos based on tab
  const sortedVideos = [...videos].sort((a, b) => {
    if (tab === "recent") {
      return new Date(b.created_at) - new Date(a.created_at);
    } else {
      const av = Number(a.view_count || 0);
      const bv = Number(b.view_count || 0);
      if (bv !== av) return bv - av;
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // pick default: selected -> first featured -> first in sorted list
  useEffect(() => {
    if (!selected && sortedVideos.length > 0) {
      const featured = sortedVideos.find((v) => v.is_featured);
      setSelected(featured || sortedVideos[0]);
    }
  }, [selected, sortedVideos, setSelected]);

  const current =
    selected && sortedVideos.some((v) => v.id === selected.id)
      ? selected
      : sortedVideos[0] || null;

  return (
    <main className="flex flex-1 flex-col md:flex-row w-full">
      {/* Left: tabs + player */}
      <div className="w-full border-b border-slate-900/80 p-4 md:w-2/3 md:border-r md:border-b-0">
        {/* Tabs */}
        <div className="mb-3 flex gap-2 text-[11px]">
          <button
            onClick={() => setTab("recent")}
            className={`rounded-full px-3 py-1 border transition ${
              tab === "recent"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            Recently added
          </button>
          <button
            onClick={() => setTab("popular")}
            className={`rounded-full px-3 py-1 border transition ${
              tab === "popular"
                ? "border-sky-400 bg-sky-500/10 text-sky-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            Most watched
          </button>
        </div>

        <section className="mb-4">
          {current ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-lg shadow-slate-950/70">
              <VideoPlayer video={current} onPlayed={onVideoPlayed} />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-sm text-slate-400">
              No video yet. Ask your admin-self to upload one 😄
            </div>
          )}
        </section>
        {fetchError && (
          <p className="mt-3 text-xs text-rose-300">{fetchError}</p>
        )}
      </div>

      {/* Right: search + library */}
      <SidebarLibrary
        videos={sortedVideos}
        selected={current}
        setSelected={setSelected}
        loading={loading}
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        canDelete={false}
        canEdit={false}
        canTogglePublic={false}
        canToggleFeatured={false}
        canReorder={false}
        onDeleteVideo={() => {}}
        onEditClick={() => {}}
        onTogglePublic={() => {}}
        onToggleFeatured={() => {}}
        onReorder={() => {}}
        isAdminView={false}
      />
    </main>
  );
}

/* ---------- Admin page ---------- */

function AdminPage(props) {
  const {
    videos,
    rawVideos,
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
  const [inputPassword, setInputPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  if (!isAdminAuthed) {
    const handleLogin = (e) => {
      e.preventDefault();
      if (inputPassword === ADMIN_PASSWORD) {
        onAdminLogin();
        setInputPassword("");
        setLoginError("");
      } else {
        setLoginError("Incorrect password");
      }
    };

    return (
      <main className="flex flex-1 items-center justify-center w-full p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-3 shadow-xl shadow-slate-950/70"
        >
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Admin login
          </h2>
          <p className="text-[11px] text-slate-400">
            This page is locked. Enter the admin password to manage your
            mini-streaming site.
          </p>
          <input
            type="password"
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
            placeholder="Admin password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
          />
          {loginError && (
            <p className="text-[11px] text-rose-300">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400"
          >
            Unlock admin
          </button>
        </form>
      </main>
    );
  }

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

  const handleEditChange = (field, value) => {
    setEditFields((prev) => ({ ...prev, [field]: value }));
  };

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

    await onUpdateVideo(editingVideo.id, payload);
    setEditSaving(false);
    setEditingVideo(null);
  };

  const handleEditCancel = () => {
    setEditingVideo(null);
  };

  const handleThumbnailUpdateClick = async () => {
    if (!editingVideo) return;
    const sec = Number(editFields.thumbSecond) || 7;
    await onUpdateThumbnail(editingVideo, sec);
  };

  // Admin stats
  const total = rawVideos.length;
  const publicCount = rawVideos.filter((v) => v.is_public !== false).length;
  const hiddenCount = total - publicCount;
  const uploadedCount = rawVideos.filter(
    (v) => v.source_type === "uploaded"
  ).length;
  const externalCount = rawVideos.filter(
    (v) => v.source_type === "external"
  ).length;
  const featuredCount = rawVideos.filter((v) => v.is_featured).length;

  return (
    <main className="flex flex-1 flex-col md:flex-row w-full">
      {/* Left: stats + player + forms */}
      <div className="w-full border-b border-slate-900/80 p-4 md:w-2/3 md:border-r md:border-b-0 space-y-4">
        {/* Stats */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-200 grid grid-cols-2 gap-3 shadow-md shadow-slate-950/60">
          <Stat label="Total videos" value={total} />
          <Stat label="Public" value={publicCount} accent="text-emerald-400" />
          <Stat label="Hidden" value={hiddenCount} accent="text-amber-300" />
          <Stat label="Featured" value={featuredCount} accent="text-yellow-300" />
          <Stat label="Uploaded" value={uploadedCount} accent="text-sky-300" />
          <Stat label="External" value={externalCount} accent="text-purple-300" />
        </section>

        {/* Player */}
        <section>
          {selected ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 shadow-lg shadow-slate-950/70">
              <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-sm text-slate-400">
              Select a video from the right or add a new one.
            </div>
          )}
        </section>

        {/* Add video forms */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Add new video
          </h2>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* External link form */}
            <form
              onSubmit={onAddExternal}
              className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3 space-y-2"
            >
              <h3 className="text-xs font-semibold text-slate-100 flex items-center justify-between">
                Online video link
                <span className="text-[10px] font-normal text-slate-500">
                  MP4 / direct URL
                </span>
              </h3>
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Title"
                value={extTitle}
                onChange={(e) => setExtTitle(e.target.value)}
              />
              <textarea
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Description (optional)"
                rows={2}
                value={extDescription}
                onChange={(e) => setExtDescription(e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Category (e.g. Travel, Tutorial)"
                value={extCategory}
                onChange={(e) => setExtCategory(e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Tags (comma separated)"
                value={extTags}
                onChange={(e) => setExtTags(e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="https://example.com/video.mp4"
                value={extUrl}
                onChange={(e) => setExtUrl(e.target.value)}
              />
              <button
                type="submit"
                disabled={savingExternal}
                className="mt-1 w-full rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {savingExternal ? "Adding…" : "Add external video"}
              </button>
            </form>

            {/* Upload form */}
            <form
              onSubmit={onUpload}
              className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3 space-y-2"
            >
              <h3 className="text-xs font-semibold text-slate-100">
                Upload video
              </h3>
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Title"
                value={upTitle}
                onChange={(e) => setUpTitle(e.target.value)}
              />
              <textarea
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Description (optional)"
                rows={2}
                value={upDescription}
                onChange={(e) => setUpDescription(e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Category"
                value={upCategory}
                onChange={(e) => setUpCategory(e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Tags (comma separated)"
                value={upTags}
                onChange={(e) => setUpTags(e.target.value)}
              />
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUpFile(e.target.files[0] || null)}
                className="block w-full text-[11px] text-slate-300"
              />
              <button
                type="submit"
                disabled={uploading}
                className="mt-1 w-full rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload video"}
              </button>
            </form>
          </div>
        </section>

        {/* Edit form + thumbnail slider */}
        {editingVideo && (
          <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Edit video – {editingVideo.title}
              </h2>
              <button
                onClick={handleEditCancel}
                className="text-[11px] text-slate-400 hover:text-slate-100"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-2">
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Title"
                value={editFields.title}
                onChange={(e) => handleEditChange("title", e.target.value)}
              />
              <textarea
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Description"
                rows={2}
                value={editFields.description}
                onChange={(e) =>
                  handleEditChange("description", e.target.value)
                }
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Category"
                value={editFields.category}
                onChange={(e) => handleEditChange("category", e.target.value)}
              />
              <input
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                placeholder="Tags (comma separated)"
                value={editFields.tags}
                onChange={(e) => handleEditChange("tags", e.target.value)}
              />
              {editingVideo.source_type === "external" && (
                <input
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
                  placeholder="External video URL"
                  value={editFields.external_url}
                  onChange={(e) =>
                    handleEditChange("external_url", e.target.value)
                  }
                />
              )}

              <div className="mt-2 space-y-1">
                <label className="text-[11px] text-slate-300">
                  Thumbnail time:{" "}
                  <span className="font-semibold">
                    {editFields.thumbSecond}s
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={editFields.thumbSecond}
                  onChange={(e) =>
                    handleEditChange("thumbSecond", e.target.value)
                  }
                  className="w-full accent-purple-500"
                />
                <button
                  type="button"
                  onClick={handleThumbnailUpdateClick}
                  className="mt-1 rounded-md bg-purple-500 px-3 py-1 text-[11px] font-medium text-slate-950 hover:bg-purple-400"
                >
                  Update thumbnail at {editFields.thumbSecond}s
                </button>
              </div>

              <button
                type="submit"
                disabled={editSaving}
                className="mt-2 rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>
        )}

        {fetchError && (
          <p className="mt-3 text-xs text-rose-300">{fetchError}</p>
        )}
      </div>

      {/* Right: library sidebar with admin controls + drag & drop */}
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
        onEditClick={openEdit}
        onTogglePublic={onTogglePublic}
        onToggleFeatured={onToggleFeatured}
        onReorder={onReorder}
        isAdminView={true}
      />
    </main>
  );
}

/* ---------- Small stat card ---------- */

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={`text-base font-semibold ${accent || "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

/* ---------- Shared sidebar (with drag & drop in admin) ---------- */

function SidebarLibrary({
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

  const handleDragStart = (id) => {
    if (!canReorder) return;
    setDraggingId(id);
  };

  const handleDragOver = (e) => {
    if (!canReorder) return;
    e.preventDefault();
  };

  const handleDropOnItem = (e, targetId) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;

    const sourceIndex = videos.findIndex((v) => v.id === draggingId);
    const targetIndex = videos.findIndex((v) => v.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...videos];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorder(reordered);
    setDraggingId(null);
  };

  const handleDropOnEnd = (e) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!draggingId) return;

    const sourceIndex = videos.findIndex((v) => v.id === draggingId);
    if (sourceIndex === -1) return;

    const reordered = [...videos];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.push(moved);
    onReorder(reordered);
    setDraggingId(null);
  };

  return (
    <aside className="w-full p-4 md:w-1/3">
      {/* Search & filter */}
      <div className="mb-3 space-y-2">
        <input
          className="w-full rounded-md bg-slate-950 border border-slate-800 px-2 py-1 text-xs"
          placeholder={
            isAdminView
              ? "Search by title, description, category, tags…"
              : "Search videos…"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 text-[11px]">
          <button
            onClick={() => setFilterType("all")}
            className={`flex-1 rounded-full border px-2 py-1 ${
              filterType === "all"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("uploaded")}
            className={`flex-1 rounded-full border px-2 py-1 ${
              filterType === "uploaded"
                ? "border-sky-400 bg-sky-500/10 text-sky-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            Uploaded
          </button>
          <button
            onClick={() => setFilterType("external")}
            className={`flex-1 rounded-full border px-2 py-1 ${
              filterType === "external"
                ? "border-purple-400 bg-purple-500/10 text-purple-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            External
          </button>
        </div>
      </div>

      {/* List */}
      <h2 className="mb-2 text-sm font-semibold text-slate-100 flex items-center justify-between">
        {isAdminView ? "Admin library" : "Library"}
        {isAdminView && canReorder && (
          <span className="text-[10px] text-slate-400">
            Drag to reorder ▸
          </span>
        )}
      </h2>

      {loading ? (
        <p className="text-xs text-slate-400">Loading videos…</p>
      ) : videos.length === 0 ? (
        <p className="text-xs text-slate-500">
          No videos found. Try changing the search or filters, or add a new
          video.
        </p>
      ) : (
        <div
          className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1"
          onDragOver={handleDragOver}
        >
          {videos.map((video) => {
            const isActive = selected && selected.id === video.id;
            const isUploaded = video.source_type === "uploaded";
            const thumbSrc =
              video.thumbnail_url ||
              (isUploaded ? video.public_url : video.external_url);

            const isHidden = video.is_public === false;
            const isFeatured = !!video.is_featured;

            return (
              <div
                key={video.id}
                draggable={canReorder}
                onDragStart={() => handleDragStart(video.id)}
                onDrop={(e) => handleDropOnItem(e, video.id)}
                className={`flex gap-2 rounded-xl border p-2 text-xs transition ${
                  isActive
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-950/90 hover:border-slate-600"
                } ${
                  draggingId === video.id
                    ? "opacity-60 ring-1 ring-emerald-400"
                    : ""
                }`}
              >
                <button
                  onClick={() => setSelected(video)}
                  className="flex gap-2 flex-1 text-left"
                >
                  <div className="aspect-video h-16 overflow-hidden rounded-md bg-black">
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={video.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-800" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="line-clamp-2 text-[11px] font-semibold text-slate-100">
                        {video.title}
                      </p>
                      {isFeatured && (
                        <span className="text-[10px] text-yellow-300">★</span>
                      )}
                    </div>

                    {video.description && (
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">
                        {video.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {video.category && (
                        <span className="inline-flex rounded-full bg-slate-900 px-2 py-[2px] text-[9px] text-emerald-300">
                          {video.category}
                        </span>
                      )}
                      <span
                        className={`inline-flex rounded-full px-2 py-[2px] text-[9px] ${
                          isUploaded
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-purple-500/15 text-purple-300"
                        }`}
                      >
                        {isUploaded ? "Uploaded" : "External"}
                      </span>
                      {isAdminView && isHidden && (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-[2px] text-[9px] text-amber-300">
                          Hidden
                        </span>
                      )}
                      {/* tiny view count */}
                      <span className="inline-flex rounded-full bg-slate-800 px-2 py-[2px] text-[9px] text-slate-300">
                        {Number(video.view_count || 0)} views
                      </span>
                    </div>
                  </div>
                </button>

                {(canDelete ||
                  canEdit ||
                  canTogglePublic ||
                  canToggleFeatured) && (
                  <div className="flex flex-col gap-1 self-start">
                    {canTogglePublic && (
                      <button
                        onClick={() => onTogglePublic(video)}
                        className="rounded-md border border-slate-600 px-2 py-[2px] text-[10px] text-slate-100 hover:bg-slate-700"
                        title={
                          video.is_public === false
                            ? "Make public"
                            : "Hide from viewers"
                        }
                      >
                        {video.is_public === false ? "👁" : "🚫"}
                      </button>
                    )}
                    {canToggleFeatured && (
                      <button
                        onClick={() => onToggleFeatured(video)}
                        className="rounded-md border border-yellow-500/60 px-2 py-[2px] text-[10px] text-yellow-200 hover:bg-yellow-500/20"
                        title={
                          video.is_featured
                            ? "Unfeature"
                            : "Mark as featured"
                        }
                      >
                        {video.is_featured ? "★" : "☆"}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => onEditClick(video)}
                        className="rounded-md border border-slate-600 px-2 py-[2px] text-[10px] text-slate-100 hover:bg-slate-700"
                        title="Edit details"
                      >
                        ✏
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDeleteVideo(video)}
                        className="rounded-md border border-rose-500/50 px-2 py-[2px] text-[10px] text-rose-200 hover:bg-rose-500/15"
                        title="Delete video"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Drop zone at end */}
          {canReorder && (
            <div
              onDrop={handleDropOnEnd}
              onDragOver={handleDragOver}
              className="mt-1 h-6 rounded-md border border-dashed border-slate-700 text-[10px] text-center text-slate-500 flex items-center justify-center"
            >
              Drop here to move to end
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default App;
