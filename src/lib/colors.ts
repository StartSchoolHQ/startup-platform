/**
 * Unified color scheme constants for consistent styling across the application
 */

// Task Status Colors
export const STATUS_COLORS = {
  approved: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  revision_required: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  pending_review: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  in_progress: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  not_started: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
    dot: "bg-gray-500",
  },
  cancelled: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
    dot: "bg-gray-500",
  },
} as const;

// Difficulty Level Colors
export const DIFFICULTY_COLORS = {
  easy: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
  },
  hard: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
  },
} as const;

// Team Colors
export const TEAM_COLORS = {
  primary: "bg-blue-600", // For external teams in peer review
  secondary: "bg-green-500", // For own team in submitted tasks
  accent: "bg-purple-500", // For special indicators
} as const;

// Timeline Colors (for task history)
export const TIMELINE_COLORS = {
  assigned: "bg-purple-500",
  started: "bg-yellow-500",
  completed: "bg-blue-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  pending: "bg-orange-300",
} as const;

// Utility Colors
export const UTILITY_COLORS = {
  xp: "text-green-600", // XP reward indicators
  warning: "text-yellow-600", // Warning states
  error: "text-red-600", // Error states
  info: "text-blue-600", // Info states
  success: "text-green-600", // Success states
} as const;

// Gradient Colors (for avatars, cards, etc.)
export const GRADIENT_COLORS = {
  primary: "bg-gradient-to-r from-purple-400 to-pink-400",
  secondary: "bg-gradient-to-r from-blue-400 to-purple-400",
  accent: "bg-gradient-to-br from-blue-50 to-indigo-50",
  success: "bg-gradient-to-br from-green-50 to-emerald-50",
} as const;

// Helper functions to get color classes
export function getStatusColorClasses(status: keyof typeof STATUS_COLORS) {
  return STATUS_COLORS[status] || STATUS_COLORS.not_started;
}

export function getDifficultyColorClasses(level: number) {
  if (level <= 1) return DIFFICULTY_COLORS.easy;
  if (level <= 3) return DIFFICULTY_COLORS.medium;
  return DIFFICULTY_COLORS.hard;
}

export function getTimelineColorClass(eventType: keyof typeof TIMELINE_COLORS) {
  return TIMELINE_COLORS[eventType] || TIMELINE_COLORS.pending;
}
