/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-unused-vars */
// src/components/ViewerPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/*
  ViewerPage — stable, feature-complete, with pagination (12 per page)
  - Tabs: Home / Latest / Categories / Trending / Featured
  - Pagination: 12 thumbnails per page + page numbers
  - Scrolls to player at top after clicking a thumbnail
  - Respects reduced-motion
  - Mobile + Desktop optimizations
*/

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

  // pagination state
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  // memo: categories, trending, maxViewCount
  const { categories, trendingVideos, maxViewCount } = useMemo(() => {
    const catSet = new Set();
    const trendingBase = [];
    let max = 0;

    (videos || []).forEach((v) => {
      if (!v) return;
      if (v.category) {
        v.category.split(",").forEach((c) => {
          const t = c && c.trim();
          if (t) catSet.add(t);
        });
      }
      const vc = Number(v?.view_count || 0);
      if (vc > max) max = vc;
      trendingBase.push(v);
    });

    const sortedTrending = trendingBase.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));

    return { categories: Array.from(catSet), trendingVideos: sortedTrending, maxViewCount: max };
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
      base = [...(videos || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const q = (search || "").trim().toLowerCase();
    return base.filter((v) => {
      if (!v) return false;
      if (filterType && filterType !== "all" && v.source_type !== filterType) return false;
      if (!q) return true;
      const hay = `${v.title || ""} ${v.description || ""} ${v.category || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, filterType, recentVideos, trendingVideos, activeTab, videos]);

  // total pages
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // ensure current page is valid when filtered changes
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filtered.length, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset page when user changes search/filter/tab
  useEffect(() => setPage(1), [search, filterType, activeTab]);

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

  const onClickHome = () => {
    setActiveTab("home");
    setShowPlayer(false);
    setSelected(null);
  };

  const onToggleCategory = (cat) => {
    if (!cat) return;
    const cur = (search || "").trim();
    const isSame = cur.toLowerCase() === cat.toLowerCase();
    setSearch(isSame ? "" : cat);
    setFilterType("all");
    setShowPlayer(false);
    setSelected(null);
    setActiveTab("home");
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
    hidden: { opacity: 0, y: 6, scale: 0.995 },
    visible: { opacity: 1, y: 0, scale: 1 },
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

  return (
    <main className="w-full min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Desktop nav (not sticky) */}
      <nav aria-label="Main video section navigation" className="hidden md:block">
        <div className="flex justify-center border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3">
          <div className="flex gap-6 text-sm" role="tablist">
            <button
              type="button"
              onClick={onClickHome}
              className={`hover:text-emerald-400 ${activeTab === "home" ? "text-emerald-400 font-semibold" : ""}`}
              role="tab"
              aria-selected={activeTab === "home"}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("latest");
                setShowPlayer(false);
                setSelected(null);
              }}
              className={`hover:text-sky-400 ${activeTab === "latest" ? "text-sky-400 font-semibold" : ""}`}
              role="tab"
              aria-selected={activeTab === "latest"}
            >
              Latest
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("categories");
                setShowPlayer(false);
                setSelected(null);
              }}
              className={`hover:text-blue-400 ${activeTab === "categories" ? "text-blue-400 font-semibold" : ""}`}
              role="tab"
              aria-selected={activeTab === "categories"}
            >
              Categories
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("trending");
                setShowPlayer(false);
                setSelected(null);
              }}
              className={`hover:text-pink-400 ${activeTab === "trending" ? "text-pink-400 font-semibold" : ""}`}
              role="tab"
              aria-selected={activeTab === "trending"}
            >
              Trending
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("featured");
                setShowPlayer(false);
                setSelected(null);
              }}
              className={`hover:text-yellow-300 ${activeTab === "featured" ? "text-yellow-300 font-semibold" : ""}`}
              role="tab"
              aria-selected={activeTab === "featured"}
            >
              Featured
            </button>
          </div>
        </div>
      </nav>

      {/* Search + filter (not sticky) */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-3 py-2">
        <div className="max-w-6xl w-full mx-auto flex items-center gap-2">
          <input
            value={search || ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            aria-label="Search videos"
            className="flex-1 min-w-0 px-3 py-2 rounded-full bg-white/10 text-sm placeholder:text-gray-400 focus:outline-none transition-colors duration-200"
          />

          {(search || "").trim() !== "" && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterType("all");
                setShowPlayer(false);
                setSelected(null);
              }}
              aria-label="Clear search"
              className="ml-1 px-3 py-2 rounded-full bg-white/6 text-sm"
            >
              ×
            </button>
          )}

          <select
            value={filterType || "all"}
            onChange={(e) => setFilterType(e.target.value)}
            className="ml-1 rounded-md bg-white/6 px-2 py-2 text-sm"
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
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 pb-28">
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
              className="rounded-2xl bg-white/5 p-0 sm:p-0 shadow-xl mb-5"
              aria-labelledby="video-player-heading"
            >
              {/* Player container */}
              <div className="relative rounded-2xl overflow-hidden aspect-video">
                <div className="w-full h-full flex items-center justify-center bg-transparent p-0">
                  <div className="w-full h-full">
                    <VideoPlayer video={selected} onPlayed={(id) => onVideoPlayed?.(id)} />
                  </div>
                </div>
              </div>

              <div className="mt-3 px-0 sm:px-0">
                <h2 id="video-player-heading" className="text-lg sm:text-xl font-bold leading-tight whitespace-normal break-words px-1">
                  {selected.title}
                </h2>

                {selected.description && <p className="text-gray-300 text-sm mt-1 hidden sm:block px-1">{selected.description}</p>}

                <p className="text-[12px] text-gray-400 mt-2 flex flex-wrap gap-2 items-center px-1">
                  <span className="text-xs sm:text-sm">{selected.category || "Uncategorized"}</span>
                  <span>•</span>
                  <span className="text-xs sm:text-sm">{formatDate(selected.created_at) || "Unknown date"}</span>
                  <span>•</span>
                  <span className="text-xs sm:text-sm">{(selected.view_count || 0).toLocaleString()} views</span>
                  {selected.duration ? (
                    <>
                      <span>•</span>
                      <span className="text-xs sm:text-sm">{formatDuration(selected.duration)}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Categories */}
        {activeTab === "categories" && (
          <div className="mb-5">
            <h2 className="text-lg font-semibold mb-3">Categories</h2>

            <div className="max-w-3xl w-full mx-auto">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-start md:justify-center">
                {categories.length === 0 && <p className="text-gray-400">No categories found.</p>}
                {categories.map((c) => {
                  const active = ((search || "").trim().toLowerCase() === c.toLowerCase());
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onToggleCategory(c)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm ${active ? "bg-emerald-500 text-black" : "bg-white/10 text-gray-300"} transition-colors duration-200`}
                      aria-pressed={active}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid list */}
        {(activeTab === "home" || activeTab === "latest" || activeTab === "trending" || activeTab === "featured" || activeTab === "categories") && (
          <section aria-labelledby="video-list-heading" ref={listTopRef}>
            <h2 id="video-list-heading" className="text-lg font-semibold mb-3">
              {activeTab === "trending" ? "Trending Now" : activeTab === "featured" ? "Featured" : activeTab === "latest" ? "Latest" : "Videos"}
            </h2>

            {loading ? (
              <p className="text-gray-300">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400">No videos found.</p>
            ) : (
              <>
                <motion.div
                  layout
                  initial="enter"
                  animate="center"
                  exit="exit"
                  variants={listVariants}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
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
                          transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
                          className={`text-left group bg-transparent rounded relative ${isSelected ? "shadow-md border border-emerald-500" : ""}`}
                          aria-label={`Open player for ${v?.title || "video"}`}
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                        >
                          <div className="relative">
                            {/* thumbnail (no layoutId) */}
                            <img
                              src={thumb(v)}
                              alt={v?.title || "thumbnail"}
                              className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black object-cover w-full h-full block transition-opacity duration-300"
                              loading="lazy"
                              style={{ objectFit: "cover", opacity: isSelected ? 0.28 : 1 }}
                            />

                            {/* "Now Playing" Text Overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl">
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                                  className="text-xl font-bold text-emerald-400 bg-black/50 px-3 py-1 rounded-full shadow-lg"
                                >
                                  Now Playing
                                </motion.span>
                              </div>
                            )}

                            {/* badges */}
                            <div className="absolute left-2 top-2 flex flex-col gap-1 z-10">
                              {isFeatured && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-700/90 rounded-full text-[10px] sm:text-xs">
                                  <span role="img" aria-label="Featured">⭐</span>
                                  <span className="hidden sm:inline">Featured</span>
                                </motion.div>
                              )}

                              {isTopTrending && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-700/90 rounded-full text-[10px] sm:text-xs">
                                  <span role="img" aria-label="Top">🔥</span>
                                  <span className="hidden sm:inline">Top</span>
                                </motion.div>
                              )}
                            </div>

                            {/* torrent badge */}
                            {v.source_type === "torrent" && (
                              <div className="absolute left-2 bottom-2 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-800/90 rounded-full text-[10px] sm:text-xs z-10">
                                <span role="img" aria-label="Torrent">🔗</span>
                                <span className="hidden sm:inline">Torrent</span>
                              </div>
                            )}
                          </div>

                          <h3 className="mt-2 text-xs sm:text-sm font-semibold leading-snug whitespace-normal break-words">{v?.title}</h3>

                          <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 items-center mt-1">
                            <span className="truncate max-w-[40%] sm:max-w-[60%]">{v.category || "Uncategorized"}</span>
                            <span>•</span>
                            <time dateTime={v.created_at}>{formatDate(v.created_at) || "Unknown"}</time>
                            <span>•</span>
                            <span>{(v.view_count || 0).toLocaleString()} views</span>
                            {v.duration ? (
                              <>
                                <span>•</span>
                                <span>{formatDuration(v.duration)}</span>
                              </>
                            ) : null}
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination controls */}
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded-md ${page === 1 ? "opacity-40 cursor-default" : "bg-white/6 hover:bg-white/10"}`}
                    aria-label="Previous page"
                  >
                    ← Prev
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
                            className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10"
                          >
                            1
                          </button>
                        );
                        if (start > 2) nodes.push(<span key="left-ellipsis" className="px-2">…</span>);
                      }

                      range.forEach((n) => {
                        nodes.push(
                          <button
                            key={`p${n}`}
                            type="button"
                            onClick={() => setPage(n)}
                            aria-current={n === page ? "page" : undefined}
                            className={`px-3 py-1 rounded-md ${n === page ? "bg-emerald-500 text-black font-semibold" : "bg-white/6 hover:bg-white/10"}`}
                          >
                            {n}
                          </button>
                        );
                      });

                      if (end < totalPages) {
                        if (end < totalPages - 1) nodes.push(<span key="right-ellipsis" className="px-2">…</span>);
                        nodes.push(
                          <button
                            key={`plast`}
                            type="button"
                            onClick={() => setPage(totalPages)}
                            className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10"
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
                    className={`px-3 py-1 rounded-md ${page === totalPages ? "opacity-40 cursor-default" : "bg-white/6 hover:bg-white/10"}`}
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>

                <div className="mt-2 text-center text-xs text-gray-400">
                  Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong> results — page {page} of {totalPages}
                </div>
              </>
            )}
          </section>
        )}

        {fetchError && <p className="text-rose-400 mt-3">{fetchError}</p>}
      </div>

      {/* bottom nav (mobile) - fixed */}
      <div className="fixed bottom-0 left-0 w-full md:hidden bg-black/40 backdrop-blur-xl border-t border-white/10 py-3 flex justify-around text-sm" role="tablist">
        <button
          type="button"
          onClick={onClickHome}
          className={`flex flex-col items-center w-1/5 ${activeTab === "home" ? "text-emerald-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "home"}
        >
          <span>🏠</span>
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("latest");
            setShowPlayer(false);
            setSelected(null);
          }}
          className={`flex flex-col items-center w-1/5 ${activeTab === "latest" ? "text-sky-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "latest"}
        >
          <span>🕒</span>
          <span className="text-[10px]">Latest</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("categories");
            setShowPlayer(false);
            setSelected(null);
          }}
          className={`flex flex-col items-center w-1/5 ${activeTab === "categories" ? "text-blue-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "categories"}
        >
          <span>🗂️</span>
          <span className="text-[10px]">Categories</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("trending");
            setShowPlayer(false);
            setSelected(null);
          }}
          className={`flex flex-col items-center w-1/5 ${activeTab === "trending" ? "text-pink-400" : "text-gray-300"}`}
          role="tab"
          aria-selected={activeTab === "trending"}
        >
          <span>🔥</span>
          <span className="text-[10px]">Trending</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("featured");
            setShowPlayer(false);
            setSelected(null);
          }}
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
