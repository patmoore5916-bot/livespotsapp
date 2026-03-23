import { motion } from "framer-motion";
import { MapPin, Clock, ExternalLink, Calendar, Navigation, Ticket } from "lucide-react";
import { statusColors, type Event } from "@/hooks/useVenuesAndEvents";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { distanceMiles } from "@/lib/geo";
import { formatLabel } from "@/lib/formatters";
import { trackAndOpenTicket } from "@/lib/ticketTracking";
import { useNavigate } from "react-router-dom";

interface EventCardProps {
  event: Event;
  userLocation?: { lat: number; lng: number } | null;
}

function formatEventDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

const EventCard = ({ event, userLocation }: EventCardProps) => {
  const navigate = useNavigate();
  const hasCoords = event.venue.lat !== 0 && event.venue.lng !== 0;
  const dist =
    userLocation && hasCoords
      ? distanceMiles(userLocation.lat, userLocation.lng, event.venue.lat, event.venue.lng)
      : null;

  const locationLabel = event.venue.city || (hasCoords ? "Nearby" : "");
  const statusStyle = statusColors[event.status] ?? statusColors["upcoming"];

  const handleTicketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!event.ticketUrl) return;
    trackAndOpenTicket({
      eventId: event.id,
      venueId: event.venue.id,
      artist: event.artist,
      ticketUrl: event.ticketUrl,
    });
  };

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-card p-4 rounded-card shadow-card cursor-pointer"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-medium"
              style={{ color: statusStyle.bg }}
            >
              {event.status === "live" && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusStyle.bg }} />
              )}
              {event.statusLabel}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight truncate">
            {event.artist}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.venue.name}</span>
            {locationLabel && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="font-mono-nums text-xs shrink-0">{locationLabel}</span>
              </>
            )}
            {dist !== null && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="font-mono-nums text-xs shrink-0 flex items-center gap-0.5">
                  <Navigation className="w-2.5 h-2.5" />
                  {dist < 1 ? "<1" : dist.toFixed(1)} mi
                </span>
              </>
            )}
          </p>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <span className="flex items-center gap-1 justify-end text-sm text-foreground font-medium">
            <Calendar className="w-3 h-3" />
            <span className="font-mono-nums">{formatEventDate(event.date)}</span>
          </span>
          {event.showTimes && event.showTimes.length > 1 ? (
            <div className="space-y-0.5">
              {event.showTimes.map((t, i) => (
                <span key={i} className="block font-mono-nums text-xs text-muted-foreground">{t}</span>
              ))}
            </div>
          ) : event.startTime ? (
            <span className="font-mono-nums text-xs text-muted-foreground">{event.startTime}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent-foreground/60 bg-accent px-2 py-1 rounded-inner">
          {formatLabel(event.genre)}
        </span>
        <div className="flex gap-2">
          {event.ticketUrl && (
            <button
              onClick={handleTicketClick}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors min-h-[44px] px-3"
            >
              <Ticket className="w-3.5 h-3.5" />
              Tickets
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
          )}
          {hasCoords && (
            <a
              href={`https://maps.google.com/maps?daddr=${event.venue.lat},${event.venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors min-h-[44px] px-3"
            >
              <Clock className="w-3.5 h-3.5" />
              Directions
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
