/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "./RichTextEditor"; 
import { Search, Plus, ArrowLeft, X, Trash2, Eye, MessageSquare, Edit3, Link as LinkIcon, ExternalLink, User, Settings, LogOut, Shield, Camera, Calendar } from "lucide-react";

// --- CONSTANTS ---
const CATEGORIES = [
  { id: "All", label: "Feed", icon: "⚡" },
  { id: "General", label: "General", icon: "💬" },
  { id: "Feature Request", label: "Features", icon: "✨" },
  { id: "Bug Report", label: "Bugs", icon: "🔧" },
  { id: "Showcase", label: "Showcase", icon: "🎨" },
];

// --- UTILS ---
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

const Avatar = ({ name, url, size = "md", isAdmin = false }) => {
  const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  const fallbackInitial = name?.[0]?.toUpperCase() || "U";
  
  if (url) {
      return <img src={url} alt={name} className={`${s} rounded-2xl bg-slate-800 object-cover ring-2 ${isAdmin ? 'ring-emerald-500/50' : 'ring-white/10'} shadow-lg`} />;
  }
  
  return (
    <div className={`${s} rounded-2xl flex items-center justify-center font-black text-white shadow-lg ring-2 ${isAdmin ? 'bg-gradient-to-br from-emerald-900 to-black ring-emerald-500/50' : 'bg-gradient-to-br from-slate-700 to-slate-900 ring-white/10'}`}>
        {fallbackInitial}
    </div>
  );
};

