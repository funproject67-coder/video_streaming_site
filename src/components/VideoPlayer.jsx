/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * VideoPlayer — Clean Cinematic Engine
 * Features: 
 * 1. ADDED: Space Bar to Play/Pause
 * 2. Transparent Floating Feedback (No rectangles/gradients)
 * 3. Smaller, Sleek Center Play Button
 * 4. Dual-Layer Colored Progress Bar
 * 5. Advanced Gestures & Buffering
 */
export default function VideoPlayer({ video, onPlayed }) {
  // --- STATE ---
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // --- METRICS ---
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // --- GESTURES ---
  const [skippingMode, setSkippingMode] = useState(null); 
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);

  // --- REFS ---
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const animationRef = useRef(null); 
  const wasPlayingRef = useRef(false); 
  const wasMutedRef = useRef(false); 
  const holdTimerRef = useRef(null); 
  const lastTapTimeRef = useRef(0); 
  const isHoldingRef = useRef(false); 

  const { id: videoId, source_type, public_url, file_url, external_url, thumbnail_url } = video || {};
  const src = source_type === "uploaded" ? public_url || file_url || "" : external_url || "";

  // --- INIT ---
  useEffect(() => {
    setReported(false);
    setIsPlaying(false);
    setIsBuffering(true); 
    setSkippingMode(null);
    setDoubleTapFeedback(null);
    setProgress(0);
  }, [videoId]);

  // --- CONTROLS ---
  const togglePlay = useCallback(async (e) => {
    // e is optional here
    const el = videoRef.current;
    if (!el) return;
    try { if (el.paused) await el.play(); else el.pause(); } catch (err) {}
  }, []);

  // --- KEYBOARD LISTENER (SPACE BAR) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        // Check if the active element is an input field (to allow typing)
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

        if (e.code === "Space") {
            e.preventDefault(); // Prevent page scroll
            togglePlay();
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  // --- UI TOGGLE ---
  const showUI = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !skippingMode) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, skippingMode]);

  const toggleUI = useCallback(() => {
    if (showControls && isPlaying) setShowControls(false);
    else showUI();
  }, [showControls, isPlaying, showUI]);

  // --- FULLSCREEN ---
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
        const isFs = !!document.fullscreenElement;
        setIsFullscreen(isFs);
        if (isFs && window.screen?.orientation?.lock) window.screen.orientation.lock("landscape").catch(() => {});
        else if (!isFs && window.screen?.orientation?.unlock) window.screen.orientation.unlock();
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // --- VIDEO LOGIC ---
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (el) {
        setCurrentTime(el.currentTime);
        setProgress((el.currentTime / el.duration) * 100 || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    const el = videoRef.current;
    if (el) {
        const newTime = (val / 100) * el.duration;
        el.currentTime = newTime;
        setProgress(val);
        showUI();
    }
  };

  const handlePlayEvent = useCallback(() => {
    if (!reported && typeof onPlayed === "function" && videoId) {
        try { onPlayed(videoId); } catch (err) {}
        setReported(true);
    }
    setIsPlaying(true);
    setIsBuffering(false);
  }, [reported, onPlayed, videoId]);

  const handlePauseEvent = useCallback(() => { setIsPlaying(false); setIsBuffering(false); }, []);
  const handleWaiting = useCallback(() => setIsBuffering(true), []);
  const handleCanPlay = useCallback(() => setIsBuffering(false), []);
  const handleEndedEvent = useCallback(() => { setIsPlaying(false); setSkippingMode(null); setShowControls(true); }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    el.addEventListener("play", handlePlayEvent);
    el.addEventListener("playing", handlePlayEvent);
    el.addEventListener("pause", handlePauseEvent);
    el.addEventListener("waiting", handleWaiting);
    el.addEventListener("canplay", handleCanPlay);
    el.addEventListener("ended", handleEndedEvent);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      el.removeEventListener("play", handlePlayEvent);
      el.removeEventListener("playing", handlePlayEvent);
      el.removeEventListener("pause", handlePauseEvent);
      el.removeEventListener("waiting", handleWaiting);
      el.removeEventListener("canplay", handleCanPlay);
      el.removeEventListener("ended", handleEndedEvent);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [handlePlayEvent, handlePauseEvent, handleWaiting, handleCanPlay, handleEndedEvent]);

  // --- GESTURES (SKIP) ---
  const startHoldAction = (direction) => {
    const el = videoRef.current;
    if (!el) return;
    isHoldingRef.current = true;
    wasPlayingRef.current = !el.paused;
    wasMutedRef.current = el.muted; 
    setSkippingMode(direction);
    setShowControls(false);

    if (direction === 'forward') {
        el.playbackRate = 3.0; 
        if (el.paused) el.play();
    } else {
        el.muted = true; 
        el.playbackRate = 1.0;
        el.pause();
        const smoothRewind = () => {
            el.currentTime = Math.max(0, el.currentTime - 0.06);
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
    el.currentTime = el.currentTime; 
    if (wasPlayingRef.current) el.play().catch(() => {});
    else el.pause();

    setTimeout(() => { if (el) el.muted = wasMutedRef.current; }, 50);
    setSkippingMode(null);
    showUI(); 
    setTimeout(() => { isHoldingRef.current = false; }, 100);
  };

  const handleInteractionStart = (direction) => { holdTimerRef.current = setTimeout(() => { startHoldAction(direction); }, 500); };
  const handleInteractionEnd = (direction) => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (isHoldingRef.current) { endHoldAction(); return; }
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
        const el = videoRef.current;
        if (el) {
            const time = direction === 'forward' ? 10 : -10;
            el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + time));
            setDoubleTapFeedback(direction);
            setTimeout(() => setDoubleTapFeedback(null), 600);
        }
    } else {
        toggleUI();
    }
    lastTapTimeRef.current = now;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!video) return null;

  return (
    <div 
        ref={containerRef}
        className={`
            relative w-full aspect-video bg-black group select-none outline-none overflow-hidden
            ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl md:rounded-[2.5rem] shadow-2xl ring-1 ring-white/10'}
        `}
        onMouseMove={showUI}
        onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        controls={false}
        playsInline 
        preload="metadata" 
        className={`w-full h-full block bg-black ${isFullscreen ? 'object-contain' : 'object-cover'}`}
        src={src}
        poster={thumbnail_url || undefined}
      />

      {/* --- BUFFERING --- */}
      {isBuffering && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin drop-shadow-md"></div>
        </div>
      )}

      {/* --- GESTURE ZONES (Left) --- */}
      <div 
        className="absolute top-0 left-0 bottom-20 w-[30%] z-10 cursor-pointer touch-manipulation"
        onMouseDown={() => handleInteractionStart('rewind')}
        onMouseUp={() => handleInteractionEnd('rewind')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('rewind')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('rewind'); }}
      >
        {skippingMode === 'rewind' && (
            <div className="absolute inset-0 flex items-center justify-start pl-8 transition-all">
                 <div className="flex flex-col items-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                    <span className="text-4xl text-emerald-400 animate-pulse">«</span>
                    <span className="text-[10px] font-black uppercase text-white mt-1">Rewind</span>
                 </div>
            </div>
        )}
        {doubleTapFeedback === 'rewind' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                    <span className="text-sm font-black text-white drop-shadow-md">-10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- GESTURE ZONES (Right) --- */}
      <div 
        className="absolute top-0 right-0 bottom-20 w-[30%] z-10 cursor-pointer"
        onMouseDown={() => handleInteractionStart('forward')}
        onMouseUp={() => handleInteractionEnd('forward')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('forward')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('forward'); }}
      >
        {skippingMode === 'forward' && (
            <div className="absolute inset-0 flex items-center justify-end pr-8 transition-all">
                 <div className="flex flex-col items-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                    <span className="text-4xl text-emerald-400 animate-pulse">»</span>
                    <span className="text-[10px] font-black uppercase text-white mt-1">3x</span>
                 </div>
            </div>
        )}
        {doubleTapFeedback === 'forward' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                    <span className="text-sm font-black text-white drop-shadow-md">+10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- CENTER PLAY/PAUSE BUTTON --- */}
      {!skippingMode && !isBuffering && (showControls || !isPlaying) && (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                togglePlay();
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.6)] cursor-pointer hover:scale-110 hover:bg-emerald-400 transition-all active:scale-95"
        >
            {isPlaying ? (
                <svg className="w-6 h-6 md:w-8 md:h-8 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
        </div>
      )}

      {/* --- BOTTOM CONTROLS --- */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-12 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-white mb-1">
            
            {/* Play/Pause (Small) */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-emerald-400 transition-colors">
                {isPlaying ? (
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>
            
            <span className="min-w-[40px] text-center font-mono">{formatTime(currentTime)}</span>
            
            {/* DUAL-LAYER COLORED PROGRESS BAR */}
            <div className="flex-1 h-1.5 relative rounded-full cursor-pointer group flex items-center">
                {/* 1. Track BG */}
                <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                {/* 2. Progress Fill (Emerald) */}
                <div 
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-75" 
                    style={{ width: `${progress}%` }}
                ></div>
                {/* 3. Thumb (Visual) */}
                <div 
                    className="absolute h-3 w-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                ></div>
                {/* 4. Input (Interaction) */}
                <input 
                    type="range" min="0" max="100" step="0.1"
                    value={progress} 
                    onChange={handleSeek}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                />
            </div>

            <span className="min-w-[40px] text-center font-mono">{formatTime(duration)}</span>
            
            {/* Fullscreen Button */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-emerald-400 transition-colors">
                {isFullscreen ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
