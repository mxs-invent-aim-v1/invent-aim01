import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats, getHealth, listInvoices } from '../api/client'
import { Upload, FileText, BarChart3, Settings2, Zap, Activity, Users } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

const BrutalistButton = ({ children, onClick, className, icon: Icon, textClass = "text-3xl" }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group relative flex items-center justify-center p-6 border-2 border-black transition-all duration-500 bg-transparent hover:border-black/20 hover:shadow-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none",
        className
      )}
    >
      {/* Background container with overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Background Black Striped Layer */}
        <div className="absolute inset-0 btn-striped" />
        
        {/* Wipe Layer (Yellow background sliding in from top-left) */}
        <div 
          className="absolute -inset-4 bg-[#FCD535] z-0 transition-transform duration-500 ease-in-out -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0" 
          style={{ transformOrigin: 'top left' }}
        />
      </div>

      {/* Brackets Layer (visible on hover, positioned further outside) */}
      <div className="absolute -top-[6px] -left-[6px] w-[50px] h-[30px] border-t-[5px] border-l-[5px] border-black opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
      <div className="absolute -top-[6px] -right-[6px] w-[50px] h-[30px] border-t-[5px] border-r-[5px] border-black opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
      <div className="absolute -bottom-[6px] -left-[6px] w-[50px] h-[30px] border-b-[5px] border-l-[5px] border-black opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
      <div className="absolute -bottom-[6px] -right-[6px] w-[50px] h-[30px] border-b-[5px] border-r-[5px] border-black opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
      
      {/* Content Layer */}
      <div className="relative z-20 flex items-center gap-3">
        {Icon && (
          <Icon size={24} className="text-[#FCD535] group-hover:text-black transition-colors duration-500" />
        )}
        <span className={clsx("text-[#FCD535] group-hover:text-black font-black tracking-widest text-glitch group-hover:[text-shadow:none] transition-all duration-500 uppercase", textClass)}>
          {children}
        </span>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [ollamaOk, setOllamaOk] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    Promise.all([
      getStats().catch(() => ({ data: { by_month: [] } })),
      getHealth().catch(() => ({ data: { ollama: { status: 'error' } } })),
      listInvoices({ limit: 50 }).catch(() => ({ data: { items: [] } }))
    ]).then(([s, h, inv]) => {
      setStats(s.data)
      setOllamaOk(h.data.ollama?.status === 'ok')
      // Reverse so oldest is first
      setInvoices((inv.data?.items || []).slice().reverse())
      setLoading(false)
    })
  }, [])

  // Create chart data from individual invoices
  let chartData = invoices.map((inv, i) => ({
    name: inv.invoice_number || `Inv #${i+1}`,
    spend: inv.grand_total || 0
  }))

  // If there's only 1 invoice, add a starting point so a line is drawn
  if (chartData.length === 1) {
    chartData.unshift({ name: 'Start', spend: 0 })
  } else if (chartData.length === 0) {
    // Fake placeholder data so the chart is never empty
    chartData = [
      { name: 'Jan', spend: 1200 },
      { name: 'Feb', spend: 2100 },
      { name: 'Mar', spend: 800 },
      { name: 'Apr', spend: 1600 },
      { name: 'May', spend: 3200 },
    ]
  }

  return (
    <div className="min-h-screen bg-brutal-yellow text-black font-mono p-8 selection:bg-black selection:text-[#FCD535]">
      
      {/* Top Navigation removed, handled by AppLayout */}

      <div className="flex items-center justify-between text-xs font-bold tracking-widest mb-2 uppercase">
        <span>// AI POWERED<br/>// ENTERPRISE READY</span>
        <span>V12.40.0</span>
      </div>
      <hr className="border-t-2 border-black mb-16" />

      {/* Main Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
        <div>
          <h1 className="text-7xl font-black tracking-tighter leading-[0.9] mb-8">
            InvoiceAI.<br/>
            Production-grade<br/>
            extraction for<br/>the web.
          </h1>
          <div className="flex items-center gap-6 text-sm font-bold tracking-widest mb-12 uppercase">
            <span>&gt; AVAILABLE FOR</span>
            <span>PDF</span>
            <span>JPG</span>
            <span>PNG</span>
          </div>
          
          {/* Main Action Button */}
          <BrutalistButton 
            onClick={() => navigate('/upload')}
            className="px-12 py-6"
            textClass="text-3xl"
          >
            Get Started
          </BrutalistButton>
        </div>

        {/* Chart Area */}
        <div className="p-4 relative">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Monthly Spend Trajectory</h2>
          <div className="h-[280px] w-full border-2 border-black bg-[#FCD535] relative z-10">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center font-bold tracking-widest">LOADING...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#000" vertical={false} />
                  <Line 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="#000" 
                    strokeWidth={3} 
                    dot={{ fill: '#FCD535', r: 5, strokeWidth: 2, stroke: '#000' }} 
                    activeDot={{ r: 8, fill: '#000' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Brutalist ruler marks */}
          <div className="absolute -bottom-6 left-4 right-4 h-4 border-t-2 border-black flex justify-between px-1">
            {Array.from({length: 50}).map((_, i) => (
              <div key={i} className={`w-[2px] bg-black ${i % 5 === 0 ? 'h-4' : 'h-2'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Decorative Divider */}
      <div className="flex items-center gap-4 text-xl font-bold tracking-widest overflow-hidden mb-12 select-none">
        <span>+</span>
        <div className="flex-1 whitespace-nowrap overflow-hidden tracking-tighter">
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        </div>
        <span>+</span>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16">
        {[
          { path: '/invoices', icon: FileText, label: 'Invoices', title: 'MANAGE', desc: 'View processed invoices and extract structured JSON data.' },
          { path: '/analytics', icon: BarChart3, label: 'Analytics', title: 'ANALYZE', desc: 'Deep dive into spending patterns and extraction metrics.' },
          { path: '/modify', icon: Settings2, label: 'Modify', title: 'CONFIGURE', desc: 'Adjust extraction rules, schema settings, and webhooks.', requireUpload: true },
          { path: '/users', icon: Users, label: 'Users', title: 'ACCESS', desc: 'Manage users and upload permissions for your team.', adminOnly: true },
        ].map((item, i) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          if (item.requireUpload && user?.role !== 'admin' && !user?.can_upload) return null;

          return (
            <div key={item.path} className="flex flex-col">
            <span className="text-xs font-bold mb-4">0{i + 1}</span>
            <h3 className="font-black text-xl mb-4 tracking-tight uppercase">{item.title}</h3>
            <p className="text-sm font-medium leading-relaxed mb-6 h-16">
              {item.desc}
            </p>
            <BrutalistButton 
              onClick={() => navigate(item.path)}
              icon={item.icon}
              className="w-full py-5 px-4 mt-auto"
              textClass="text-lg"
            >
              {item.label}
            </BrutalistButton>
          </div>
          )
        })}
      </div>

    </div>
  )
}
