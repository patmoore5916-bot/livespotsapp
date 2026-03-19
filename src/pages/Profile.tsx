import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Sparkles, ChevronRight, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const GENRES = [
  "Rock", "Indie", "Blues", "Jazz", "Electronic", "Country",
  "Soul", "Hip-Hop", "Folk", "Punk", "Metal", "R&B",
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: prefs, refetch } = useUserPreferences();
  const [editingGenres, setEditingGenres] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-background pb-20">
        <p className="text-muted-foreground mb-4">Sign in to view your profile</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/auth")}
          className="px-6 py-3 rounded-inner bg-primary text-primary-foreground font-semibold text-sm"
        >
          Sign In
        </motion.button>
        <BottomNav />
      </div>
    );
  }

  const initials = (user.email ?? "U").split("@")[0].slice(0, 2).toUpperCase();

  const openGenreEditor = () => {
    setSelected(prefs?.genres ?? []);
    setEditingGenres(true);
  };

  const toggleGenre = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const saveGenres = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, genres: selected }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save preferences");
    } else {
      toast.success("Preferences saved");
      setEditingGenres(false);
      refetch();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {user.email?.split("@")[0]}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Genre Preferences */}
      <div className="px-6 space-y-4">
        <button
          onClick={openGenreEditor}
          className="w-full flex items-center justify-between bg-card rounded-card p-4 border border-border"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Genre Preferences</p>
              <p className="text-xs text-muted-foreground">
                {prefs?.genres?.length
                  ? prefs.genres.slice(0, 3).join(", ") + (prefs.genres.length > 3 ? ` +${prefs.genres.length - 3}` : "")
                  : "Not set yet"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Genre editor inline */}
        {editingGenres && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-card rounded-card p-4 border border-border space-y-4"
          >
            <div className="grid grid-cols-3 gap-2">
              {GENRES.map((genre) => {
                const active = selected.includes(genre);
                return (
                  <motion.button
                    key={genre}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => toggleGenre(genre)}
                    className={`rounded-inner py-2.5 px-2 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {genre}
                  </motion.button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveGenres}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-inner text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </motion.button>
              <button
                onClick={() => setEditingGenres(false)}
                className="px-4 py-2.5 rounded-inner text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Sign out */}
        <button
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="w-full flex items-center gap-3 bg-card rounded-card p-4 border border-border text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
