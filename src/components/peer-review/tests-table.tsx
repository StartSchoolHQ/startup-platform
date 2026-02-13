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
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                {columns.taskToTest}
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                {columns.submittedBy}
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                {columns.difficulty}
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                {columns.xp}
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                {columns.points}
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
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
                  className="border-border hover:bg-muted/10 border-b transition-colors duration-150"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                        {/* Assuming Medal icon is no longer needed or replaced */}
                        {/* <Medal className="h-4 w-4" /> */}
                      </div>
                      <div>
                        <div className="text-foreground text-sm font-medium">
                          {item.taskToTest}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src="/avatars/john-doe.jpg"
                          alt={personData}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-xs font-bold text-white">
                          {personData
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-foreground text-sm font-medium">
                          {personData}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          2 days ago
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="secondary"
                      className={difficultyConfig.class}
                    >
                      {difficultyConfig.text}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      {/* Assuming Zap icon is no longer needed or replaced */}
                      {/* <Zap className="h-4 w-4 text-green-500" /> */}
                      <span className="text-foreground text-sm font-medium">
                        {item.xp}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      {/* Assuming Banknote icon is no longer needed or replaced */}
                      {/* <Banknote className="h-4 w-4 text-blue-500" /> */}
                      <span className="text-foreground text-sm font-medium">
                        {item.points}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{renderActionColumn(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
