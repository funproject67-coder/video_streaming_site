// src/components/ViewerPage.jsx
import { useEffect, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";

/*
 Improved ViewerPage:
 - Category buttons toggle (click again to clear)
 - Clear (×) button in search bar clears filters + hides player
 - Selecting a category hides player and opens Home
 - Defensive coding; safe defaults for props
*/

export default function ViewerPage(props) {
  const {
    videos = [],
    selected,
    setSelected,
    loading = false,
    search,
    setSearch,
    filterType,
    setFilterType,
    onVideoPlayed,
  } = props;

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // home | categories | trending

  // derive categories
  const categories = useMemo(() => {
    const s = new Set();
    (videos || []).forEach((v) => {
      if (v && v.category) {
        v.category.split(",").forEach((c) => {
          const t = c && c.trim();
          if (t) s.add(t);
        });
      }
    });
    return Array.from(s);
  }, [videos]);

  // sorted lists
  const recentVideos = useMemo(() => {
    return [...(videos || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [videos]);

  const trendingVideos = useMemo(() => {
    return [...(videos || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  }, [videos]);

  // thumbnail fallback
  const thumb = (v) =>
    v?.thumbnail_url || v?.public_url || v?.external_url || "https://placehold.co/600x350?text=No+Thumbnail";

  // filtered list based on activeTab, search, filterType
  const filtered = useMemo(() => {
    const base = activeTab === "trending" ? trendingVideos : recentVideos;
    const q = (search || "").trim().toLowerCase();

    return base.filter((v) => {
      if (!v) return false;
      if (filterType && filterType !== "all" && v.source_type !== filterType) return false;
      if (!q) return true;
      const hay = `${v.title || ""} ${v.description || ""} ${v.category || ""} ${v.tags || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, filterType, recentVideos, trendingVideos, activeTab]);

  // open player when clicking a thumbnail
  const openPlayer = (v) => {
    if (!v) return;
    setSelected(v);
    setShowPlayer(true);
    setActiveTab("home");
  };

  // Home click hides player and clears active category search (but does not clear typed search)
  const onClickHome = () => {
    setActiveTab("home");
    setShowPlayer(false);
    // optionally clear selection too:
    setSelected(null);
  };

  // toggle category selection (click again to clear)
  const onToggleCategory = (cat) => {
    if (!cat) return;
    const current = (search || "").trim();
    if (current.toLowerCase() === cat.toLowerCase()) {
      // toggle off
      setSearch("");
      setFilterType("all");
      setActiveTab("home");
      setShowPlayer(false);
      setSelected(null);
    } else {
      setSearch(cat);
      setFilterType("all");
      setActiveTab("home");
      setShowPlayer(false);
      setSelected(null);
    }
  };

  // clear search button
  const clearSearch = () => {
    setSearch("");
    setFilterType("all");
    setShowPlayer(false);
    setSelected(null);
  };

  // if selected video got removed from the list, close player
  useEffect(() => {
    if (selected && !videos.some((v) => v && v.id === selected.id)) {
      setSelected(null);
      setShowPlayer(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  return (
    <main className="w-full min-h-screen bg-[#030712] text-white">
      {/* desktop top nav */}
      <div className="hidden md:flex justify-center border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3">
        <div className="flex gap-6 text-sm">
          <button
            onClick={onClickHome}
            className={`hover:text-emerald-400 ${activeTab === "home" ? "text-emerald-400 font-semibold" : ""}`}
          >
            Home
          </button>

          <button
            onClick={() => { setActiveTab("categories"); setShowPlayer(false); setSelected(null); }}
            className={`hover:text-blue-400 ${activeTab === "categories" ? "text-blue-400 font-semibold" : ""}`}
          >
            Categories
          </button>

          <button
            onClick={() => { setActiveTab("trending"); setShowPlayer(false); setSelected(null); }}
            className={`hover:text-pink-400 ${activeTab === "trending" ? "text-pink-400 font-semibold" : ""}`}
          >
            Trending
          </button>
        </div>
      </div>

      {/* sticky search */}
      <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex gap-3 items-center">
          <input
            value={search || ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="flex-1 px-4 py-2 rounded-full bg-white/10 text-sm placeholder:text-gray-400 focus:outline-none"
          />

          {/* clear button */}
          {(search || "").trim() !== "" && (
            <button onClick={clearSearch} className="ml-2 px-3 py-2 rounded-md bg-white/6 text-sm">
              ×
            </button>
          )}

          <select
            value={filterType || "all"}
            onChange={(e) => setFilterType(e.target.value)}
            className="ml-2 rounded-md bg-white/6 px-2 py-1 text-sm"
            aria-label="Filter videos"
          >
            <option value="all">All</option>
            <option value="uploaded">Uploaded</option>
            <option value="external">External</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* player area */}
        {activeTab === "home" && showPlayer && selected && (
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-xl">
            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
              <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
            </div>

            <div className="mt-4">
              <h1 className="text-xl font-bold">{selected.title}</h1>
              {selected.description && <p className="text-gray-300 text-sm mt-1">{selected.description}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {selected.category || "Uncategorized"} • {selected.view_count || 0} views
              </p>
            </div>
          </section>
        )}

        {/* categories page */}
        {activeTab === "categories" && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Categories</h2>
            <div className="flex flex-wrap gap-3">
              {categories.length === 0 && <p className="text-gray-400">No categories found.</p>}
              {categories.map((c) => {
                const active = ((search || "").trim().toLowerCase() === c.toLowerCase());
                return (
                  <button
                    key={c}
                    onClick={() => onToggleCategory(c)}
                    className={`px-4 py-2 rounded-full text-sm ${active ? "bg-emerald-500 text-black" : "bg-white/10 text-gray-300"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* grid for home & trending */}
        {(activeTab === "home" || activeTab === "trending") && (
          <section>
            <h2 className="text-lg font-semibold mb-3">{activeTab === "trending" ? "Trending Now" : "Videos"}</h2>

            {loading ? (
              <p className="text-gray-300">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400">No videos found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((v) => (
                  <button key={v.id} onClick={() => openPlayer(v)} className="text-left group">
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                      <img src={thumb(v)} alt={v?.title} className="w-full h-full object-cover group-hover:opacity-90 transition" />
                    </div>
                    <p className="mt-2 text-sm font-semibold truncate">{v?.title}</p>
                    <p className="text-xs text-gray-400">{(v?.view_count || 0).toLocaleString()} views</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* mobile bottom nav */}
      <div className="fixed bottom-0 left-0 w-full md:hidden bg-black/40 backdrop-blur-xl border-t border-white/10 py-2 flex justify-around text-sm">
        <button onClick={onClickHome} className={`flex flex-col items-center ${activeTab === "home" ? "text-emerald-400" : "text-gray-300"}`}>
          <span>🏠</span>
          <span className="text-[10px]">Home</span>
        </button>

        <button onClick={() => { setActiveTab("categories"); setShowPlayer(false); setSelected(null); }} className={`flex flex-col items-center ${activeTab === "categories" ? "text-blue-400" : "text-gray-300"}`}>
          <span>🗂️</span>
          <span className="text-[10px]">Categories</span>
        </button>

        <button onClick={() => { setActiveTab("trending"); setShowPlayer(false); setSelected(null); }} className={`flex flex-col items-center ${activeTab === "trending" ? "text-pink-400" : "text-gray-300"}`}>
          <span>🔥</span>
          <span className="text-[10px]">Trending</span>
        </button>
      </div>
    </main>
  );
}
