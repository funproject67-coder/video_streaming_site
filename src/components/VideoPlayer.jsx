/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * VideoPlayer — Clean Cinematic Engine
 * Strictly handles playback and native events.
 * Optimized for standard MP4/WebM external links.
 */
export default function VideoPlayer({ video, onPlayed }) {
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const {
    id: videoId,
    source_type,
    public_url,
    file_url,
    external_url,
    thumbnail_url,
  } = video || {};

  const src = source_type === "uploaded" ? public_url || file_url || "" : external_url || "";

  useEffect(() => {
    setReported(false);
    setIsPlaying(false);
  }, [videoId]);

  const handlePlayEvent = useCallback(() => {
    if (!reported && typeof onPlayed === "function" && videoId) {
      try { onPlayed(videoId); } catch (err) { console.warn("onPlayed error:", err); }
      setReported(true);
    }
    setIsPlaying(true);
  }, [reported, onPlayed, videoId]);

  const handlePauseEvent = useCallback(() => setIsPlaying(false), []);
  const handlePlayingEvent = useCallback(() => setIsPlaying(true), []);
  const handleEndedEvent = useCallback(() => setIsPlaying(false), []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
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

  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.paused) await el.play(); else el.pause();
    } catch (err) { console.warn("togglePlay failed:", err); }
  }, []);

  const handleKeyboardAction = useCallback((e) => {
    const el = videoRef.current;
    if (!el) return false;
    const active = document.activeElement;
    if (active && (active.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName))) return false;

    const key = e.key;
    if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Enter"].includes(key)) e.preventDefault();

    try {
      if (key === " " || key === "Enter") {
        if (el.paused) el.play(); else el.pause();
        return true;
      }
      switch (key) {
        case "ArrowRight": el.currentTime += 5; return true;
        case "ArrowLeft": el.currentTime -= 5; return true;
        case "ArrowUp": el.volume = Math.min(1, el.volume + 0.05); return true;
        case "ArrowDown": el.volume = Math.max(0, el.volume - 0.05); return true;
        default: return false;
      }
    } catch { return false; }
  }, []);

  useEffect(() => {
    const onKey = (e) => handleKeyboardAction(e);
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKeyboardAction]);

  if (!video) return null;

  return (
    // Removed 'ring-1' from container to prevent layout shifting
    <div className="relative w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl group select-none outline-none">
      
      {/* Decorative Border Overlay (Ensures perfect edge alignment) */}
      <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/10 pointer-events-none z-30" />

      <video
        ref={videoRef}
        controls
        playsInline 
        preload="metadata" 
        // Changed to object-cover to eliminate side gaps
        className="w-full h-full block object-cover shadow-none outline-none"
        src={src}
        poster={thumbnail_url || undefined}
      >
        Your browser does not support the video tag.
      </video>

      {!isPlaying && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 cursor-pointer transition-all duration-500 hover:bg-black/20"
        >
          {/* Reduced Button Size: w-14 h-14 */}
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] transform transition-transform duration-300 hover:scale-110 active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
