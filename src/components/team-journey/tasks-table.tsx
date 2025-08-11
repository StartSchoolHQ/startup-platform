import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Medal, CheckCircle, Zap, CreditCard } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  responsible?: {
    name: string
    avatar: string
    date: string
  }
  difficulty: "Easy" | "Medium" | "Hard"
  xp: number
  points: number
  action: "complete" | "done"
  hasTips?: boolean
}

interface TasksTableProps {
  tasks: Task[]
}

export function TasksTable({ tasks }: TasksTableProps) {
  const getDifficultyConfig = (difficulty: Task["difficulty"]) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Hard":
        return "bg-red-100 text-red-800"
    }
  }

  return (
    <div >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 font-medium text-gray-600">Task</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Responsible</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Difficulty</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">XP</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Points</th>
              <th className="text-right py-4 px-4 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr key={task.id} className={`${index < tasks.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50`}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100">
                      <Medal className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-muted-foreground">{task.description}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {task.responsible ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.responsible.avatar} alt={task.responsible.name} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                          {task.responsible.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-medium">{task.responsible.name}</div>
                        <div className="text-xs text-muted-foreground">{task.responsible.date}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <Badge variant="secondary" className={getDifficultyConfig(task.difficulty)}>
                    {task.difficulty}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{task.xp}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{task.points}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-end gap-2">
                    {task.action === "done" ? (
                      <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Button>
                    ) : (
                      <>
                        {task.hasTips && (
                          <Button variant="ghost" size="sm" className="text-xs px-2">
                            Tips
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
