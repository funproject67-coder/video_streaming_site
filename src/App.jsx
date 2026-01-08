/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useState, memo, useRef } from "react";
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, ShieldAlert, Lock, PlayCircle, Terminal, 
  MessageSquare, LayoutGrid, LogIn, Bell, CheckCircle, Wifi, WifiOff
} from "lucide-react";

// --- COMPONENTS ---
import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";
import ForumPage from "./components/ForumPage";

// --- UTILS ---
import {
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
  generateThumbnailWithRetries,
  dataURLToBlob,
  uploadThumbnailBlob,
  uploadThumbnailFile,
  deleteThumbnail
} from "./utils/thumbnails";

/* -------------------------------------------------------
    HELPER: BLOCK CHECKER
------------------------------------------------------- */
const checkIfBlocked = async (userId) => {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", userId)
      .single();
    if (error) return false;
    return data?.is_blocked === true;
  } catch {
    return false;
  }
};

/* -------------------------------------------------------
    UI: LOADING, TOAST & BLOCK SCREENS
------------------------------------------------------- */
const InitialLoader = memo(() => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <div className="text-white font-black tracking-[0.45em] text-lg animate-pulse">
        STREAM STUDIO
      </div>
      <div className="text-emerald-500/50 text-[10px] font-mono mt-2">INITIALIZING UPLINK...</div>
    </div>
  </motion.div>
));

