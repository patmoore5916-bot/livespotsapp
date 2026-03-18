import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import MapView from "@/components/MapView";
import BottomSheet from "@/components/BottomSheet";
import ExperienceStories from "@/components/ExperienceStories";
import ExperienceViewer from "@/components/ExperienceViewer";
import PostExperience from "@/components/PostExperience";
import { useEvents, useVenues } from "@/hooks/useVenuesAndEvents";
import { useExperiencePosts } from "@/hooks/useExperiences";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import HeaderAuth from "@/components/HeaderAuth";
import { Search, Locate } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Index = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState(1);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showPost, setShowPost] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location, cityName, requestLocation } = useUserLocation();
  const { data: prefs } = useUserPreferences();

  const { data: venues = [] } = useVenues();
  const { data: events = [] } = useEvents();
  const { data: experiencePosts = [] } = useExperiencePosts();

  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    setSheetSnap(1);
  };

  const handlePostTap = () => {
    if (!user) {
      toast("Sign in to share your experience", {
        action: { label: "Sign In", onClick: () => navigate("/auth") },
      });
      return;
    }
    setShowPost(true);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-inner px-4 min-h-[44px] shadow-card">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search cities, venues, artists..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none w-full py-3"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={requestLocation}
            className="w-11 h-11 rounded-inner bg-card/80 backdrop-blur-md shadow-card flex items-center justify-center"
          >
            <Locate className="w-4 h-4 text-foreground" />
          </motion.button>
          <HeaderAuth />
        </div>

        {/* Experience Stories row */}
        <div className="bg-card/70 backdrop-blur-md rounded-inner px-3 py-2 shadow-card">
          <ExperienceStories
            posts={experiencePosts}
            onStoryTap={(i) => setViewerIndex(i)}
            onPostTap={handlePostTap}
          />
        </div>
      </div>

      {/* Map */}
      <MapView
        venues={venues}
        events={events}
        onVenueSelect={handleVenueSelect}
        selectedVenueId={selectedVenueId}
        userLocation={location}
      />

      {/* Bottom Sheet */}
      <BottomSheet
        events={selectedVenueId
          ? events.filter(e => e.venue.id === selectedVenueId)
          : events
        }
        snapPoint={sheetSnap}
        onSnapChange={setSheetSnap}
        cityName={cityName}
        userGenres={prefs?.genres}
      />

      {/* Full-screen experience viewer */}
      <AnimatePresence>
        {viewerIndex !== null && experiencePosts.length > 0 && (
          <ExperienceViewer
            posts={experiencePosts}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Post experience modal */}
      <AnimatePresence>
        {showPost && (
          <PostExperience
            onClose={() => setShowPost(false)}
            preselectedVenueId={selectedVenueId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
