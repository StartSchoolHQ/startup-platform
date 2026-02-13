export interface LeaderboardEntry {
  rank: number;
  user: {
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
  streak: {
    days: number;
    type: "active" | "warning" | "inactive";
  };
  change: {
    direction: "up" | "down" | "none";
    amount: number;
  };
  rankIcon?: "crown" | "trophy" | "medal" | "flame" | "none";
}

export interface TeamLeaderboardEntry {
  rank: number;
  team: {
    name: string;
    memberCount: number;
    isCurrentUserTeam?: boolean;
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
  };
  rankIcon?: "crown" | "trophy" | "medal" | "none";
}
