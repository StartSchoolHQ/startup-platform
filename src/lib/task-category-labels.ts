/**
 * Human-readable labels for `tasks.category` slugs. Slugs not listed here
 * fall back to title case ("customer-discovery" -> "Customer Discovery").
 */
const TASK_CATEGORY_LABELS: Record<string, string> = {
  "customer-acquisition": "Customer Acquisition",
  "product-foundation": "Product Foundation",
  "idea-validation": "Idea Validation",
  "repeatable-tasks": "Recurring Tasks",
  "team-growth": "Team & Growth",
  "legal-finance": "Legal & Finance",
  pitch: "Pitch & Presentation",
  "founder-mindset": "Founder Mindset",
  reading: "Reading",
  "customer-discovery": "Customer Discovery",
  building: "Building",
  "business-fundamentals": "Business Fundamentals",
};

export function formatTaskCategory(category: string | null | undefined) {
  if (!category) return null;
  const known = TASK_CATEGORY_LABELS[category.toLowerCase()];
  if (known) return known;
  return category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
