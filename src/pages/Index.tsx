import { useState } from "react";
import MapView from "@/components/MapView";
import BottomSheet from "@/components/BottomSheet";
import { events } from "@/data/mockEvents";
import { Search, Locate, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState(1); // start at mid

  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    setSheetSnap(1);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-inner px-4 min-h-[44px] shadow-card">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search venues, artists..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none w-full py-3"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-11 h-11 rounded-inner bg-card/80 backdrop-blur-md shadow-card flex items-center justify-center"
        >
          <Locate className="w-4 h-4 text-foreground" />
        </motion.button>
      </div>

      {/* Map */}
      <MapView onVenueSelect={handleVenueSelect} selectedVenueId={selectedVenueId} />

      {/* Bottom Sheet */}
      <BottomSheet
        events={selectedVenueId
          ? events.filter(e => e.venue.id === selectedVenueId)
          : events
        }
        snapPoint={sheetSnap}
        onSnapChange={setSheetSnap}
      />
    </div>
  );
};

export default Index;
