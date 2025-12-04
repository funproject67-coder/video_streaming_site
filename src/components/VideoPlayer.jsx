import { useEffect, useState } from "react";

function VideoPlayer({ video, onPlayed }) {
  if (!video) return null;

  const src =
    video.source_type === "uploaded" ? video.public_url : video.external_url;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hasReportedPlay, setHasReportedPlay] = useState(false);

  const handlePlay = () => {
    if (!hasReportedPlay && onPlayed && video) {
      onPlayed(video);
      setHasReportedPlay(true);
    }
  };

  // Reset when video changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setHasReportedPlay(false);
  }, [video?.id]);

  const handleShare = async () => {
    if (!src) {
      alert("No shareable URL for this video.");
      return;
    }

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "MyStream video",
          text: video.description || "Check out this video!",
          url: src,
        });
        return;
      } catch (e) {
        // user cancelled or not available
        console.warn("Share cancelled or not available:", e);
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(src);
      alert("Video link copied to clipboard!");
    } catch {
      alert("Copy this link:\n" + src);
    }
  };

  const views = Number(video.view_count || 0);

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
        <video
          controls
          className="w-full h-full"
          src={src}
          onPlay={handlePlay}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold mb-0.5">{video.title}</h2>
          {video.description && (
            <p className="text-xs text-slate-400 max-w-prose">
              {video.description}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            Source:{" "}
            <span className="font-medium text-slate-300">
              {video.source_type === "external" ? "Online link" : "Uploaded"}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px]">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] hover:bg-slate-800"
          >
            🔗 Share
          </button>
          <span className="text-slate-400">
            {views} view{views === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
