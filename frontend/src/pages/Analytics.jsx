import { useEffect, useState } from 'react'
import { getStats } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black border-2 border-[#FCD535] px-4 py-3 font-mono">
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-white text-sm uppercase">
          {p.name}: <span className="text-[#FCD535]">
            {p.name === 'total' || p.name === 'spend'
              ? `₹${Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats().then(r => { setStats(r.data); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const monthData = (stats?.by_month || []).map(m => ({ ...m, spend: m.total }))

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase">Analytics</h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-2 flex items-center gap-4">
              <span>&gt; SPENDING · INSIGHTS</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly spend */}
          <div className="card-brutal-dark">
            <div className="px-6 py-4 border-b border-[#333]">
              <h2 className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest flex items-center gap-2">
                &gt; MONTHLY SPEND
              </h2>
            </div>
            <div className="p-6">
              {monthData.length === 0 ? (
                <p className="text-gray-600 text-sm font-bold tracking-widest text-center py-8">NO DATA YET.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FCD535', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Line type="linear" dataKey="spend" stroke="#FCD535" strokeWidth={3}
                      dot={{ fill: 'black', stroke: '#FCD535', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: 'white' }} name="spend" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="divider-striped-yellow"></div>
          </div>
        </div>

        {/* Monthly invoice count */}
        <div className="card-brutal-dark mb-8">
          <div className="px-6 py-4 border-b border-[#333]">
            <h2 className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest flex items-center gap-2">
              &gt; MONTHLY INVOICE COUNT
            </h2>
          </div>
          <div className="p-6">
            {monthData.length === 0 ? (
              <p className="text-gray-600 text-sm font-bold tracking-widest text-center py-8">NO DATA YET.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a1a1a' }} />
                  <Bar dataKey="count" fill="#FCD535" name="count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="divider-striped-yellow"></div>
        </div>

      </div>
    </div>
  )
}
