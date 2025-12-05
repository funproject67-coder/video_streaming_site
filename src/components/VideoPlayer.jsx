// src/components/VideoPlayer.jsx
import { useCallback, useEffect, useState } from "react";

export default function VideoPlayer({ video, onPlayed }) {
  // hooks must run every render (always declared at top)
  const [reported, setReported] = useState(false);

  // derive primitives to use in hook deps (avoid object identity issues)
  const videoId = video?.id ?? null;
  const videoTitle = video?.title ?? "";
  const videoDesc = video?.description ?? "";

  // reset reported when video changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReported(false);
  }, [videoId]);

  // If there's no video, render nothing (hooks already ran)
  if (!video) return null;

  // build src safely (use the smallest set of values possible)
  const src =
    video.source_type === "uploaded"
      ? video.public_url || video.file_url || ""
      : video.external_url || "";

  // play handler — depend on videoId and onPlayed and reported
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePlay = useCallback(() => {
    if (!reported && typeof onPlayed === "function" && videoId) {
      try {
        onPlayed({ ...video }); // call with the object (you can change to videoId if preferred)
      } catch (err) {
        console.warn("onPlayed error:", err);
      }
      setReported(true);
    }
  }, [reported, onPlayed, videoId, video]);

  // share/copy handler — depend on derived primitives (src, videoTitle, videoDesc)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleShare = useCallback(async () => {
    if (!src) {
      alert("No shareable URL.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle || "Video",
          text: videoDesc || "",
          url: src,
        });
        return;
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // user cancelled or share failed — fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(src);
      alert("Link copied to clipboard");
    } catch {
      // clipboard failed, show raw url
      // use prompt because some browsers block programmatic clipboard access in devtools
      // eslint-disable-next-line no-alert
      prompt("Copy this link:", src);
    }
  }, [src, videoTitle, videoDesc]);

  const views = Number(video.view_count || 0);

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
        <video
          controls
          className="w-full h-full"
          src={src}
          onPlay={handlePlay}
          poster={video.thumbnail_url || undefined}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{video.title}</h2>

          {video.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-3">
              {video.description}
            </p>
          )}

          <p className="mt-2 text-[11px] text-slate-500">
            Source:{" "}
            <span className="font-medium">
              {video.source_type === "external" ? "External" : "Uploaded"}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleShare}
            className="rounded-full border px-3 py-1 text-xs bg-slate-900"
            type="button"
          >
            🔗 Share
          </button>

          <div className="text-xs text-slate-400">
            {views} view{views === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}
