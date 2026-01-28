import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TestData {
  id: string;
  taskToTest: string;
  description: string;
  submittedBy: string;
  difficulty: string;
  xp: number;
  points: number;
  status?: string;
  testedBy?: string;
}

interface TestsTableProps {
  title: string;
  data: TestData[];
  columns: {
    taskToTest: string;
    submittedBy: string;
    difficulty: string;
    xp: string;
    points: string;
    action: string;
  };
  renderActionColumn: (item: TestData) => React.ReactNode;
  getPersonData: (item: TestData) => string;
}

export function TestsTable({
  title,
  data,
  columns,
  renderActionColumn,
  getPersonData,
}: TestsTableProps) {
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return {
          text: "Easy",
          class:
            "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50",
        };
      case "medium":
        return {
          text: "Medium",
          class:
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50",
        };
      case "hard":
        return {
          text: "Hard",
          class:
            "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50",
        };
      default:
        return {
          text: "Unknown",
          class: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                {columns.taskToTest}
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                {columns.submittedBy}
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                {columns.difficulty}
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                {columns.xp}
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                {columns.points}
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                {columns.action}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const difficultyConfig = getDifficultyConfig(item.difficulty);
              const personData = getPersonData(item);

              return (
                <tr
                  key={item.id}
                  className="border-b border-border hover:bg-muted/10 transition-colors duration-150"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        {/* Assuming Medal icon is no longer needed or replaced */}
                        {/* <Medal className="h-4 w-4" /> */}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {item.taskToTest}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src="/avatars/john-doe.jpg"
                          alt={personData}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                          {personData
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {personData}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          2 days ago
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
                      {/* Assuming Zap icon is no longer needed or replaced */}
                      {/* <Zap className="h-4 w-4 text-green-500" /> */}
                      <span className="text-sm font-medium text-foreground">
                        {item.xp}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {/* Assuming Banknote icon is no longer needed or replaced */}
                      {/* <Banknote className="h-4 w-4 text-blue-500" /> */}
                      <span className="text-sm font-medium text-foreground">
                        {item.points}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">{renderActionColumn(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
