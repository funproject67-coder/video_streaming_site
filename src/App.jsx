import React, { useCallback, useEffect, useState, memo } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";
import ForumPage from "./components/ForumPage";

import {
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
} from "./utils/thumbnails";

const VIDEO_BUCKET = "videos";

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
    AUTH MODAL
------------------------------------------------------- */
const AuthModal = ({ onClose, initialMode = "signin" }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    mode: initialMode,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.fullName, role: "user" } },
        });
        if (error) throw error;
        alert("Account created! Please sign in.");
        setFormData((p) => ({ ...p, mode: "signin" }));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-white uppercase text-center mb-6">
          {formData.mode === "signin" ? "Welcome Back" : "Join Studio"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.mode === "signup" && (
            <input
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="Display Name"
              className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white"
              required
            />
          )}

          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Email"
            className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white"
            required
          />

          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="Password"
            className="w-full p-4 rounded-xl bg-slate-900 border border-white/10 text-white"
            required
          />

          {error && (
            <div className="text-rose-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-emerald-500 text-slate-950 font-black uppercase tracking-widest"
          >
            {loading ? "..." : formData.mode === "signin" ? "Login" : "Register"}
          </button>
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

  const location = useLocation();

  /* -------- AUTH SYNC -------- */
  useEffect(() => {
    const syncAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsAdmin(data.session?.user?.user_metadata?.role === "admin");
    };

    syncAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, session) => {
        setSession(session);
        setIsAdmin(session?.user?.user_metadata?.role === "admin");
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  /* -------- FETCH VIDEOS -------- */
  const fetchVideos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;

      const processed = (data || []).map((v) => ({
        ...v,
        public_url: v.file_path
          ? getPublicUrlForVideoPath(v.file_path)
          : v.external_url || "",
        thumbnail_url: v.thumbnail_path
          ? getPublicUrlForThumbPath(v.thumbnail_path)
          : null,
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
    const channel = supabase
      .channel("videos-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => fetchVideos(true)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchVideos]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pt-16">
      <AnimatePresence>{initialLoad && <InitialLoader />}</AnimatePresence>
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[60] h-16 px-4 md:px-8 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
            S
          </div>
        </div>

        <nav className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
          <Link
            to="/"
            className={`px-4 py-1 text-[10px] font-bold uppercase ${
              location.pathname === "/"
                ? "bg-emerald-500 text-slate-950 rounded-full"
                : "text-slate-400"
            }`}
          >
            Video
          </Link>

          <Link
            to="/forum"
            className={`px-4 py-1 text-[10px] font-bold uppercase ${
              location.pathname.startsWith("/forum")
                ? "bg-emerald-500 text-slate-950 rounded-full"
                : "text-slate-400"
            }`}
          >
            Forum
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={`px-4 py-1 text-[10px] font-bold uppercase ${
                location.pathname.startsWith("/admin")
                  ? "bg-emerald-500 text-slate-950 rounded-full"
                  : "text-slate-400"
              }`}
            >
              Console
            </Link>
          )}
        </nav>

        {session ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 text-slate-400 hover:text-rose-500"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase"
          >
            Sign In
          </button>
        )}
      </header>

      {/* ROUTES */}
      <Routes>
        <Route
          path="/"
          element={
            <ViewerPage
              videos={videos.filter((v) => v.is_public !== false)}
              loading={loading}
              fetchError={fetchError}
              search={search}
              setSearch={setSearch}
              filterType={filterType}
              setFilterType={setFilterType}
              session={session}
              onOpenAuth={() => setShowAuthModal(true)}
              onVideoPlayed={(id) =>
                supabase.rpc("increment_view_count", { video_id: id })
              }
            />
          }
        />

        <Route
          path="/forum"
          element={
            <ForumPage
              isAdminAuthed={isAdmin}
              session={session}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          }
        />
        <Route
          path="/forum/:threadId"
          element={
            <ForumPage
              isAdminAuthed={isAdmin}
              session={session}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          }
        />

        <Route
          path="/admin"
          element={
            isAdmin ? (
              <AdminPage
                videos={videos}
                selected={selected}
                setSelected={setSelected}
                loading={loading}
                isAdminAuthed={isAdmin}
              />
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-slate-500 font-bold">
                Admin access required
              </div>
            )
          }
        />
      </Routes>
    </div>
  );
}
