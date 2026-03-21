import { useMemo, useState, useCallback } from "react";
import MapView from "@/components/MapView";
import BottomNav from "@/components/BottomNav";
import { distanceMiles } from "@/lib/geo";
import BottomSheet, { type DateFilter } from "@/components/BottomSheet";
import { useEvents, useVenues } from "@/hooks/useVenuesAndEvents";
import { useVenueProfiles } from "@/hooks/useVenueProfiles";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import HeaderAuth from "@/components/HeaderAuth";
import { Search, Navigation, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>("all");
  const [locating, setLocating] = useState(false);
  const [flyToTrigger, setFlyToTrigger] = useState(0);
  const { location, cityName, requestLocation } = useUserLocation();
  const { data: prefs } = useUserPreferences();

  const { data: rawVenues = [], isLoading: venuesLoading } = useVenues();
  const { data: allEvents = [], isLoading: eventsLoading } = useEvents();
  const isLoading = venuesLoading || eventsLoading;

  const allVenues = useVenueProfiles(rawVenues, allEvents);

  const MAP_RADIUS = 30;
  const LIST_RADIUS = 60;

  const mapVenues = useMemo(() => {
    if (!location) return allVenues;
    return allVenues.filter(
      (v) => distanceMiles(location.lat, location.lng, v.lat, v.lng) <= MAP_RADIUS
    );
  }, [allVenues, location]);

  const mapEvents = useMemo(
    () => allEvents.filter((e) => e.venue.lat !== 0 && mapVenues.some((v) => v.id === e.venue.id)),
    [allEvents, mapVenues]
  );

  const listEvents = useMemo(() => allEvents, [allEvents]);

  // BUG 3: When selecting from map, reset date filter to "all" so venue events always show
  const handleVenueSelect = useCallback((venueId: string) => {
    setSelectedVenueId(venueId);
    setActiveDateFilter("all");
    setSheetSnap(1);
  }, []);

  const handleClearVenue = useCallback(() => {
    setSelectedVenueId(null);
  }, []);

  // UX 11: Location button with pulsing feedback
  const handleRequestLocation = useCallback(() => {
    setLocating(true);
    requestLocation();
    setFlyToTrigger(t => t + 1);
    setTimeout(() => setLocating(false), 5000);
  }, [requestLocation]);

  // Clear locating state when location arrives
  useMemo(() => {
    if (location) setLocating(false);
  }, [location]);

  const selectedVenueName = selectedVenueId
    ? allVenues.find(v => v.id === selectedVenueId)?.name ?? null
    : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background pb-[60px]">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-inner px-4 min-h-[44px] shadow-card">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search genre, artist, venue..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) {
                  setSheetSnap(1);
                  // BUG 4: auto-reset date filter on search
                  setActiveDateFilter("all");
                }
              }}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none w-full py-3"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRequestLocation}
            className={`w-11 h-11 rounded-inner bg-primary shadow-card flex items-center justify-center relative ${locating ? "animate-pulse" : ""}`}
          >
            <Navigation className={`w-5 h-5 text-primary-foreground fill-primary-foreground ${locating ? "animate-spin" : ""}`} />
            {locating && (
              <span className="absolute inset-0 rounded-inner border-2 border-primary-foreground/40 animate-ping" />
            )}
          </motion.button>
          <HeaderAuth />
        </div>
      </div>

      {/* Map */}
      <MapView
        venues={mapVenues}
        events={mapEvents}
        onVenueSelect={handleVenueSelect}
        selectedVenueId={selectedVenueId}
        userLocation={location}
        sheetSnap={sheetSnap}
        isLoading={isLoading}
        activeDateFilter={activeDateFilter}
        flyToTrigger={flyToTrigger}
      />

      {/* Bottom Sheet */}
      <BottomSheet
        events={selectedVenueId
          ? listEvents.filter(e => e.venue.id === selectedVenueId)
          : listEvents
        }
        snapPoint={sheetSnap}
        onSnapChange={setSheetSnap}
        cityName={cityName}
        userGenres={prefs?.genres}
        searchQuery={searchQuery}
        userLocation={location}
        selectedVenueName={selectedVenueName}
        onClearVenue={handleClearVenue}
        isLoading={isLoading}
        onDateFilterChange={setActiveDateFilter}
      />

      <BottomNav />
    </div>
  );
};

export default Index;
