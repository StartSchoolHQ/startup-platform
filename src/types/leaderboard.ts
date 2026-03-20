export interface LeaderboardEntry {
  rank: number;
  user: {
    userId: string;
    name: string;
    avatar: string;
    teams: string;
    isCurrentUser?: boolean;
  };
  xp: {
    current: number;
    change: number;
  };
  points: {
    current: number;
    change: number;
  };
  achievements: {
    current: number;
    change: number;
  };
  tasks: {
    current: number;
    change: number;
  };
  weeklyReports: number;
  peerReviews: number;
  streak: {
    days: number;
    type: "active" | "warning" | "inactive";
  };
  change: {
    direction: "up" | "down" | "none";
    amount: number;
    isNew?: boolean;
  };
  rankIcon?: "crown" | "trophy" | "medal" | "flame" | "none";
}

export interface TeamLeaderboardEntry {
  rank: number;
  team: {
    teamId: string;
    name: string;
    logoUrl?: string;
    memberCount: number;
    isCurrentUserTeam?: boolean;
    xpPerMember?: number;
  };
  xp: {
    current: number;
    change: number;
  };
  points: {
    current: number;
    change: number;
  };
  tasks: {
    current: number;
    change: number;
  };
  meetings: {
    current: number;
    change: number;
  };
  change: {
    direction: "up" | "down" | "none";
    amount: number;
    isNew?: boolean;
  };
  rankIcon?: "crown" | "trophy" | "medal" | "none";
}
