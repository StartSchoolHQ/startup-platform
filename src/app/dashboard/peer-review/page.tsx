import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatsCardComponent } from "@/components/dashboard/stats-card"
import { TestsTable } from "@/components/peer-review/tests-table"
import { peerReviewData } from "@/data/peer-review-data"
import { ExternalLink, Trophy, User, Users, Medal, Zap, Banknote, Lightbulb, CheckCircle, BarChart3, X } from "lucide-react"

export default function PeerReviewPage() {
  // Render function for Available Tests action column
  const renderAvailableTestsAction = (test: any) => (
    <div className="flex justify-end items-center gap-4">
      <span className="text-sm text-gray-700">Tips</span>
      <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
        <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center bg-white">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        </div>
        <span className="text-sm font-medium text-gray-900">Test</span>
      </button>
    </div>
  )

  // Render function for My Tests action column
  const renderMyTestsAction = (test: any) => (
    <div className="flex justify-end items-center gap-4">
      <span className="text-sm text-gray-700">Tips</span>
      <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
        <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center bg-white">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        </div>
        <span className="text-sm font-medium text-gray-900">Complete</span>
      </button>
    </div>
  )

  // Render function for My Tasks status column
  const renderMyTasksStatus = (task: any) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case "accepted":
          return {
            text: "Accepted",
            class: "bg-green-100 text-green-800 border-green-200",
            icon: <CheckCircle className="h-3 w-3 mr-1" />
          }
        case "in-progress":
          return {
            text: "In Progress", 
            class: "bg-orange-100 text-orange-800 border-orange-200",
            icon: <BarChart3 className="h-3 w-3 mr-1" />
          }
        case "denied":
          return {
            text: "Denied",
            class: "bg-red-100 text-red-800 border-red-200",
            icon: <X className="h-3 w-3 mr-1" />
          }
        default:
          return {
            text: "Lorem Ipsum",
            class: "bg-gray-100 text-gray-800 border-gray-200",
            icon: null
          }
      }
    }

    const statusConfig = getStatusConfig(task.status)
    
    return (
      <div className="flex justify-end">
        <Badge variant="secondary" className={`${statusConfig.class} px-3 py-1 flex items-center p-2`}>
          {statusConfig.icon}
          {statusConfig.text}
        </Badge>
      </div>
    )
  }

  return (
    <main className="p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Task Testing & Acceptance</h1>
          <p className="text-muted-foreground">Compete with others and track your progress</p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Read About Testing
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {peerReviewData.statsCards.map((card, index) => (
          <StatsCardComponent
            key={index}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconColor={card.iconColor}
          />
        ))}
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="available-tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="available-tests" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Available Tests
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Tests
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available-tests" className="space-y-6">
          <TestsTable
            title="Available Tests"
            data={peerReviewData.availableTests}
            columns={{
              taskToTest: "Task to Test",
              submittedBy: "Submitted By",
              difficulty: "Difficulty",
              xp: "XP",
              points: "Points",
              action: "Action"
            }}
            renderActionColumn={renderAvailableTestsAction}
            getPersonData={(test) => test.submittedBy}
          />
        </TabsContent>

        <TabsContent value="my-tests" className="space-y-6">
          <TestsTable
            title="My Tests"
            data={peerReviewData.myTests}
            columns={{
              taskToTest: "Task to Test",
              submittedBy: "Tested By",
              difficulty: "Difficulty",
              xp: "XP",
              points: "Points",
              action: "Action"
            }}
            renderActionColumn={renderMyTestsAction}
            getPersonData={(test) => test.testedBy}
          />
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-6">
          <TestsTable
            title="My Tasks"
            data={peerReviewData.myTasks}
            columns={{
              taskToTest: "Task to Test",
              submittedBy: "Submitted By",
              difficulty: "Difficulty",
              xp: "XP",
              points: "Points",
              action: "Status"
            }}
            renderActionColumn={renderMyTasksStatus}
            getPersonData={(task) => task.testedBy}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
} 