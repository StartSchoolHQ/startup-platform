import { z } from "zod";

// ============================================
// API REQUEST SCHEMAS
// ============================================

/**
 * Support ticket validation schema
 */
export const SupportTicketSchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"], {
    message: "Priority must be low, medium, high, or critical",
  }),
  category: z.string().min(1, "Category is required").max(50),
  title: z.string().min(1, "Title is required").max(100),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters"),
  userInfo: z.object({
    id: z.string().uuid("Invalid user ID"),
    name: z.string().min(1).max(100),
    email: z.string().email("Invalid email address").max(100),
  }),
});

export type SupportTicketData = z.infer<typeof SupportTicketSchema>;

/**
 * Single invitation schema
 */
const InvitationSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  first_name: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .regex(
      /^[\p{L}\s'-]+$/u,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),
  last_name: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .regex(
      /^[\p{L}\s'-]+$/u,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .trim(),
});

/**
 * Bulk invite validation schema
 */
export const BulkInviteSchema = z.object({
  invitations: z
    .array(InvitationSchema)
    .min(1, "At least one invitation is required")
    .max(100, "Maximum 100 invitations allowed"),
});

export type BulkInviteData = z.infer<typeof BulkInviteSchema>;
export type InvitationData = z.infer<typeof InvitationSchema>;

// ============================================
// FORM SCHEMAS
// ============================================

/**
 * Weekly report validation schema (team context)
 * Updated 2026-01-29:
 * - Blockers section now optional single field
 * - Commitment explanation optional & conditional (only for in_progress/not_done)
 * - nextWeekPriority replaced with nextWeekCommitments array
 * - Min chars reduced to 5-10 for required fields
 */
export const WeeklyReportSchema = z.object({
  // Q1: Last week's commitments - explanation is optional
  commitments: z
    .array(
      z.object({
        text: z.string().min(5, "Commitment must be at least 5 characters"),
        status: z.enum(["completed", "in_progress", "not_done"]),
        explanation: z.string().optional(),
      })
    )
    .refine(
      (commitments) => commitments.some((c) => c.text.trim().length >= 5),
      { message: "At least one commitment is required" }
    ),
  // Q2: Blockers - now optional single field
  blockers: z.string().optional(),
  meetingsHeld: z.number().int().min(0, "Meetings held cannot be negative"),
  keyInsight: z.string().min(5, "Key insight must be at least 5 characters"),
  mostImportantOutcome: z
    .string()
    .min(5, "Most important outcome must be at least 5 characters"),
  measurableProgress: z
    .string()
    .min(5, "Measurable progress must be at least 5 characters"),
  biggestAchievement: z
    .string()
    .min(5, "Achievement must be at least 5 characters"),
  achievementImpact: z
    .string()
    .min(5, "Achievement impact must be at least 5 characters"),
  // Q7: Top 3 commitments for next week (replaces nextWeekPriority)
  nextWeekCommitments: z
    .array(z.string())
    .refine((commitments) => commitments.some((c) => c.trim().length >= 5), {
      message: "At least one commitment for next week is required",
    }),
  teamRecognition: z.string().optional(),
  alignmentScore: z.number().int().min(1).max(10),
  alignmentReason: z
    .string()
    .min(5, "Alignment reason must be at least 5 characters"),
});

export type WeeklyReportFormData = z.infer<typeof WeeklyReportSchema>;

/**
 * Client meeting validation schema
 * Updated 2026-01-20:
 * - Min chars reduced to 5 (3 for role)
 * - clientResponsibilities and segmentRelevance now optional
 * - Added meetingDate for backdate support
 * - User-friendly error messages
 */
export const ClientMeetingSchema = z.object({
  clientName: z
    .string()
    .min(1, "Please enter the client or company name")
    .min(2, "Client name is too short (minimum 2 characters)")
    .trim(),
  responsibleUserId: z
    .string()
    .min(1, "Please select who conducted this meeting"),
  meetingDate: z.string().min(1, "Please select when the meeting took place"),
  // Q1: Who & relevance
  clientRole: z
    .string()
    .min(1, "Please enter the client's role")
    .min(3, "Role is too short (minimum 3 characters)"),
  clientResponsibilities: z
    .string()
    .min(5, "If provided, responsibilities should be at least 5 characters")
    .optional()
    .or(z.literal("")),
  segmentRelevance: z
    .string()
    .min(5, "If provided, segment relevance should be at least 5 characters")
    .optional()
    .or(z.literal("")),
  // Q2: Goal & assumptions (combined into single field)
  meetingGoal: z
    .string()
    .min(1, "Please describe the meeting goal and assumptions you tested")
    .min(
      5,
      "Meeting goal is too short - please provide more detail (minimum 5 characters)"
    ),
  assumptionsTested: z
    .string()
    .min(5, "If provided, assumptions should be at least 5 characters")
    .optional()
    .or(z.literal("")),
  // Q3: Feedback
  clientFeedback: z
    .string()
    .min(1, "Please describe what feedback the client gave")
    .min(
      5,
      "Client feedback is too short - what did they say? (minimum 5 characters)"
    ),
  feedbackValidation: z
    .string()
    .min(5, "If provided, validation feedback should be at least 5 characters")
    .optional()
    .or(z.literal("")),
  feedbackChallenges: z
    .string()
    .min(5, "If provided, challenges feedback should be at least 5 characters")
    .optional()
    .or(z.literal("")),
  // Q4: Main learnings
  mainLearnings: z
    .string()
    .min(1, "Please share what you learned from this meeting")
    .min(
      5,
      "Main learnings is too short - what insights did you gain? (minimum 5 characters)"
    ),
  // Q5: Next steps
  nextStepsClient: z
    .string()
    .min(1, "Please describe the next steps agreed with the client")
    .min(
      5,
      "Next steps is too short - what was agreed? (minimum 5 characters)"
    ),
  interestLevel: z
    .string()
    .min(1, "Please select the client's level of interest"),
  // Q6: Internal actions
  internalActions: z
    .string()
    .min(1, "Please describe what your team will do next")
    .min(
      5,
      "Internal actions is too short - what will you do? (minimum 5 characters)"
    ),
  actionDeadline: z
    .string()
    .min(1, "Please set a deadline for the action items"),
  actionResponsible: z
    .string()
    .min(1, "Please select who is responsible for follow-up"),
  // Q7: Team improvements (optional)
  teamImprovements: z.string().optional(),
});

export type ClientMeetingFormData = z.infer<typeof ClientMeetingSchema>;

// ============================================
// ADMIN API VALIDATION SCHEMAS
// ============================================

/**
 * UUID validation helper
 */
export const UUIDSchema = z.string().uuid("Invalid UUID format");

/**
 * Admin team update schema
 */
export const AdminTeamUpdateSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100).optional(),
  description: z.string().max(500).optional(),
  website: z.string().url("Invalid URL format").max(255).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  team_points: z.number().int().min(0).optional(),
  strikes_count: z.number().int().min(0).max(3).optional(),
});

