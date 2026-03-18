import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Video, Upload, MapPin, Loader2 } from "lucide-react";
import { useVenues } from "@/hooks/useVenuesAndEvents";
import { uploadExperienceVideo, createExperiencePost } from "@/hooks/useExperiences";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PostExperienceProps {
  onClose: () => void;
  preselectedVenueId?: string | null;
}

const PostExperience = ({ onClose, preselectedVenueId }: PostExperienceProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [venueId, setVenueId] = useState(preselectedVenueId || "");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50MB");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user || !file || !venueId) return;
    setUploading(true);

    try {
      const videoUrl = await uploadExperienceVideo(user.id, file);
      await createExperiencePost({
        user_id: user.id,
        venue_id: venueId,
        video_url: videoUrl,
        caption: caption || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["experience-posts"] });
      toast.success("Experience posted! 🎶");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onClose}>
          <X className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground tracking-tight">Share Experience</h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!file || !venueId || uploading}
          className="px-4 py-2 rounded-inner bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Video upload */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative rounded-card overflow-hidden bg-black aspect-[9/16] max-h-[50vh]">
            <video
              src={previewUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => { setFile(null); setPreviewUrl(null); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[50vh] rounded-card border-2 border-dashed border-muted-foreground/20 bg-card flex flex-col items-center justify-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Tap to record or upload video</p>
            <p className="text-[10px] text-muted-foreground/50 font-mono">MAX 50MB • EXPIRES IN 24H</p>
          </motion.button>
        )}

        {/* Venue selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Where are you?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {venues.map((venue) => (
              <motion.button
                key={venue.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setVenueId(venue.id)}
                className={`flex items-center gap-2 p-3 rounded-inner text-left transition-colors ${
                  venueId === venue.id
                    ? "bg-primary/15 border border-primary/30"
                    : "bg-card border border-border/50"
                }`}
              >
                <MapPin className={`w-3 h-3 shrink-0 ${venueId === venue.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs truncate ${venueId === venue.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {venue.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Caption
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's happening? 🎵"
            maxLength={140}
            className="w-full bg-card rounded-inner px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none border border-border/50 focus:border-primary/50 transition-colors"
          />
          <p className="text-[10px] text-muted-foreground/40 text-right font-mono">{caption.length}/140</p>
        </div>
      </div>
    </motion.div>
  );
};

export default PostExperience;
