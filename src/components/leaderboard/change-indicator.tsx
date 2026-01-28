import { ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

interface ChangeIndicatorProps {
  direction: "up" | "down" | "none";
  amount: number;
}

export function ChangeIndicator({ direction, amount }: ChangeIndicatorProps) {
  if (direction === "none" || amount === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <motion.div
      className="flex items-center gap-1"
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {direction === "up" ? (
        <motion.div
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowUp className="h-3 w-3 text-primary" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowDown className="h-3 w-3 text-destructive" />
        </motion.div>
      )}
      <span
        className={`text-sm ${
          direction === "up" ? "text-primary" : "text-destructive"
        }`}
      >
        {amount}
      </span>
    </motion.div>
  );
}
