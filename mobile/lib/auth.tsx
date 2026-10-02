import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiFetch, setAccessToken, getAccessToken } from '@/lib/api'

export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/mobile/me', {
        auth: true,
      })
      setUser(data.user)
    } catch {
      await setAccessToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await refresh()
      } finally {
        setLoading(false)
      }
    })()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{
      accessToken: string
      user: AuthUser
    }>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    await setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await setAccessToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
