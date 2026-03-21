import { useState } from "react";
import { X, PlusCircle, CalendarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SuggestShowModal = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const [venueName, setVenueName] = useState("");
  const [artist, setArtist] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!venueName || !artist || !eventDate) {
      toast.error("All fields are required");
      return;
    }

    if (!user) {
      toast.error("Sign in to suggest a show");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("show_submissions").insert({
      user_id: user.id,
      venue_name: venueName,
      artist,
      event_date: format(eventDate, "yyyy-MM-dd"),
    });
    setSaving(false);

    if (error) {
      toast.error("Couldn't submit suggestion");
      return;
    }

    toast.success("Show suggested — thanks!");
    setVenueName("");
    setArtist("");
    setEventDate(undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg bg-card rounded-t-card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Suggest a Show</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <Input placeholder="Venue name *" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
            <Input placeholder="Artist / Band *" value={artist} onChange={(e) => setArtist(e.target.value)} />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : "Pick a date *"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" />
                {saving ? "Submitting…" : "Submit Suggestion"}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuggestShowModal;
