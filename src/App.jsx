/* eslint-disable no-irregular-whitespace */
import React, { useCallback, useEffect, useState, memo } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ShieldAlert, Lock, UserPlus } from "lucide-react";

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";
import ForumPage from "./components/ForumPage";

import {
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
} from "./utils/thumbnails";

/* -------------------------------------------------------
    INITIAL SPLASH SCREEN
------------------------------------------------------- */
const InitialLoader = memo(() => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.05, filter: "blur(15px)" }}
    transition={{ duration: 0.8 }}
    className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center pointer-events-none"
  >
    <div className="w-24 h-24 bg-[#0B1120] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
      <span className="text-5xl font-black text-white">S</span>
    </div>
    <div className="mt-8 text-white font-black tracking-[0.5em] uppercase text-[10px] animate-pulse">
      Stream Studio
    </div>
  </motion.div>
));

/* -------------------------------------------------------
    BLOCKED OVERLAY (HARD LOCK SCREEN)
------------------------------------------------------- */
const BlockedOverlay = ({ message, icon: Icon = ShieldAlert }) => (
  <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center">
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8 max-w-md text-center">
      <Icon className="mx-auto mb-4 text-rose-500" size={44} />
      <h2 className="text-xl font-black text-rose-400 uppercase mb-3">
        Access Restricted
      </h2>
      <p className="text-slate-300 text-sm leading-relaxed">
        {message}
      </p>
    </div>
  </div>
);