// --- COMPONENT: USER PROFILE MODAL (Lite Version for Forum) ---
const UserProfileModal = ({ session, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
        setFullName(session.user.user_metadata?.full_name || "");
        setAvatarUrl(session.user.user_metadata?.avatar_url || "");
    }
  }, [session]);

  const role = session?.user?.user_metadata?.role || "user";
  const defaultAvatar = role === 'admin' 
    ? "https://placehold.co/150x150/10b981/020617?text=ADMIN" 
    : `https://placehold.co/150x150/334155/ffffff?text=${encodeURIComponent((fullName?.[0] || "U").toUpperCase())}`;
  const currentAvatar = avatarUrl || defaultAvatar;

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } });
    if (error) alert("Error: " + error.message);
    else window.location.reload(); 
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg bg-[#0B1121] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className={`h-32 relative border-b border-white/5 ${role === 'admin' ? 'bg-gradient-to-r from-emerald-900/40 via-black to-emerald-900/40' : 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800'}`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 rounded-full text-white transition-all z-20"><X size={18}/></button>
        </div>
        <div className="relative z-10 px-8 pb-8 -mt-12 flex-1">
            <div className="flex justify-between items-end mb-6">
                <div className="relative group">
                    <img src={currentAvatar} alt="Profile" className={`w-32 h-32 rounded-3xl border-4 border-[#0B1121] shadow-xl object-cover bg-slate-800 ${role === 'admin' ? 'ring-2 ring-emerald-500/50' : ''}`} />
                    {isEditing && <div className="absolute inset-0 bg-black/60 rounded-2xl m-1 flex items-center justify-center text-white/80 border-4 border-transparent"><Camera size={24} /></div>}
                </div>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="mb-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"><Settings size={18} /></button>
                )}
            </div>
            
            {isEditing ? (
                <div className="space-y-4 animate-in fade-in">
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-emerald-500/50" placeholder="Display Name" />
                    <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-slate-300 text-xs font-mono outline-none focus:border-emerald-500/50" placeholder="Avatar URL" />
                    <div className="flex gap-2">
                        <button onClick={handleUpdateProfile} disabled={loading} className="flex-1 py-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl uppercase tracking-widest hover:bg-emerald-400">{loading ? "Saving..." : "Save"}</button>
                        <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-white/5 text-slate-400 font-black text-xs rounded-xl uppercase tracking-widest hover:text-white">Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">{fullName || "Stream User"}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                            {role === 'admin' ? <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> Admin</span> : <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 uppercase tracking-wider">User</span>}
                            <span>•</span><span>{session.user.email}</span>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-900/30 border border-white/5">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} className="text-slate-500" /> Details</h3>
                        <div className="space-y-3 text-xs font-medium text-slate-400">
                            <div className="flex justify-between border-b border-white/5 pb-2"><span>Member Since</span><span className="text-white">{new Date(session.user.created_at).toLocaleDateString()}</span></div>
                            <div className="flex justify-between"><span>Provider</span><span className="text-white capitalize">{session.user.app_metadata.provider || "Email"}</span></div>
                        </div>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); onClose(); }} className="w-full py-4 rounded-xl border border-rose-500/20 text-rose-500/80 font-bold text-xs uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all flex items-center justify-center gap-2"><LogOut size={16} /> Sign Out</button>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function ForumPage({ isAdminAuthed, session, onOpenAuth }) {
  const { threadId } = useParams(); 
  const navigate = useNavigate();   

  const [activeThread, setActiveThread] = useState(null);
  const [threads, setThreads] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // New Profile State
  
  // Controlled Form Inputs
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("General");
  const [createContent, setCreateContent] = useState(""); 
  const [createLink, setCreateLink] = useState("");
  
  // Reply State
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  const profile = session ? { id: session.user.id, name: session.user.user_metadata.full_name || "User", avatar: session.user.user_metadata.avatar_url, role: session.user.user_metadata.role } : null;

  // --- DATA FETCHING ---
  const fetchThreads = useCallback(async () => {
    const { data } = await supabase.from("forum_threads").select("*, forum_posts(count)").order("created_at", { ascending: false });
    if (data) {
        setThreads(data.map(t => ({ ...t, reply_count: t.forum_posts?.[0]?.count || 0 })));
    }
  }, []);

  const fetchSingleThread = useCallback(async (id) => {
      const { data, error } = await supabase.from("forum_threads").select("*").eq("id", id).single();
      
      if (data) {
          // 1. Trigger the database update and Log the result
          const { error: rpcError } = await supabase.rpc("increment_thread_view", { thread_id: id });
          if (rpcError) console.error("View Count RPC Error:", rpcError);

          // 2. Optimistic UI update (shows +1 immediately)
          setActiveThread({ ...data, view_count: (data.view_count || 0) + 1 });
      } else if (error) {
          console.error("Fetch Thread Error:", error);
          navigate("/forum");
      }
  }, [navigate]);
  
  const fetchReplies = useCallback(async (id) => {
    const { data } = await supabase.from("forum_posts").select("*").eq("thread_id", id).order("created_at", { ascending: true });
    setReplies(data || []);
  }, []);

  useEffect(() => {
      fetchThreads();
      if (threadId) {
          fetchSingleThread(threadId);
          fetchReplies(threadId);
      } else {
          setActiveThread(null);
      }
  }, [threadId, fetchThreads, fetchSingleThread, fetchReplies]);

  // --- ACTIONS ---
  const handleOpenThread = (t) => {
      const updatedThread = { ...t, view_count: (t.view_count || 0) + 1 };
      setThreads(prev => prev.map(thread => thread.id === t.id ? { ...thread, view_count: updatedThread.view_count } : thread));
      navigate(`/forum/${t.id}`);
  };

  const handleBack = () => navigate("/forum");

  const openCreateModal = () => {
      setCreateTitle(""); setCreateContent(""); setCreateLink(""); setCreateCategory("General");
      setIsEditing(false); setShowModal(true);
  };

  const openEditModal = (thread) => {
      setCreateTitle(thread.title); setCreateContent(thread.content); setCreateLink(thread.link_url || "");
      setCreateCategory(thread.category); setIsEditing(true); setShowModal(true);
  };

  const handleSavePost = async () => {
    if (!createTitle.trim()) return alert("Please enter a title.");
    if (!createContent || createContent === "<p></p>") return alert("Please enter some content.");
    
    const payload = { title: createTitle, content: createContent, category: createCategory, link_url: createLink.trim() || null };
    let error;

    if (isEditing && activeThread) {
        const { error: err } = await supabase.from("forum_threads").update(payload).eq("id", activeThread.id);
        error = err;
        if (!error) setActiveThread(prev => ({ ...prev, ...payload }));
    } else {
        const { error: err } = await supabase.from("forum_threads").insert({ ...payload, author_name: profile.name, author_avatar: profile.avatar, user_id: profile.id });
        error = err;
    }

    if (error) alert("Failed to save: " + error.message);
    else {
        setShowModal(false); setCreateTitle(""); setCreateContent(""); setCreateLink("");
        if (!isEditing) localStorage.removeItem("draft_new_thread");
        fetchThreads(); 
    }
  };

  const handleReply = async () => {
      if (!profile) return onOpenAuth();
      if (!replyContent || replyContent === "<p></p>") return;
      setSending(true);
      const { error } = await supabase.from("forum_posts").insert({ thread_id: activeThread.id, content: replyContent, author_name: profile.name, author_avatar: profile.avatar, user_id: profile.id });
      if (!error) {
          setReplyContent(""); fetchReplies(activeThread.id);
          setActiveThread(prev => ({...prev, reply_count: (prev.reply_count || 0) + 1}));
      }
      setSending(false); 
  };

  const handleDelete = async (id, type) => {
      if(!confirm("Are you sure you want to delete this?")) return;
      const table = type === 'thread' ? "forum_threads" : "forum_posts";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) {
          if (type === 'thread') { navigate("/forum"); fetchThreads(); } 
          else { fetchReplies(activeThread.id); setActiveThread(prev => ({...prev, reply_count: Math.max(0, (prev.reply_count || 0) - 1)})); }
      }
  };

  const filtered = useMemo(() => threads.filter(t => (category === "All" || t.category === category) && (!search || t.title.toLowerCase().includes(search.toLowerCase()))), [threads, category, search]);

  const MobileCategoryNav = () => (
    <div className="md:hidden w-full overflow-x-auto flex items-center gap-2 pb-2 px-1 no-scrollbar mt-3 border-t border-white/5 pt-3">
        {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => { setCategory(cat.id); navigate("/forum"); }} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${category === cat.id ? "bg-emerald-500 text-slate-950 shadow-lg" : "bg-white/5 text-slate-400 border border-white/5"}`}>
                {cat.label}
            </button>
        ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-900/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[120px]" />
        </div>

        {/* Sticky Navbar */}
        <nav className="sticky top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
             <div className="px-4 md:px-8 py-3 md:h-16 flex flex-col md:flex-row md:items-center justify-between">
                 <div className="flex items-center justify-between w-full md:w-auto">
                     <div className="flex items-center gap-8">
                         <h1 className="text-xl font-black text-white tracking-tight">FORUM <span className="text-emerald-500">.</span></h1>
                         <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => { setCategory(cat.id); navigate("/forum"); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${category === cat.id ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-400 hover:text-white"}`}>
                                    {cat.label}
                                </button>
                            ))}
                         </div>
                     </div>
                     <div className="md:hidden flex items-center gap-3">
                        <button onClick={() => profile ? openCreateModal() : onOpenAuth()} className="p-2 rounded-lg bg-emerald-500 text-slate-950 shadow-lg"><Plus size={18} /></button>
                        {profile ? (
                            <button onClick={() => setShowProfile(true)} className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg active:scale-95 transition-transform">
                                <Avatar name={profile.name} url={profile.avatar} size="sm" isAdmin={profile.role === 'admin'} />
                            </button>
                        ) : (
                            <button onClick={onOpenAuth} className="text-xs font-bold text-white uppercase">Login</button>
                        )}
                     </div>
                 </div>
                 <MobileCategoryNav />
                 <div className="hidden md:flex items-center gap-4">
                     <button onClick={() => profile ? openCreateModal() : onOpenAuth()} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider border border-white/5 transition-all">
                         <Plus size={16} /> New Post
                     </button>
                     {profile ? (
                         <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg hover:ring-2 hover:ring-emerald-500/50 transition-all flex items-center justify-center">
                             <Avatar name={profile.name} url={profile.avatar} size="md" isAdmin={profile.role === 'admin'} />
                         </button>
                     ) : (
                         <button onClick={onOpenAuth} className="text-xs font-bold text-white uppercase hover:text-emerald-400">Login</button>
                     )}
                 </div>
             </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 relative px-4 md:px-8 max-w-7xl mx-auto z-10 w-full pt-6"> 
            <AnimatePresence mode="wait">
                {!threadId ? (
                    <motion.div key="feed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                        <div className="flex flex-col md:flex-row gap-6 mb-6 justify-center">
                            <div className="w-full max-w-2xl flex items-center p-2 rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all mx-auto">
                                <div className="flex-1 flex items-center px-3 gap-3">
                                    <span className="text-slate-500"><Search size={18} /></span>
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discussions..." className="w-full bg-transparent outline-none text-sm placeholder:text-slate-600 text-white" />
                                </div>
                            </div>
                            <button onClick={() => profile ? openCreateModal() : onOpenAuth()} className="md:hidden h-12 px-6 bg-emerald-500 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2">
                                <Plus size={18} /> New
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pb-20">
                            {filtered.length === 0 ? <div className="col-span-full py-20 text-center opacity-50"><div className="text-6xl mb-4 grayscale">🔭</div><p className="text-sm font-bold uppercase tracking-widest text-slate-500">No signals found</p></div> : 
                             filtered.map(t => (
                                <motion.button 
                                    key={t.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => handleOpenThread(t)} 
                                    className="w-full text-left p-5 md:p-6 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-white/[0.03] hover:border-emerald-500/30 transition-all group relative overflow-hidden mb-2 shadow-sm hover:shadow-2xl"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={t.author_name} url={t.author_avatar} size="sm" />
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors truncate max-w-[100px] md:max-w-none">{t.author_name}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/5 uppercase tracking-wide">{t.category}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-600 font-bold whitespace-nowrap">{timeAgo(t.created_at)}</span>
                                    </div>
                                    <h3 className="text-base md:text-lg font-black leading-snug mb-3 text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2">{t.title}</h3>
                                    
                                    {t.link_url && (
                                        <div className="mb-3 flex items-center gap-2 text-emerald-400 text-xs font-bold hover:underline" onClick={(e) => { e.stopPropagation(); window.open(t.link_url, '_blank'); }}>
                                            <LinkIcon size={12} /> <span className="truncate max-w-[200px]">{t.link_url.replace(/^https?:\/\//, '')}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600 group-hover:text-slate-500">
                                        <span className="flex items-center gap-1.5"><Eye size={14} /> {t.view_count || 0}</span>
                                        <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {t.reply_count || 0}</span>
                                    </div>
                                </motion.button>
                             ))}
                        </div>
                    </motion.div>
                ) : (
                    activeThread && (
                        <motion.div key="thread" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto pb-20">
                            <button onClick={handleBack} className="mb-4 md:mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors group px-1">
                                <span className="group-hover:-translate-x-1 transition-transform"><ArrowLeft size={16} /></span> Back to Feed
                            </button>
                            
                            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-wider">{activeThread.category}</span>
                                            <span className="text-xs text-slate-500 font-mono font-bold uppercase">{timeAgo(activeThread.created_at)}</span>
                                            <div className="flex items-center gap-3 ml-2 text-slate-500 text-xs font-mono border-l border-white/10 pl-3">
                                                <span className="flex items-center gap-1"><Eye size={12} /> {activeThread.view_count || 0}</span>
                                                <span className="flex items-center gap-1"><MessageSquare size={12} /> {replies.length}</span>
                                            </div>
                                        </div>
                                        {(isAdminAuthed || profile?.id === activeThread.user_id) && (
                                            <div className="flex gap-2 self-end md:self-auto">
                                                <button onClick={() => openEditModal(activeThread)} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"><Edit3 size={16} /></button>
                                                <button onClick={() => handleDelete(activeThread.id, 'thread')} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </div>

                                    <h1 className="text-2xl md:text-5xl font-black text-white leading-tight mb-4 md:mb-6">{activeThread.title}</h1>
                                    
                                    {activeThread.link_url && (
                                        <a href={activeThread.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all max-w-full truncate">
                                            <ExternalLink size={16} /> <span className="truncate">Visit Link ({activeThread.link_url.replace(/^https?:\/\//, '').split('/')[0]})</span>
                                        </a>
                                    )}

                                    <div className="flex items-center gap-4 mb-8 md:mb-10 pb-8 md:pb-10 border-b border-white/5">
                                        <Avatar name={activeThread.author_name} url={activeThread.author_avatar} size="lg" />
                                        <div>
                                            <div className="text-base font-bold text-white">{activeThread.author_name}</div>
                                            <div className="text-xs text-emerald-500 font-mono">Original Poster</div>
                                        </div>
                                    </div>
                                    <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-base leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: activeThread.content }} />
                                </div>
                            </div>

                            {/* Replies */}
                            <div className="space-y-6 md:space-y-8 mt-12 md:mt-16">
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                    <span className="relative bg-[#020617] px-6 text-xs md:text-sm font-black text-slate-600 uppercase tracking-[0.2em]">Discussion ({replies.length})</span>
                                </div>
                                
                                {replies.map(r => (
                                    <div key={r.id} className="flex gap-3 md:gap-6 group">
                                        <div className="flex-shrink-0 pt-1"><Avatar name={r.author_name} url={r.author_avatar} size="sm" /></div>
                                        <div className="flex-1 bg-slate-900/30 rounded-2xl p-4 md:p-6 border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-baseline justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-emerald-400">{r.author_name}</span>
                                                    <span className="text-[10px] text-slate-600 font-mono">{timeAgo(r.created_at)}</span>
                                                </div>
                                                {(isAdminAuthed || profile?.id === r.user_id) && <button onClick={() => handleDelete(r.id, 'reply')} className="opacity-100 md:opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-opacity"><Trash2 size={14} /></button>}
                                            </div>
                                            <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-base break-words" dangerouslySetInnerHTML={{ __html: r.content }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Editor */}
                            <div className="mt-12 bg-slate-900/30 rounded-2xl p-4 md:p-6 border border-white/5">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Post a Reply</h3>
                                <div className="flex gap-4">
                                    <div className="hidden md:block pt-2"><Avatar name={profile?.name} url={profile?.avatar} size="md" /></div>
                                    <div className="flex-1">
                                        <RichTextEditor content={replyContent} onChange={setReplyContent} placeholder={profile ? "Share your thoughts..." : "Login to reply"} minHeight="h-32" />
                                        <div className="flex justify-end mt-4">
                                            <button onClick={handleReply} disabled={sending || !replyContent} className="px-6 md:px-8 py-2 md:py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 w-full md:w-auto">
                                                {sending ? "Sending..." : "Post Reply"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>

        {/* Profile Modal */}
        <AnimatePresence>
            {showProfile && session && (
                <UserProfileModal session={session} onClose={() => setShowProfile(false)} />
            )}
        </AnimatePresence>

        {/* Create/Edit Modal */}
        <AnimatePresence>
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
                    <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} className="w-full max-w-5xl bg-[#0B1121] border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:max-h-[90vh]">
                        <div className="px-6 md:px-8 py-4 md:py-6 border-b border-white/5 flex justify-between items-center bg-[#0B1121]">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                {isEditing ? <Edit3 size={20} /> : <Plus size={20} />} 
                                {isEditing ? "Edit Post" : "Create Post"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"><X size={18} /></button>
                        </div>
                        {/* Z-Index Fix Applied Here */}
                        <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                                    <input 
                                        value={createTitle}
                                        onChange={(e) => setCreateTitle(e.target.value)}
                                        className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" 
                                        placeholder="Enter an interesting title..." 
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project/Resource Link (Optional)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><LinkIcon size={16} /></span>
                                        <input 
                                            value={createLink}
                                            onChange={(e) => setCreateLink(e.target.value)}
                                            className="w-full p-4 pl-12 bg-black/40 border border-white/10 rounded-xl text-emerald-400 font-medium outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600" 
                                            placeholder="https://github.com/..." 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                                    <select 
                                        value={createCategory}
                                        onChange={(e) => setCreateCategory(e.target.value)}
                                        className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-slate-300 font-bold outline-none focus:border-emerald-500/50 appearance-none"
                                    >
                                        {CATEGORIES.filter(c => c.id !== "All").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col min-h-[300px] md:min-h-[400px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Content</label>
                                <RichTextEditor 
                                    content={createContent} 
                                    onChange={setCreateContent} 
                                    placeholder="Write something amazing..." 
                                    minHeight="h-full" 
                                    storageKey={isEditing ? null : "draft_new_thread"}
                                />
                            </div>
                        </div>
                        <div className="p-4 md:p-6 border-t border-white/5 bg-[#0B1121] flex justify-end gap-3 md:gap-4 pb-8 md:pb-6">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl bg-white/5 text-slate-400 font-bold text-xs uppercase hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleSavePost} className="px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all">
                                {isEditing ? "Save Changes" : "Publish"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}
