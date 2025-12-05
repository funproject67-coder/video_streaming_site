// src/components/ViewerPage.jsx
import { useEffect, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";

/*
  ViewerPage — responsive viewer with:
  - sticky search (min-w-0 input)
  - categories, trending, home tabs
  - grid thumbnails (click to open player)
  - mobile bottom nav
*/

export default function ViewerPage(props) {
  const {
    videos = [],
    selected,
    setSelected,
    loading = false,
    fetchError = "",
    search,
    setSearch,
    filterType,
    setFilterType,
    onVideoPlayed,
  } = props;

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // home | categories | trending

  // categories
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

  // sortings
  const recentVideos = useMemo(() => {
    return [...(videos || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [videos]);

  const trendingVideos = useMemo(() => {
    return [...(videos || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  }, [videos]);

  const thumb = (v) => v?.thumbnail_url || v?.public_url || v?.external_url || "https://placehold.co/600x350?text=No+Thumbnail";

  // filtered list
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

  // open player
  const openPlayer = (v) => {
    if (!v) return;
    setSelected(v);
    setShowPlayer(true);
    setActiveTab("home");
  };

  // clicking Home hides player
  const onClickHome = () => {
    setActiveTab("home");
    setShowPlayer(false);
    setSelected(null);
  };

  // category toggle
  const onToggleCategory = (cat) => {
    if (!cat) return;
    const cur = (search || "").trim();
    if (cur.toLowerCase() === cat.toLowerCase()) {
      setSearch("");
      setFilterType("all");
      setShowPlayer(false);
      setSelected(null);
      setActiveTab("home");
    } else {
      setSearch(cat);
      setFilterType("all");
      setShowPlayer(false);
      setSelected(null);
      setActiveTab("home");
    }
  };

  useEffect(() => {
    if (selected && !videos.some((v) => v && v.id === selected.id)) {
      setSelected(null);
      setShowPlayer(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  return (
    <main className="w-full min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Desktop top nav */}
      <div className="hidden md:flex justify-center border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3">
        <div className="flex gap-6 text-sm">
          <button onClick={onClickHome} className={`hover:text-emerald-400 ${activeTab === "home" ? "text-emerald-400 font-semibold" : ""}`}>Home</button>

          <button onClick={() => { setActiveTab("categories"); setShowPlayer(false); setSelected(null); }} className={`hover:text-blue-400 ${activeTab === "categories" ? "text-blue-400 font-semibold" : ""}`}>Categories</button>

          <button onClick={() => { setActiveTab("trending"); setShowPlayer(false); setSelected(null); }} className={`hover:text-pink-400 ${activeTab === "trending" ? "text-pink-400 font-semibold" : ""}`}>Trending</button>
        </div>
      </div>

      {/* Sticky search + filter */}
      <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/10 px-3 py-3">
        <div className="max-w-6xl w-full mx-auto flex items-center gap-3">
          {/* input must be able to shrink on small screens -> min-w-0 */}
          <input
            value={search || ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="flex-1 min-w-0 px-4 py-2 rounded-full bg-white/10 text-sm placeholder:text-gray-400 focus:outline-none"
          />

          {(search || "").trim() !== "" && (
            <button onClick={() => { setSearch(""); setFilterType("all"); setShowPlayer(false); setSelected(null); }} className="ml-2 px-3 py-2 rounded-md bg-white/6 text-sm">×</button>
          )}

          <select value={filterType || "all"} onChange={(e) => setFilterType(e.target.value)} className="ml-2 rounded-md bg-white/6 px-2 py-1 text-sm" aria-label="Filter videos">
            <option value="all">All</option>
            <option value="uploaded">Uploaded</option>
            <option value="external">External</option>
            <option value="torrent">Torrent</option>
          </select>
        </div>
      </div>

      {/* Main content container — w-full + pb-24 so bottom nav doesn't overlap */}
      <div className="max-w-6xl w-full mx-auto px-4 py-6 pb-24">
        {/* Player (only when shown) */}
        {activeTab === "home" && showPlayer && selected && (
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-xl mb-6">
            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
              <VideoPlayer video={selected} onPlayed={onVideoPlayed} />
            </div>

            <div className="mt-4">
              <h1 className="text-xl font-bold">{selected.title}</h1>
              {selected.description && <p className="text-gray-300 text-sm mt-1">{selected.description}</p>}
              <p className="text-xs text-gray-500 mt-1">{selected.category || "Uncategorized"} • {selected.view_count || 0} views</p>
            </div>
          </section>
        )}

        {/* Categories */}
        {activeTab === "categories" && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Categories</h2>

            {/* Centered inner container so categories are not left-aligned */}
            <div className="max-w-3xl w-full mx-auto">
              <div className="flex flex-wrap gap-3 justify-start md:justify-center">
                {categories.length === 0 && <p className="text-gray-400">No categories found.</p>}
                {categories.map((c) => {
                  const active = ((search || "").trim().toLowerCase() === c.toLowerCase());
                  return (
                    <button key={c} onClick={() => onToggleCategory(c)} className={`px-4 py-2 rounded-full text-sm ${active ? "bg-emerald-500 text-black" : "bg-white/10 text-gray-300"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid list for home & trending */}
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
                    <div className="relative">
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                        <img src={thumb(v)} alt={v?.title || "thumbnail"} className="w-full h-full object-cover max-w-full" />
                      </div>

                      {v.source_type === "torrent" && (
                        <div className="absolute left-2 top-2 inline-flex items-center gap-2 px-2 py-1 bg-yellow-800/90 rounded-full text-xs z-10">
                          <span>🔗</span>
                          <span>Torrent</span>
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-sm font-semibold truncate">{v?.title}</p>
                    <p className="text-xs text-gray-400">{(v?.view_count || 0).toLocaleString()} views</p>

                    {/* quick actions for torrents (stopPropagation so we don't open player) */}
                    <div className="mt-1 flex gap-2">
                      {v.source_type === "torrent" && (
                        <>
                          <a onClick={(ev) => ev.stopPropagation()} href={v.external_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-white/6 rounded">Open</a>
                          <button onClick={(ev) => { ev.stopPropagation(); navigator.clipboard?.writeText(v.external_url || ""); }} className="text-xs px-2 py-1 bg-white/6 rounded">Copy</button>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {fetchError && <p className="text-rose-400 mt-3">{fetchError}</p>}
      </div>

      {/* bottom nav (mobile) */}
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
