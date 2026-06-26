import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login as apiLogin, getCurrentUser } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // OAuth2 requires form data
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const tokenResponse = await apiLogin(formData)
      const token = tokenResponse.data.access_token

      // Set token temporarily to fetch user info
      localStorage.setItem('token', token)
      
      const userResponse = await getCurrentUser()
      login(token, userResponse.data)
      
      navigate(from, { replace: true })
    } catch (err) {
      localStorage.removeItem('token')
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-surface-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-surface-800 p-8 rounded-2xl border border-surface-700/50 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-surface-400">
            Invoice Scanner System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full rounded-xl border-0 bg-surface-900 py-3 px-4 text-white ring-1 ring-inset ring-surface-700 placeholder:text-surface-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-xl border-0 bg-surface-900 py-3 px-4 text-white ring-1 ring-inset ring-surface-700 placeholder:text-surface-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl bg-primary-600 px-3 py-3 text-sm font-semibold text-white hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
