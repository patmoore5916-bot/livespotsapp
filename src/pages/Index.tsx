import { useMemo, useState } from "react";
import MapView from "@/components/MapView";
import BottomNav from "@/components/BottomNav";
import { distanceMiles } from "@/lib/geo";
import BottomSheet from "@/components/BottomSheet";
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
  const [sheetSnap, setSheetSnap] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { location, cityName, requestLocation } = useUserLocation();
  const { data: prefs } = useUserPreferences();

  const { data: rawVenues = [], isLoading: venuesLoading } = useVenues();
  const { data: allEvents = [], isLoading: eventsLoading } = useEvents();
  const isLoading = venuesLoading || eventsLoading;

  // Enrich venues with music frequency profiles
  const allVenues = useVenueProfiles(rawVenues, allEvents);

  const MAP_RADIUS = 30;
  const LIST_RADIUS = 60;

  const mapVenues = useMemo(() => {
    if (!location) return allVenues;
    return allVenues.filter(
      (v) => distanceMiles(location.lat, location.lng, v.lat, v.lng) <= MAP_RADIUS
    );
  }, [allVenues, location]);

  const listVenueIds = useMemo(() => {
    if (!location) return new Set(allVenues.map((v) => v.id));
    return new Set(
      allVenues
        .filter((v) => distanceMiles(location.lat, location.lng, v.lat, v.lng) <= LIST_RADIUS)
        .map((v) => v.id)
    );
  }, [allVenues, location]);

  const mapEvents = useMemo(
    () => allEvents.filter((e) => e.venue.lat !== 0 && mapVenues.some((v) => v.id === e.venue.id)),
    [allEvents, mapVenues]
  );

  // Show all events in the list — include events without a matched venue
  const listEvents = useMemo(
    () => allEvents,
    [allEvents]
  );

  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    setSheetSnap(1);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background pb-[60px]">
      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 right-4 z-40 flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-inner px-3 py-2 shadow-card"
          >
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                if (e.target.value) setSheetSnap(2);
              }}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none w-full py-3"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={requestLocation}
            className="w-11 h-11 rounded-inner bg-primary shadow-card flex items-center justify-center"
          >
            <Navigation className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
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
      />

      <BottomNav />
    </div>
  );
};

export default Index;
