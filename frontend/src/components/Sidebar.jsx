import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, FileText, BarChart3, Zap, Activity, Settings2, MessageSquare, Users, LogOut, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload', requireUpload: true },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/query', icon: MessageSquare, label: 'Ask AI' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/modify', icon: Settings2, label: 'Modify', requireUpload: true },
  { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
  { to: '/users', icon: Users, label: 'Users', adminOnly: true },
]

export default function Sidebar() {
  const [ollamaOk, setOllamaOk] = useState(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    getHealth()
      .then(r => setOllamaOk(r.data.ollama?.status === 'ok'))
      .catch(() => setOllamaOk(false))
  }, [])

  return (
    <aside className="w-64 shrink-0 bg-surface-800 border-r border-surface-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-glow">
            <Zap size={18} className="text-surface-50" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-surface-50">InvoiceAI</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, requireUpload, adminOnly }) => {
          if (adminOnly && user?.role !== 'admin') return null;
          if (requireUpload && user?.role !== 'admin' && !user?.can_upload) return null;
          
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('nav-link', isActive && 'active')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 pt-4 border-t border-surface-200">
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{user?.username}</span>
            <span className="text-xs text-surface-400 capitalize">{user?.role}</span>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Ollama status */}
      <div className="px-4 py-4 border-t border-surface-200">
        <div className={clsx(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium',
          ollamaOk === null && 'bg-surface-100 text-surface-500',
          ollamaOk === true && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          ollamaOk === false && 'bg-red-500/10 text-red-400 border border-red-500/20',
        )}>
          <Activity size={14} className={ollamaOk ? 'animate-pulse' : ''} />
          <span>
            {ollamaOk === null && 'Checking Ollama...'}
            {ollamaOk === true && 'Ollama Connected'}
            {ollamaOk === false && 'Ollama Offline'}
          </span>
        </div>
      </div>
    </aside>
  )
}
