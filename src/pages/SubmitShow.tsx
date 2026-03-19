import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarIcon, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

const SubmitShow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sign in to add a show");
      navigate("/auth");
      return;
    }

    if (!venueName || !artist || !eventDate) {
      toast.error("Venue, artist, and date are required");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("show_submissions").insert({
      user_id: user.id,
      venue_name: venueName,
      city,
      artist,
      genre,
      event_date: format(eventDate, "yyyy-MM-dd"),
      start_time: startTime,
      ticket_url: ticketUrl || null,
      notes: notes || null,
    });
    setSaving(false);

    if (error) {
      toast.error("Couldn't submit show");
      return;
    }

    toast.success("Show submitted");
    navigate("/profile");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="px-4 pt-12 pb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Add a Show</h1>
          <p className="text-xs text-muted-foreground">Quick submit for review</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-card border border-border rounded-card p-4 space-y-4">
          <Input placeholder="Venue name *" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="Artist / Band *" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <Input placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !eventDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {eventDate ? format(eventDate, "PPP") : <span>Pick event date *</span>}
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

          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input placeholder="Ticket URL" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              {saving ? "Submitting..." : "Submit Show"}
            </Button>
          </motion.div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SubmitShow;
