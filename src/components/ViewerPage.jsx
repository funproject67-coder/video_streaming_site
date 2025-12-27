/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom"; 
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// --- HELPER: COPY TO CLIPBOARD ---
const handleShare = async (video) => {
  const url = `${window.location.origin}${window.location.pathname}?v=${video.id}`;
  try {
    await navigator.clipboard.writeText(url);
    alert("Direct link copied to clipboard!"); 
  } catch (err) {
    console.error("Failed to copy", err);
  }
};

// --- COMPONENT: VIDEO ACTIONS ---
const VideoActions = ({ video, isLiked, isSaved, onToggleLike, onToggleSave }) => {
  return (
    <div className="grid grid-cols-3 md:flex md:items-center gap-2 mt-4 md:mt-0 w-full md:w-auto">
      <button 
        onClick={() => onToggleLike(video.id)} 
        className={`flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 ${isLiked ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"}`}
      >
        <span className="text-sm md:text-base">{isLiked ? "♥" : "♡"}</span> 
        <span>{isLiked ? "Liked" : "Like"}</span>
      </button>
      
      <button 
        onClick={() => onToggleSave(video.id)} 
        className={`flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 ${isSaved ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"}`}
      >
        <span className="text-sm md:text-base">{isSaved ? "✓" : "+"}</span> 
        <span>{isSaved ? "Saved" : "Save"}</span>
      </button>

      <button 
        onClick={() => handleShare(video)}
        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
      >
        <span className="text-sm md:text-base">↗</span> 
        <span>Share</span>
      </button>
    </div>
  );
};

