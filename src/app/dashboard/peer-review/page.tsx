"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  CheckCircle2,
  Users,
  Medal,
  Zap,
  CreditCard,
  ExternalLink,
  Clock,
} from "lucide-react";
import { peerReviewData } from "@/data/peer-review-data";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
} from "@/lib/database";
import { useApp } from "@/contexts/app-context";

interface AvailableTask {
  id: string;
  task_id: string;
  team_id: string;
  assigned_to_user_id: string | null;
  completed_at: string;
  submission_data: Record<string, unknown>;
  tasks: {
    id: string;
    title: string;
    description: string;
    difficulty_level: number;
    base_xp_reward: number;
    category: string;
  } | null;
  teams: {
    id: string;
    name: string;
  } | null;
}

export default function PeerReviewPage() {
  const { user } = useApp();
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [myTasks, setMyTasks] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user?.id) return;

      try {
        const [available, mySubmitted] = await Promise.all([
          getAvailableTasksForReview(user.id),
          getMySubmittedTasksForReview(user.id),
        ]);

        // Type guard to check if data is valid
        const isValidTaskArray = (data: unknown): data is AvailableTask[] => {
          return (
            Array.isArray(data) &&
            (data.length === 0 ||
              (data[0] && typeof data[0] === "object" && "id" in data[0]))
          );
        };

        if (isValidTaskArray(available)) {
          setAvailableTasks(available);
        } else {
          console.error("Invalid available tasks data:", available);
          setAvailableTasks([]);
        }

        if (isValidTaskArray(mySubmitted)) {
          setMyTasks(mySubmitted);
        } else {
          console.error("Invalid my tasks data:", mySubmitted);
          setMyTasks([]);
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user?.id]);

  const getDifficultyConfig = (difficulty: number | string) => {
    const level =
      typeof difficulty === "string" ? parseInt(difficulty) : difficulty;

    if (level <= 1) {
      return {
        text: "Easy",
        class: "bg-green-100 text-green-800 border-green-200",
      };
    } else if (level <= 3) {
      return {
        text: "Medium",
        class: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    } else {
      return {
        text: "Hard",
        class: "bg-red-100 text-red-800 border-red-200",
      };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Testing & Acceptance</h1>
          <p className="text-muted-foreground">
            Compete with others and track your progress
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Read About Testing
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {peerReviewData.statsCards.map((card, index) => (
          <StatsCardComponent key={index} {...card} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available-tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="available-tests"
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            Available Tests
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            My Tests
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available-tests" className="space-y-6 mt-6">
          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">
                Loading available tasks...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Task to Test
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Team
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      XP Reward
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Submitted
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availableTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tasks available for review
                      </td>
                    </tr>
                  ) : (
                    availableTasks
                      .filter((task) => task.tasks && task.teams) // Filter out tasks with null relations
                      .map((task) => {
                        const difficultyConfig = getDifficultyConfig(
                          task.tasks!.difficulty_level
                        );

                        return (
                          <tr
                            key={task.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100">
                                  <Medal className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {task.tasks!.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {task.tasks!.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-medium">
                                  {task.teams!.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className={difficultyConfig.class}
                              >
                                {difficultyConfig.text}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">
                                  {task.tasks!.base_xp_reward}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(task.completed_at)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-end">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-xs px-3 py-2"
                                >
                                  Accept Testing
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tests" className="space-y-6 mt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-medium text-gray-500">
                    Task to Test
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-500">
                    Tested By
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-500">
                    Difficulty
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-500">
                    XP
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-500">
                    Points
                  </th>
                  <th className="text-right py-4 px-4 font-medium text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {peerReviewData.myTests.map((test) => {
                  const difficultyConfig = getDifficultyConfig(test.difficulty);

                  return (
                    <tr
                      key={test.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100">
                            <Medal className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {test.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {test.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={test.testedBy.avatar}
                              alt={test.testedBy.name}
                            />
                            <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                              {test.testedBy.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {test.testedBy.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {test.testedBy.date}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant="secondary"
                          className={difficultyConfig.class}
                        >
                          {difficultyConfig.text}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">{test.xp}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            {test.points}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs px-3 py-2"
                          >
                            View More Info
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-6 mt-6">
          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">Loading my tasks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Task
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Team
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Submitted
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        You haven&apos;t submitted any tasks for review
                      </td>
                    </tr>
                  ) : (
                    myTasks
                      .filter((task) => task.tasks && task.teams) // Filter out tasks with null relations
                      .map((task) => {
                        const difficultyConfig = getDifficultyConfig(
                          task.tasks!.difficulty_level
                        );

                        return (
                          <tr
                            key={task.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100">
                                  <Medal className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {task.tasks!.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {task.tasks!.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium">
                                  {task.teams!.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className={difficultyConfig.class}
                              >
                                {difficultyConfig.text}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-800 border-orange-200"
                              >
                                Pending Review
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(task.completed_at)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs px-3 py-2"
                                >
                                  View Submission
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
