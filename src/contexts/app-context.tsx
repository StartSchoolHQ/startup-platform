'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  name: string | null
  email: string
  avatar_url: string | null
}

interface AppContextType {
  user: User | null
  loading: boolean
  firstName: string
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient()
        
        // Get current authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
          setLoading(false)
          return
        }

        // Get user profile from our users table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('id', authUser.id)
          .single()

        if (profileError || !userProfile) {
          setLoading(false)
          return
        }

        setUser(userProfile)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'User'

  return (
    <AppContext.Provider value={{ user, loading, firstName }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}