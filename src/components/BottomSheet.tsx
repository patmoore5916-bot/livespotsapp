import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import EventCard from "./EventCard";
import FilterChips from "./FilterChips";
import { useGenres, type Event } from "@/hooks/useVenuesAndEvents";

interface BottomSheetProps {
  events: Event[];
  snapPoint: number;
  onSnapChange: (snap: number) => void;
  cityName?: string;
  userGenres?: string[];
  searchQuery?: string;
}

const SNAP_POINTS = [0.1, 0.45, 0.92];

const BottomSheet = ({ events, snapPoint, onSnapChange, cityName = "Nearby", userGenres, searchQuery = "" }: BottomSheetProps) => {
  const genres = useGenres();
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [liveOnly, setLiveOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const showForYou = !!userGenres && userGenres.length > 0;

  const q = searchQuery.toLowerCase().trim();

  const filteredEvents = events.filter((e) => {
    if (liveOnly && e.status !== "live") return false;
    if (selectedGenre === "For You" && userGenres) {
      return userGenres.some((g) => e.genre.toLowerCase() === g.toLowerCase());
    }
    if (selectedGenre !== "All" && selectedGenre !== "For You" && e.genre !== selectedGenre) return false;
    if (q) {
      return (
        e.genre.toLowerCase().includes(q) ||
        e.artist.toLowerCase().includes(q) ||
        e.venue.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const currentHeight = SNAP_POINTS[snapPoint];

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity < -300 || offset < -80) {
      onSnapChange(Math.min(snapPoint + 1, 2));
    } else if (velocity > 300 || offset > 80) {
      onSnapChange(Math.max(snapPoint - 1, 0));
    }
  };

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-card shadow-card"
      animate={{ height: `${currentHeight * 100}vh` }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Drag handle */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing pt-3 pb-4 px-6"
      >
        <div className="w-10 h-1 rounded-full bg-accent mx-auto" />
      </motion.div>

      {/* Header */}
      <div className="px-5 pb-3">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {q ? `Results for "${searchQuery}"` : `Live near ${cityName}`}
          </h2>
          <span className="font-mono-nums text-xs text-muted-foreground">
            {filteredEvents.length} shows
          </span>
        </div>
        <FilterChips
          genres={genres}
          selected={selectedGenre}
          onSelect={setSelectedGenre}
          liveOnly={liveOnly}
          onToggleLive={() => setLiveOnly(!liveOnly)}
          showForYou={showForYou}
        />
      </div>

      {/* Event list */}
      <div
        ref={containerRef}
        className="overflow-y-auto px-5 pb-20 space-y-3"
        style={{ height: `calc(100% - 140px)` }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <p className="text-muted-foreground text-sm">No music right now.</p>
            <button className="text-xs font-mono uppercase tracking-widest text-primary min-h-[44px] px-4">
              Suggest a Show
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </motion.div>
  );
};

export default BottomSheet;
