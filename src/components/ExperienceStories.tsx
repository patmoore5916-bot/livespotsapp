import { motion } from "framer-motion";
import { Plus, Flame } from "lucide-react";
import type { ExperiencePost } from "@/hooks/useExperiences";
import { useVenues } from "@/hooks/useVenuesAndEvents";

interface ExperienceStoriesProps {
  posts: ExperiencePost[];
  onStoryTap: (index: number) => void;
  onPostTap: () => void;
}

const ExperienceStories = ({ posts, onStoryTap, onPostTap }: ExperienceStoriesProps) => {
  const { data: venues = [] } = useVenues();

const ExperienceStories = ({ posts, onStoryTap, onPostTap }: ExperienceStoriesProps) => {
  // Group posts by venue
  const venueGroups = posts.reduce<Record<string, ExperiencePost[]>>((acc, post) => {
    if (!acc[post.venue_id]) acc[post.venue_id] = [];
    acc[post.venue_id].push(post);
    return acc;
  }, {});

  const groupedEntries = Object.entries(venueGroups);

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none px-1 py-1">
      {/* Add story button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onPostTap}
        className="flex flex-col items-center gap-1.5 shrink-0"
      >
        <div className="w-14 h-14 rounded-full bg-card border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <Plus className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">Post</span>
      </motion.button>

      {/* Venue stories */}
      {groupedEntries.map(([venueId, venuePosts]) => {
        const venue = venues.find(v => v.id === venueId);
        const firstPostIndex = posts.findIndex(p => p.venue_id === venueId);
        const isRecent = Date.now() - new Date(venuePosts[0].created_at).getTime() < 3600000;

        return (
          <motion.button
            key={venueId}
            whileTap={{ scale: 0.9 }}
            onClick={() => onStoryTap(firstPostIndex)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className={`w-14 h-14 rounded-full p-[2px] ${
              isRecent
                ? "bg-gradient-to-br from-destructive to-primary"
                : "bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/20"
            }`}>
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                <span className="text-sm font-bold text-foreground">
                  {venue?.name?.charAt(0) || "?"}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[56px]">
              {venue?.name?.split(" ")[0] || "Venue"}
            </span>
            {venuePosts.length > 1 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center">
                {venuePosts.length}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Empty state hint */}
      {groupedEntries.length === 0 && (
        <div className="flex items-center gap-2 px-3">
          <Flame className="w-4 h-4 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40 whitespace-nowrap">
            No experiences yet — be the first!
          </span>
        </div>
      )}
    </div>
  );
};

export default ExperienceStories;
