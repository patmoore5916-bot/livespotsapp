import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExperiencePost } from "@/hooks/useExperiences";
import { useVenues } from "@/hooks/useVenuesAndEvents";

interface ExperienceViewerProps {
  posts: ExperiencePost[];
  initialIndex: number;
  onClose: () => void;
}

const ExperienceViewer = ({ posts, initialIndex, onClose }: ExperienceViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const { data: venues = [] } = useVenues();
  const post = posts[currentIndex];
  const venue = venues.find(v => v.id === post?.venue_id);

  const goNext = () => {
    if (currentIndex < posts.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!post) return null;

  const timeAgo = getTimeAgo(post.created_at);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 px-3">
        {posts.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i < currentIndex ? "bg-white w-full" : i === currentIndex ? "bg-white w-1/2 animate-pulse" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {venue?.name?.charAt(0) || "?"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{venue?.name || "Unknown"}</p>
            <p className="text-[10px] text-white/50">{timeAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="w-8 h-8 flex items-center justify-center"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-white/70" />
            ) : (
              <Volume2 className="w-4 h-4 text-white/70" />
            )}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          key={post.id}
          src={post.video_url}
          autoPlay
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          onEnded={goNext}
        />

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 w-1/3"
          aria-label="Previous"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 w-1/3"
          aria-label="Next"
        />
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <p className="text-sm text-white font-medium drop-shadow-lg">{post.caption}</p>
        </div>
      )}
    </motion.div>
  );
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return "1d ago";
}

export default ExperienceViewer;
