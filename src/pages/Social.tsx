import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, MapPin, Clock } from "lucide-react";
import { useExperiencePosts } from "@/hooks/useExperiences";
import { useVenues } from "@/hooks/useVenuesAndEvents";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import ExperienceStories from "@/components/ExperienceStories";
import ExperienceViewer from "@/components/ExperienceViewer";
import PostExperience from "@/components/PostExperience";
import BottomNav from "@/components/BottomNav";

const Social = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: posts = [] } = useExperiencePosts();
  const { data: venues = [] } = useVenues();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showPost, setShowPost] = useState(false);

  const handlePostTap = () => {
    if (!user) {
      toast("Sign in to share your experience", {
        action: { label: "Sign In", onClick: () => navigate("/auth") },
      });
      return;
    }
    setShowPost(true);
  };

  const getVenueName = (venueId: string) =>
    venues.find((v) => v.id === venueId)?.name ?? "Unknown Venue";

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Social</h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePostTap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-inner bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Post
          </motion.button>
        </div>
      </div>

      {/* Stories row */}
      <div className="px-4 py-3 border-b border-border">
        <ExperienceStories
          posts={posts}
          onStoryTap={(i) => setViewerIndex(i)}
          onPostTap={handlePostTap}
        />
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Play className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No posts yet</p>
            <p className="text-xs text-muted-foreground/60">Be the first to share a live experience!</p>
          </div>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-card overflow-hidden"
            >
              {/* Video thumbnail / tap to view */}
              <button
                onClick={() => setViewerIndex(i)}
                className="relative w-full aspect-[9/12] bg-secondary overflow-hidden group"
              >
                {post.thumbnail_url ? (
                  <img
                    src={post.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <video
                    src={post.video_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  {post.caption && (
                    <p className="text-sm text-white font-medium line-clamp-2">{post.caption}</p>
                  )}
                </div>
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </button>

              {/* Post info */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {getVenueName(post.venue_id)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-mono-nums">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Full-screen experience viewer */}
      <AnimatePresence>
        {viewerIndex !== null && posts.length > 0 && (
          <ExperienceViewer
            posts={posts}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Post modal */}
      <AnimatePresence>
        {showPost && (
          <PostExperience
            onClose={() => setShowPost(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Social;
