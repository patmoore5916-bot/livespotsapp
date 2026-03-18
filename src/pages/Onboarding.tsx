import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GENRES = [
  "Rock", "Indie", "Blues", "Jazz", "Electronic", "Country",
  "Soul", "Hip-Hop", "Folk", "Punk", "Metal", "R&B",
];

const Onboarding = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, genres: selected }, { onConflict: "user_id" });

    setSaving(false);
    if (error) {
      toast.error("Couldn't save preferences");
      console.error(error);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12" style={{ backgroundColor: "#09090f" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-card bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">What's your vibe?</h1>
          <p className="text-sm text-muted-foreground">Pick the genres you love</p>
        </div>

        {/* Genre grid */}
        <div className="grid grid-cols-3 gap-3">
          {GENRES.map((genre) => {
            const active = selected.includes(genre);
            return (
              <motion.button
                key={genre}
                whileTap={{ scale: 0.93 }}
                onClick={() => toggle(genre)}
                className={`rounded-inner py-3 px-2 text-sm font-semibold transition-colors duration-150 min-h-[48px] ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {genre}
              </motion.button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="w-full min-h-[48px] bg-primary text-primary-foreground rounded-inner font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Let's Go"}
          </motion.button>
          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
