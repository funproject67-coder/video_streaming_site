
import { supabase } from "../supabaseClient";

const VIDEO_BUCKET = "videos";
const THUMB_BUCKET = "thumbnails";

const THUMB_ATTEMPTS = [7, 12, 4, 2, 1];

export async function captureFrameAtTime(src, time = 5, width = 640) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.src = src;

      const cleanup = () => {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch { /* empty */ }
      };

      const onError = () => {
        cleanup();
        resolve(null);
      };

      video.addEventListener("loadedmetadata", () => {
        const dur = isNaN(video.duration) ? 0 : video.duration;
        const t = dur > time ? time : Math.max(0.5, dur * 0.3);
        video.currentTime = t;
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          const ar = video.videoHeight / Math.max(1, video.videoWidth);
          canvas.width = width;
          canvas.height = Math.round(width * ar || (width * 9) / 16);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          cleanup();
          resolve(dataUrl);
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          cleanup();
          resolve(null);
        }
      });

      video.onerror = onError;
      // in some browsers, need to load
      video.load();
    } catch {
      resolve(null);
    }
  });
}

export async function generateThumbnailWithRetries(videoSrc) {
  for (const t of THUMB_ATTEMPTS) {
    const dataUrl = await captureFrameAtTime(videoSrc, t);
    if (dataUrl) return dataUrl;
  }
  return null;
}

export function dataURLToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*);base64/) || [])[1] || "image/jpeg";
  const binary = atob(b64 || "");
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function uploadThumbnailBlob(blob, existingPath = null) {
  const path = existingPath || `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(THUMB_BUCKET).upload(path, blob, { upsert: true });
  if (error) {
    console.error("Thumbnail upload error", error);
    return null;
  }
  return path;
}

export function getPublicUrlForVideoPath(path) {
  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export function getPublicUrlForThumbPath(path) {
  const { data } = supabase.storage.from(THUMB_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
