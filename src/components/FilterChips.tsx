import { motion } from "framer-motion";
import { formatLabel } from "@/lib/formatters";

interface FilterChipsProps {
  genres: string[];
  selected: string;
  onSelect: (genre: string) => void;
  liveOnly: boolean;
  onToggleLive: () => void;
  showForYou?: boolean;
}

const FilterChips = ({ genres, selected, onSelect, liveOnly, onToggleLive, showForYou = false }: FilterChipsProps) => {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onToggleLive}
        className={`shrink-0 px-2.5 py-1.5 rounded-inner text-[10px] font-mono uppercase tracking-widest min-h-[32px] transition-colors duration-150 ${
          liveOnly
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {liveOnly && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />}
          Live Now
        </span>
      </motion.button>

      {showForYou && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect("For You")}
          className={`shrink-0 px-2.5 py-1.5 rounded-inner text-[10px] font-mono uppercase tracking-widest min-h-[32px] transition-colors duration-150 ${
            selected === "For You"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          ✦ For You
        </motion.button>
      )}

      {genres.map((genre) => (
        <motion.button
          key={genre}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(genre)}
          className={`shrink-0 px-2.5 py-1.5 rounded-inner text-[10px] font-mono uppercase tracking-widest min-h-[32px] transition-colors duration-150 ${
            selected === genre
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {formatLabel(genre)}
        </motion.button>
      ))}
    </div>
  );
};

export default FilterChips;
