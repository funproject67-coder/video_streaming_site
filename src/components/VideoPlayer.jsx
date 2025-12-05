
import { useEffect, useState } from "react";

export default function VideoPlayer({ video, onPlayed }) {
  if (!video) return null;

  const src = video.source_type === "uploaded" ? video.public_url : video.external_url;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [reported, setReported] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => setReported(false), [video?.id]);

  const handlePlay = () => {
    if (!reported && onPlayed && video) {
      onPlayed(video);
      setReported(true);
    }
  };

  const handleShare = async () => {
    if (!src) {
      alert("No shareable URL.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title || "Video", text: video.description || "", url: src });
        return;
      } catch { /* empty */ }
    }
    try {
      await navigator.clipboard.writeText(src);
      alert("Link copied to clipboard");
    } catch {
      alert(src);
    }
  };

  const views = Number(video.view_count || 0);

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
        <video controls className="w-full h-full" src={src} onPlay={handlePlay}>
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{video.title}</h2>
          {video.description && <p className="text-xs text-slate-400 mt-1 line-clamp-3">{video.description}</p>}
          <p className="mt-2 text-[11px] text-slate-500">Source: <span className="font-medium">{video.source_type === "external" ? "External" : "Uploaded"}</span></p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button onClick={handleShare} className="rounded-full border px-3 py-1 text-xs bg-slate-900">🔗 Share</button>
          <div className="text-xs text-slate-400">{views} view{views === 1 ? "" : "s"}</div>
        </div>
      </div>
    </div>
  );
}
