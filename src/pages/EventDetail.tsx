import { useParams, useNavigate } from "react-router-dom";
import { useEvents } from "@/hooks/useVenuesAndEvents";
import { statusColors } from "@/hooks/useVenuesAndEvents";
import { trackAndOpenTicket } from "@/lib/ticketTracking";
import { formatLabel } from "@/lib/formatters";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ArrowLeft, MapPin, Calendar, Clock, ExternalLink, Navigation, Ticket } from "lucide-react";
import { motion } from "framer-motion";

function formatEventDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMMM d");
}

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();

  const event = events.find((e) => e.id === eventId);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground text-sm">Event not found</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm font-medium">
          ← Back to map
        </button>
      </div>
    );
  }

  const statusStyle = statusColors[event.status] ?? statusColors["upcoming"];
  const hasCoords = event.venue.lat !== 0 && event.venue.lng !== 0;

  const handleGetTickets = () => {
    if (!event.ticketUrl) return;
    trackAndOpenTicket({
      eventId: event.id,
      venueId: event.venue.id,
      artist: event.artist,
      ticketUrl: event.ticketUrl,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-inner bg-card flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <span className="text-sm font-medium text-muted-foreground truncate flex-1">
            Event Details
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Status + Artist */}
        <div className="space-y-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-medium"
            style={{ color: statusStyle.bg }}
          >
            {event.status === "live" && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusStyle.bg }} />
            )}
            {event.statusLabel}
          </span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{event.artist}</h1>
        </div>

        {/* Details card */}
        <div className="bg-card rounded-card p-5 shadow-card space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{event.venue.name}</p>
              {event.venue.city && (
                <p className="text-xs text-muted-foreground">{event.venue.city}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-foreground font-mono-nums">{formatEventDate(event.date)}</p>
          </div>

          {event.startTime && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                {event.showTimes && event.showTimes.length > 1 ? (
                  event.showTimes.map((t, i) => (
                    <span key={i} className="text-sm font-mono-nums text-foreground bg-accent px-2 py-0.5 rounded-inner">
                      {t}
                    </span>
                  ))
                ) : (
                  <p className="text-sm font-mono-nums text-foreground">{event.startTime}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent-foreground/60 bg-accent px-2 py-1 rounded-inner">
              {formatLabel(event.genre)}
            </span>
          </div>
        </div>

        {/* Directions */}
        {hasCoords && (
          <a
            href={`https://maps.google.com/maps?daddr=${event.venue.lat},${event.venue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-inner bg-card text-foreground text-sm font-medium shadow-card hover:bg-accent transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </a>
        )}
      </div>

      {/* Sticky bottom CTA */}
      {event.ticketUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGetTickets}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-card bg-primary text-primary-foreground font-bold text-base shadow-[0_0_30px_rgba(255,92,0,0.3)] hover:bg-primary/90 transition-colors"
          >
            <Ticket className="w-5 h-5" />
            Get Tickets
            <ExternalLink className="w-4 h-4 opacity-60" />
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
