/* eslint-disable no-unused-vars */
// src/utils/thumbnails.js
import { supabase } from "../supabaseClient";

const VIDEO_BUCKET = "videos";
const THUMB_BUCKET = "thumbnails";

/**
 * 1. Try to fetch the initial bytes (2MB) of a remote video.
 * Returns an object URL (blob:) on success, or null on failure.
 * Used to bypass CORS issues for thumbnail generation.
 */
async function tryPartialFetchAsBlobUrl(url, bytes = 2_000_000, timeoutMs = 8000) {
  if (!url || typeof fetch !== "function") return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "GET",
      headers: { Range: `bytes=0-${bytes - 1}` },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok && res.status !== 206) return null;
    
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    return null;
  }
}

/**
 * 2. Capture a frame from a video source.
 * Includes stability fixes (play/pause) and CORS handling.
 */
export async function captureFrameAtTime(src, time = 7, width = 960, timeoutMs = 15000) {
  if (!src) return null;

  return new Promise((resolve) => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, timeoutMs);

    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous"; // Crucial for CORS
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = src;

      const cleanup = () => {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch { /* ignore */ }
        clearTimeout(timeout);
      };

      const onError = () => {
        cleanup();
        if (!timedOut) resolve(null);
      };

      const onLoadedMeta = () => {
        if (timedOut) return;
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        // If the video is shorter than the requested time, seek to middle
        const targetTime = (dur > 0 && time > dur) ? dur / 2 : time;

        // >>> STABILITY FIX: Play and Pause to prime the buffer <<<
        video.play().then(() => video.pause()).catch(() => {});

        try {
          video.currentTime = targetTime;
        } catch (err) {
          setTimeout(() => {
             if (!timedOut) try { video.currentTime = targetTime; } catch { onError(); }
          }, 200);
        }
      };

      const onSeeked = () => {
        if (timedOut) return;
        try {
          const canvas = document.createElement("canvas");
          const vw = video.videoWidth || 1280;
          const vh = video.videoHeight || 720;
          const aspect = vw > 0 ? vw / vh : 16 / 9;
          
          canvas.width = width;
          canvas.height = Math.round(width / aspect);
          
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // This will throw if CORS headers are missing
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          console.warn("Capture failed (likely CORS tainted)", err);
          cleanup();
          resolve(null);
        }
      };

      video.addEventListener("loadedmetadata", onLoadedMeta, { once: true });
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });

      video.load();
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * 3. Master function to generate thumbnail.
 * Tries the original URL first. If that fails (CORS),
 * it falls back to downloading a partial blob.
 */
export async function generateThumbnailWithRetries(src, seconds) {
  if (!src) return null;

  // Normalize seconds to array
  const secondsInput = Array.isArray(seconds) ? seconds : [seconds || 7];
  // Always ensure we have a fallback to 1s at the end
  const secondsToTry = [...new Set([...secondsInput, 1])];

  // --- ATTEMPT 1: Direct Source (Best Quality) ---
  for (const s of secondsToTry) {
    const dataUrl = await captureFrameAtTime(src, Number(s));
    if (dataUrl) return dataUrl;
  }

  // --- ATTEMPT 2: Partial Fetch Fallback (CORS Bypass) ---
  // If direct access failed, we fetch the first 2MB locally.
  // We MUST force time to ~1s because we only have the start of the file.
  console.log("Direct capture failed. Attempting partial fetch fallback...");
  
  let partialUrl = null;
  try {
    partialUrl = await tryPartialFetchAsBlobUrl(src, 2_000_000); 
    if (partialUrl) {
        // Force capture at 1.0s using the local blob
        const dataUrl = await captureFrameAtTime(partialUrl, 1.0); 
        if (dataUrl) {
            URL.revokeObjectURL(partialUrl);
            return dataUrl;
        }
    }
  } catch (err) {
    console.warn("Partial fallback failed", err);
  } finally {
    if (partialUrl) URL.revokeObjectURL(partialUrl);
  }

  return null;
}

// --- Standard Helpers ---

export function dataURLToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const base64 = parts[1] || "";
  const mime = (meta.match(/data:(.*);base64/) || [])[1] || "image/jpeg";
  const binary = atob(base64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export async function uploadThumbnailBlob(blob, existingPath = null) {
  try {
    if (!blob) return null;
    const ext = "jpg";
    const filePath = existingPath || `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(THUMB_BUCKET).upload(filePath, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
    });

    if (error) {
      console.error("Thumbnail upload error", error);
      return null;
    }
    return filePath;
  } catch (err) {
    return null;
  }
}

export async function uploadThumbnailFile(file, existingPath = null) {
  if (!file) return null;
  try {
    const ext = (file.type && file.type.split("/").pop()) || "jpg";
    const useExt = ext === "jpeg" ? "jpg" : ext || "jpg";
    const targetPath = existingPath || `${crypto.randomUUID()}.${useExt}`;

    const { error } = await supabase.storage.from(THUMB_BUCKET).upload(targetPath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) return null;
    return targetPath;
  } catch (err) {
    return null;
  }
}

export async function deleteThumbnail(path) {
  if (!path) return { success: false };
  const { error } = await supabase.storage.from(THUMB_BUCKET).remove([path]);
  return { success: !error, error };
}

export function getPublicUrlForVideoPath(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export function getPublicUrlForThumbPath(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(THUMB_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export default {
  captureFrameAtTime,
  generateThumbnailWithRetries,
  dataURLToBlob,
  uploadThumbnailBlob,
  uploadThumbnailFile,
  deleteThumbnail,
  getPublicUrlForVideoPath,
  getPublicUrlForThumbPath,
};