export type AdminTeamUpdate = z.infer<typeof AdminTeamUpdateSchema>;

/**
 * Admin user update schema
 */
export const AdminUserUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  primary_role: z.enum(["student", "admin"]).optional(),
  secondary_roles: z.array(z.string()).optional(),
  balance: z.number().min(0).optional(),
  total_points: z.number().int().min(0).optional(),
});

export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;

/**
 * Resend invite schema
 */
export const ResendInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ResendInvite = z.infer<typeof ResendInviteSchema>;

// ============================================
// JSONB FIELD SCHEMAS
// ============================================

/**
 * Peer review history entry schema
 * Validates the structure written by add_peer_review_history_entry RPC
 */
export const peerReviewHistoryEntrySchema = z.object({
  timestamp: z.string(),
  event_type: z.string(),
  reviewer_id: z.string().uuid().nullable(),
  reviewer_name: z.string().nullable(),
  reviewer_avatar_url: z.string().nullable(),
  decision: z.string().nullable(),
  feedback: z.string().nullable(),
});

/**
 * Peer review history array schema
 * Used for task_progress.peer_review_history JSONB field
 */
export const peerReviewHistorySchema = z.array(peerReviewHistoryEntrySchema);

export type PeerReviewHistoryEntry = z.infer<
  typeof peerReviewHistoryEntrySchema
>;
export type PeerReviewHistory = z.infer<typeof peerReviewHistorySchema>;
