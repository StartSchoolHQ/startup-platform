import { LeaderboardEntry } from "@/types/leaderboard";

export const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    user: {
      userId: "mock-user-1",
      name: "John Doe",
      avatar: "/avatars/john-doe.jpg",
      teams: "1 Teams",
      isCurrentUser: false,
    },
    xp: {
      current: 4850,
      change: 320,
    },
    points: {
      current: 2940,
      change: 320,
    },
    achievements: {
      current: 20,
      change: 3,
    },
    tasks: {
      current: 140,
      change: 15,
    },
    streak: {
      days: 21,
      type: "active",
    },
    change: {
      direction: "up",
      amount: 1,
    },
    weeklyReports: 0,
    peerReviews: 0,
    rankIcon: "crown",
  },
  {
    rank: 2,
    user: {
      userId: "mock-user-2",
      name: "John Doe",
      avatar: "/avatars/john-doe.jpg",
      teams: "4 Teams",
      isCurrentUser: false,
    },
    xp: {
      current: 4850,
      change: 320,
    },
    points: {
      current: 2940,
      change: 320,
    },
    achievements: {
      current: 20,
      change: 3,
    },
    tasks: {
      current: 140,
      change: 15,
    },
    streak: {
      days: 18,
      type: "active",
    },
    change: {
      direction: "down",
      amount: 1,
    },
    weeklyReports: 0,
    peerReviews: 0,
    rankIcon: "trophy",
  },
  {
    rank: 3,
    user: {
      userId: "mock-user-3",
      name: "John Doe",
      avatar: "/avatars/john-doe.jpg",
      teams: "2 Teams",
      isCurrentUser: false,
    },
    xp: {
      current: 4850,
      change: 320,
    },
    points: {
      current: 2940,
      change: 320,
    },
    achievements: {
      current: 20,
      change: 3,
    },
    tasks: {
      current: 140,
      change: 15,
    },
    streak: {
      days: 15,
      type: "active",
    },
    change: {
      direction: "none",
      amount: 0,
    },
    weeklyReports: 0,
    peerReviews: 0,
    rankIcon: "medal",
  },
  {
    rank: 4,
    user: {
      userId: "mock-user-4",
      name: "You",
      avatar: "/avatars/you.jpg",
      teams: "No Teams",
      isCurrentUser: true,
    },
    xp: {
      current: 4850,
      change: 320,
    },
    points: {
      current: 2940,
      change: 320,
    },
    achievements: {
      current: 20,
      change: 3,
    },
    tasks: {
      current: 140,
      change: 15,
    },
    streak: {
      days: 12,
      type: "warning",
    },
    change: {
      direction: "up",
      amount: 1,
    },
    weeklyReports: 0,
    peerReviews: 0,
    rankIcon: "flame",
  },
  {
    rank: 5,
    user: {
      userId: "mock-user-5",
      name: "John Doe",
      avatar: "/avatars/john-doe.jpg",
      teams: "No Teams",
      isCurrentUser: false,
    },
    xp: {
      current: 4850,
      change: 320,
    },
    points: {
      current: 2940,
      change: 320,
    },
    achievements: {
      current: 20,
      change: 3,
    },
    tasks: {
      current: 140,
      change: 15,
    },
    streak: {
      days: 3,
      type: "inactive",
    },
    change: {
      direction: "down",
      amount: 1,
    },
    weeklyReports: 0,
    peerReviews: 0,
    rankIcon: "none",
  },
];
