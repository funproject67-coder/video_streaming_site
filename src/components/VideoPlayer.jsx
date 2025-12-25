/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * VideoPlayer — Clean Cinematic Engine
 * Integrated Features:
 * 1. Base: Native Events, Keyboard, Optimization
 * 2. Gestures: Double Tap (10s), Hold (Smooth Rewind/Forward)
 * 3. UI: Clean Floating Feedback (No dark background boxes)
 */
export default function VideoPlayer({ video, onPlayed }) {
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // --- GESTURE STATE ---
  const [skippingMode, setSkippingMode] = useState(null); // 'rewind' | 'forward'
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);

  const videoRef = useRef(null);
  
  // --- GESTURE REFS ---
  const animationRef = useRef(null); 
  const wasPlayingRef = useRef(false); 
  const holdTimerRef = useRef(null); 
  const lastTapTimeRef = useRef(0); 
  const isHoldingRef = useRef(false); 

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
    setSkippingMode(null);
    setDoubleTapFeedback(null);
  }, [videoId]);

  // --- EVENTS ---
  const handlePlayEvent = useCallback(() => {
    if (!reported && typeof onPlayed === "function" && videoId) {
      try { onPlayed(videoId); } catch (err) { console.warn("onPlayed error:", err); }
      setReported(true);
    }
    setIsPlaying(true);
  }, [reported, onPlayed, videoId]);

  const handlePauseEvent = useCallback(() => setIsPlaying(false), []);
  const handlePlayingEvent = useCallback(() => setIsPlaying(true), []);
  const handleEndedEvent = useCallback(() => {
    setIsPlaying(false);
    setSkippingMode(null);
  }, []);

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

  // --- CONTROLS ---
  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.paused) await el.play(); else el.pause();
    } catch (err) { console.warn("togglePlay failed:", err); }
  }, []);

  // --- KEYBOARD ---
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

  // ==========================================
  //  GESTURE LOGIC
  // ==========================================
  
  const startHoldAction = (direction) => {
    const el = videoRef.current;
    if (!el) return;

    isHoldingRef.current = true;
    wasPlayingRef.current = !el.paused;
    setSkippingMode(direction);

    if (direction === 'forward') {
        // SMOOTH FORWARD (Native)
        el.playbackRate = 4.0;
        if (el.paused) el.play();
    } else {
        // SMOOTH REWIND (Frame Loop)
        el.playbackRate = 1.0;
        el.pause();
        const smoothRewind = () => {
            el.currentTime = Math.max(0, el.currentTime - 0.08);
            if (el.currentTime > 0) animationRef.current = requestAnimationFrame(smoothRewind);
        };
        animationRef.current = requestAnimationFrame(smoothRewind);
    }
  };

  const endHoldAction = () => {
    const el = videoRef.current;
    if (!el) return;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    el.playbackRate = 1.0;
    
    if (wasPlayingRef.current) el.play().catch(() => {});
    else el.pause();

    setSkippingMode(null);
    setTimeout(() => { isHoldingRef.current = false; }, 100);
  };

  const handleInteractionStart = (direction) => {
    holdTimerRef.current = setTimeout(() => {
        startHoldAction(direction);
    }, 500);
  };

  const handleInteractionEnd = (direction) => {
    if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
    }

    if (isHoldingRef.current) {
        endHoldAction();
        return;
    }

    // Double Tap Logic
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
        const el = videoRef.current;
        if (el) {
            const time = direction === 'forward' ? 10 : -10;
            el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + time));
            setDoubleTapFeedback(direction);
            setTimeout(() => setDoubleTapFeedback(null), 600);
        }
    }
    lastTapTimeRef.current = now;
  };

  if (!video) return null;

  return (
    <div className="relative w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl group select-none outline-none">
      
      {/* Decorative Border Overlay */}
      <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/10 pointer-events-none z-50" />

      <video
        ref={videoRef}
        controls
        playsInline 
        preload="metadata" 
        className="w-full h-full block object-cover shadow-none outline-none"
        src={src}
        poster={thumbnail_url || undefined}
      >
        Your browser does not support the video tag.
      </video>

      {/* --- LEFT ZONE (Rewind) --- */}
      <div 
        className="absolute top-0 left-0 bottom-16 w-[25%] z-40 cursor-pointer select-none"
        onMouseDown={() => handleInteractionStart('rewind')}
        onMouseUp={() => handleInteractionEnd('rewind')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('rewind')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('rewind'); }}
      >
        {/* Clean Floating Feedback (Left) - No Background Box */}
        <div className={`absolute inset-0 flex items-center justify-start pl-12 transition-opacity duration-300 ${skippingMode === 'rewind' ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex flex-col items-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
                <div className="flex text-emerald-400 animate-pulse mb-2 scale-125">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Rewinding</span>
             </div>
        </div>
        {/* Tap Feedback */}
        {doubleTapFeedback === 'rewind' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                    <span className="text-xl font-black text-white drop-shadow-md">-10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- RIGHT ZONE (Forward) --- */}
      <div 
        className="absolute top-0 right-0 bottom-16 w-[25%] z-40 cursor-pointer select-none"
        onMouseDown={() => handleInteractionStart('forward')}
        onMouseUp={() => handleInteractionEnd('forward')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('forward')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('forward'); }}
      >
        {/* Clean Floating Feedback (Right) - No Background Box */}
        <div className={`absolute inset-0 flex items-center justify-end pr-12 transition-opacity duration-300 ${skippingMode === 'forward' ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex flex-col items-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
                <div className="flex text-emerald-400 animate-pulse mb-2 scale-125">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">4x Speed</span>
             </div>
        </div>
        {/* Tap Feedback */}
        {doubleTapFeedback === 'forward' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                    <span className="text-xl font-black text-white drop-shadow-md">+10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- CENTER PLAY OVERLAY --- */}
      {!isPlaying && !skippingMode && (
        <div 
          onClick={togglePlay}
          className="absolute top-0 left-[25%] right-[25%] bottom-16 z-30 flex items-center justify-center cursor-pointer bg-transparent"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.5)] transform transition-transform duration-300 hover:scale-110 active:scale-95 hover:bg-emerald-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
