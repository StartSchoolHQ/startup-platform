import {
  Trophy,
  Star,
  Target,
  Users,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  StatsCard,
  TeamProgressData,
  PersonalProgressData,
} from "@/types/dashboard";
import { getUserProfile } from "@/lib/database";

// Function to get real stats cards data
export async function getStatsCards(userId: string): Promise<StatsCard[]> {
  try {
    const userProfile = await getUserProfile(userId);

    return [
      {
        title: "XP Earned",
        value: userProfile.total_xp.toString(),
        subtitle: "Total experience points",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
      {
        title: "Points Earned",
        value: userProfile.total_credits.toString(),
        subtitle: "Available startup capital",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        title: "Achievements",
        value: "0/25", // Keep original mock format - will update later
        subtitle: "Achievements unlocked",
        icon: Target,
        iconColor: "text-yellow-500",
      },
      {
        title: "Tasks",
        value: "0/150", // Keep original mock format - will update later
        subtitle: "Tasks completed",
        icon: Users,
        iconColor: "text-green-500",
      },
    ];
  } catch (error) {
    console.error("Error fetching stats cards:", error);
    return getDefaultStatsCards();
  }
}

// Function to get real team progress data
export async function getTeamProgressData(
  userId: string
): Promise<TeamProgressData> {
  try {
    const userProfile = await getUserProfile(userId);

    return {
      title: "Your Teams Progress",
      joinTeamsText: "Join Teams",
      stats: [
        {
          value: userProfile.total_credits.toString(),
          label: "Total Points Earned", // Keep original label
          icon: Star,
          iconColor: "text-orange-500",
        },
        {
          value: userProfile.total_xp.toString(),
          label: "Total XP Earned",
          icon: Trophy,
          iconColor: "text-purple-500",
        },
      ],
      teams: [], // Keep empty for now - will populate with real team data later
    };
  } catch (error) {
    console.error("Error fetching team progress:", error);
    return getDefaultTeamProgressData();
  }
}

// Function to get real personal progress data
export async function getPersonalProgressData(
  userId: string
): Promise<PersonalProgressData> {
  try {
    const userProfile = await getUserProfile(userId);

    return {
      title: "Your Personal Progress",
      stats: [
        {
          value: userProfile.total_credits.toString(),
          label: "Total Points Earned", // Keep original label
          icon: Star,
          iconColor: "text-orange-500",
        },
        {
          value: userProfile.total_xp.toString(),
          label: "Total XP Earned",
          icon: Trophy,
          iconColor: "text-purple-500",
        },
      ],
      activities: [
        {
          name: "Strikes", // Keep original
          icon: AlertTriangle, // Use correct original icon
          iconColor: "text-red-500",
          indicators: "••", // Keep original indicators
        },
        {
          name: "30 Tests", // Keep original
          label: "How Much Tests Done", // Keep original label
          icon: FileText,
          iconColor: "text-pink-500",
        },
      ],
      actions: [
        {
          text: "Submit Weekly Report", // Keep original
          icon: FileText,
          variant: "outline",
        },
        {
          text: "View Progress", // Keep original
          icon: FileText,
          variant: "default",
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching personal progress:", error);
    return getDefaultPersonalProgressData();
  }
}

// Fallback default data
function getDefaultStatsCards(): StatsCard[] {
  return [
    {
      title: "XP Earned",
      value: "0",
      subtitle: "Total experience points",
      icon: Trophy,
      iconColor: "text-purple-500",
    },
    {
      title: "Points Earned",
      value: "500",
      subtitle: "Available startup capital",
      icon: Star,
      iconColor: "text-orange-500",
    },
    {
      title: "Achievements",
      value: "0/25",
      subtitle: "Achievements unlocked",
      icon: Target,
      iconColor: "text-yellow-500",
    },
    {
      title: "Tasks",
      value: "0/150",
      subtitle: "Tasks completed",
      icon: Users,
      iconColor: "text-green-500",
    },
  ];
}

function getDefaultTeamProgressData(): TeamProgressData {
  return {
    title: "Your Teams Progress",
    joinTeamsText: "Join Teams",
    stats: [
      {
        value: "500",
        label: "Total Points Earned",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        value: "0",
        label: "Total XP Earned",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
    ],
    teams: [],
  };
}

function getDefaultPersonalProgressData(): PersonalProgressData {
  return {
    title: "Your Personal Progress",
    stats: [
      {
        value: "500",
        label: "Total Points Earned",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        value: "0",
        label: "Total XP Earned",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
    ],
    activities: [
      {
        name: "Strikes",
        icon: AlertTriangle,
        iconColor: "text-red-500",
        indicators: "••",
      },
      {
        name: "30 Tests",
        label: "How Much Tests Done",
        icon: FileText,
        iconColor: "text-pink-500",
      },
    ],
    actions: [
      {
        text: "Submit Weekly Report",
        icon: FileText,
        variant: "outline",
      },
      {
        text: "View Progress",
        icon: FileText,
        variant: "default",
      },
    ],
  };
}
