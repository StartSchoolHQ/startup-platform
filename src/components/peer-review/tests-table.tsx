import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Medal, Zap, Banknote, Lightbulb } from "lucide-react"

interface TestsTableProps {
  title: string
  data: any[]
  columns: {
    taskToTest: string
    submittedBy: string
    difficulty: string
    xp: string
    points: string
    action: string
  }
  renderActionColumn: (item: any) => React.ReactNode
  getPersonData: (item: any) => { name: string; avatar: string; date: string }
}

export function TestsTable({ 
  title, 
  data, 
  columns, 
  renderActionColumn, 
  getPersonData 
}: TestsTableProps) {
  // Function to get difficulty badge styling
  const getDifficultyConfig = (difficulty: "easy" | "medium" | "hard") => {
    switch (difficulty) {
      case "easy":
        return { text: "Easy", class: "bg-green-100 text-green-800" }
      case "medium":
        return { text: "Medium", class: "bg-yellow-100 text-yellow-800" }
      case "hard":
        return { text: "Hard", class: "bg-red-100 text-red-800" }
    }
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">{title}</h2>
      
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
                        <Medal className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={personData.avatar} alt={personData.name} />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{personData.name}</div>
                        <div className="text-xs text-muted-foreground">{personData.date}</div>
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
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{item.xp}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Banknote className="h-4 w-4 text-blue-500" />
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