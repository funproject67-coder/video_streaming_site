/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom"; 
import VideoPlayer from "./VideoPlayer";
import { supabase } from "../supabaseClient"; 
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  User, Settings, LogOut, Heart, Bookmark, Shield, X, Camera, Play, Calendar, 
  Activity, Clock, FileText, MessageSquare, Trash2 
} from "lucide-react";

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

// --- SUB-COMPONENTS (Defined FIRST to prevent ReferenceError) ---

const StatBox = ({ label, value }) => (
    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center flex flex-col justify-center min-h-[90px]">
        <div className="text-2xl md:text-3xl font-black text-white mb-1">{value}</div>
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{label}</div>
    </div>
);

const HistoryRow = ({ video, onClick }) => (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 text-left transition-all group">
        <div className="w-24 h-14 bg-black rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
            <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 truncate">{video.title}</h4>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{video.category || "Video"}</div>
        </div>
    </button>
);

const ThreadRow = ({ post }) => (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">{post.category}</span>
            <span className="text-[10px] text-slate-500 font-mono">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <h4 className="text-sm font-bold text-white line-clamp-1">{post.title}</h4>
    </div>
);

const ReplyRow = ({ reply }) => (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-2 flex justify-between items-center">
            <span className="truncate max-w-[70%]">On: <span className="text-slate-300">{reply.forum_threads?.title || "Deleted"}</span></span>
            <span className="font-mono opacity-50">{new Date(reply.created_at).toLocaleDateString()}</span>
        </div>
        <div className="text-xs text-slate-400 pl-3 border-l-2 border-slate-700 italic line-clamp-2" dangerouslySetInnerHTML={{ __html: reply.content }} />
    </div>
);

const EmptyState = ({ msg }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-3">
        <div className="text-4xl opacity-50 grayscale">📂</div>
        <div className="text-xs font-bold uppercase tracking-widest">{msg}</div>
    </div>
);

