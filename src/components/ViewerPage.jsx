/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-unused-vars */
// src/components/ViewerPage.jsx (Combined Search, Category Counts, Tab Reset, and UI Tweaks)
import { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/*
  ViewerPage Redesigned — Modern, Border-less, Sticky Header
  - **UPDATE 1**: Category filter buttons now show the number of videos in that category.
  - **UPDATE 2**: All search and category filters are automatically cleared when switching between main navigation tabs.
  - **UPDATE 3**: List heading now displays the active category filter name.
  - **UPDATE 4**: Reduced space between thumbnail and title (mt-2 -> mt-1).
  - **UPDATE 5**: Reduced space between thumbnail and title to minimum (mt-1 -> mt-0).
  - **UPDATE 6**: Reduced space aggressively using negative margin (mt-0 -> mt-[-1]).
  - **UPDATE 7**: Reduced space even more aggressively using increased negative margin (mt-[-1] -> mt-[-2]).
  - **UPDATE 8**: Reduced space even further using aggressive negative margin (mt-[-2] -> mt-[-3]).
  - **UPDATE 9**: Mobile UI Optimization: Reduced padding on pagination buttons and increased category tag max-width on mobile.
  - **FIX 10-16**: Adjustments made to extreme negative margins.
  - **FIX 17 (Refined)**: Spacing adjusted to add space between thumbnail/title and reduce space between title/category.
  - **FIX 18**: Title margin changed to mt-3 (Added large positive space) and Category margin changed to mt-[-2] (Reduced space/max overlap).
  - **FIX 19**: Category margin further reduced from mt-[-2] to mt-[-3] for minimal title/category separation.
  - **FIX 20**: Category margin further reduced from mt-[-3] to mt-[-4] for greater title/category overlap. (Applies to grid view)
  - **FIX 21**: Player view category margin reduced from mt-2 (8px) to mt-[7px] to reduce vertical space by ~7%.
  - **FIX 22**: Player view category margin reduced from mt-[6px] to mt-[6px] to reduce vertical space by another ~14.3%.
  - **FIX 23**: Player view category margin reduced from mt-[6px] to mt-[5px] to reduce vertical space by another ~16.7% (closest to 10%).
  - **FIX 24**: Player view category margin further reduced from mt-[5px] to mt-[4px] to reduce vertical space by another 10% (closest integer is 4px).
  - **FIX 25**: Enhanced robustness for 'Latest' video sorting to prevent issues with null/invalid dates from external videos.
  - **FIX 2**: Reduced badge z-index to z-[1] to ensure they are correctly below the sticky header (z-40/z-30).
  - **FIX 26**: Reduced bottom margin (mb-8 -> mb-6) on player to make it more compact.
  - **FIX 27**: Significantly reduced max player size on large screens by adding `max-w-3xl` (768px max width) to the player's container, centering it with `mx-auto`.
  - **FIX 29**: **Major Player Metadata Redesign**: Created clear visual separation between the title, description, and stats. The metadata section now uses a `border-t` for clean hierarchy and the category is explicitly labeled and grouped with other stats.
  - **FIX 30 (Expanded)**: Animation Performance Fix: Switched all primary layout animations (Grid Container & Grid Items) to use a high-stiffness spring transition for smoother, snappier movement. Also removed scale animation from grid item variants.
  - **FIX 31**: Smooth Menu/Tab Transition: Implemented `AnimatePresence` around the main content (Categories vs. Grid List) to apply a smooth fade and slide transition when switching between major viewing modes, eliminating the "messy" jump.
  - **FIX 32 (New)**: **Smooth Tab Switching Fix**: Assigned a dynamic `key` to the video grid based on the `activeTab` to ensure `AnimatePresence` triggers the enter/exit animation when switching between "Home", "Latest", "Trending", and "Featured".
  - **FIX 33 (New)**: **Reduced Title/Category Gap**: Increased negative margin on the category container from `mt-[-4]` to `mt-[-5]` to pull it further up, eliminating more vertical space.
*/

// Icon Helper Components (Simulating simple icons, replace with actual icon library if needed)
const IconHome = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.95-8.95c.38-.38 1.02-.38 1.4 0L21.75 12M4.5 9.75v10.125a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 19.875V9.75M12 14.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" /></svg>
);
const IconLatest = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
);
const IconCategories = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" /></svg>
);
const IconTrending = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9V6M12 18v3" /></svg>
);
const IconFeatured = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.178 5.516.472a.562.562 0 0 1 .3 1.018l-4.255 3.65.654 5.385a.562.562 0 0 1-.84 1.258l-4.81-2.923-4.81 2.923a.562.562 0 0 1-.84-1.258l.654-5.385-4.255-3.65a.562.562 0 0 1 .3-1.018l5.516-.472L11.48 3.5Z" /></svg>
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
    filterType,
    setFilterType,
    onVideoPlayed,
  } = props;

  const shouldReduceMotion = useReducedMotion();

  // refs
  const playerRef = useRef(null);
  const listTopRef = useRef(null);

  // selection fallback
  const [localSelected, setLocalSelected] = useState(null);
  const selected = parentSelected ?? localSelected;
  const setSelected = parentSetSelected ?? setLocalSelected;

  // player visibility toggle (kept for compatibility)
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // home | latest | categories | trending | featured
  
  // Dedicated filter for category button clicks - allows combined filtering
  const [categoryFilter, setCategoryFilter] = useState(""); 

  // pagination state
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  // memo: categoryCounts, trending, maxViewCount
  const { categoryCounts, trendingVideos, maxViewCount } = useMemo(() => {
    const catMap = new Map(); // Use Map to store category name -> count
    const trendingBase = [];
    let max = 0;

    (videos || []).forEach((v) => {
      if (!v) return;
      if (v.category) {
        // Handle comma-separated categories
        v.category.split(",").forEach((c) => {
          const t = c && c.trim();
          if (t) {
            const currentCount = catMap.get(t) || 0;
            catMap.set(t, currentCount + 1);
          }
        });
      }
      const vc = Number(v?.view_count || 0);
      if (vc > max) max = vc;
      trendingBase.push(v);
    });

    const sortedTrending = trendingBase.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
    
    // Convert Map to a sorted Array of {name, count} for rendering
    const categoryCounts = Array.from(catMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

    return { categoryCounts, trendingVideos: sortedTrending, maxViewCount: max };
  }, [videos]);

  // home uses server-provided order
  const recentVideos = videos;

  const thumb = (v) =>
    v?.thumbnail_url || v?.public_url || v?.external_url || "https://placehold.co/600x350?text=No+Thumbnail";

  // filtered list depending on tab
  const filtered = useMemo(() => {
    let base = recentVideos;

    if (activeTab === "trending") base = trendingVideos;
    else if (activeTab === "featured") base = (videos || []).filter((v) => v && v.is_featured);
    else if (activeTab === "latest") {
      // FIX 25: Enhanced robustness for date sorting, especially for external videos which might have null/invalid created_at dates.
      base = [...(videos || [])].sort((a, b) => {
        // Fallback to epoch (0) for invalid dates to ensure consistent sorting (oldest first for invalid dates).
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        // Sort descending (b - a) to show latest first.
        return dateB - dateA;
      });
    }

    const freeTextQuery = (search || "").trim().toLowerCase();
    const catFilterQuery = (categoryFilter || "").trim().toLowerCase();

    return base.filter((v) => {
      if (!v) return false;
      
      // 1. Source Type Filter
      if (filterType && filterType !== "all" && v.source_type !== filterType) return false;

      // 2. Category Button Filter (Must be an EXACT match/inclusion in the category field if set)
      if (catFilterQuery) {
          const videoCategories = (v.category || "").toLowerCase();
          // Check if the video's category field INCLUDES the selected category.
          if (!videoCategories.includes(catFilterQuery)) {
              return false;
          }
      }

      // 3. Free Text Search (Checks title, description, and category if set)
      if (freeTextQuery) {
          const hay = `${v.title || ""} ${v.description || ""} ${v.category || ""}`.toLowerCase();
          // Check if the video's title/desc/category field INCLUDES the free-text query.
          if (!hay.includes(freeTextQuery)) {
              return false;
          }
      }
      
      // If both filters are inactive, or if both pass, return true.
      return true;
    });
  }, [search, filterType, recentVideos, trendingVideos, activeTab, videos, categoryFilter]); 

  // total pages
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // ensure current page is valid when filtered changes
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filtered.length, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset page when user changes search/filter/tab
  useEffect(() => setPage(1), [search, filterType, activeTab, categoryFilter]); 

  // get items for current page
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // helper: compact page range (window)
  const getPageRange = (current, total, maxButtons = 7) => {
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, current + half);

    if (end - start + 1 < maxButtons) {
      if (start === 1) end = Math.min(total, start + maxButtons - 1);
      else if (end === total) start = Math.max(1, end - maxButtons + 1);
    }

    const range = [];
    for (let i = start; i <= end; i++) range.push(i);
    return { range, start, end };
  };

  // open player: set selected, show player, then scroll to player (top)
  const openPlayer = (v) => {
    if (!v) return;

    // 1) set selection so the player component will mount
    setSelected(v);
    // 2) show player container
    setShowPlayer(true);

    // 3) scroll to player after next paint(s)
    const doScroll = () => {
      const el = playerRef.current;
      if (el && typeof el.scrollIntoView === "function") {
        try {
          el.scrollIntoView({
            behavior: shouldReduceMotion ? "auto" : "smooth",
            block: "start",
            inline: "nearest",
          });
        } catch {
          try {
            window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
          } catch {
            window.scrollTo(0, 0);
          }
        }
      } else {
        try {
          window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    };

    // Use rAF twice to ensure DOM updated; also a safety timeout
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
    setTimeout(doScroll, 160);
  };

  /**
   * Centralized handler for all tab clicks to ensure player is hidden.
   * Also clears search/category filters.
   * @param {string} tab The tab to set as active.
   */
  const onSelectTab = (tab) => {
    setActiveTab(tab);
    
    // Clear all search/filter states when switching tabs
    setSearch("");
    setCategoryFilter("");
    setFilterType("all"); 
    
    // Crucial: Hide player and deselect video on tab change
    setShowPlayer(false);
    setSelected(null);
  };

  /**
   * Handler for clicking a category button.
   * @param {string} cat The category to filter by.
   */
  const handleCategoryClick = (cat) => {
    if (!cat) return;
    
    const isSame = (categoryFilter || "").trim().toLowerCase() === cat.toLowerCase();

    // 1. Set/Toggle the dedicated category filter state
    setCategoryFilter(isSame ? "" : cat);
    
    // 2. Set active tab to 'home' to see the grid immediately, or 'categories' if no filter (though category logic handles this)
    if (activeTab !== "home") setActiveTab("home"); 
    
    // 3. Reset other view states
    setFilterType("all");
    setShowPlayer(false);
    setSelected(null);
  };

  // If the currently selected video is no longer in the videos list, deselect it.
  useEffect(() => {
    if (selected && !videos.some((v) => v && v.id === selected.id)) {
      setSelected(null);
      setShowPlayer(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  // helpers
  const formatDate = (iso) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const formatDuration = (secondsOrStr) => {
    if (secondsOrStr == null) return "";
    const seconds = Number(secondsOrStr);
    if (Number.isNaN(seconds)) return String(secondsOrStr);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // motion variants
  const itemVariants = {
    // FIX 30: Removed scale property to simplify animation calculations and improve performance.
    hidden: { opacity: 0, y: 6 }, 
    visible: { opacity: 1, y: 0 },
  };
  const playerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };
  const listVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  // When page changes, scroll listTop into view for context
  useEffect(() => {
    if (listTopRef.current) {
      try {
        listTopRef.current.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
      } catch {
        window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
      }
    }
  }, [page]);

  const showCategoryButtons = activeTab === "categories" && !categoryFilter;
  const showVideoGrid = activeTab !== "categories" || categoryFilter; // Show grid for all tabs, or for 'categories' when a filter is applied
  
  // FIX 32: Dynamic key to force re-render/animate for AnimatePresence
  const gridKey = categoryFilter 
    ? `video-grid-category-${categoryFilter}` 
    : `video-grid-tab-${activeTab}`; 

  return (
    // Updated background for a slightly deeper, more immersive look
    <main className="w-full min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* Desktop nav - NOW STICKY */}
      <nav aria-label="Main video section navigation" className="hidden md:block sticky top-0 z-40">
        {/* Removed border-b. Using a subtle shadow and dark translucent background */}
        <div className="flex justify-center bg-black/80 backdrop-blur-md px-4 py-3 shadow-xl">
          <div className="flex gap-6 text-sm" role="tablist">
            <button
              type="button"
              onClick={() => onSelectTab("home")}
              className={`hover:text-emerald-400 transition-colors duration-200 ${activeTab === "home" ? "text-emerald-400 font-semibold border-b-2 border-emerald-400 -mb-3 pb-3" : "text-gray-300"}`}
              role="tab"
              aria-selected={activeTab === "home"}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("latest")}
              className={`hover:text-sky-400 transition-colors duration-200 ${activeTab === "latest" ? "text-sky-400 font-semibold border-b-2 border-sky-400 -mb-3 pb-3" : "text-gray-300"}`}
              role="tab"
              aria-selected={activeTab === "latest"}
            >
              Latest
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("categories")}
              className={`hover:text-blue-400 transition-colors duration-200 ${activeTab === "categories" ? "text-blue-400 font-semibold border-b-2 border-blue-400 -mb-3 pb-3" : "text-gray-300"}`}
              role="tab"
              aria-selected={activeTab === "categories"}
            >
              Categories
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("trending")}
              className={`hover:text-pink-400 transition-colors duration-200 ${activeTab === "trending" ? "text-pink-400 font-semibold border-b-2 border-pink-400 -mb-3 pb-3" : "text-gray-300"}`}
              role="tab"
              aria-selected={activeTab === "trending"}
            >
              Trending
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("featured")}
              className={`hover:text-yellow-300 transition-colors duration-200 ${activeTab === "featured" ? "text-yellow-300 font-semibold border-b-2 border-yellow-300 -mb-3 pb-3" : "text-gray-300"}`}
              role="tab"
              aria-selected={activeTab === "featured"}
            >
              Featured
            </button>
          </div>
        </div>
      </nav>

      {/* Search + filter - NOW STICKY */}
      {/* Positioned just below the sticky nav (assuming nav height of ~52px) */}
      <div 
        // FIX 16: Changed top-[52px] to top-0 md:top-[52px] to make the search bar visible at the very top of the screen on mobile devices, where the desktop nav is hidden.
        className="sticky top-0 md:top-[52px] z-30 bg-black/80 backdrop-blur-md px-3 py-3 shadow-md"
      >
        <div className="max-w-6xl w-full mx-auto flex items-center gap-2">
          <input
            value={search || ""}
            onChange={(e) => {
              setSearch(e.target.value);
              // Does NOT clear categoryFilter, allowing combined search
            }}
            placeholder="Search videos..."
            aria-label="Search videos"
            className="flex-1 min-w-0 px-4 py-2 rounded-xl bg-white/10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
          />

          {((search || "").trim() !== "" || (categoryFilter || "").trim() !== "") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterType("all");
                setCategoryFilter(""); // Clears both search inputs
                // Ensure player is hidden when clearing search
                setShowPlayer(false);
                setSelected(null);
              }}
              aria-label="Clear search"
              className="ml-1 px-3 py-2 rounded-xl bg-white/6 text-sm hover:bg-white/10 transition-colors duration-200"
            >
              ×
            </button>
          )}

          <select
            value={filterType || "all"}
            onChange={(e) => setFilterType(e.target.value)}
            className="ml-1 rounded-xl bg-white/10 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            aria-label="Filter videos by source type"
          >
            <option value="all">All Sources</option>
            <option value="uploaded">Uploaded</option>
            <option value="external">External</option>
            <option value="torrent">Torrent</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      {/* Added top padding to clear the sticky header (approx 12px for desktop) */}
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-3 pb-28">

        {/* Player */}
        <AnimatePresence initial={false} mode="wait">
          {showPlayer && selected && (
            <motion.section
              ref={playerRef}
              key={`player-${selected.id}`}
              initial={shouldReduceMotion ? "visible" : "hidden"}
              animate="visible"
              exit="exit"
              variants={playerVariants}
              transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: "easeOut" }}
              // FIX 26: Reduced margin bottom from mb-8 to mb-6 to make the player more compact.
              // Removed styling classes from motion.section as they are moved to the inner container
              className="mb-6"
              aria-labelledby="video-player-heading"
            >
              {/* FIX 27: New container to limit max-width to 768px (max-w-3xl) and center it (mx-auto) */}
              <div className="max-w-3xl mx-auto rounded-2xl shadow-2xl shadow-emerald-900/50">
                
                {/* Player container */}
                {/* This is what enforces the 16:9 aspect ratio and max-width fit */}
                <div className="relative rounded-2xl overflow-hidden aspect-video">
                  <div className="w-full h-full flex items-center justify-center bg-transparent p-0">
                    <div className="w-full h-full">
                      <VideoPlayer video={selected} onPlayed={(id) => onVideoPlayed?.(id)} />
                    </div>
                  </div>
                </div>

                {/* FIX 29: Redesigned metadata layout for clarity */}
                <div className="mt-3">
                  {/* 1. Title */}
                  <h2 id="video-player-heading" className="text-xl sm:text-2xl font-bold leading-tight whitespace-normal break-words px-1">
                    {selected.title}
                  </h2>

                  {/* 2. Description Block (Hidden on small screens) */}
                  {selected.description && (
                    <div className="mt-3 px-1 hidden sm:block">
                        <p className="text-gray-300 text-sm font-semibold mb-1">Description</p>
                        <p className="text-gray-300 text-sm line-clamp-3 overflow-hidden">
                          {selected.description}
                        </p>
                    </div>
                  )}

                  {/* 3. Metadata/Stats Block (Added border for visual separation) */}
                  <div className="mt-4 pt-3 px-1 border-t border-white/10">
                    <p className="text-sm text-gray-400 flex flex-wrap gap-x-4 gap-y-1 items-center">
                      {/* Category Tag */}
                      <span className="text-xs sm:text-sm font-semibold text-gray-300">Category:</span>
                      <span className="text-xs sm:text-sm px-2 py-0.5 rounded-full bg-white/10">{selected.category || "Uncategorized"}</span>
                      
                      {/* Stats Line */}
                      <span className="text-xs sm:text-sm ml-2">🗓️ {formatDate(selected.created_at) || "Unknown date"}</span>
                      <span className="text-xs sm:text-sm">👁️ {(selected.view_count || 0).toLocaleString()} views</span>
                      {selected.duration ? (
                        <span className="text-xs sm:text-sm">⏱️ {formatDuration(selected.duration)}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* START FIX 31/32: AnimatePresence for content switching */}
        <AnimatePresence mode="wait" initial={false}>
          {/* State 1: Category Buttons View (only visible if 'categories' tab is active and NO filter is applied) */}
          {showCategoryButtons && (
            <motion.div
              key="category-buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="mb-8"
              aria-labelledby="category-explore-heading"
            >
              <h2 id="category-explore-heading" className="text-xl font-semibold mb-4">Explore Categories</h2>

              <div className="max-w-4xl w-full mx-auto">
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  {categoryCounts.length === 0 && <p className="text-gray-400">No categories found.</p>}
                  {categoryCounts.map(({ name: c, count }) => { 
                    // Check the dedicated categoryFilter state
                    const active = ((categoryFilter || "").trim().toLowerCase() === c.toLowerCase()); 
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCategoryClick(c)}
                        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-medium transition-all duration-200 
                          ${active 
                            ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30" 
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                          }`}
                        aria-pressed={active}
                      >
                        {c} <span className={`ml-1 text-xs font-normal ${active ? 'text-gray-700' : 'text-gray-400'}`}>({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* State 2: Video Grid View (The default, or when 'categories' is active AND a filter IS applied) */}
          {showVideoGrid && (
            <motion.section 
              // FIX 32: Use dynamic key to force animation between Home/Latest/Trending/Featured tabs
              key={gridKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              aria-labelledby="video-list-heading" 
              ref={listTopRef}
            >
              
              <h2 id="video-list-heading" className="text-xl font-semibold mb-5">
                {categoryFilter 
                  ? `Videos in Category: ${categoryFilter}`
                  : activeTab === "trending" ? "Trending Now" 
                  : activeTab === "featured" ? "Featured" 
                  : activeTab === "latest" ? "Latest Videos" 
                  : "All Videos"}
              </h2>

              {loading ? (
                <p className="text-gray-300">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-gray-400">No videos found matching your criteria.</p>
              ) : (
                <>
                  <motion.div
                    layout
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={listVariants}
                    // FIX 30: Applied spring transition to the list container's layout
                    transition={shouldReduceMotion ? 
                      { duration: 0 } : 
                      { 
                        duration: 0.3, // Keep the original duration for enter/exit (opacity)
                        layout: { type: "spring", stiffness: 400, damping: 30 } 
                      }
                    }
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                  >
                    <AnimatePresence initial={false}>
                      {paged.map((v) => {
                        const isTopTrending = (Number(v?.view_count || 0) === maxViewCount) && maxViewCount > 0;
                        const isFeatured = !!v?.is_featured;
                        // Check if this thumbnail is the currently selected one
                        const isSelected = selected && v.id === selected.id && showPlayer;

                        return (
                          <motion.button
                            key={v.id}
                            type="button"
                            onClick={() => openPlayer(v)}
                            layout
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={itemVariants}
                            // FIX 30: Applied spring transition to the individual grid item's layout
                            transition={shouldReduceMotion ? 
                              { duration: 0 } : 
                              { 
                                duration: 0.28, // Default transition for enter/exit (opacity, y)
                                layout: { type: "spring", stiffness: 400, damping: 30 } // Optimized for smooth layout changes
                              }
                            }
                            // **Border-less design**: Removed explicit borders. Added padding (-m-1 and p-1) to create clickable space, and a clean ring/shadow for selection.
                            className={`text-left group bg-transparent relative transition-all duration-300 ease-out p-2 -m-2 rounded-xl 
                              ${isSelected 
                                ? "ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-gray-950 shadow-xl" 
                                : "hover:bg-white/5 hover:shadow-xl hover:shadow-white/5"
                              }`}
                            aria-label={`Open player for ${v?.title || "video"}`}
                            whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                          >
                            <div className="relative">
                              {/* Removed border from image/thumbnail */}
                              <img
                                src={thumb(v)}
                                alt={v?.title || "thumbnail"}
                                className="aspect-video rounded-lg overflow-hidden bg-black object-cover w-full h-full block transition-opacity duration-300"
                                loading="lazy"
                                style={{ objectFit: "cover", opacity: isSelected ? 0.35 : 1 }}
                              />

                              {/* "Now Playing" Text Overlay */}
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg">
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                                    className="text-lg font-bold text-emerald-300 bg-black/60 px-3 py-1.5 rounded-full shadow-lg"
                                  >
                                    Now Playing
                                  </motion.span>
                                </div>
                              )}

                              {/* badges - FIX: Reduced z-index to z-[1] from z-10 to ensure they are BELOW the sticky header (z-40/z-30) */}
                              <div className="absolute left-2 top-2 flex flex-col gap-1 z-[1]">
                                {isFeatured && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-700/90 rounded-full text-[10px] sm:text-xs font-semibold">
                                    <span role="img" aria-label="Featured">⭐</span>
                                    <span className="hidden sm:inline">Featured</span>
                                  </motion.div>
                                )}

                                {isTopTrending && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-700/90 rounded-full text-[10px] sm:text-xs font-semibold">
                                    <span role="img" aria-label="Top">🔥</span>
                                    <span className="hidden sm:inline">Top</span>
                                  </motion.div>
                                )}
                              </div>

                              {/* torrent badge */}
                              {v.source_type === "torrent" && (
                                <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 px-2 py-0.5 bg-sky-800/90 rounded-full text-[10px] sm:text-xs z-10">
                                  <span role="img" aria-label="Torrent">🔗</span>
                                  <span className="hidden sm:inline">Torrent</span>
                                </div>
                              )}
                            </div>

                            {/* FIX 18: Title margin set to mt-3 (12px positive space). */}
                            <h3 
                              className="mt-3 h-20 overflow-hidden text-sm sm:text-base font-semibold whitespace-normal break-words"
                              title={v?.title} // Add title attribute for full tooltip visibility on truncation
                            >
                              {v?.title}
                            </h3>

                            {/* FIX 33: Category margin further reduced from mt-[-4] to mt-[-5] to aggressively reduce vertical space between title and category/metadata. */}
                            <div className="text-[11px] text-gray-400 flex flex-wrap gap-x-3 gap-y-1 items-center mt-[-5]">
                              {/* IMPROVEMENT: Increased max-w for category tag on mobile */}
                              <span className="px-2 py-0.5 rounded bg-white/5 truncate max-w-[50%] sm:max-w-[60%]">{v.category || "Uncategorized"}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>

                  {/* Pagination controls - Updated style */}
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      // IMPROVEMENT: Reduced padding for mobile
                      className={`flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm transition ${page === 1 ? "opacity-50 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 text-white"}`}
                      aria-label="Previous page"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {(() => {
                        const { range, start, end } = getPageRange(page, totalPages, 7);
                        const nodes = [];

                        if (start > 1) {
                          nodes.push(
                            <button
                              key="p1"
                              type="button"
                              onClick={() => setPage(1)}
                              // IMPROVEMENT: Reduced padding for mobile
                              className="px-2 py-1 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                            >
                              1
                            </button>
                          );
                          if (start > 2) nodes.push(<span key="left-ellipsis" className="px-1 text-gray-500">…</span>);
                        }

                        range.forEach((n) => {
                          nodes.push(
                            <button
                              key={`p${n}`}
                              type="button"
                              onClick={() => setPage(n)}
                              aria-current={n === page ? "page" : undefined}
                              // IMPROVEMENT: Reduced padding for mobile
                              className={`px-2 py-1 sm:px-3 sm:py-2 rounded-xl text-sm font-medium transition-all ${n === page ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30" : "bg-white/5 hover:bg-white/10 text-white"}`}
                            >
                              {n}
                            </button>
                          );
                        });

                        if (end < totalPages) {
                          if (end < totalPages - 1) nodes.push(<span key="right-ellipsis" className="px-1 text-gray-500">…</span>);
                          nodes.push(
                            <button key={`plast`} type="button" onClick={() => setPage(totalPages)} 
                              // IMPROVEMENT: Reduced padding for mobile
                              className="px-2 py-1 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                            >
                              {totalPages}
                            </button>
                          );
                        }

                        return nodes;
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      // IMPROVEMENT: Reduced padding for mobile
                      className={`flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm transition ${page === totalPages ? "opacity-50 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 text-white"}`}
                      aria-label="Next page"
                    >
                      ← Next
                    </button>
                  </div>

                  <div className="mt-4 text-center text-xs text-gray-400">
                    Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong> results — page {page} of {totalPages}
                  </div>
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>
        {/* END FIX 31/32: AnimatePresence for content switching */}


        {fetchError && <p className="text-rose-400 mt-6 p-3 rounded-lg bg-rose-900/20 border border-rose-800">{fetchError}</p>}
      </div>

      {/* bottom nav (mobile) - fixed */}
      <div className="fixed bottom-0 left-0 w-full md:hidden bg-black/80 backdrop-blur-md border-t border-white/10 py-3 flex justify-around text-sm z-40" role="tablist">
        <button
          type="button"
          onClick={() => onSelectTab("home")}
          className={`flex flex-col items-center w-1/5 ${activeTab === "home" ? "text-emerald-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "home"}
        >
          <span>🏠</span>
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("latest")}
          className={`flex flex-col items-center w-1/5 ${activeTab === "latest" ? "text-sky-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "latest"}
        >
          <span>🕒</span>
          <span className="text-[10px]">Latest</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("categories")}
          className={`flex flex-col items-center w-1/5 ${activeTab === "categories" ? "text-blue-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "categories"}
        >
          <span>🗂️</span>
          <span className="text-[10px]">Categories</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("trending")}
          className={`flex flex-col items-center w-1/5 ${activeTab === "trending" ? "text-pink-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "trending"}
        >
          <span>🔥</span>
          <span className="text-[10px]">Trending</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("featured")}
          className={`flex flex-col items-center w-1/5 ${activeTab === "featured" ? "text-yellow-300" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "featured"}
        >
          <span>⭐</span>
          <span className="text-[10px]">Featured</span>
        </button>
      </div>
    </main>
  );
}