// --- COMPONENT: RELATED VIDEOS SIDEBAR ---
const RelatedVideos = ({ currentVideo, allVideos, onPlay }) => {
  const { list, isMixed } = useMemo(() => {
    if (!allVideos || allVideos.length === 0) return { list: [], isMixed: false };
    const otherVideos = allVideos.filter(v => v.id !== currentVideo.id);
    const sameCategory = otherVideos.filter(v => v.category === currentVideo.category);
    const diffCategory = otherVideos.filter(v => v.category !== currentVideo.category);
    
    // Fill up to 6 videos, prioritizing category match
    const combined = [...sameCategory, ...diffCategory].slice(0, 6);

    return {
      list: combined,
      isMixed: sameCategory.length < 5
    };
  }, [currentVideo, allVideos]);

  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
        {isMixed ? "Recommended For You" : <>Up Next in <span className="text-emerald-500">{currentVideo.category}</span></>}
      </h3>
      
      <div className="flex flex-col gap-3">
        {list.map(video => (
          <button 
            key={video.id} 
            onClick={() => onPlay(video)}
            className="group flex gap-4 text-left w-full p-2 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
          >
            {/* Thumbnail */}
            <div className="w-32 h-20 md:w-36 md:h-20 bg-black rounded-lg overflow-hidden relative flex-shrink-0 ring-1 ring-white/10 shadow-lg group-hover:ring-emerald-500/50 transition-all">
               <img src={video.thumbnail_url || "https://placehold.co/600x400/020617/white?text=Preview"} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                 <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-lg scale-75 group-hover:scale-100 transition-transform">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                 </div>
               </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
               <h4 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-emerald-400 line-clamp-2 leading-snug transition-colors">
                 {video.title}
               </h4>
               
               <div className="flex flex-wrap items-center gap-2 mt-1.5">
                 <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                    {Number(video.view_count || 0).toLocaleString()} views
                 </span>
                 
                 {video.category !== currentVideo.category && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 font-bold uppercase tracking-wider">
                        {video.category}
                    </span>
                 )}
               </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- SKELETON LOADER ---
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

  // --- ROUTING & STATE ---
  const [searchParams, setSearchParams] = useSearchParams();
  const videoIdFromUrl = searchParams.get("v");

  const [localSelected, setLocalSelected] = useState(null);
  const selected = parentSelected ?? localSelected;
  const setSelected = parentSetSelected ?? setLocalSelected;

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [categoryFilter, setCategoryFilter] = useState(""); 
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // --- PERSISTENCE ---
  const [likedIds, setLikedIds] = useState(() => JSON.parse(localStorage.getItem("stream_studio_liked") || "[]"));
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem("stream_studio_saved") || "[]"));

  useEffect(() => { localStorage.setItem("stream_studio_liked", JSON.stringify(likedIds)); }, [likedIds]);
  useEffect(() => { localStorage.setItem("stream_studio_saved", JSON.stringify(savedIds)); }, [savedIds]);

  const handleToggleLike = (id) => {
    setLikedIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const handleToggleSave = (id) => {
    setSavedIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  // --- URL SYNC ---
  useEffect(() => {
    if (videoIdFromUrl && videos.length > 0) {
        const foundVideo = videos.find(v => String(v.id) === videoIdFromUrl);
        if (foundVideo) {
            // Logic: Open if video changed OR if player is currently closed
            if (selected?.id !== foundVideo.id || !showPlayer) {
                setSelected(foundVideo);
                setShowPlayer(true);
                setTimeout(() => {
                    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 300);
            }
        }
    } else if (!videoIdFromUrl) {
        // Clear state if URL is cleared
        if (showPlayer) setShowPlayer(false);
        if (selected) setSelected(null);
    }
  }, [videoIdFromUrl, videos, selected, showPlayer, setSelected]);

  const openPlayer = (v) => {
    setSearchParams({ v: v.id }, { replace: false }); 
  };

  // --- DATA ---
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

  // --- FILTER ---
  const filtered = useMemo(() => {
    let base = activeTab === "trending" ? trendingVideos : 
               activeTab === "featured" ? videos.filter(v => v?.is_featured) :
               activeTab === "latest" ? [...videos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : 
               activeTab === "saved" ? videos.filter(v => savedIds.includes(v.id)) :
               videos;

    const freeText = (search || "").toLowerCase();
    const catQuery = (categoryFilter || "").toLowerCase();

    return base.filter((v) => {
      if (!v) return false;
      if (catQuery && !(v.category || "").toLowerCase().includes(catQuery)) return false;
      if (freeText && !`${v.title} ${v.description} ${v.category}`.toLowerCase().includes(freeText)) return false;
      return true;
    });
  }, [search, activeTab, videos, trendingVideos, categoryFilter, savedIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [filtered.length, totalPages]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // --- HANDLERS ---
  const onSelectTab = (tab) => {
    setActiveTab(tab);
    setCategoryFilter("");
    setSearch("");
    if (showPlayer) setSearchParams({});
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
    <main className="w-full min-h-screen bg-[#020617] text-slate-100 relative isolate font-sans selection:bg-emerald-500/30 pb-24 md:pb-32 transition-colors duration-1000">
      
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-center h-16 items-center px-6">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            {["home", "latest", "categories", "trending", "saved"].map((tab) => (
              <button key={tab} onClick={() => onSelectTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {activeTab === tab && <motion.div layoutId="navBg" className="absolute inset-0 bg-white/10 rounded-lg shadow-inner" />}
                <span className="relative z-10 capitalize">{tab === "saved" ? "Watchlist" : tab}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Search Bar */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* PLAYER SECTION */}
        <AnimatePresence mode="wait">
          {showPlayer && selected && (
            <motion.section 
                ref={playerRef} 
                // FORCE REMOUNT ON ID CHANGE (Crucial for Player to reset)
                key={`player-${selected.id}`} 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="mb-16 scroll-mt-24"
            >
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 items-start">
                {/* Main Player Column */}
                <div className="lg:col-span-2 w-full">
                    <div className="mb-4">
                      <VideoPlayer video={selected} onPlayed={(id) => onVideoPlayed?.(id)} />
                    </div>
                    
                    {/* Meta Info */}
                    <div className="px-2">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                            <div className="flex-1 space-y-2">
                                <h1 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight">{selected.title}</h1>
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                    <span className="text-emerald-500/80">👁️ {Number(selected.view_count || 0).toLocaleString()} views</span>
                                    <span className="text-slate-800">|</span>
                                    <span>{new Date(selected.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            
                            <VideoActions 
                                video={selected} 
                                isLiked={likedIds.includes(selected.id)}
                                isSaved={savedIds.includes(selected.id)}
                                onToggleLike={handleToggleLike}
                                onToggleSave={handleToggleSave}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">{selected.category || "General"}</span>
                            {selected.duration && <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 text-[10px] font-black border border-white/5 uppercase tracking-widest">⏱️ {formatDuration(selected.duration)}</span>}
                        </div>
                        
                        <p className="text-slate-400 leading-relaxed text-sm border-l-2 border-emerald-500/30 pl-4 py-1 whitespace-pre-line max-w-4xl">
                            {selected.description}
                        </p>
                    </div>
                </div>

                {/* Related Videos (Sticky on Desktop) */}
                <div className="lg:col-span-1 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 w-full sticky top-24">
                    <RelatedVideos currentVideo={selected} allVideos={videos} onPlay={openPlayer} />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Content Header & View Toggles */}
        <div className="mb-8 px-2 scroll-mt-32 flex flex-col sm:flex-row sm:items-end justify-between gap-4" ref={listTopRef}>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter capitalize flex items-center gap-2">
                {categoryFilter ? ( <> <span className="text-slate-600">📂</span> <span>{categoryFilter}</span> </> ) : ( <span>{activeTab === "saved" ? "My Watchlist" : activeTab}</span> )}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-bold ml-1 uppercase tracking-wider">{filtered.length} videos</p>
          </div>

          {activeTab !== "categories" && (
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3H3v7h7V3zm11 0h-7v7h7V3zm0 11h-7v7h7v-7zm-11 0H3v7h7v-7z"/></svg>
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h17v-6H4v6zM4 5v6h17V5H4z"/></svg>
                  </button>
              </div>
          )}
        </div>

        {/* Grid/List Content */}
        <AnimatePresence mode="wait">
          {activeTab === "categories" && !categoryFilter ? (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
                  className="mb-8 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest"
                >
                  ✕ Clear: {categoryFilter}
                </button>
              )}

              {loading ? ( <VideoGridSkeleton /> ) : (
                <>
                    {paged.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="text-6xl mb-4">🕸️</div>
                            <h3 className="text-xl font-bold text-white">No videos found</h3>
                            <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <motion.div layout className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8" : "flex flex-col gap-4"}>
                            {paged.map((v) => {
                            const isTop = Number(v.view_count || 0) === maxViewCount && maxViewCount > 0;
                            const isPlaying = selected?.id === v.id;

                            if (viewMode === 'list') {
                                return (
                                    <motion.button key={v.id} onClick={() => openPlayer(v)} className="group flex flex-col sm:flex-row gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left">
                                        <div className="w-full sm:w-40 md:w-56 aspect-video rounded-xl overflow-hidden bg-slate-900 relative flex-shrink-0">
                                            <img src={v.thumbnail_url || "https://placehold.co/600x400/020617/white?text=Preview"} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                            {isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="text-xl animate-pulse text-emerald-500">▶</span></div>}
                                        </div>
                                        <div className="flex-1 py-1 min-w-0">
                                            <h3 className={`text-sm md:text-lg font-bold truncate ${isPlaying ? "text-emerald-400" : "text-white"}`}>{v.title}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-2">{v.description}</p>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <span>{v.category}</span>
                                                <span>•</span>
                                                <span>{Number(v.view_count).toLocaleString()} views</span>
                                                {savedIds.includes(v.id) && <span className="text-emerald-500 ml-auto">✓ Saved</span>}
                                            </div>
                                        </div>
                                    </motion.button>
                                )
                            }

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
                                    
                                    {savedIds.includes(v.id) && (
                                        <div className="absolute bottom-3 right-3 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 text-emerald-400 rounded-full p-1.5 shadow-lg">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    )}
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
          {["home", "latest", "categories", "trending", "saved"].map(id => (
            <button key={id} onClick={() => onSelectTab(id)} className={`flex-1 py-3 rounded-xl relative ${activeTab === id ? "text-emerald-400" : "text-slate-500"}`}>
              {activeTab === id && <motion.div layoutId="mobileNav" className="absolute inset-0 bg-white/5 rounded-xl" />}
              <span className="relative z-10 text-xl block text-center">
                {id === "home" ? "🏠" : id === "latest" ? "⚡" : id === "categories" ? "📂" : id === "saved" ? "🔖" : "🔥"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