// --- MAIN COMPONENT: USER PROFILE MODAL ---
const UserProfileModal = ({ session, onClose, likedIds, savedIds, allVideos, onPlayVideo }) => {
  const [activeTab, setActiveTab] = useState("overview"); 
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [watchHistory, setWatchHistory] = useState([]);
  const [userThreads, setUserThreads] = useState([]);
  const [userReplies, setUserReplies] = useState([]);

  // --- FETCH DATA ---
  useEffect(() => {
    if (session?.user) {
        setFullName(session.user.user_metadata?.full_name || "");
        setAvatarUrl(session.user.user_metadata?.avatar_url || "");
        
        const fetchHistory = async () => {
            const { data } = await supabase.from('video_history').select('video_id, watched_at').eq('user_id', session.user.id).order('watched_at', { ascending: false }).limit(50);
            if(data) {
                const historyVideos = data.map(h => {
                    const vid = allVideos.find(v => v.id === h.video_id);
                    return vid ? { ...vid, watched_at: h.watched_at } : null;
                }).filter(Boolean);
                setWatchHistory(historyVideos);
            }
        };

        const fetchThreads = async () => {
            const { data } = await supabase.from('forum_threads').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
            if(data) setUserThreads(data);
        };

        const fetchReplies = async () => {
            const { data } = await supabase.from('forum_posts').select('*, forum_threads(title)').eq('user_id', session.user.id).order('created_at', { ascending: false });
            if(data) setUserReplies(data);
        };

        fetchHistory();
        fetchThreads();
        fetchReplies();
    }
  }, [session, allVideos]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } });
    if (error) alert("Error: " + error.message);
    else window.location.reload(); 
    setLoading(false);
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your entire watch history?")) return;
    const previousHistory = [...watchHistory];
    setWatchHistory([]);
    const { error } = await supabase.from('video_history').delete().eq('user_id', session.user.id);
    if (error) {
        alert("Failed to clear history");
        setWatchHistory(previousHistory);
    }
  };

  const role = session?.user?.user_metadata?.role || "user";
  const defaultAvatar = role === 'admin' ? "https://placehold.co/150x150/10b981/020617?text=ADMIN" : `https://placehold.co/150x150/334155/ffffff?text=${encodeURIComponent((fullName?.[0] || "U").toUpperCase())}`;

  // --- TABS CONFIG ---
  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "history", label: "History", icon: Clock },
    { id: "threads", label: "Posts", icon: FileText },
    { id: "replies", label: "Replies", icon: MessageSquare },
    { id: "likes", label: "Liked", icon: Heart },
    { id: "saves", label: "Saved", icon: Bookmark },
  ];

  const likedVideos = useMemo(() => allVideos.filter(v => likedIds.includes(v.id)), [allVideos, likedIds]);
  const savedVideos = useMemo(() => allVideos.filter(v => savedIds.includes(v.id)), [allVideos, savedIds]);

  return (
    // 1. CENTER ALIGNMENT: 'flex items-center justify-center' + 'p-4' ensures it floats in center on all screens
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        // 2. COMPACT HEIGHT: 'h-[75vh]' ensures it doesn't cover the whole screen, 'rounded-3xl' for all corners
        className="w-full max-w-5xl h-[75vh] md:h-[75vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative"
      >
        {/* === LEFT COLUMN: SIDEBAR === */}
        <div className="flex-shrink-0 w-full md:w-72 bg-black/20 border-b md:border-b-0 md:border-r border-white/5 z-20 flex flex-col">
            
            {/* 1. HEADER & ACTIONS - Reduced padding (p-5) for more compact look */}
            <div className="p-5 md:p-6 relative">
                 {/* Close Button (Mobile) */}
                 <button onClick={onClose} className="absolute top-4 right-4 md:hidden p-2 bg-white/5 rounded-full text-slate-400"><X size={20}/></button>

                 <div className="flex flex-row md:flex-col items-center md:items-start gap-4 pr-10 md:pr-0">
                    <div className="relative group flex-shrink-0">
                        {/* Smaller avatar on mobile (w-14) */}
                        <img src={avatarUrl || defaultAvatar} className="w-14 h-14 md:w-24 md:h-24 rounded-2xl bg-slate-800 object-cover ring-2 ring-white/10 shadow-lg" alt="" />
                        {isEditing && <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white/80"><Camera size={24} /></div>}
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left w-full">
                        {isEditing ? (
                            <div className="space-y-2 animate-in fade-in">
                                <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-2 bg-black/40 rounded border border-white/10 text-xs text-white" placeholder="Name" />
                                <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full p-2 bg-black/40 rounded border border-white/10 text-xs text-white" placeholder="Avatar URL" />
                                <div className="flex gap-2">
                                    <button onClick={handleUpdateProfile} disabled={loading} className="flex-1 py-2 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase rounded hover:bg-emerald-400">{loading ? "..." : "Save"}</button>
                                    <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-white/10 text-white text-[10px] font-bold uppercase rounded">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full">
                                <h2 className="text-lg md:text-xl font-black text-white truncate">{fullName || "Stream User"}</h2>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 md:mb-4">{role}</div>
                                
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <button onClick={() => setIsEditing(true)} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-[10px] md:text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 hover:bg-white/10">
                                        <Settings size={14} /> EDIT
                                    </button>
                                    <button onClick={async () => { await supabase.auth.signOut(); onClose(); }} className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] md:text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2">
                                        <LogOut size={14} /> LOGOUT
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* 2. NAVIGATION GRID - Compact padding */}
            <div className="p-4 md:p-6 pt-0 md:pt-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex flex-col md:flex-row items-center md:gap-4 p-2 md:p-3 rounded-xl transition-all border
                                    ${active ? "bg-emerald-500 text-slate-950 shadow-lg border-emerald-500" : "bg-white/5 md:bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white"}
                                `}
                            >
                                <Icon size={18} className={active ? "text-slate-950" : "text-slate-500 md:text-slate-400 group-hover:text-white"} />
                                <span className="text-[9px] md:text-xs font-black uppercase tracking-wider mt-1 md:mt-0">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* === RIGHT COLUMN: CONTENT === */}
        <div className="flex-1 bg-slate-900/50 relative flex flex-col min-h-0">
            {/* Desktop Close Button */}
            <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all z-10 items-center justify-center">
                <X size={20}/>
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-10 pb-20 md:pb-10">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">{activeTab.replace('_', ' ')}</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage your activity</p>
                </div>

                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <StatBox label="Watched" value={watchHistory.length} />
                            <StatBox label="Posts" value={userThreads.length} />
                            <StatBox label="Replies" value={userReplies.length} />
                            <StatBox label="Likes" value={likedIds.length} />
                        </div>
                        {watchHistory.length > 0 && (
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={14}/> Jump Back In</h3>
                                <div className="space-y-3">
                                    {watchHistory.slice(0, 3).map((video, i) => (
                                        <HistoryRow key={i} video={video} onClick={() => { onClose(); onPlayVideo(video); }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB: HISTORY --- */}
                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {watchHistory.length > 0 && (
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleClearHistory} 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-colors"
                                >
                                    <Trash2 size={14} /> Clear History
                                </button>
                            </div>
                        )}
                        <div className="space-y-3">
                            {watchHistory.length === 0 && <EmptyState msg="No history yet" />}
                            {watchHistory.map((video, i) => (
                                <HistoryRow key={i} video={video} onClick={() => { onClose(); onPlayVideo(video); }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* --- OTHER TABS --- */}
                {activeTab === 'threads' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        {userThreads.length === 0 && <EmptyState msg="No posts yet" />}
                        {userThreads.map(post => <ThreadRow key={post.id} post={post} />)}
                    </div>
                )}

                {activeTab === 'replies' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        {userReplies.length === 0 && <EmptyState msg="No replies yet" />}
                        {userReplies.map(reply => <ReplyRow key={reply.id} reply={reply} />)}
                    </div>
                )}

                {(activeTab === 'likes' || activeTab === 'saves') && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        {(activeTab === 'likes' ? likedVideos : savedVideos).length === 0 && <EmptyState msg="List is empty" />}
                        {(activeTab === 'likes' ? likedVideos : savedVideos).map(video => (
                            <HistoryRow key={video.id} video={video} onClick={() => { onClose(); onPlayVideo(video); }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- COMPONENT: VIDEO ACTIONS ---
const VideoActions = ({ video, isLiked, isSaved, onToggleLike, onToggleSave }) => {
  return (
    <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto">
      <button 
        onClick={() => onToggleLike(video.id)} 
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest active:scale-95 ${isLiked ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"}`}
      >
        <span className="text-base">{isLiked ? "♥" : "♡"}</span> 
        <span>{video.likes_count || 0}</span>
      </button>
      
      <button 
        onClick={() => onToggleSave(video.id)} 
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest active:scale-95 ${isSaved ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"}`}
      >
        <span className="text-base">{isSaved ? "✓" : "+"}</span> 
        <span>{isSaved ? "Saved" : "Save"}</span>
      </button>

      <button 
        onClick={() => handleShare(video)}
        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
      >
        <span className="text-base">↗</span> 
        <span className="hidden sm:inline">Share</span>
      </button>
    </div>
  );
};