const SecurityToast = ({ message, type }) => (
  <motion.div
    initial={{ y: 50, opacity: 0, scale: 0.9 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: 20, opacity: 0, scale: 0.95 }}
    className="fixed bottom-4 left-4 right-4 md:left-auto md:bottom-6 md:right-6 z-[200] md:w-auto md:max-w-sm"
  >
    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${type === 'alert' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <div className={`p-2 rounded-full flex-shrink-0 ${type === 'alert' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {type === 'alert' ? <Lock size={18} /> : <CheckCircle size={18} />}
        </div>
        <div className="min-w-0">
            <h4 className={`text-[10px] font-black uppercase tracking-widest truncate ${type === 'alert' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {type === 'alert' ? 'Security Update' : 'System Status'}
            </h4>
            <p className="text-xs text-slate-300 font-bold mt-0.5 leading-tight">{message}</p>
        </div>
    </div>
  </motion.div>
);

const BlockedOverlay = ({ onLogout }) => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
    <div className="max-w-md w-full rounded-3xl border border-rose-500/20 bg-slate-900/70 p-8 text-center shadow-2xl">
      <ShieldAlert className="mx-auto mb-5 text-rose-500" size={48} />
      <h2 className="mb-3 text-xl font-black uppercase tracking-widest text-rose-400">
        Access Suspended
      </h2>
      <p className="text-sm leading-relaxed text-slate-300 mb-6">
        Your account has been restricted by an administrator.
      </p>
      <div className="flex justify-center">
        <button 
            onClick={onLogout} 
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase text-xs rounded-xl transition-all shadow-lg flex items-center gap-2"
        >
            <LogOut size={16} /> Sign Out & Reload
        </button>
      </div>
    </div>
  </div>
);

const ConnectionStatus = ({ status }) => (
    <div className="fixed bottom-3 left-3 md:bottom-4 md:left-4 z-50 flex items-center gap-1.5 md:gap-2 pointer-events-none opacity-60 mix-blend-screen transition-all">
        <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-500 ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`} />
        <span className="hidden sm:block text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            {status === 'connected' ? 'SYSTEM ONLINE' : 'ATTEMPTING RECONNECT...'}
        </span>
        <span className="block sm:hidden text-[8px] font-mono text-slate-500 uppercase tracking-widest">
            {status === 'connected' ? 'ONLINE' : 'RETRYING'}
        </span>
    </div>
);

/* -------------------------------------------------------
    UI: AUTH MODAL
------------------------------------------------------- */
const AuthModal = ({ onClose, disableSignup, onVerifying }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        if (disableSignup) throw new Error("Signups are currently restricted.");
        const { error: err } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        });
        if (err) throw err;
        setMode("signin");
        alert("Account created. Please login.");
        return;
      }

      if (onVerifying) onVerifying(true);

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (onVerifying) onVerifying(false);
      onClose();
    } catch (e) {
      if (onVerifying) onVerifying(false);
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-[#0B1121] p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
        <h2 className="text-center text-xl font-black tracking-widest text-white mb-6">
          {mode === "signin" ? "WELCOME BACK" : "JOIN STUDIO"}
        </h2>
        {mode === "signup" && (
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Full Name</label>
             <input className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Email Address</label>
             <input className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Password</label>
             <input className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-rose-400 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-tight text-center">
            {error}
          </motion.div>
        )}
        <button disabled={loading} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-950 uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-500/20 mt-4 transition-all">
          {loading ? "Verifying..." : (mode === "signin" ? "Enter Studio" : "Create Account")}
        </button>
        {!disableSignup && (
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} className="w-full text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors pt-2">
            {mode === "signin" ? "New here? Create account" : "Already have an account? Sign in"}
            </button>
        )}
        <button type="button" onClick={onClose} className="w-full text-[10px] font-bold text-slate-600 uppercase hover:text-white transition-colors">Cancel</button>
      </motion.form>
    </div>
  );
};

/* -------------------------------------------------------
    MAIN APP COMPONENT
------------------------------------------------------- */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- DATA STATE ---
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- AUTH STATE ---
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // --- SITE ACCESS & TOAST STATE ---
  const [accessMode, setAccessMode] = useState("open");
  const [toast, setToast] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");

  // --- SEARCH STATE ---
  const [viewerSearch, setViewerSearch] = useState("");

  // --- ADMIN FORM STATE ---
  const [uploading, setUploading] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [extTitle, setExtTitle] = useState("");
  const [extDescription, setExtDescription] = useState("");
  const [extCategory, setExtCategory] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [extPosition, setExtPosition] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upFile, setUpFile] = useState(null);
  const [upPosition, setUpPosition] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilterType, setAdminFilterType] = useState("all");

  const isVerifying = useRef(false);
  const [isVerifyingState, setIsVerifyingState] = useState(false);

  // Helper to trigger toasts
  const triggerToast = (msg, type = 'info') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 5000);
  };

  /* --- 1. AUTH & SESSION LISTENER --- */
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            // Wait for session with a soft timeout
            const { data } = await Promise.race([
                supabase.auth.getSession(),
                new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 5000)) // 5s timeout
            ]);

            if (mounted) {
                if (data?.session) {
                    setSession(data.session);
                    const isUserAdmin = data.session.user.user_metadata?.role === "admin";
                    setIsAdmin(isUserAdmin);
                    if (isUserAdmin) localStorage.setItem("studio_admin_active", "true");
                    
                    checkIfBlocked(data.session.user.id).then(blocked => {
                        if (mounted && blocked) setBlockedMessage("Your account has been suspended.");
                    });
                }
                setAuthReady(true);
            }
        } catch (err) {
            console.error("Auth init error:", err);
            if (mounted) setAuthReady(true);
        }
    };
    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      setSession(s);
      
      if (s) {
          const isUserAdmin = s.user.user_metadata?.role === "admin";
          if (isUserAdmin) {
              setIsAdmin(true);
              localStorage.setItem("studio_admin_active", "true");
          } else {
              setIsAdmin(false); 
              if(localStorage.getItem("studio_admin_active") !== "true") setIsAdmin(false);
          }

          checkIfBlocked(s.user.id).then(blocked => {
              if (mounted && blocked) setBlockedMessage("Your account has been suspended.");
              else if (mounted) setBlockedMessage(null);
          });
      } else {
          if (localStorage.getItem("studio_admin_active") !== "true") setIsAdmin(false);
      }
      setAuthReady(true);
    });

    return () => {
        mounted = false;
        sub.subscription.unsubscribe();
    };
  }, []);

  // --- REALTIME BLOCK LISTENER ---
  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel(`public:profiles:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => {
          if (payload.new.is_blocked) {
            setBlockedMessage("Your account has been suspended.");
            supabase.auth.signOut();
          } else {
            setBlockedMessage(null);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  const handleForceLogout = async () => {
      setBlockedMessage(null);
      await supabase.auth.signOut();
      setSession(null);
      window.location.reload(); 
  };

  /* --- 2. DATA FETCHING --- */
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("videos").select("*").order("order_index");
      if (error) throw error;
      
      const v = (data || []).map((x) => ({
        ...x,
        public_url: x.file_path ? getPublicUrlForVideoPath(x.file_path) : x.external_url,
        thumbnail_url: x.thumbnail_path ? getPublicUrlForThumbPath(x.thumbnail_path) : null,
      }));
      setVideos(v);
    } catch (e) { 
        console.error("Fetch Error:", e); 
    } finally { 
        setLoading(false); 
    }
  }, []); 

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  useEffect(() => {
    if (selected && videos.length > 0) {
      const updated = videos.find(v => v.id === selected.id);
      if (updated && updated !== selected) setSelected(updated);
    }
  }, [videos, selected]);

  /* --- 6. VIEW COUNT HANDLER --- */
const handleVideoView = useCallback(async (videoId) => {
  // 1. Update Database (Calls the SQL function you created)
  const { error } = await supabase.rpc('increment_video_view', { video_id: videoId });
  
  if (!error) {
    // 2. Update Local State (Instant UI update without refetching)
    setVideos(prev => prev.map(v => 
      v.id === videoId ? { ...v, view_count: (v.view_count || 0) + 1 } : v
    ));
    
    // Update selected video if it is the one currently playing
    if (selected?.id === videoId) {
      setSelected(prev => ({ ...prev, view_count: (prev.view_count || 0) + 1 }));
    }
  }
}, [selected]); //

  /* --- 3. THUMBNAIL OPERATIONS --- */
  const onUpdateThumbnail = async (video, second = 7) => {
    try {
      const videoUrl = video.public_url || video.external_url;
      const dataUrl = await generateThumbnailWithRetries(videoUrl, second);
      if (!dataUrl) throw new Error("Capture failed");
      const blob = dataURLToBlob(dataUrl);
      const newPath = await uploadThumbnailBlob(blob, video.thumbnail_path);
      if (newPath) {
        await supabase.from("videos").update({ thumbnail_path: newPath }).eq("id", video.id);
        fetchVideos(); 
      }
    } catch (err) { console.error(err); alert("Thumbnail capture failed."); }
  };

  const onRemoveThumbnail = async (videoId) => {
    const video = videos.find(v => v.id === videoId);
    if (video?.thumbnail_path) await deleteThumbnail(video.thumbnail_path);
    await supabase.from("videos").update({ thumbnail_path: null }).eq("id", videoId);
    fetchVideos();
  };

  const onUploadCustomThumbnail = async (videoId, file) => {
    const video = videos.find(v => v.id === videoId);
    const newPath = await uploadThumbnailFile(file, video?.thumbnail_path);
    if (newPath) {
      await supabase.from("videos").update({ thumbnail_path: newPath }).eq("id", videoId);
      fetchVideos();
    }
  };

  /* --- 4. ADMIN OPERATIONS --- */
  const handleAddExternal = async (e, position) => {
      if(e) e.preventDefault();
      if (!extTitle || !extUrl) return alert("Title and URL required");
      setSavingExternal(true);
      try {
          let targetIndex = videos.length;
          const posNum = Number(position);
          if (position && !isNaN(posNum) && posNum > 0) targetIndex = posNum - 1;

          if (targetIndex < videos.length) {
              const itemsToShift = videos
                  .filter(v => v.order_index >= targetIndex)
                  .map(v => ({ id: v.id, order_index: v.order_index + 1 }));
              if (itemsToShift.length > 0) await supabase.from('videos').upsert(itemsToShift);
          }

          const { error } = await supabase.from('videos').insert({
              title: extTitle, description: extDescription, category: extCategory, external_url: extUrl, source_type: 'external', is_public: false,
              order_index: targetIndex
          });
          if (error) throw error;
          setExtTitle(""); setExtDescription(""); setExtCategory(""); setExtUrl(""); setExtPosition("");
          await fetchVideos(); 
      } catch (err) { alert("Error adding link: " + err.message); } finally { setSavingExternal(false); }
  };

  const handleUpload = async (e, position) => {
      if(e && e.preventDefault) e.preventDefault();
      if (!upFile) return alert("No file selected");
      setUploading(true);
      try {
          const fileExt = upFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${fileName}`;
          const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, upFile);
          if (uploadError) throw uploadError;

          let targetIndex = videos.length;
          const posNum = Number(position);
          if (position && !isNaN(posNum) && posNum > 0) targetIndex = posNum - 1;

          if (targetIndex < videos.length) {
              const itemsToShift = videos
                  .filter(v => v.order_index >= targetIndex)
                  .map(v => ({ id: v.id, order_index: v.order_index + 1 }));
              if (itemsToShift.length > 0) await supabase.from('videos').upsert(itemsToShift);
          }

          const { error: dbError } = await supabase.from('videos').insert({
              title: upTitle || upFile.name, tags: upTags, file_path: filePath, source_type: 'uploaded', is_public: false,
              order_index: targetIndex
          });
          if (dbError) throw dbError;
          setUpFile(null); setUpTitle(""); setUpTags(""); setUpPosition("");
          await fetchVideos(); 
      } catch (err) { alert("Upload failed: " + err.message); } finally { setUploading(false); }
  };

  const onUpdateVideo = async (id, payload) => {
    const { error } = await supabase.from("videos").update(payload).eq("id", id);
    if (!error) await fetchVideos();
  };
  const onTogglePublic = async (v) => {
    const { error } = await supabase.from("videos").update({ is_public: !v.is_public }).eq("id", v.id);
    if (!error) await fetchVideos();
  };
  const onToggleFeatured = async (v) => {
    const { error } = await supabase.from("videos").update({ is_featured: !v.is_featured }).eq("id", v.id);
    if (!error) await fetchVideos();
  };
  const onDeleteVideo = async (v) => {
      if (v.file_path) await supabase.storage.from('videos').remove([v.file_path]);
      if (v.thumbnail_path) await deleteThumbnail(v.thumbnail_path);
      await supabase.from("videos").delete().eq("id", v.id);
      await fetchVideos();
  };
  const onReorder = async (p) => {
      const { error } = await supabase.from("videos").upsert(p);
      if (!error) await fetchVideos();
  };

  /* --- 5. ACCESS MODE SYNC & REALTIME TOASTS --- */
  useEffect(() => {
    const fetchMode = async () => {
      // Check RPC availability first
      try {
          const { data, error } = await supabase.rpc('admin_get_stats');
          if (error) throw error;
          if (data?.site_mode) setAccessMode(data.site_mode);
      } catch (err) {
          console.warn("RPC admin_get_stats failed. Defaulting to OPEN mode.");
          setAccessMode("open");
      }
    };
    fetchMode();

    const sub = supabase.channel('site_settings_global_listener')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'site_settings' }, 
        (payload) => {
            console.log("[REALTIME] Payload Received:", payload); 

            if (payload.new) {
                // HANDLE SITE MODE CHANGE
                if (payload.new.setting_name === 'site_mode') {
                    const newMode = payload.new.setting_value;
                    setAccessMode(newMode); 
                    if (newMode === 'login') triggerToast("Admin enabled Private Access.", "alert");
                    else if (newMode === 'invite') triggerToast("System is now in Restricted Mode.", "alert");
                    else if (newMode === 'open') triggerToast("Open Access restored.", "success");
                }
                
                // HANDLE FORCE REFRESH TRIGGER
                if (payload.new.setting_name === 'force_refresh_trigger') {
                    console.log("FORCE REFRESH SIGNAL RECEIVED");
                    window.location.reload();
                }
            }
        }
      )
      .subscribe((status) => {
          setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });

    return () => supabase.removeChannel(sub);
  }, []);

  /* --- RENDER --- */
  if (blockedMessage) return <BlockedOverlay onLogout={handleForceLogout} />;
  
  const isGated = authReady && (accessMode === "login" || accessMode === "invite") && !session && !location.pathname.startsWith("/admin");
  const showGateLock = isGated || isVerifyingState;
  const showModal = showAuthModal || isGated || isVerifyingState;

  const NavItem = ({ to, label, icon: Icon }) => {
    const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
    return (
      <Link to={to} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={16} className="md:hidden" />
        <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30">
      
      {!authReady && <InitialLoader />}

      <AnimatePresence>
        {toast && <SecurityToast message={toast.msg} type={toast.type} />}
      </AnimatePresence>

      <ConnectionStatus status={realtimeStatus} />
      
      {authReady && (
        <>
          {showModal && (
            <AuthModal 
              onClose={() => setShowAuthModal(false)} 
              disableSignup={accessMode === "invite"} 
              onVerifying={(val) => {
                isVerifying.current = val;
                setIsVerifyingState(val);
              }}
            />
          )}

          <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl transition-all">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <PlayCircle size={20} fill="currentColor" />
                </div>
                <span className="font-black tracking-widest text-lg hidden sm:block">STREAM</span>
              </Link>

              <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <NavItem to="/" label="Library" icon={LayoutGrid} />
                <NavItem to="/forum" label="Forum" icon={MessageSquare} />
                {isAdmin && <NavItem to="/admin" label="Console" icon={Terminal} />}
              </nav>

              <div className="flex items-center gap-3">
                {session ? (
                   <button 
                     onClick={() => { localStorage.removeItem("studio_admin_active"); supabase.auth.signOut(); }} 
                     className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                     title="Sign Out"
                   >
                     <LogOut size={18} />
                   </button>
                ) : (
                   <button 
                     onClick={() => setShowAuthModal(true)} 
                     className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all hover:border-emerald-500/50 hover:text-emerald-400 flex items-center gap-2"
                   >
                     <span className="hidden sm:inline">Sign In</span>
                     <LogIn size={16} className="sm:hidden" />
                   </button>
                )}
              </div>
            </div>
          </header>

          <main className="pt-16 min-h-screen">
            {showGateLock ? (
              <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6">
                 <Lock size={48} className="text-slate-700 animate-pulse" />
                 <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Authentication Required</p>
              </div>
            ) : (
              <Routes>
                <Route 
                    path="/" 
                    element={
                        <ViewerPage 
                            videos={videos.filter(v => v.is_public !== false)} 
                            selected={selected}
                            setSelected={setSelected}
                            loading={loading} 
                            session={session} 
                            onOpenAuth={() => setShowAuthModal(true)}
                            search={viewerSearch}
                            setSearch={setViewerSearch}
                            onVideoPlayed={handleVideoView}
                        />
                    } 
                />

                <Route path="/forum" element={<ForumPage session={session} isAdminAuthed={isAdmin} onOpenAuth={() => setShowAuthModal(true)} />} />
                <Route path="/forum/:threadId" element={<ForumPage session={session} isAdminAuthed={isAdmin} onOpenAuth={() => setShowAuthModal(true)} />} />

                <Route 
                    path="/admin" 
                    element={
                        isAdmin ? (
                          <AdminPage 
                            videos={videos} 
                            selected={selected} 
                            setSelected={setSelected} 
                            loading={loading}
                            
                            search={adminSearch} 
                            setSearch={setAdminSearch} 
                            filterType={adminFilterType} 
                            setFilterType={setAdminFilterType}

                            extTitle={extTitle} setExtTitle={setExtTitle}
                            extDescription={extDescription} setExtDescription={setExtDescription}
                            extCategory={extCategory} setExtCategory={setExtCategory}
                            extUrl={extUrl} setExtUrl={setExtUrl}
                            extPosition={extPosition} setExtPosition={setExtPosition}
                            savingExternal={savingExternal}
                            onAddExternal={handleAddExternal}

                            upTitle={upTitle} setUpTitle={setUpTitle}
                            upTags={upTags} setUpTags={setUpTags}
                            setUpFile={setUpFile}
                            upPosition={upPosition} setUpPosition={setUpPosition}
                            uploading={uploading}
                            onUpload={handleUpload}

                            onUpdateVideo={onUpdateVideo} 
                            onTogglePublic={onTogglePublic} 
                            onToggleFeatured={onToggleFeatured} 
                            onDeleteVideo={onDeleteVideo} 
                            onReorder={onReorder} 
                            
                            onUpdateThumbnail={onUpdateThumbnail}
                            onRemoveThumbnail={onRemoveThumbnail}
                            onUploadCustomThumbnail={onUploadCustomThumbnail}

                            isAdminAuthed={isAdmin} 
                            onAdminLogin={() => { setIsAdmin(true); localStorage.setItem("studio_admin_active", "true"); }}
                          />
                        ) : <Navigate to="/" replace />
                    } 
                />
              </Routes>
            )}
          </main>
        </>
      )}
    </div>
  );
}
