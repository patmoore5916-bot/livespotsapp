import { useMemo } from "react";
import { motion } from "framer-motion";
import { Music, Calendar } from "lucide-react";
import { useEvents } from "@/hooks/useVenuesAndEvents";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const MyBands = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: prefs } = useUserPreferences();
  const { data: allEvents = [] } = useEvents();

  const matchedEvents = useMemo(() => {
    if (!prefs?.genres?.length) return [];
    const genreSet = new Set(prefs.genres.map((g) => g.toLowerCase()));
    return allEvents.filter((e) => genreSet.has(e.genre.toLowerCase()));
  }, [allEvents, prefs]);

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-background pb-20">
        <p className="text-muted-foreground mb-4">Sign in to see your personalized feed</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/auth")}
          className="px-6 py-3 rounded-inner bg-primary text-primary-foreground font-semibold text-sm"
        >
          Sign In
        </motion.button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="px-6 pt-14 pb-4">
        <h1 className="text-xl font-bold text-foreground">My Bands</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Events matching your genre preferences
        </p>
      </div>

      {!prefs?.genres?.length ? (
        <div className="px-6 py-12 text-center space-y-3">
          <Music className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Set your genre preferences to see matching events
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/profile")}
            className="px-5 py-2.5 rounded-inner bg-primary text-primary-foreground text-sm font-semibold"
          >
            Set Preferences
          </motion.button>
        </div>
      ) : matchedEvents.length === 0 ? (
        <div className="px-6 py-12 text-center space-y-2">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No upcoming events match your genres right now
          </p>
        </div>
      ) : (
        <div className="px-6 space-y-3">
          {matchedEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-card p-4 border border-border space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {event.artist}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {event.venue.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    event.status === "live"
                      ? "bg-destructive/20 text-destructive"
                      : event.status === "today"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-indigo-500/20 text-indigo-400"
                  }`}
                >
                  {event.status === "live" ? "LIVE" : event.status === "today" ? "TODAY" : "THIS WEEK"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono-nums">
                <span>{event.genre}</span>
                <span>·</span>
                <span>{event.startTime}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MyBands;