// --- COMPONENT: RELATED VIDEOS ---
const RelatedVideos = ({ currentVideo, allVideos, onPlay }) => {
  const { list, isMixed } = useMemo(() => {
    if (!allVideos || allVideos.length === 0) return { list: [], isMixed: false };
    const otherVideos = allVideos.filter(v => v.id !== currentVideo.id);
    const sameCategory = otherVideos.filter(v => v.category === currentVideo.category);
    const diffCategory = otherVideos.filter(v => v.category !== currentVideo.category);
    const combined = [...sameCategory, ...diffCategory].slice(0, 6);
    return { list: combined, isMixed: sameCategory.length < 5 };
  }, [currentVideo, allVideos]);

  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
        {isMixed ? "Recommended For You" : <>Up Next in <span className="text-emerald-500">{currentVideo.category}</span></>}
      </h3>
      <div className="flex flex-col gap-3">
        {list.map(video => (
          <button key={video.id} onClick={() => onPlay(video)} className="group flex gap-4 text-left w-full p-2 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 active:bg-white/10">
            <div className="w-28 h-16 md:w-36 md:h-20 bg-black rounded-lg overflow-hidden relative flex-shrink-0 ring-1 ring-white/10 shadow-lg group-hover:ring-emerald-500/50 transition-all">
               <img src={video.thumbnail_url || "https://placehold.co/600x400/020617/white?text=Preview"} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
            </div>
            <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
               <h4 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-emerald-400 line-clamp-2 leading-snug transition-colors">{video.title}</h4>
               <div className="flex flex-wrap items-center gap-2 mt-1.5">
                 <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wide">{Number(video.view_count || 0).toLocaleString()} views</span>
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

export default function ViewerPage({ videos = [], selected: parentSelected, setSelected: parentSetSelected, loading = false, fetchError = "", search, setSearch, onVideoPlayed, filterType, setFilterType, session, onOpenAuth }) {
  const shouldReduceMotion = useReducedMotion();
  const playerRef = useRef(null);
  const listTopRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const videoIdFromUrl = searchParams.get("v");

  const [localSelected, setLocalSelected] = useState(null);
  const selected = parentSelected ?? localSelected;
  const setSelected = parentSetSelected ?? setLocalSelected;

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [categoryFilter, setCategoryFilter] = useState(""); 
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // --- PROFILE MODAL STATE ---
  const [showProfile, setShowProfile] = useState(false);

  // --- HYBRID PERSISTENCE STATE ---
  const [likedIds, setLikedIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // --- EFFECT: LOAD DATA (DB or LocalStorage) ---
  useEffect(() => {
    const loadUserData = async () => {
        if (session?.user) {
            const { data: likes } = await supabase.from('video_likes').select('video_id').eq('user_id', session.user.id);
            const { data: saves } = await supabase.from('video_saves').select('video_id').eq('user_id', session.user.id);
            setLikedIds(likes?.map(l => l.video_id) || []);
            setSavedIds(saves?.map(s => s.video_id) || []);
        } else {
            setLikedIds(JSON.parse(localStorage.getItem("stream_studio_liked") || "[]"));
            setSavedIds(JSON.parse(localStorage.getItem("stream_studio_saved") || "[]"));
        }
    };
    loadUserData();
  }, [session]);

  // --- HANDLER: TOGGLE LIKE ---
  const handleToggleLike = async (id) => {
    const isLiked = likedIds.includes(id);
    setLikedIds(prev => isLiked ? prev.filter(k => k !== id) : [...prev, id]);

    if (session?.user) {
        if (isLiked) {
            await supabase.from('video_likes').delete().eq('user_id', session.user.id).eq('video_id', id);
        } else {
            await supabase.from('video_likes').insert({ user_id: session.user.id, video_id: id });
        }
    } else {
        const newLikes = isLiked ? likedIds.filter(k => k !== id) : [...likedIds, id];
        localStorage.setItem("stream_studio_liked", JSON.stringify(newLikes));
        try {
            if (isLiked) {
                await supabase.rpc('decrement_video_like', { vid: id });
            } else {
                await supabase.rpc('increment_video_like', { vid: id });
            }
        } catch (err) {
            console.error("Failed to update guest like count", err);
        }
    }
  };

  // --- HANDLER: TOGGLE SAVE ---
  const handleToggleSave = async (id) => {
    const isSaved = savedIds.includes(id);
    setSavedIds(prev => isSaved ? prev.filter(k => k !== id) : [...prev, id]);

    if (session?.user) {
        if (isSaved) {
            await supabase.from('video_saves').delete().eq('user_id', session.user.id).eq('video_id', id);
        } else {
            await supabase.from('video_saves').insert({ user_id: session.user.id, video_id: id });
        }
    } else {
        const newSaves = isSaved ? savedIds.filter(k => k !== id) : [...savedIds, id];
        localStorage.setItem("stream_studio_saved", JSON.stringify(newSaves));
    }
  };

  // --- URL SYNC ---
  useEffect(() => {
    if (videoIdFromUrl && videos.length > 0) {
        const foundVideo = videos.find(v => String(v.id) === videoIdFromUrl);
        if (foundVideo && (selected?.id !== foundVideo.id || !showPlayer)) {
            setSelected(foundVideo);
            setShowPlayer(true);
            setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }
    } else if (!videoIdFromUrl) {
        if (showPlayer) setShowPlayer(false);
        if (selected) setSelected(null);
    }
  }, [videoIdFromUrl, videos, selected, showPlayer, setSelected]);

  const openPlayer = (v) => { setSearchParams({ v: v.id }, { replace: false }); };

  // --- FILTER & SORT ---
  const { categoryCounts, trendingVideos, maxViewCount, mostLikedVideos } = useMemo(() => {
    const catMap = new Map();
    const trendingBase = [];
    const likedBase = [];
    let max = 0;
    (videos || []).forEach((v) => {
      if (!v) return;
      if (v.category) v.category.split(",").forEach((c) => { const t = c?.trim(); if (t) catMap.set(t, (catMap.get(t) || 0) + 1); });
      const vc = Number(v?.view_count || 0);
      if (vc > max) max = vc;
      trendingBase.push(v);
      likedBase.push(v);
    });
    return { 
      categoryCounts: Array.from(catMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      trendingVideos: trendingBase.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)),
      mostLikedVideos: likedBase.sort((a, b) => Number(b.likes_count || 0) - Number(a.likes_count || 0)),
      maxViewCount: max 
    };
  }, [videos]);

  const filtered = useMemo(() => {
    let base = activeTab === "trending" ? trendingVideos : 
               activeTab === "most_liked" ? mostLikedVideos : 
               activeTab === "featured" ? videos.filter(v => v?.is_featured) :
               activeTab === "latest" ? [...videos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : 
               activeTab === "saved" ? videos.filter(v => savedIds.includes(v.id)) :
               activeTab === "liked" ? videos.filter(v => likedIds.includes(v.id)) : 
               videos;

    const freeText = (search || "").toLowerCase();
    const catQuery = (categoryFilter || "").toLowerCase();

    return base.filter((v) => {
      if (!v) return false;
      if (catQuery && !(v.category || "").toLowerCase().includes(catQuery)) return false;
      if (freeText && !`${v.title} ${v.description} ${v.category}`.toLowerCase().includes(freeText)) return false;
      return true;
    });
  }, [search, activeTab, videos, trendingVideos, mostLikedVideos, categoryFilter, savedIds, likedIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [filtered.length, totalPages]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // --- TAB HANDLERS ---
  const onSelectTab = (tab) => {
    setActiveTab(tab); setCategoryFilter(""); setSearch("");
    if (showPlayer) setSearchParams({});
    setPage(1); 
  };
  const handleCategoryClick = (cat) => {
    const isSame = categoryFilter === cat;
    setCategoryFilter(isSame ? "" : cat);
    if (!isSame && activeTab === "categories") setActiveTab("home");
    setPage(1); 
  };
  const handlePageChange = (newPage) => { setPage(newPage); listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const formatDuration = (s) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "";

  const menuItems = ["home", "latest", "categories", "trending", "most_liked", "liked", "saved"];

  return (
    <main className="w-full min-h-screen bg-[#020617] text-slate-100 relative isolate font-sans selection:bg-emerald-500/30 pb-24 md:pb-32 transition-colors duration-1000">
      
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* DESKTOP NAV */}
      <nav className="hidden md:block sticky top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-between h-16 items-center px-6">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl mx-auto">
            {menuItems.map((tab) => (
              <button key={tab} onClick={() => onSelectTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {activeTab === tab && <motion.div layoutId="navBg" className="absolute inset-0 bg-white/10 rounded-lg shadow-inner" />}
                <span className="relative z-10 capitalize">
                    {tab === "saved" ? "Watchlist" : tab === "liked" ? "My Likes" : tab === "most_liked" ? "Top Rated" : tab}
                </span>
              </button>
            ))}
          </div>
          
          {/* UPDATED: Profile Button (Icon Only) */}
          {session && (
             <button onClick={() => setShowProfile(true)} className="absolute right-8 w-10 h-10 rounded-full border border-white/10 hover:border-emerald-500/50 transition-all group overflow-hidden bg-slate-800 flex items-center justify-center" title="My Profile">
                {session.user.user_metadata.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="User" />
                ) : (
                    <User size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                )}
             </button>
          )}
        </div>
      </nav>

      {/* MOBILE HEADER & SEARCH */}
      <div className="sticky top-0 md:top-16 z-40 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 md:border-none md:bg-transparent pb-2 md:pb-0">
        <div className="px-4 py-4 md:py-4 transition-all flex gap-3 justify-center">
            {/* UPDATED: Centered Search Container */}
            <div className="w-full max-w-2xl flex items-center p-2 rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all mx-auto">
                <div className="flex-1 flex items-center px-3 gap-3">
                    <span className="text-slate-500">🔍</span>
                    <input value={search || ""} onChange={(e) => setSearch(e.target.value)} placeholder="Search library..." className="w-full bg-transparent outline-none text-sm placeholder:text-slate-600 text-white" />
                    {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-white text-lg">×</button>}
                </div>
            </div>
            {/* Mobile Profile Trigger (Visible only on mobile) */}
            {session && (
                <button onClick={() => setShowProfile(true)} className="md:hidden w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-transform overflow-hidden flex-shrink-0">
                    {session.user.user_metadata.avatar_url ? (
                        <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="User" />
                    ) : (
                        <User size={20} className="text-emerald-500" />
                    )}
                </button>
            )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8">
        
        <AnimatePresence>
            {showProfile && session && (
                <UserProfileModal 
                    session={session} 
                    onClose={() => setShowProfile(false)} 
                    likedIds={likedIds}
                    savedIds={savedIds}
                    allVideos={videos}
                    onPlayVideo={(v) => openPlayer(v)}
                />
            )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showPlayer && selected && (
            <motion.section ref={playerRef} key={`player-${selected.id}`} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-16 scroll-mt-24">
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8 items-start">
                <div className="lg:col-span-2 w-full">
                    {/* VIDEO PLAYER CONTAINER */}
                    <div className="-mx-4 md:mx-0 mb-6 relative z-20">
                        <VideoPlayer video={selected} onPlayed={(id) => onVideoPlayed?.(id)} />
                    </div>
                    
                    <div className="px-4 md:px-0">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="space-y-2">
                                <h1 className="text-lg md:text-3xl font-black text-white tracking-tight leading-tight">{selected.title}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                    <span className="text-emerald-500/80">👁️ {Number(selected.view_count || 0).toLocaleString()} views</span>
                                    <span className="text-slate-800">|</span>
                                    <span>{new Date(selected.created_at).toLocaleDateString()}</span>
                                    <span className="text-slate-800">|</span>
                                    <span className="text-emerald-400">{selected.category || "General"}</span>
                                    {selected.duration && (
                                      <>
                                        <span className="text-slate-800">|</span>
                                        <span>⏱️ {formatDuration(selected.duration)}</span>
                                      </>
                                    )}
                                </div>
                            </div>
                            <VideoActions video={selected} isLiked={likedIds.includes(selected.id)} isSaved={savedIds.includes(selected.id)} onToggleLike={handleToggleLike} onToggleSave={handleToggleSave} />
                        </div>
                        
                        <div className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Description</h3>
                            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{selected.description || "No description available for this video."}</p>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 w-full sticky top-24">
                    <RelatedVideos currentVideo={selected} allVideos={videos} onPlay={openPlayer} />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="mb-6 md:mb-8 px-2 scroll-mt-32 flex flex-col sm:flex-row sm:items-end justify-between gap-4" ref={listTopRef}>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter capitalize flex items-center gap-2">
                {categoryFilter ? ( <> <span className="text-slate-600">📂</span> <span>{categoryFilter}</span> </> ) : ( <span>{activeTab === "saved" ? "My Watchlist" : activeTab === "liked" ? "My Liked Videos" : activeTab === "most_liked" ? "Top Rated" : activeTab}</span> )}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-bold ml-1 uppercase tracking-wider">{filtered.length} videos</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "categories" && !categoryFilter ? (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {categoryCounts.map(({ name, count }) => (
                <button key={name} onClick={() => handleCategoryClick(name)} className="p-4 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-900/50 border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all text-left group">
                  <div className="text-2xl md:text-3xl mb-3 md:mb-4 group-hover:scale-110 transition-transform">📁</div>
                  <h3 className="font-bold text-sm md:text-lg text-white group-hover:text-emerald-400 transition-colors truncate">{name}</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-semibold">{count} Videos</p>
                </button>
              ))}
            </motion.div>
          ) : (
            <>
              {categoryFilter && ( <button onClick={() => setCategoryFilter("")} className="mb-6 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest">✕ Clear: {categoryFilter}</button> )}
              {loading ? ( <VideoGridSkeleton /> ) : (
                <>
                    {paged.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50"><div className="text-6xl mb-4">🕸️</div><h3 className="text-xl font-bold text-white">No videos found</h3><p className="text-sm text-slate-500">Try adjusting your search or filters.</p></div>
                    ) : (
                        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            {paged.map((v) => {
                            const isTop = Number(v.view_count || 0) === maxViewCount && maxViewCount > 0;
                            const isMostLiked = v.likes_count > 0 && activeTab === 'most_liked' && filtered.indexOf(v) === 0;
                            const isPlaying = selected?.id === v.id;

                            return (
                                <motion.button key={v.id} onClick={() => openPlayer(v)} className="group text-left focus:outline-none w-full">
                                <div className={`relative aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden bg-slate-900 mb-3 md:mb-4 ring-1 transition-all duration-500 shadow-xl shadow-black/40 ${isPlaying ? "ring-emerald-500 ring-offset-2 ring-offset-[#020617]" : "ring-white/10 group-hover:ring-emerald-500/50"}`}>
                                    <img src={v.thumbnail_url || "https://placehold.co/600x400/020617/white?text=Preview"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></div>
                                    </div>

                                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                        {isPlaying && <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg animate-pulse">▶ Playing</span>}
                                        {v.is_featured && <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg">⭐ Featured</span>}
                                        {isTop && <span className="bg-pink-500 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg">🔥 TOP</span>}
                                        {isMostLiked && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase shadow-lg">♥ Most Liked</span>}
                                    </div>
                                    
                                    {savedIds.includes(v.id) && ( <div className="absolute bottom-3 right-3 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 text-emerald-400 rounded-full p-1.5 shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div> )}
                                </div>

                                <h3 className={`text-sm md:text-base font-bold line-clamp-1 transition-colors px-1 ${isPlaying ? "text-emerald-400" : "text-slate-200 group-hover:text-emerald-400"}`}>{v.title}</h3>
                                <div className="flex items-center flex-wrap gap-2 mt-1.5 px-1 text-[10px] md:text-[11px] font-bold uppercase tracking-tighter text-slate-500">
                                    <span>{Number(v.view_count || 0).toLocaleString()} views</span>
                                    <span className="text-slate-800">|</span>
                                    <span className={v.likes_count > 0 ? "text-rose-400" : ""}>
                                    ♥ {v.likes_count || 0}
                                    </span>
                                    <span className="text-slate-800">|</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 tracking-widest">
                                    {v.category || "General"}
                                    </span>
                                </div>
                                </motion.button>
                            );
                            })}
                        </motion.div>
                    )}
                </>
              )}

              {totalPages > 1 && (
                <div className="mt-12 md:mt-16 flex justify-center pb-8">
                  <div className="flex gap-1 p-1 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                    {[...Array(totalPages)].map((_, i) => (
                      <button key={i} onClick={() => handlePageChange(i + 1)} className={`w-8 h-8 md:w-10 md:h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:bg-white/5"}`}>{i + 1}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* FIXED BOTTOM NAVIGATION FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-[#020617]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6 h-14 items-end px-1 pb-1">
          {["home", "latest", "categories", "trending", "liked", "saved"].map(id => (
            <button 
                key={id} 
                onClick={() => onSelectTab(id)} 
                className={`flex flex-col items-center justify-end h-full gap-0.5 relative min-w-0 ${activeTab === id ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <span className={`text-xl mb-0.5 transition-transform ${activeTab === id ? "scale-110" : ""}`}>
                {id === "home" ? "🏠" : id === "latest" ? "⚡" : id === "categories" ? "📂" : id === "saved" ? "🔖" : id === "liked" ? "♥" : "🔥"}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-tight w-full truncate text-center opacity-80 px-0.5">
                  {id === "saved" ? "Save" : id === "liked" ? "Likes" : id}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
