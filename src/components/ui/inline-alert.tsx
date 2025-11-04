"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface InlineAlertProps {
  variant: "success" | "error" | "info";
  message: string;
  description?: string;
  onDismiss?: () => void;
}

export function InlineAlert({
  variant,
  message,
  description,
  onDismiss,
}: InlineAlertProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800/50",
      iconColor: "text-green-600 dark:text-green-400",
      textColor: "text-green-900 dark:text-green-100",
      descColor: "text-green-700 dark:text-green-300",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800/50",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-900 dark:text-red-100",
      descColor: "text-red-700 dark:text-red-300",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-900 dark:text-blue-100",
      descColor: "text-blue-700 dark:text-blue-300",
    },
  };

  const {
    icon: Icon,
    bgColor,
    borderColor,
    iconColor,
    textColor,
    descColor,
  } = config[variant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`${bgColor} ${borderColor} border-l-4 p-4 mb-4 shadow-sm`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${textColor}`}>{message}</p>
              {description && (
                <p className={`text-sm mt-1 ${descColor}`}>{description}</p>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
