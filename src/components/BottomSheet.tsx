import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, CalendarSearch, X } from "lucide-react";
import { motion, PanInfo } from "framer-motion";
import EventCard from "./EventCard";
import FilterChips from "./FilterChips";
import { useGenres, type Event } from "@/hooks/useVenuesAndEvents";
import { distanceMiles } from "@/lib/geo";
import { format, parseISO, isToday, isTomorrow, isWithinInterval, addDays, isSameDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DateFilter = "all" | "today" | "tomorrow" | "weekend" | "custom";

const DATE_CHIPS: { key: Exclude<DateFilter, "custom">; label: string }[] = [
  { key: "all", label: "All Dates" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend", label: "Weekend" },
];

function isThisWeekend(date: Date): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  // Find upcoming Saturday (or today if Sat/Sun)
  const daysUntilSat = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const saturday = new Date(now);
  saturday.setHours(0, 0, 0, 0);
  saturday.setDate(now.getDate() + daysUntilSat);
  const sunday = addDays(saturday, 1);
  sunday.setHours(23, 59, 59, 999);

  // If we're already on the weekend, include today
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    return isWithinInterval(date, { start: todayStart, end: sunday });
  }

  return isWithinInterval(date, { start: saturday, end: sunday });
}

function matchesDateFilter(dateStr: string, filter: DateFilter, customDate?: Date): boolean {
  if (filter === "all") return true;
  const d = parseISO(dateStr);
  if (filter === "today") return isToday(d);
  if (filter === "tomorrow") return isTomorrow(d);
  if (filter === "weekend") return isThisWeekend(d);
  if (filter === "custom" && customDate) return isSameDay(d, customDate);
  return true;
}

interface BottomSheetProps {
  events: Event[];
  snapPoint: number;
  onSnapChange: (snap: number) => void;
  cityName?: string;
  userGenres?: string[];
  searchQuery?: string;
  userLocation?: { lat: number; lng: number } | null;
  /** Name of the currently selected venue (when filtering to one venue) */
  selectedVenueName?: string | null;
  /** Clear the venue filter and return to the full list */
  onClearVenue?: () => void;
}

const SNAP_POINTS = [0.1, 0.45, 0.78];

/** Group events by date label */
function groupByDate(events: Event[]): { label: string; events: Event[] }[] {
  const groups = new Map<string, Event[]>();
  for (const e of events) {
    const d = parseISO(e.date);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isTomorrow(d)) label = "Tomorrow";
    else if (isThisWeekend(d)) label = format(d, "EEEE");
    else label = format(d, "EEE, MMM d");

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }
  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }));
}

const BottomSheet = ({ events, snapPoint, onSnapChange, cityName = "Nearby", userGenres, searchQuery = "", userLocation }: BottomSheetProps) => {
  const genres = useGenres();
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedDate, setSelectedDate] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const showForYou = !!userGenres && userGenres.length > 0;

  const q = searchQuery.toLowerCase().trim();

  const filteredEvents = events.filter((e) => {
    if (!matchesDateFilter(e.date, selectedDate, customDate)) return false;
    const liveOnly = false; // kept for compatibility
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

  // Sort by distance to user if location available
  const sortedEvents = userLocation
    ? [...filteredEvents].sort((a, b) => {
        const aDist = a.venue.lat && a.venue.lng
          ? distanceMiles(userLocation.lat, userLocation.lng, a.venue.lat, a.venue.lng)
          : Infinity;
        const bDist = b.venue.lat && b.venue.lng
          ? distanceMiles(userLocation.lat, userLocation.lng, b.venue.lat, b.venue.lng)
          : Infinity;
        return aDist - bDist;
      })
    : filteredEvents;

  const dateGroups = groupByDate(sortedEvents);
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
      {/* Tap handle with arrow: cycles 0→1→2→0 */}
      <button
        onClick={() => onSnapChange(snapPoint >= 2 ? 0 : snapPoint + 1)}
        className="w-full flex items-center justify-center pt-2 pb-2 px-6"
      >
        {snapPoint >= 2 ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Header */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {q ? `Results for "${searchQuery}"` : `Upcoming near ${cityName}`}
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono-nums text-xs text-muted-foreground">
              {filteredEvents.length} shows
            </span>
            <button
              onClick={() => onSnapChange(snapPoint >= 2 ? 0 : snapPoint + 1)}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            >
              {snapPoint >= 2 ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Date filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center">
          {DATE_CHIPS.map((df) => (
            <motion.button
              key={df.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedDate(df.key);
                setCustomDate(undefined);
              }}
              className={`shrink-0 px-2.5 py-1 rounded-inner text-[10px] font-mono uppercase tracking-widest transition-colors duration-150 ${
                selectedDate === df.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {df.label}
            </motion.button>
          ))}

          {/* Calendar picker */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 w-7 h-7 rounded-inner flex items-center justify-center transition-colors duration-150 ${
                  selectedDate === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <CalendarSearch className="w-4 h-4" />
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={(date) => {
                  setCustomDate(date);
                  if (date) setSelectedDate("custom");
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {selectedDate === "custom" && customDate && (
            <span className="shrink-0 text-[10px] font-mono text-primary">
              {format(customDate, "MMM d")}
            </span>
          )}
        </div>

        {/* Genre filters */}
        <div className="mt-2">
          <FilterChips
            genres={genres}
            selected={selectedGenre}
            onSelect={setSelectedGenre}
            liveOnly={false}
            onToggleLive={() => {}}
            showForYou={showForYou}
          />
        </div>
      </div>

      {/* Event list grouped by date */}
      <div
        ref={containerRef}
        className="overflow-y-auto px-5 pb-28 space-y-4"
        style={{ height: `calc(100% - 140px)` }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <p className="text-muted-foreground text-sm">No upcoming shows found.</p>
            <button className="text-xs font-mono uppercase tracking-widest text-primary min-h-[44px] px-4">
              Suggest a Show
            </button>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70 mb-2 sticky top-0 bg-background py-1 z-10">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.events.map((event, idx) => (
                  <EventCard key={`${event.id}-${idx}`} event={event} userLocation={userLocation} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default BottomSheet;
