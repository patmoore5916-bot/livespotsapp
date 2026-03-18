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
      whileTap={{ scale: 0.9 }}
      animate={isSelected ? { scale: 1.2 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <div className="relative">
        <div className={`w-4 h-4 rounded-full ${isLive ? "bg-primary" : "bg-muted-foreground"}`} />
        {isLive && (
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-primary animate-pulse-pin" />
        )}
      </div>
      <span className="text-[10px] font-mono font-medium text-foreground/80 whitespace-nowrap bg-background/60 px-1.5 py-0.5 rounded-sm backdrop-blur-sm">
        {label}
      </span>
    </motion.button>
  );
};

export default MapPin;