/* -------------------------------------------------------
    AUTH MODAL
------------------------------------------------------- */
const AuthModal = ({ onClose, initialMode = "signin", disableSignup = false }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    mode: initialMode,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (disableSignup && formData.mode === "signup") {
      setFormData(prev => ({ ...prev, mode: "signin" }));
    }
  }, [disableSignup, formData.mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.mode === "signup") {
        if (disableSignup) throw new Error("New registrations are currently disabled.");
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.fullName, role: "user" } },
        });
        if (error) throw error;
        alert("Account created! Please sign in.");
        setFormData((p) => ({ ...p, mode: "signin" }));
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_blocked")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.is_blocked) {
          await supabase.auth.signOut();
          throw new Error("Your account has been restricted by an administrator.");
        }
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0B1120] border border-white/10 rounded-3xl p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        <h2 className="text-2xl font-black text-white uppercase text-center mb-6">
          {formData.mode === "signin" ? "Welcome Back" : "Join Studio"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.mode === "signup" && (
            <input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Display Name" className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white" required />
          )}
          <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white" required />
          <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Password" className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white" required />
          {error && <div className="text-rose-400 text-xs font-bold text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-slate-950 font-black uppercase tracking-widest">
            {loading ? "..." : formData.mode === "signin" ? "Login" : "Register"}
          </button>
          {!disableSignup && (
            <button type="button" onClick={() => setFormData(p => ({ ...p, mode: p.mode === 'signin' ? 'signup' : 'signin' }))} className="w-full text-[10px] text-slate-500 uppercase font-black tracking-widest hover:text-white transition-colors">
              {formData.mode === 'signin' ? "Need an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------
    MAIN APP
------------------------------------------------------- */
export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [blockedMessage, setBlockedMessage] = useState(null);
  
  // Aligned with site_settings table and AdminPage.jsx logic
  const [accessMode, setAccessMode] = useState("open"); 

  const location = useLocation();

  /* -------- AUTH SYNC -------- */
  useEffect(() => {
    const syncAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsAdmin(data.session?.user?.user_metadata?.role === "admin");
    };
    syncAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSession(session);
      setIsAdmin(session?.user?.user_metadata?.role === "admin");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* -------- GLOBAL SETTINGS SYNC (site_settings) -------- */
  useEffect(() => {
    const fetchSettings = async () => {
      // Logic adjusted to match the site_settings table structure
      const { data } = await supabase.from("site_settings").select("setting_value").eq("setting_name", "access_mode").single();
      if (data) setAccessMode(data.setting_value);
    };

    fetchSettings();

    // Listen for real-time security mode changes
    const channel = supabase
      .channel("site-settings-sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_settings", filter: "setting_name=eq.access_mode" }, 
        (payload) => setAccessMode(payload.new.setting_value)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* -------- REALTIME BLOCK ENFORCEMENT -------- */
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`profile-block-${session.user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
        (payload) => {
          if (payload.new?.is_blocked) {
            setBlockedMessage("Your access has been restricted by an administrator.");
            document.querySelectorAll("video,audio").forEach((el) => {
              try { el.pause(); el.removeAttribute("src"); el.load(); } catch {}
            });
            setTimeout(async () => { await supabase.auth.signOut(); setSession(null); }, 1500);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  /* -------- FETCH VIDEOS -------- */
  const fetchVideos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.from("videos").select("*").order("order_index", { ascending: true });
      if (error) throw error;
      const processed = (data || []).map((v) => ({
        ...v,
        public_url: v.file_path ? getPublicUrlForVideoPath(v.file_path) : v.external_url || "",
        thumbnail_url: v.thumbnail_path ? getPublicUrlForThumbPath(v.thumbnail_path) : null,
      }));
      setVideos(processed);
      if (!selected && processed.length > 0) setSelected(processed[0]);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchVideos();
    const channel = supabase.channel("videos-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => fetchVideos(true))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchVideos]);

  /* -------- GATE LOGIC -------- */
  if (blockedMessage) return <BlockedOverlay message={blockedMessage} />;

  // login_required (now 'login' from admin) | existing_only (now 'invite' from admin)
  const isGated = accessMode === "login" || accessMode === "invite";
  const showGate = isGated && !session && location.pathname !== "/admin";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pt-16">
      <AnimatePresence>{initialLoad && <InitialLoader />}</AnimatePresence>
      <AnimatePresence>
        {(showAuthModal || showGate) && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            disableSignup={accessMode === "invite"} // If restricted, registrations are off
          />
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 z-[60] h-16 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">S</Link>
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 rounded-full p-1 border border-white/5">
            <Link to="/" className={`px-4 py-1 text-[10px] font-bold uppercase ${location.pathname === "/" ? "bg-emerald-500 text-slate-950 rounded-full" : "text-slate-400"}`}>Video</Link>
            <Link to="/forum" className={`px-4 py-1 text-[10px] font-bold uppercase ${location.pathname.startsWith("/forum") ? "bg-emerald-500 text-slate-950 rounded-full" : "text-slate-400"}`}>Forum</Link>
            {isAdmin && (
              <Link to="/admin" className={`px-4 py-1 text-[10px] font-bold uppercase ${location.pathname.startsWith("/admin") ? "bg-emerald-500 text-slate-950 rounded-full" : "text-slate-400"}`}>Console</Link>
            )}
          </nav>
          {session ? (
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-rose-500"><LogOut size={18} /></button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">Sign In</button>
          )}
        </div>
      </header>

      {showGate ? (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
          <Lock className="text-slate-700 mb-4" size={48} />
          <h2 className="text-xl font-black uppercase text-slate-400">Restricted Content</h2>
          <p className="text-slate-600 text-sm mt-2">Authentication is required to view the studio library.</p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<ViewerPage videos={videos.filter((v) => v.is_public !== false)} loading={loading} fetchError={fetchError} search={search} setSearch={setSearch} filterType={filterType} setFilterType={setFilterType} session={session} onOpenAuth={() => setShowAuthModal(true)} onVideoPlayed={(id) => supabase.rpc("increment_view_count", { video_id: id })} />} />
          <Route path="/forum" element={<ForumPage key={location.pathname} isAdminAuthed={isAdmin} session={session} onOpenAuth={() => setShowAuthModal(true)} />} />
          <Route path="/forum/:threadId" element={<ForumPage key={location.pathname} isAdminAuthed={isAdmin} session={session} onOpenAuth={() => setShowAuthModal(true)} />} />
          <Route path="/admin" element={isAdmin ? <AdminPage videos={videos} selected={selected} setSelected={setSelected} loading={loading} isAdminAuthed={isAdmin} /> : <div className="flex items-center justify-center h-[60vh] text-slate-500 font-bold">Admin access required</div>} />
        </Routes>
      )}
    </div>
  );
}
