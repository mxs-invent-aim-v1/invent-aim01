import { useState, useEffect, useCallback } from 'react'
import { getTrackingDashboard, getInvoiceTracking, toggleWorkflow } from '../api/client'
import {
  GitBranch, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Loader2, X, RefreshCw, Package, Layers, Clock, User
} from 'lucide-react'
import clsx from 'clsx'

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, size = 'md' }) {
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'
  const color = progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-[#FCD535]' : 'bg-orange-500'
  return (
    <div className={clsx('w-full bg-[#222] overflow-hidden', h)}>
      <div
        className={clsx(color, h, 'transition-all duration-500 ease-out')}
        style={{ width: `${Math.min(100, progress)}%` }}
      />
    </div>
  )
}

// ─── Workflow Toggle Modal ────────────────────────────────────────────────────

function WorkflowModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  const fetchTracking = useCallback(async () => {
    setLoading(true)
    try {
      const { data: resp } = await getInvoiceTracking(invoiceId)
      setData(resp)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { fetchTracking() }, [fetchTracking])

  // Group processes by workflow_name
  const workflowGroups = {}
  if (data?.processes) {
    for (const proc of data.processes) {
      if (!workflowGroups[proc.workflow_name]) {
        workflowGroups[proc.workflow_name] = { processes: [], workflow_id: null }
      }
      workflowGroups[proc.workflow_name].processes.push(proc)
      // All procs of same workflow share the same workflow — grab the workflow id from process_id relationship
    }
  }

  // We need workflow IDs. The tracking API returns process_id but not workflow_id directly.
  // We can deduce workflow_id from process relationships. Let's fetch it from the data structure.
  // The get_invoice_tracking returns processes with workflow_name but not workflow_id.
  // We'll need to look up workflow_id. Let me add it to the response or work around it.
  // For now, we'll use the first process_id in each workflow group to identify it via process.

  const handleToggleWorkflow = async (workflowName, currentlyAllCompleted) => {
    // Find a workflow_id — we need to get it. Since the backend endpoint accepts workflow_id,
    // and our tracking data has process objects with workflow_name, let's search for the ID.
    // The processes share a workflow, so we look up any process's parent workflow.
    const group = workflowGroups[workflowName]
    if (!group || group.processes.length === 0) return

    // We'll extract workflow_id from the first process. But the current API doesn't return it.
    // Let's use the process_id to call the individual toggle for each. 
    // Actually, the backend endpoint takes workflow_id. We need it.
    // Let's modify the backend to also return workflow_id in process tracking data.
    // For now, let's use a workaround: the backend get_invoice_tracking should include workflow_id.
    
    // Since we have workflow_name but not workflow_id, and the modal needs workflow_id,
    // we need to get it. The simplest approach: include workflow_id in the tracking response.
    // But for now, let's use the process-level data that includes it if available.
    
    const workflowId = group.processes[0]?.workflow_id
    if (!workflowId) {
      alert('Workflow ID not available. Please refresh.')
      return
    }

    setToggling(workflowName)
    try {
      await toggleWorkflow(invoiceId, workflowId, { completed: !currentlyAllCompleted })
      await fetchTracking()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update workflow')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#111] border-2 border-[#FCD535] w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-[#333] bg-black flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#FCD535] tracking-tighter uppercase">TRACE WORKFLOW</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">INVOICE #{invoiceId} · {data?.category || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-[#FCD535] mx-auto" />
            </div>
          ) : !data?.processes || data.processes.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch size={48} className="mx-auto mb-4 text-gray-700" />
              <p className="text-sm text-gray-500 font-black tracking-widest uppercase">NO WORKFLOWS DEFINED</p>
              <p className="text-xs text-gray-600 mt-2 font-bold">Add workflows to this category in Configure.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">OVERALL PROGRESS</span>
                  <span className={clsx(
                    'text-sm font-black tracking-widest',
                    data.progress >= 100 ? 'text-emerald-400' : 'text-[#FCD535]'
                  )}>{data.progress}%</span>
                </div>
                <ProgressBar progress={data.progress} size="lg" />
                <p className="text-[10px] text-gray-600 font-bold tracking-widest mt-2 uppercase">
                  {data.completed_count} OF {data.total_processes} STEPS COMPLETED
                </p>
              </div>

              {/* Workflow Groups */}
              <div className="space-y-4">
                <p className="text-[10px] text-[#FCD535] font-black tracking-widest uppercase">WORKFLOWS</p>
                {Object.entries(workflowGroups).map(([wfName, group]) => {
                  const allCompleted = group.processes.every(p => p.completed)
                  const completedCount = group.processes.filter(p => p.completed).length
                  const totalCount = group.processes.length
                  const wfProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                  return (
                    <div key={wfName} className={clsx(
                      'border transition-all',
                      allCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-[#0a0a0a] border-[#333] hover:border-[#555]'
                    )}>
                      {/* Workflow header — clickable to toggle all */}
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer group"
                        onClick={() => handleToggleWorkflow(wfName, allCompleted)}
                      >
                        <div className="shrink-0">
                          {toggling === wfName ? (
                            <Loader2 size={22} className="animate-spin text-[#FCD535]" />
                          ) : allCompleted ? (
                            <CheckCircle2 size={22} className="text-emerald-500" />
                          ) : (
                            <Circle size={22} className="text-gray-600 group-hover:text-[#FCD535] transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className={clsx(
                              'text-sm font-black tracking-widest uppercase',
                              allCompleted ? 'text-emerald-400 line-through' : 'text-white'
                            )}>
                              {wfName}
                            </span>
                            <span className="text-[10px] text-gray-600 font-bold tracking-widest">
                              {completedCount}/{totalCount} STEPS
                            </span>
                          </div>
                          <div className="mt-2">
                            <ProgressBar progress={wfProgress} size="sm" />
                          </div>
                        </div>
                        <span className={clsx(
                          'text-xs font-black tracking-widest',
                          allCompleted ? 'text-emerald-400' : wfProgress > 0 ? 'text-[#FCD535]' : 'text-gray-600'
                        )}>
                          {wfProgress}%
                        </span>
                      </div>

                      {/* Sub-processes list (read-only, for visibility) */}
                      <div className="border-t border-[#222] px-4 pb-3">
                        {group.processes.map((proc, idx) => (
                          <div key={proc.process_id} className="flex items-center gap-3 py-2 px-2">
                            <span className="text-[9px] text-gray-700 font-black w-4 shrink-0">{idx + 1}.</span>
                            {proc.completed ? (
                              <CheckCircle2 size={12} className="text-emerald-500/50 shrink-0" />
                            ) : (
                              <Circle size={12} className="text-gray-700 shrink-0" />
                            )}
                            <span className={clsx(
                              'text-[10px] font-bold tracking-widest uppercase truncate',
                              proc.completed ? 'text-gray-600 line-through' : 'text-gray-400'
                            )}>
                              {proc.name}
                            </span>
                            {proc.completed && proc.completed_at && (
                              <div className="flex items-center gap-1 ml-auto shrink-0">
                                <Clock size={8} className="text-gray-700" />
                                <span className="text-[8px] text-gray-700 font-bold">
                                  {new Date(proc.completed_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TraceWorkflow() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      const { data: resp } = await getTrackingDashboard(params)
      setData(resp)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const summary = data?.summary || {}
  const items = (data?.items || []).filter(i => i.total_processes > 0)
  const categories = summary.categories || []

  const completedItems = items.filter(i => i.progress >= 100).length
  const inProgressItems = items.filter(i => i.progress > 0 && i.progress < 100).length

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="mb-8 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase flex items-center gap-5">
              <div className="w-14 h-14 bg-[#FCD535] flex items-center justify-center">
                <GitBranch size={30} className="text-black" />
              </div>
              TRACE WORKFLOW
            </h1>
            <div className="text-sm font-bold tracking-widest text-gray-500 mt-3 flex items-center gap-4">
              <span>> TOGGLE ENTIRE WORKFLOWS FOR INVOICES</span>
              <div className="w-24 h-[1px] bg-[#333]"></div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="appearance-none bg-black border border-[#333] px-4 py-2.5 pr-10 text-xs font-black tracking-widest text-white focus:border-[#FCD535] outline-none uppercase cursor-pointer"
              >
                <option value="">ALL CATEGORIES</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <button onClick={fetchDashboard} className="btn-brutal-dark p-3 text-xs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111] border border-[#333] p-5 flex items-start gap-4 hover:border-[#FCD535] transition-colors">
            <div className="w-11 h-11 bg-[#FCD535] text-black flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">TRACKED INVOICES</p>
              <p className="text-2xl font-black tracking-tight text-[#FCD535]">{items.length}</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] p-5 flex items-start gap-4 hover:border-emerald-500/50 transition-colors">
            <div className="w-11 h-11 bg-emerald-500 text-black flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">FULLY COMPLETED</p>
              <p className="text-2xl font-black tracking-tight text-emerald-400">{completedItems}</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] p-5 flex items-start gap-4 hover:border-orange-500/50 transition-colors">
            <div className="w-11 h-11 bg-orange-500 text-black flex items-center justify-center shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">IN PROGRESS</p>
              <p className="text-2xl font-black tracking-tight text-orange-400">{inProgressItems}</p>
            </div>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {/* Items Table */}
        <div className="card-brutal-dark relative">
          {loading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-[#FCD535]" size={32} />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111] border-b-2 border-[#333]">
                <tr>
                  {['INVOICE #', 'CATEGORY', 'DESCRIPTION', 'CURRENT STAGE', 'PROGRESS', 'ACTION'].map(h => (
                    <th key={h} className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222] last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-600 font-bold tracking-widest">
                      <GitBranch size={48} className="mx-auto mb-4 opacity-20" />
                      {loading ? 'LOADING...' : 'NO INVOICES WITH WORKFLOWS FOUND.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.invoice_id}
                      className={clsx(
                        'border-b border-[#222] hover:bg-[#1a1a1a] transition-colors',
                        idx % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]'
                      )}
                    >
                      <td className="py-3 px-4 text-sm font-bold border-r border-[#222]">
                        {item.invoice_number || '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-[#222]">
                        <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1">
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300 max-w-[200px] truncate border-r border-[#222]">
                        {item.description || '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-[#222]">
                        {item.current_stage ? (
                          <span className={clsx(
                            'text-[10px] font-black tracking-widest uppercase px-2 py-1',
                            item.current_stage === 'COMPLETED'
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-[#FCD535] bg-[#FCD535]/10 border border-[#FCD535]/20'
                          )}>
                            {item.current_stage}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">NOT STARTED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 min-w-[140px] border-r border-[#222]">
                        <div className="flex items-center gap-3">
                          <ProgressBar progress={item.progress} size="sm" />
                          <span className={clsx(
                            'text-[10px] font-black tracking-widest whitespace-nowrap',
                            item.progress >= 100 ? 'text-emerald-400' : item.progress > 0 ? 'text-[#FCD535]' : 'text-gray-600'
                          )}>
                            {item.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedInvoice(item.invoice_id)}
                          className="text-[10px] font-black tracking-widest uppercase text-[#FCD535] hover:text-white border border-[#FCD535] hover:bg-[#FCD535] hover:text-black px-3 py-1.5 transition-all"
                        >
                          TOGGLE
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-widest text-gray-500 px-2 uppercase">
          <span>{items.length} TRACKED ITEMS</span>
          <span>·</span>
          <span className="text-emerald-400">{completedItems} COMPLETED</span>
          <span>·</span>
          <span className="text-[#FCD535]">{inProgressItems} IN PROGRESS</span>
          <span>·</span>
          <span>CLICK TOGGLE TO UPDATE WORKFLOWS</span>
        </div>
      </div>

      {/* Workflow Modal */}
      {selectedInvoice && (
        <WorkflowModal
          invoiceId={selectedInvoice}
          onClose={() => { setSelectedInvoice(null); fetchDashboard(); }}
        />
      )}
    </div>
  )
}
