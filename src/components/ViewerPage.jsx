/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// --- SKELETON LOADER (Matches Card Design) ---
const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex flex-col gap-3">
        <div className="aspect-video bg-white/5 rounded-2xl md:rounded-[2rem] animate-pulse ring-1 ring-white/5" />
        <div className="space-y-2 px-2">
          <div className="h-4 bg-white/5 rounded-md w-3/4 animate-pulse" />
          <div className="h-3 bg-white/5 rounded-md w-1/2 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export default function ViewerPage(props) {
  const {
    videos = [],
    selected: parentSelected,
    setSelected: parentSetSelected,
    loading = false,
    fetchError = "",
    search,
    setSearch,
    onVideoPlayed,
    filterType,
    setFilterType
  } = props;

  const shouldReduceMotion = useReducedMotion();
  const playerRef = useRef(null);
  const listTopRef = useRef(null);

  const [localSelected, setLocalSelected] = useState(null);
  const selected = parentSelected ?? localSelected;
  const setSelected = parentSetSelected ?? setLocalSelected;

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [categoryFilter, setCategoryFilter] = useState(""); 
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // === Data Processing ===
  const { categoryCounts, trendingVideos, maxViewCount } = useMemo(() => {
    const catMap = new Map();
    const trendingBase = [];
    let max = 0;
    (videos || []).forEach((v) => {
      if (!v) return;
      if (v.category) v.category.split(",").forEach((c) => {
        const t = c?.trim();
        if (t) catMap.set(t, (catMap.get(t) || 0) + 1);
      });
      const vc = Number(v?.view_count || 0);
      if (vc > max) max = vc;
      trendingBase.push(v);
    });
    return { 
      categoryCounts: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      trendingVideos: trendingBase.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)),
      maxViewCount: max 
    };
  }, [videos]);

  // === Filtering ===
  const filtered = useMemo(() => {
    let base = activeTab === "trending" ? trendingVideos : 
               activeTab === "featured" ? videos.filter(v => v?.is_featured) :
               activeTab === "latest" ? [...videos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : 
               videos;

    const freeText = (search || "").toLowerCase();
    const catQuery = (categoryFilter || "").toLowerCase();

    return base.filter((v) => {
      if (!v) return false;
      if (catQuery && !(v.category || "").toLowerCase().includes(catQuery)) return false;
      if (freeText && !`${v.title} ${v.description} ${v.category}`.toLowerCase().includes(freeText)) return false;
      return true;
    });
  }, [search, activeTab, videos, trendingVideos, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [filtered.length, totalPages]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // === Interactions ===
  const openPlayer = (v) => {
    setSelected(v);
    setShowPlayer(true);
    setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const onSelectTab = (tab) => {
    setActiveTab(tab);
    setCategoryFilter("");
    setSearch("");
    setShowPlayer(false);
    setSelected(null);
    setPage(1); 
  };

  const handleCategoryClick = (cat) => {
    const isSame = categoryFilter === cat;
    setCategoryFilter(isSame ? "" : cat);
    if (!isSame && activeTab === "categories") setActiveTab("home");
    setPage(1); 
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const formatDuration = (s) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "";

  return (
    <main className="w-full min-h-screen bg-[#020617] text-slate-100 relative isolate font-sans selection:bg-emerald-500/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-center h-16 items-center px-6">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            {["home", "latest", "categories", "trending", "featured"].map((tab) => (
              <button key={tab} onClick={() => onSelectTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {activeTab === tab && <motion.div layoutId="navBg" className="absolute inset-0 bg-white/10 rounded-lg shadow-inner" />}
                <span className="relative z-10 capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Search */}
      <div className="sticky top-0 md:top-16 z-40 px-4 py-4 backdrop-blur-sm transition-all">
        <div className="max-w-4xl mx-auto flex items-center p-2 rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
          <div className="flex-1 flex items-center px-3 gap-3">
            <span className="text-slate-500">🔍</span>
            <input 
              value={search || ""} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search library..." 
              className="w-full bg-transparent outline-none text-sm placeholder:text-slate-600 text-white" 
            />
            {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-white text-lg">×</button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* PLAYER SECTION */}
        <AnimatePresence mode="wait">
          {showPlayer && selected && (
            <motion.section 
                ref={playerRef} 
                key={`player-${selected.id}`} 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="mb-16 scroll-mt-24"
            >
              <div className="max-w-5xl mx-auto">
                {/* FIX: No wrapper styling here. 
                    VideoPlayer handles its own rounded corners and shadows.
                */}
                <div className="mb-2">
                  <VideoPlayer video={selected} onPlayed={(id) => onVideoPlayed?.(id)} />
                </div>
                
                {/* Meta Info */}
                <div className="mt-6 px-2 md:px-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20 uppercase tracking-wider">{selected.category || "General"}</span>
                    {selected.duration && <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-[9px] font-medium border border-white/5 uppercase tracking-wider">⏱️ {formatDuration(selected.duration)}</span>}
                  </div>
                  
                  <h1 className="text-lg md:text-2xl font-black text-white mb-2 tracking-tight leading-snug">{selected.title}</h1>
                  
                  <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-4">
                    <span className="text-emerald-500/80">👁️ {Number(selected.view_count || 0).toLocaleString()} views</span>
                    <span className="text-slate-800">|</span>
                    <span>{new Date(selected.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-slate-400 leading-relaxed text-xs md:text-sm border-l-2 border-emerald-500/30 pl-4 whitespace-pre-line max-w-4xl">{selected.description}</p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Content Header */}
        <div className="mb-8 px-2 scroll-mt-32" ref={listTopRef}>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter capitalize flex items-center gap-2">
            {categoryFilter ? ( <> <span className="text-slate-600">📂</span> <span>{categoryFilter}</span> </> ) : ( <span>{activeTab}</span> )}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium ml-1">{filtered.length} total videos</p>
        </div>

        {/* Grid Content */}
        <AnimatePresence mode="wait">
          {activeTab === "categories" && !categoryFilter ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {categoryCounts.map(({ name, count }) => (
                <button key={name} onClick={() => handleCategoryClick(name)} className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-slate-900/50 border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all text-left group">
                  <div className="text-2xl md:text-3xl mb-4 group-hover:scale-110 transition-transform">📁</div>
                  <h3 className="font-bold text-sm md:text-lg text-white group-hover:text-emerald-400 transition-colors truncate">{name}</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-semibold">{count} Videos</p>
                </button>
              ))}
            </motion.div>
          ) : (
            <>
              {categoryFilter && (
                <button 
                  onClick={() => setCategoryFilter("")} 
                  className="mb-8 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  ✕ CLEAR FILTER: {categoryFilter}
                </button>
              )}

              {loading ? ( <VideoGridSkeleton /> ) : (
                <>
                    {/* EMPTY STATE */}
                    {paged.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="text-6xl mb-4">🕸️</div>
                            <h3 className="text-xl font-bold text-white">No videos found</h3>
                            <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            {paged.map((v) => {
                            const isTop = Number(v.view_count || 0) === maxViewCount && maxViewCount > 0;
                            const isPlaying = selected?.id === v.id;

                            return (
                                <motion.button key={v.id} onClick={() => openPlayer(v)} className="group text-left focus:outline-none w-full">
                                <div className={`relative aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden bg-slate-900 mb-4 ring-1 transition-all duration-500 shadow-xl shadow-black/40 ${isPlaying ? "ring-emerald-500 ring-offset-2 ring-offset-[#020617]" : "ring-white/10 group-hover:ring-emerald-500/50"}`}>
                                    <img src={v.thumbnail_url || "https://placehold.co/600x400/020617/white?text=Preview"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>

                                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                        {isPlaying && <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg animate-pulse">▶ Playing</span>}
                                        {v.is_featured && <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg">⭐ Featured</span>}
                                        {isTop && <span className="bg-pink-500 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg">🔥 TOP</span>}
                                    </div>
                                </div>

                                <h3 className={`text-sm md:text-base font-bold line-clamp-1 transition-colors px-1 ${isPlaying ? "text-emerald-400" : "text-slate-200 group-hover:text-emerald-400"}`}>{v.title}</h3>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] md:text-[11px] text-slate-500 font-bold px-1 uppercase tracking-tighter">
                                    <span>{Number(v.view_count || 0).toLocaleString()} views</span>
                                    <span className="text-slate-800">|</span>
                                    <span>{v.category || "General"}</span>
                                </div>
                                </motion.button>
                            );
                            })}
                        </motion.div>
                    )}
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 md:mt-16 flex justify-center">
                  <div className="flex gap-1 p-1 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                    {[...Array(totalPages)].map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => handlePageChange(i + 1)} 
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:bg-white/5"}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Nav */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
        <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-1 flex justify-between shadow-2xl shadow-black/50">
          {["home", "latest", "categories", "trending"].map(id => (
            <button key={id} onClick={() => onSelectTab(id)} className={`flex-1 py-3 rounded-xl relative ${activeTab === id ? "text-emerald-400" : "text-slate-500"}`}>
              {activeTab === id && <motion.div layoutId="mobileNav" className="absolute inset-0 bg-white/5 rounded-xl" />}
              <span className="relative z-10 text-xl block text-center">{id === "home" ? "🏠" : id === "latest" ? "⚡" : id === "categories" ? "📂" : "🔥"}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
