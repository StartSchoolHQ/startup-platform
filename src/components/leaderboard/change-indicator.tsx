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

  const isUp = direction === "up";

  return (
    <motion.div
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
        isUp
          ? "bg-green-50 dark:bg-green-950/30"
          : "bg-red-50 dark:bg-red-950/30"
      }`}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {isUp ? (
        <motion.div
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowUp className="h-3.5 w-3.5 text-green-600" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowDown className="h-3.5 w-3.5 text-red-600" />
        </motion.div>
      )}
      <span
        className={`text-sm font-medium ${
          isUp ? "text-green-600" : "text-red-600"
        }`}
      >
        {amount}
      </span>
    </motion.div>
  );
}
