import { useState, useEffect, useRef } from 'react'
import { runNLQuery, getQuerySuggestions } from '../api/client'
import { 
  Search, Sparkles, MessageSquare, Code2, Copy, Check, Download, 
  ChevronRight, AlertTriangle, Play, Clock, History, X 
} from 'lucide-react'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function NaturalQuery() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('nlq_history') || '[]'))
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showSql, setShowSql] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Destructive query confirmation state
  const [confirmModal, setConfirmModal] = useState(null)
  const [executingDestructive, setExecutingDestructive] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    getQuerySuggestions().then(r => setSuggestions(r.data)).catch(console.error)
  }, [])

  const saveToHistory = (q, rowCount) => {
    const newEntry = { q, rowCount, time: Date.now() }
    const updated = [newEntry, ...history.filter(h => h.q.toLowerCase() !== q.toLowerCase())].slice(0, 20)
    setHistory(updated)
    localStorage.setItem('nlq_history', JSON.stringify(updated))
  }

  const handleSearch = async (overrideQuery = null) => {
    const q = overrideQuery || query
    if (!q.trim()) return
    
    setQuery(q)
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmModal(null)

    try {
      const res = await runNLQuery({ question: q })
      
      if (res.data.requires_confirmation) {
        setConfirmModal(res.data)
        setLoading(false)
        return
      }

      setResult(res.data)
      saveToHistory(q, res.data.row_count)
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Network Error: Could not connect to the backend. The server might be restarting, please try again.')
      } else {
        console.error("NLQuery Error:", err)
        setError(err.response?.data?.detail || err.message || 'An error occurred while generating the query.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDestructive = async () => {
    if (!confirmModal) return
    setExecutingDestructive(true)
    setError(null)
    
    try {
      const res = await runNLQuery({ sql: confirmModal.sql, confirmed: true })
      setResult(res.data)
      setConfirmModal(null)
      saveToHistory(query, res.data.row_count)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to execute query.')
      setConfirmModal(null)
    } finally {
      setExecutingDestructive(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const copySql = () => {
    if (!result && !confirmModal) return
    const sql = result ? result.sql : confirmModal.sql
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCsv = () => {
    if (!result || !result.rows || result.rows.length === 0) return
    
    const headers = result.columns.join(',')
    const rows = result.rows.map(row => 
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${new Date().getTime()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('nlq_history')
  }

  // --- Auto Chart Logic ---
  let chartData = null
  let chartConfig = null

  if (result && result.columns && result.rows && result.rows.length > 0 && result.rows.length <= 100) {
    // Find a string column for labels, and a number column for values
    let labelIdx = -1
    let valueIdx = -1
    
    // Simple heuristic: first string-like column is label, first number-like is value
    for (let i = 0; i < result.columns.length; i++) {
      const sample = result.rows[0][i]
      if (typeof sample === 'number' && valueIdx === -1) valueIdx = i
      else if (typeof sample === 'string' && labelIdx === -1) labelIdx = i
    }
    
    if (labelIdx !== -1 && valueIdx !== -1) {
      chartData = result.rows.map(r => ({
        label: r[labelIdx]?.substring(0, 20) || 'Unknown',
        value: r[valueIdx] || 0
      }))
      chartConfig = { x: result.columns[labelIdx], y: result.columns[valueIdx] }
    }
  }

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="mb-12 border-b border-[#333] pb-6 flex flex-col items-start justify-between">
              <h1 className="text-7xl font-black tracking-tighter uppercase flex items-center gap-6">
                <div className="w-16 h-16 bg-[#FCD535] flex items-center justify-center border-4 border-[#FCD535]">
                  <MessageSquare size={36} className="text-black" />
                </div>
                ASK AI
              </h1>
              <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-4 flex items-center gap-4">
                <span>&gt; NATURAL · LANGUAGE · QUERY</span>
                <div className="w-32 h-[1px] bg-[#FCD535]"></div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <div className="flex items-center bg-black border-2 border-[#333] focus-within:border-[#FCD535] transition-colors p-2 shadow-[8px_8px_0_0_#000]">
                <Search className="text-[#FCD535] ml-4 mr-2 shrink-0" size={24} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. SHOW ME ALL INVOICES ABOVE 1000 RUPEES..."
                  className="flex-1 bg-transparent border-none text-white font-bold uppercase tracking-widest py-4 px-2 outline-none placeholder-gray-700"
                  disabled={loading}
                />
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  className="bg-[#FCD535] text-black hover:bg-white transition-colors font-black uppercase tracking-widest px-8 py-4 ml-2 flex items-center gap-2 border-2 border-black"
                >
                  {loading ? <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span> : <Sparkles size={18} />}
                  {loading ? 'ASKING AI' : 'ASK AI'}
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-16 h-16 border-4 border-[#333] border-t-[#FCD535] rounded-full animate-spin" />
                <p className="text-[#FCD535] font-black uppercase tracking-widest animate-pulse">TRANSLATING TO SQL AND QUERYING...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-500 border-2 border-black p-6 shadow-[8px_8px_0_0_#000] flex items-start gap-4">
                <AlertTriangle className="text-black shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-black text-black uppercase tracking-widest text-lg">QUERY FAILED</h3>
                  <p className="text-black font-bold uppercase tracking-widest mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Destructive Confirmation Modal */}
            {confirmModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono animate-fade-in p-4">
                <div className="bg-[#111] border-2 border-amber-500 p-8 max-w-2xl w-full shadow-[12px_12px_0_0_#000] relative">
                  
                  <div className="flex items-start gap-6 border-b border-[#333] pb-6 mb-6">
                    <div className="w-16 h-16 bg-amber-500 text-black flex items-center justify-center shrink-0 border-2 border-amber-500">
                      <AlertTriangle size={32} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black text-amber-500 uppercase tracking-tighter">CONFIRM MODIFICATION</h2>
                      <p className="text-gray-400 font-bold uppercase tracking-widest mt-2 text-sm leading-relaxed">The AI generated a query that modifies the database. Review carefully.</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles size={18} className="text-amber-500" />
                      <span className="text-xs text-gray-500 font-black uppercase tracking-widest">AI INTENTION:</span>
                      <span className="text-xs text-amber-500 font-bold uppercase tracking-widest">"{confirmModal.explanation}"</span>
                    </div>
                    
                    <div className="relative group border-2 border-amber-500/50 mt-4">
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={copySql} className="p-2 bg-black hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-500 transition-colors">
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <pre className="bg-black p-6 overflow-x-auto text-sm font-mono text-amber-500 whitespace-pre-wrap font-bold">
                        {confirmModal.sql}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-8">
                    <button 
                      onClick={() => setConfirmModal(null)} 
                      className="text-sm font-black text-gray-500 hover:text-white uppercase tracking-widest px-6 py-3"
                      disabled={executingDestructive}
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={handleConfirmDestructive}
                      disabled={executingDestructive}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest px-8 py-3 border-2 border-black flex items-center gap-2 transition-transform hover:-translate-y-1 hover:translate-x-1"
                    >
                      {executingDestructive ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                      {executingDestructive ? 'EXECUTING...' : 'YES, RUN IT'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions (Initial State) */}
            {!loading && !result && !error && !confirmModal && (
              <div className="animate-fade-in pt-12">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center justify-center gap-4">
                  <div className="w-12 h-[1px] bg-gray-800"></div>
                  SUGGESTED QUERIES
                  <div className="w-12 h-[1px] bg-gray-800"></div>
                </h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSearch(s.query)}
                      className="bg-[#111] border border-[#333] px-6 py-3 text-xs font-bold text-gray-400 hover:text-[#FCD535] hover:border-[#FCD535] transition-colors flex items-center gap-3 uppercase tracking-widest"
                    >
                      <ChevronRight size={16} className="text-[#FCD535]" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-8 animate-slide-up pb-20">
                
                {/* Explanation Pill */}
                <div className="flex items-center gap-4 bg-[#FCD535]/10 border border-[#FCD535]/30 p-6">
                  <Sparkles size={24} className="text-[#FCD535] shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-widest leading-relaxed">
                    <strong className="text-[#FCD535] font-black mr-2">AI EXPLANATION:</strong> {result.explanation}
                  </span>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between border-b border-[#333] pb-4">
                  <div className="flex items-center gap-4">
                    <span className="bg-[#FCD535] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-black">
                      {result.row_count} ROWS
                    </span>
                    {result.message && <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase">{result.message}</span>}
                    <span className="text-xs font-bold tracking-widest text-gray-500 flex items-center gap-1 uppercase">
                      <Clock size={12} /> {result.execution_time_ms}MS
                    </span>
                    {result.cached && (
                      <span className="text-xs text-amber-500 border border-amber-500/50 px-2 py-0.5 uppercase font-bold tracking-widest bg-amber-500/10">CACHED</span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowSql(!showSql)}
                      className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-[#FCD535] transition-colors", showSql ? "text-[#FCD535]" : "text-gray-500")}
                    >
                      <Code2 size={14} /> {showSql ? '[ HIDE SQL ]' : '[ SHOW SQL ]'}
                    </button>
                    {result.rows && result.rows.length > 0 && (
                      <button onClick={exportCsv} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
                        <Download size={14} /> [ EXPORT CSV ]
                      </button>
                    )}
                  </div>
                </div>

                {/* SQL Block */}
                {showSql && (
                  <div className="relative group border-2 border-[#333] bg-[#0a0a0a] animate-slide-up">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={copySql} className="p-2 bg-black hover:bg-white text-gray-400 hover:text-black border border-[#333] transition-colors">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <pre className="p-6 overflow-x-auto text-sm font-mono text-gray-300 font-bold whitespace-pre-wrap">
                      {result.sql}
                    </pre>
                  </div>
                )}

                {/* Auto Chart */}
                {chartData && (
                  <div className="card-brutal-dark p-8 h-96">
                    <h3 className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest mb-8 flex items-center gap-3">
                      <BarChart className="text-[#FCD535]" size={20} /> 
                      {chartConfig.y} BY {chartConfig.x}
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="label" stroke="#666" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#666" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dx={-10} tickFormatter={v => `₹${v}`} />
                        <Tooltip 
                          cursor={{fill: '#1a1a1a'}}
                          contentStyle={{ backgroundColor: '#000', border: '2px solid #FCD535', borderRadius: '0', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}
                        />
                        <Bar dataKey="value" fill="#FCD535" maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Result Table */}
                {result.rows && result.rows.length > 0 && (
                  <div className="card-brutal-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-black border-b-2 border-[#333]">
                          <tr>
                            {result.columns.map((col, i) => (
                              <th key={i} className="py-4 px-6 text-[10px] font-black text-[#FCD535] uppercase tracking-widest whitespace-nowrap border-r border-[#222] last:border-0">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} className={clsx("border-b border-[#222] hover:bg-[#1a1a1a] transition-colors", i % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]')}>
                              {row.map((cell, j) => (
                                <td key={j} className="py-4 px-6 text-sm font-bold text-gray-300 whitespace-nowrap border-r border-[#222] last:border-0">
                                  {cell === null ? <span className="text-gray-600 italic">NULL</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Empty state for valid query with no rows */}
                {result.rows && result.rows.length === 0 && !result.message && (
                  <div className="card-brutal-dark py-20 text-center flex flex-col items-center">
                    <Search size={48} className="text-gray-600 mb-6" />
                    <p className="text-gray-400 font-black uppercase tracking-widest">NO RECORDS FOUND MATCHING THIS QUERY.</p>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: History */}
        <div className="w-80 border-l-2 border-[#333] bg-[#0a0a0a] flex flex-col shrink-0">
          <div className="p-6 border-b border-[#333] flex items-center justify-between">
            <h2 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-3">
              <History size={16} className="text-[#FCD535]" /> HISTORY
            </h2>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-red-500 transition-colors">
                [ CLEAR ]
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 text-center py-12">NO PAST QUERIES</p>
            ) : (
              history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(h.q)}
                  className="w-full text-left p-4 bg-black border border-[#222] hover:border-[#FCD535] transition-colors group relative"
                >
                  <p className="text-xs text-gray-300 font-bold uppercase tracking-widest line-clamp-3 leading-relaxed">{h.q}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#222] text-[10px] font-black text-gray-600">
                    <span>{new Date(h.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="group-hover:text-[#FCD535] transition-colors">{h.rowCount} ROWS</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
