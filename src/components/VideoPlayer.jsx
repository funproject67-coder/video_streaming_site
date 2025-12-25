/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * VideoPlayer — Clean Cinematic Engine
 * Features: 
 * 1. FIXED: Play Button Reliability (Direct Click Handler & Z-Index)
 * 2. Mobile-Optimized Responsive Icons
 * 3. Dual-Layer Colored Progress Bar
 * 4. Advanced Gestures
 */
export default function VideoPlayer({ video, onPlayed }) {
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // --- VIDEO STATE ---
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // --- GESTURE STATE ---
  const [skippingMode, setSkippingMode] = useState(null); 
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);

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

  useEffect(() => {
    setReported(false);
    setIsPlaying(false);
    setIsBuffering(true); 
    setSkippingMode(null);
    setDoubleTapFeedback(null);
    setProgress(0);
  }, [videoId]);

  // --- UI VISIBILITY ---
  const showUI = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !skippingMode) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, skippingMode]);

  const toggleUI = useCallback((e) => {
    e?.stopPropagation();
    if (showControls && isPlaying) setShowControls(false);
    else showUI();
  }, [showControls, isPlaying, showUI]);

  useEffect(() => {
    if (!isPlaying) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
        showUI();
    }
  }, [isPlaying, showUI]);

  // --- FULLSCREEN ---
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
        const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
        setIsFullscreen(isFs);
        if (isFs && window.screen?.orientation?.lock) window.screen.orientation.lock("landscape").catch(() => {});
        else if (!isFs && window.screen?.orientation?.unlock) window.screen.orientation.unlock();
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
        document.removeEventListener("fullscreenchange", handleFsChange);
        document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // --- EVENTS ---
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
    e.stopPropagation();
    const el = videoRef.current;
    if (el) {
        const newTime = (Number(e.target.value) / 100) * el.duration;
        el.currentTime = newTime;
        setProgress(Number(e.target.value));
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

  // --- CONTROLS ---
  const togglePlay = useCallback(async (e) => {
    // e is optional here because we might call it programmatically
    const el = videoRef.current;
    if (!el) return;
    try { if (el.paused) await el.play(); else el.pause(); } catch (err) {}
  }, []);

  // --- SKIP LOGIC ---
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
        className={`relative w-full aspect-video bg-black shadow-2xl group select-none outline-none ${isFullscreen ? 'rounded-none w-full h-full flex items-center justify-center' : 'rounded-2xl md:rounded-[2.5rem] overflow-hidden ring-1 ring-white/10'}`}
        onMouseMove={showUI}
        onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        controls={false}
        playsInline 
        preload="metadata" 
        className={`w-full h-full block shadow-none outline-none ${isFullscreen ? 'object-contain' : 'object-cover'}`}
        src={src}
        poster={thumbnail_url || undefined}
      />

      {/* --- BUFFERING WHEEL --- */}
      {isBuffering && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 md:w-16 md:h-16 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin filter drop-shadow-lg"></div>
        </div>
      )}

      {/* --- CUSTOM PROGRESS BAR & CONTROLS --- */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm font-bold text-white mb-1">
            
            {/* Small Play Button */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-emerald-400 transition-colors p-1">
                {isPlaying ? (
                    <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                    <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>
            
            <span className="min-w-[35px] md:min-w-[40px] text-center font-mono">{formatTime(currentTime)}</span>
            
            {/* PROGRESS BAR */}
            <div className="flex-1 h-1 md:h-1.5 relative rounded-full cursor-pointer group">
                <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                <div 
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${progress}%` }}
                ></div>
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                ></div>
                <input 
                    type="range" min="0" max="100" value={progress} onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
            </div>

            <span className="min-w-[35px] md:min-w-[40px] text-center font-mono">{formatTime(duration)}</span>
            
            {/* Fullscreen Button */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-emerald-400 transition-colors p-1">
                {isFullscreen ? (
                    <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                    <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
            </button>
        </div>
      </div>

      {/* --- LEFT ZONE (Rewind) --- */}
      <div 
        className="absolute top-0 left-0 bottom-20 w-[30%] z-40 cursor-pointer touch-none"
        onMouseDown={() => handleInteractionStart('rewind')}
        onMouseUp={() => handleInteractionEnd('rewind')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('rewind')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('rewind'); }}
      >
        <div className={`absolute inset-0 flex items-center justify-start pl-8 transition-opacity duration-300 ${skippingMode === 'rewind' ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex flex-col items-center drop-shadow-md">
                <span className="text-3xl md:text-5xl text-emerald-400 animate-pulse">«</span>
                <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-widest mt-1 md:mt-2">Rewind</span>
             </div>
        </div>
        {doubleTapFeedback === 'rewind' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/20">
                    <span className="text-xs md:text-lg font-black text-white drop-shadow-md">-10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- RIGHT ZONE (Forward) --- */}
      <div 
        className="absolute top-0 right-0 bottom-20 w-[30%] z-40 cursor-pointer touch-none"
        onMouseDown={() => handleInteractionStart('forward')}
        onMouseUp={() => handleInteractionEnd('forward')}
        onMouseLeave={() => { clearTimeout(holdTimerRef.current); if(isHoldingRef.current) endHoldAction(); }}
        onTouchStart={() => handleInteractionStart('forward')}
        onTouchEnd={(e) => { e.preventDefault(); handleInteractionEnd('forward'); }}
      >
        <div className={`absolute inset-0 flex items-center justify-end pr-8 transition-opacity duration-300 ${skippingMode === 'forward' ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex flex-col items-center drop-shadow-md">
                <span className="text-3xl md:text-5xl text-emerald-400 animate-pulse">»</span>
                <span className="text-[10px] md:text-xs font-black uppercase text-white tracking-widest mt-1 md:mt-2">3x Speed</span>
             </div>
        </div>
        {doubleTapFeedback === 'forward' && (
            <div className="absolute inset-0 flex items-center justify-center animate-ping-short">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/20">
                    <span className="text-xs md:text-lg font-black text-white drop-shadow-md">+10s</span>
                </div>
            </div>
        )}
      </div>

      {/* --- CENTER PLAY/PAUSE BUTTON (FIXED) --- */}
      {/* Bumped z-index to 50 to sit above gesture zones if they overlap at the edges */}
      {!skippingMode && !isBuffering && (showControls || !isPlaying) && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" 
        >
          <div 
            onClick={(e) => {
                e.stopPropagation(); // Prevents "Toggle UI" from firing
                togglePlay();
            }}
            className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] cursor-pointer pointer-events-auto hover:scale-110 hover:bg-emerald-400 transition-all"
          >
            {isPlaying ? (
               <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            ) : (
               <svg className="w-6 h-6 md:w-8 md:h-8 ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
