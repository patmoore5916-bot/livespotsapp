import { motion } from "framer-motion";

interface MapPinProps {
  isLive: boolean;
  x: number;
  y: number;
  label: string;
  isSelected?: boolean;
  onClick: () => void;
}

const MapPin = ({ isLive, x, y, label, isSelected, onClick }: MapPinProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${x}%`, top: `${y}%` }}
      whileTap={{ scale: 0.85 }}
      animate={isSelected ? { scale: 1.3 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring for live venues */}
        {isLive && (
          <>
            <div className="absolute w-10 h-10 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute w-7 h-7 rounded-full bg-primary/15" />
          </>
        )}
        {/* Core dot */}
        <div
          className={`relative w-3.5 h-3.5 rounded-full border-2 ${
            isLive
              ? "bg-primary border-primary shadow-[0_0_12px_hsl(22_100%_50%/0.6)]"
              : "bg-muted-foreground/60 border-muted-foreground/40"
          } ${isSelected ? "ring-2 ring-primary-foreground ring-offset-2 ring-offset-background" : ""}`}
        />
      </div>
      <span
        className={`text-[9px] font-mono font-medium whitespace-nowrap px-1.5 py-0.5 rounded-sm transition-colors ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : isLive
            ? "text-white/80 bg-black/50 backdrop-blur-sm"
            : "text-white/40 bg-black/30 backdrop-blur-sm"
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
};

export default MapPin;
