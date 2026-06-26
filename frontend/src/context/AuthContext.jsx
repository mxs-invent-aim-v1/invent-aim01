import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser } from '../api/client'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const { data } = await getCurrentUser()
      setUser(data)
    } catch (error) {
      console.error("Failed to fetch user:", error)
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-surface-900 text-white">Loading...</div>
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
