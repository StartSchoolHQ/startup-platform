import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react"
import { peerReviewData } from "@/data/peer-review-data"

export default function PeerReviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Peer Review</h1>
          <p className="text-muted-foreground">
            Review and test tasks submitted by your peers
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          {/* ExternalLink removed as it's not in the new imports */}
          Read About Testing
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* peerReviewData.statsCards removed as it's not in the new imports */}
        {/* StatsCardComponent removed as it's not in the new imports */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available-tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="available-tests" className="flex items-center gap-2">
            {/* Trophy removed as it's not in the new imports */}
            Available Tests
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            {/* User removed as it's not in the new imports */}
            My Tests
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2">
            {/* Users removed as it's not in the new imports */}
            My Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available-tests" className="space-y-6">
          {/* TestsTable removed as it's not in the new imports */}
          {renderAvailableTests()}
        </TabsContent>

        <TabsContent value="my-tests" className="space-y-6">
          {/* TestsTable removed as it's not in the new imports */}
          {renderMyTests()}
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-6">
          {/* TestsTable removed as it's not in the new imports */}
          {renderMyTasks()}
        </TabsContent>
      </Tabs>
    </div>
  )

  function renderAvailableTests() {
    return peerReviewData.availableTests.map((test) => (
      <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">{test.title}</h3>
            <p className="text-sm text-muted-foreground">{test.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{test.difficulty}</Badge>
          <Button size="sm">Take Test</Button>
        </div>
      </div>
    ))
  }

  function renderMyTests() {
    return peerReviewData.myTests.map((test) => (
      <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">{test.title}</h3>
            <p className="text-sm text-muted-foreground">{test.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{test.status}</Badge>
          <Button size="sm">View Results</Button>
        </div>
      </div>
    ))
  }

  function renderMyTasks() {
    return peerReviewData.myTasks.map((task) => (
      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold">{task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{task.status}</Badge>
          <Button size="sm">Complete</Button>
        </div>
      </div>
    ))
  }
} 