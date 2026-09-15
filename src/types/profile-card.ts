import type { BackgroundLean } from "@/lib/validation-schemas";

/** Return shape of get_user_profile_card_v2. */
export interface ProfileCard {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  member_since: string | null;
  my_journey_xp: number;
  my_journey_credits: number;
  team_xp: number;
  team_points: number;
  /** Approved active solo tasks — same count as the My Journey page. */
  my_journey_tasks_completed: number;
  /** All active solo tasks. */
  my_journey_tasks_total: number;
  team: ProfileCardTeam | null;
  founder_card: ProfileCardFounder | null;
}

export interface ProfileCardTeam {
  id: string;
  name: string;
  role: string | null;
}

export interface ProfileCardFounder {
  background_lean: BackgroundLean;
  background_reason: string;
  bio_energizes: string;
  bio_skills: string;
  bio_gaps: string;
  updated_at: string;
}
