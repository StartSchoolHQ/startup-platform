import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TestData {
  id: string
  taskToTest: string
  description: string
  submittedBy: string
  difficulty: string
  xp: number
  points: number
  status?: string
  testedBy?: string
}

interface TestsTableProps {
  title: string
  data: TestData[]
  columns: {
    taskToTest: string
    submittedBy: string
    difficulty: string
    xp: string
    points: string
    action: string
  }
  renderActionColumn: (item: TestData) => React.ReactNode
  getPersonData: (item: TestData) => string
}

export function TestsTable({ title, data, columns, renderActionColumn, getPersonData }: TestsTableProps) {
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return {
          text: "Easy",
          class: "bg-green-100 text-green-800 border-green-200"
        }
      case "medium":
        return {
          text: "Medium",
          class: "bg-yellow-100 text-yellow-800 border-yellow-200"
        }
      case "hard":
        return {
          text: "Hard",
          class: "bg-red-100 text-red-800 border-red-200"
        }
      default:
        return {
          text: "Unknown",
          class: "bg-gray-100 text-gray-800 border-gray-200"
        }
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 font-medium text-gray-500">{columns.taskToTest}</th>
              <th className="text-left py-4 px-4 font-medium text-gray-500">{columns.submittedBy}</th>
              <th className="text-left py-4 px-4 font-medium text-gray-500">{columns.difficulty}</th>
              <th className="text-left py-4 px-4 font-medium text-gray-500">{columns.xp}</th>
              <th className="text-left py-4 px-4 font-medium text-gray-500">{columns.points}</th>
              <th className="text-right py-4 px-4 font-medium text-gray-500">{columns.action}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const difficultyConfig = getDifficultyConfig(item.difficulty)
              const personData = getPersonData(item)
              
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100">
                        {/* Assuming Medal icon is no longer needed or replaced */}
                        {/* <Medal className="h-4 w-4" /> */}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.taskToTest}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/john-doe.jpg" alt={personData} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                          {personData.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{personData}</div>
                        <div className="text-xs text-muted-foreground">2 days ago</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="secondary" className={difficultyConfig.class}>
                      {difficultyConfig.text}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {/* Assuming Zap icon is no longer needed or replaced */}
                      {/* <Zap className="h-4 w-4 text-green-500" /> */}
                      <span className="text-sm font-medium">{item.xp}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {/* Assuming Banknote icon is no longer needed or replaced */}
                      {/* <Banknote className="h-4 w-4 text-blue-500" /> */}
                      <span className="text-sm font-medium">{item.points}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {renderActionColumn(item)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}