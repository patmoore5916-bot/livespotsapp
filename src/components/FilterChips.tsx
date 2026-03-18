import { motion } from "framer-motion";

interface FilterChipsProps {
  genres: string[];
  selected: string;
  onSelect: (genre: string) => void;
  liveOnly: boolean;
  onToggleLive: () => void;
}

const FilterChips = ({ genres, selected, onSelect, liveOnly, onToggleLive }: FilterChipsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onToggleLive}
        className={`shrink-0 px-3 py-2 rounded-inner text-xs font-mono uppercase tracking-widest min-h-[44px] transition-colors duration-150 ${
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

      {genres.map((genre) => (
        <motion.button
          key={genre}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(genre)}
          className={`shrink-0 px-3 py-2 rounded-inner text-xs font-mono uppercase tracking-widest min-h-[44px] transition-colors duration-150 ${
            selected === genre
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {genre}
        </motion.button>
      ))}
    </div>
  );
};

export default FilterChips;
