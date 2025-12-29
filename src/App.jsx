/* eslint-disable no-irregular-whitespace */
import React, { useCallback, useEffect, useState, memo } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { motion } from "framer-motion";
import { LogOut, ShieldAlert, Lock } from "lucide-react";

import ViewerPage from "./components/ViewerPage";
import AdminPage from "./components/AdminPage";
import ForumPage from "./components/ForumPage";

import {
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
} from "./utils/thumbnails";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
const checkIfBlocked = async (userId) => {
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", userId)
      .single();
    return data?.is_blocked === true;
  } catch {
    return false;
  }
};

/* -------------------------------------------------------
   UI COMPONENTS
------------------------------------------------------- */
const InitialLoader = memo(() => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]"
  >
    <div className="text-white font-black tracking-[0.45em] text-lg">
      STREAM STUDIO
    </div>
  </motion.div>
));

const BlockedOverlay = ({ message }) => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-xl">
    <div className="max-w-md rounded-3xl border border-rose-500/20 bg-slate-900/70 p-8 text-center shadow-2xl">
      <ShieldAlert className="mx-auto mb-5 text-rose-500" size={48} />
      <h2 className="mb-3 text-xl font-black uppercase tracking-widest text-rose-400">
        Access Restricted
      </h2>
      <p className="text-sm leading-relaxed text-slate-300">{message}</p>
    </div>
  </div>
);

/* -------------------------------------------------------
   AUTH MODAL
------------------------------------------------------- */
const AuthModal = ({ onClose, disableSignup }) => {
  const [name, setName] = useState("");       // ✅ FIXED
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
        if (disableSignup) throw new Error("Signup disabled");

        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        setMode("signin");
        setName("");
        alert("Account created. Please login.");
        return;
      }

      const { data, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      const blocked = await checkIfBlocked(data.user.id);
      if (blocked) {
        await supabase.auth.signOut();
        setError("Blocked by admin");
        return;
      }

      onClose();
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-80 space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl"
      >
        <h2 className="text-center text-lg font-black tracking-widest text-white">
          {mode === "signin" ? "SIGN IN" : "SIGN UP"}
        </h2>

        {mode === "signup" && (
          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white outline-none focus:border-emerald-500/50"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white outline-none focus:border-emerald-500/50"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white outline-none focus:border-emerald-500/50"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-xs text-rose-400">{error}</div>}

        <button className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-black uppercase tracking-widest text-slate-950 hover:bg-emerald-400">
          {loading ? "..." : "Submit"}
        </button>

        {!disableSignup && (
          <button
            type="button"
            className="w-full text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create account" : "Back to login"}
          </button>
        )}
      </motion.form>
    </div>
  );
};

/* -------------------------------------------------------
   MAIN APP
------------------------------------------------------- */
export default function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [accessMode, setAccessMode] = useState("open");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const location = useLocation();

  /* ---------- AUTH ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setIsAdmin(data.session.user.user_metadata?.role === "admin");
      }
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setIsAdmin(s?.user?.user_metadata?.role === "admin");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- REALTIME BLOCK ---------- */
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase
      .channel(`block-${session.user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        table: "profiles",
        filter: `id=eq.${session.user.id}`,
      }, async (p) => {
        if (p.new.is_blocked) {
          await supabase.auth.signOut();
          setBlockedMessage("Blocked by administrator");
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  /* ---------- SITE MODE ---------- */
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_name", "access_mode")
      .maybeSingle()
      .then(({ data }) => data && setAccessMode(data.setting_value));
  }, []);

  /* ---------- VIDEOS ---------- */
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .order("order_index");
      const v = (data || []).map((x) => ({
        ...x,
        public_url: x.file_path
          ? getPublicUrlForVideoPath(x.file_path)
          : x.external_url,
        thumbnail_url: x.thumbnail_path
          ? getPublicUrlForThumbPath(x.thumbnail_path)
          : null,
      }));
      setVideos(v);
      if (!selected && v.length) setSelected(v[0]);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchVideos();
    const ch = supabase
      .channel("videos")
      .on("postgres_changes", { event: "*", table: "videos" }, fetchVideos)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchVideos]);

  /* ---------- ADMIN CALLBACKS ---------- */
  const onUpdateVideo = (id, payload) =>
    supabase.from("videos").update(payload).eq("id", id);
  const onTogglePublic = (v) =>
    supabase.from("videos").update({ is_public: !v.is_public }).eq("id", v.id);
  const onToggleFeatured = (v) =>
    supabase.from("videos")
      .update({ is_featured: !v.is_featured })
      .eq("id", v.id);
  const onDeleteVideo = (v) =>
    supabase.from("videos").delete().eq("id", v.id);
  const onReorder = (p) => supabase.from("videos").upsert(p);

  if (blockedMessage) return <BlockedOverlay message={blockedMessage} />;

  const gated =
    authReady &&
    (accessMode === "login" || accessMode === "invite") &&
    !session &&
    !location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {!authReady && <InitialLoader />}

      {authReady && (
        <>
          {(gated || showAuthModal) && (
            <AuthModal
              onClose={() => setShowAuthModal(false)}
              disableSignup={accessMode === "invite"}
            />
          )}

          <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
              <Link to="/" className="font-black tracking-widest">STREAM</Link>

              <nav className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Link to="/" className="hover:text-white">Video</Link>
                <Link to="/forum" className="hover:text-white">Forum</Link>
                {isAdmin && <Link to="/admin" className="hover:text-white">Console</Link>}
              </nav>

              {session ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg border border-white/10 p-2 hover:bg-white/5"
                >
                  <LogOut size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-white/5"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          <main className="pt-16">
            {gated ? (
              <div className="flex h-[70vh] items-center justify-center">
                <Lock size={42} className="text-slate-600" />
              </div>
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={
                    <ViewerPage
                      videos={videos.filter((v) => v.is_public !== false)}
                      loading={loading}
                      fetchError={fetchError}
                      session={session}
                      search={search}
                      setSearch={setSearch}
                      filterType={filterType}
                      setFilterType={setFilterType}
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
                      session={session}
                      isAdminAuthed={isAdmin}
                      onOpenAuth={() => setShowAuthModal(true)}
                    />
                  }
                />
                <Route
                  path="/forum/:threadId"
                  element={
                    <ForumPage
                      session={session}
                      isAdminAuthed={isAdmin}
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
                        rawVideos={videos}
                        selected={selected}
                        setSelected={setSelected}
                        loading={loading}
                        search={search}
                        setSearch={setSearch}
                        filterType={filterType}
                        setFilterType={setFilterType}
                        onUpdateVideo={onUpdateVideo}
                        onTogglePublic={onTogglePublic}
                        onToggleFeatured={onToggleFeatured}
                        onDeleteVideo={onDeleteVideo}
                        onReorder={onReorder}
                        isAdminAuthed={isAdmin}
                      />
                    ) : (
                      <Navigate to="/" replace />
                    )
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
