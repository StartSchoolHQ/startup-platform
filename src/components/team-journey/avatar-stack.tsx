import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  name: string
  avatar: string
}

interface AvatarStackProps {
  users: User[]
  maxVisible?: number
  size?: "sm" | "md" | "lg"
}

export function AvatarStack({ users, maxVisible = 4, size = "md" }: AvatarStackProps) {
  const visibleUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  }

  const offsetClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4"
  }

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <Avatar 
          key={user.id} 
          className={`
            ${sizeClasses[size]} 
            ${index > 0 ? offsetClasses[size] : ''} 
            border-2 border-white relative z-${10 - index}
          `}
        >
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <Avatar 
          className={`
            ${sizeClasses[size]} 
            ${offsetClasses[size]} 
            border-2 border-white bg-gray-100 relative z-0
          `}
        >
          <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold text-xs">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
