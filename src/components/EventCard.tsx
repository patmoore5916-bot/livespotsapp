import { motion } from "framer-motion";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import type { Event } from "@/data/mockEvents";
import { statusColors } from "@/data/mockEvents";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-card p-4 rounded-card shadow-card"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          {event.isLiveNow && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Now
            </span>
          )}
          <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight truncate">
            {event.artist}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.venue.name}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
              {event.venue.type}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-mono-nums text-xs shrink-0">{event.venue.distance}</span>
          </p>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <span className="font-mono-nums text-sm text-muted-foreground">{event.startTime}</span>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Doors {event.doorsAt}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent-foreground/60 bg-accent px-2 py-1 rounded-inner">
          {event.genre}
        </span>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors min-h-[44px] px-3">
            <ExternalLink className="w-3.5 h-3.5" />
            Tickets
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors min-h-[44px] px-3">
            <Clock className="w-3.5 h-3.5" />
            Directions
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
