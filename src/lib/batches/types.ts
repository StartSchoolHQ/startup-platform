// Batch (cohort) close/reopen types. A batch row lives in diploma_batches;
// users.batch_id / teams.batch_id NULL means "current cohort or staff".

export interface BatchClosePreview {
  users: {
    id: string;
    name: string | null;
    email: string;
    team_names: string[];
  }[];
  teams: {
    id: string;
    name: string;
    member_count: number;
    member_names: string[];
    has_admin_member: boolean;
  }[];
}

export interface BanFailure {
  id: string;
  email: string | null;
  error: string;
}

export interface CloseBatchResult {
  users_archived: number;
  teams_archived: number;
  banned: number;
  banFailures: BanFailure[];
}

export interface ReopenBatchResult {
  users_reopened: number;
  teams_reopened: number;
  unbanned: number;
  banFailures: BanFailure[];
}

export interface RetryBansResult {
  banned: number;
  alreadyBanned: number;
  banFailures: BanFailure[];
}
