/* eslint-disable react-hooks/rules-of-hooks */
// src/components/VideoPlayer.jsx
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * VideoPlayer — fixed overlay visibility (overlay only visible when paused/not started)
 * - Keeps keyboard handlers, global listener while mounted.
 * - Ensures overlay hides as soon as video is playing (syncs with native events).
 */

export default function VideoPlayer({ video, onPlayed }) {
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const {
    id: videoId,
    title: videoTitle,
    description: videoDesc,
    source_type,
    public_url,
    file_url,
    external_url,
    thumbnail_url,
    view_count,
    duration,
  } = video || {};

  const views = Number(view_count || 0);
  const src = source_type === "uploaded" ? public_url || file_url || "" : external_url || "";

  // reset UI state when video changes
  useEffect(() => {
    setReported(false);
    setIsPlaying(false);
  }, [videoId]);

  if (!video) return null;

  // === Native event handlers and syncing ===
  const handlePlayEvent = useCallback(() => {
    if (!reported && typeof onPlayed === "function" && videoId) {
      try {
        onPlayed(videoId);
      } catch (err) {
        // don't break UI if parent throws
        // eslint-disable-next-line no-console
        console.warn("onPlayed error:", err);
      }
      setReported(true);
    }
    setIsPlaying(true);
  }, [reported, onPlayed, videoId]);

  const handlePauseEvent = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handlePlayingEvent = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleEndedEvent = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;

    // sync initial state
    try {
      setIsPlaying(!el.paused && !el.ended);
    } catch { /* empty */ }

    el.addEventListener("play", handlePlayEvent);
    el.addEventListener("playing", handlePlayingEvent);
    el.addEventListener("pause", handlePauseEvent);
    el.addEventListener("ended", handleEndedEvent);

    return () => {
      el.removeEventListener("play", handlePlayEvent);
      el.removeEventListener("playing", handlePlayingEvent);
      el.removeEventListener("pause", handlePauseEvent);
      el.removeEventListener("ended", handleEndedEvent);
    };
  }, [handlePlayEvent, handlePlayingEvent, handlePauseEvent, handleEndedEvent]);

  // === Toggle playback ===
  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("togglePlay failed:", err);
    }
  }, []);

  // === Keyboard handling (shared) ===
  const handleKeyboardAction = useCallback((e) => {
    const el = videoRef.current;
    if (!el) return false;

    // ignore when typing in inputs
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName;
      const isEditable = active.isContentEditable;
      if (isEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
    }

    const key = e.key;
    const code = e.code;
    const isSpace = key === " " || key === "Spacebar" || code === "Space";

    const handledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Escape", "Enter"];
    if (isSpace || handledKeys.includes(key)) {
      try { e.preventDefault(); } catch { /* empty */ }
    }

    try {
      if (isSpace || key === "Enter") {
        if (el.paused) el.play(); else el.pause();
        return true;
      }
      switch (key) {
        case "ArrowRight":
          el.currentTime = Math.min(el.duration || Infinity, el.currentTime + 5);
          return true;
        case "ArrowLeft":
          el.currentTime = Math.max(0, el.currentTime - 5);
          return true;
        case "ArrowUp":
          el.volume = Math.min(1, (el.volume || 0) + 0.05);
          return true;
        case "ArrowDown":
          el.volume = Math.max(0, (el.volume || 0) - 0.05);
          return true;
        case "Home":
          el.currentTime = 0;
          return true;
        case "End":
          if (el.duration) el.currentTime = el.duration;
          return true;
        case "Escape":
          el.pause();
          return true;
        default:
          return false;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("keyboard action error:", err);
      return false;
    }
  }, []);

  const onContainerKeyDown = useCallback((e) => {
    handleKeyboardAction(e);
  }, [handleKeyboardAction]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t) {
        const tag = t.tagName;
        const isEditable = t.isContentEditable;
        if (isEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      handleKeyboardAction(e);
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKeyboardAction]);

  // === Share helper ===
  const handleShare = useCallback(async () => {
    if (!src) {
      // eslint-disable-next-line no-alert
      alert("No shareable URL available.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: videoTitle || "Video", text: videoDesc || "", url: src });
        return;
      } catch (err) {
        if (err && err.name !== "AbortError") console.warn("navigator.share failed:", err);
      }
    }
    try {
      await navigator.clipboard.writeText(src);
      // eslint-disable-next-line no-alert
      alert("Link copied to clipboard");
    } catch {
       
      prompt("Copy this link:", src);
    }
  }, [src, videoTitle, videoDesc]);

  // overlay visibility: show when NOT playing
  const overlayVisible = !isPlaying;

  return (
    <div className="relative space-y-3">
      {/* player container */}
      <div
        ref={containerRef}
        role="group"
        tabIndex={0}
        onKeyDown={onContainerKeyDown}
        aria-label={`Video player for ${videoTitle || "video"}. Controls: Space/Enter to play, Arrow keys to seek/volume.`}
        className="relative rounded-xl overflow-hidden focus:outline-none"
        style={{
          outline: "none",
          boxShadow: "0 10px 30px rgba(2,6,23,0.6), inset 0 0 20px rgba(0,212,255,0.02)",
        }}
      >
        <video
          ref={videoRef}
          controls
          className="w-full h-full bg-black block"
          src={src}
          poster={thumbnail_url || undefined}
          style={{ outline: "none", boxShadow: "none" }}
        >
          Your browser does not support the video tag.
        </video>

        {/* overlay play button: hidden/removed from pointer flow when playing */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={overlayVisible ? "Play video" : "Video playing"}
          aria-hidden={!overlayVisible}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            background: "rgba(3,7,18,0.6)",
            padding: 10,
            backdropFilter: "blur(6px)",
            // hide visually and from pointer events when playing
            opacity: overlayVisible ? 1 : 0,
            transform: overlayVisible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.9)",
            pointerEvents: overlayVisible ? "auto" : "none",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="11" stroke="rgba(63,94,251,0.12)" strokeWidth="1.1" />
            <path d="M10 8L16 12L10 16V8Z" fill="white" />
          </svg>
        </button>
      </div>

      {/* metadata & actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-semibold truncate">{videoTitle}</h2>

          {videoDesc && (
            <p className="text-xs text-slate-300 mt-1" style={{ lineHeight: 1.25 }}>
              {videoDesc.length > 220 ? `${videoDesc.slice(0, 220).trim()}…` : videoDesc}
            </p>
          )}

          <div className="mt-2 text-[12px] text-slate-400 flex items-center gap-3">
            <span className="px-2 py-0.5 bg-white/3 rounded text-[11px]">{source_type === "external" ? "External" : "Uploaded"}</span>
            {typeof duration === "number" ? (
              <span className="text-[11px]">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</span>
            ) : null}
            <span className="text-[11px]">{views.toLocaleString()} views</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-slate-900 border"
            type="button"
            aria-label="Share video link"
            style={{ borderColor: "rgba(63,94,251,0.12)" }}
          >
            🔗 Share
          </button>

          <div className="text-[12px] text-slate-400">
            <strong className="font-mono text-xs text-sky-300">{views.toLocaleString()}</strong> views
          </div>
        </div>
      </div>
    </div>
  );
}
