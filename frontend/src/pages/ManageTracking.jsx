import { useState, useEffect, useCallback } from 'react'
import {
  getTrackingDashboard, getTrackingHistory, reassignTrackingCategory,
  revertTrackingCategory, resetTracking, addTrackingNote, listCategories
} from '../api/client'
import {
  Settings2, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Loader2, X, RefreshCw, Package, RotateCcw, AlertTriangle,
  FileText, Clock, User, GitBranch, ArrowRightLeft, Trash2,
  MessageSquare, History, ShieldAlert, Undo2
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

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#111] border-2 border-[#333] w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-[#FCD535]'} />
          <h3 className="text-lg font-black tracking-tighter uppercase text-white">{title}</h3>
        </div>
        <p className="text-xs text-gray-400 font-bold tracking-widest mb-6 uppercase leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-xs font-black tracking-widest uppercase text-gray-500 hover:text-white border border-[#333] hover:border-[#555] px-4 py-2 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'text-xs font-black tracking-widest uppercase px-4 py-2 transition-all flex items-center gap-2',
              danger
                ? 'text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black'
                : 'text-[#FCD535] border border-[#FCD535]/30 hover:bg-[#FCD535] hover:text-black'
            )}
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reassign Category Modal ──────────────────────────────────────────────────

function ReassignModal({ invoiceId, currentCategory, categories, onClose, onSuccess }) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReassign = async () => {
    if (!selectedCategory) return
    setLoading(true)
    try {
      await reassignTrackingCategory(invoiceId, { category_name: selectedCategory })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reassign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#111] border-2 border-[#FCD535] w-full max-w-md overflow-hidden">
        <div className="p-6 border-b-2 border-[#333] bg-black flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#FCD535] tracking-tighter uppercase">REASSIGN WORKFLOW</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">INVOICE #{invoiceId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current */}
          <div>
            <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-2">CURRENT CATEGORY</p>
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#333] px-4 py-3">
              <GitBranch size={14} className="text-gray-500" />
              <span className="text-sm font-black tracking-widest uppercase text-gray-400">
                {currentCategory || 'NONE'}
              </span>
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-2">NEW CATEGORY</p>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-black border border-[#333] px-4 py-3 pr-10 text-sm font-black tracking-widest text-white focus:border-[#FCD535] outline-none uppercase cursor-pointer"
              >
                <option value="">SELECT CATEGORY...</option>
                {categories
                  .filter(c => c.name !== currentCategory)
                  .map(c => (
                    <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                  ))
                }
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 bg-[#FCD535]/5 border border-[#FCD535]/20 p-3">
            <AlertTriangle size={14} className="text-[#FCD535] shrink-0 mt-0.5" />
            <p className="text-[9px] text-[#FCD535] font-bold tracking-widest uppercase leading-relaxed">
              THIS WILL OVERRIDE THE WORKFLOW FOR THIS INVOICE ONLY. THE PO'S CATEGORY WILL NOT CHANGE. EXISTING TRACKING PROGRESS WILL BE PRESERVED BUT MAY NOT ALIGN WITH THE NEW WORKFLOW.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="text-xs font-black tracking-widest uppercase text-gray-500 hover:text-white border border-[#333] hover:border-[#555] px-4 py-2 transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleReassign}
              disabled={!selectedCategory || loading}
              className={clsx(
                'text-xs font-black tracking-widest uppercase px-4 py-2 transition-all flex items-center gap-2',
                selectedCategory
                  ? 'text-[#FCD535] border border-[#FCD535]/30 hover:bg-[#FCD535] hover:text-black'
                  : 'text-gray-600 border border-[#222] cursor-not-allowed'
              )}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              REASSIGN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: resp } = await getTrackingHistory(invoiceId)
        setData(resp)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [invoiceId])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#111] border-2 border-[#FCD535] w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-6 border-b-2 border-[#333] bg-black flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-[#FCD535] tracking-tighter uppercase">TRACKING HISTORY</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">
              INVOICE #{invoiceId} · {data?.invoice_number || '—'}
              {data?.is_overridden && (
                <span className="text-orange-400 ml-2">· OVERRIDDEN</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-[#FCD535] mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info Bar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] border border-[#222] p-3">
                  <p className="text-[9px] text-gray-600 font-black tracking-widest uppercase">CURRENT CATEGORY</p>
                  <p className="text-sm font-black tracking-widest uppercase text-white mt-1">{data?.current_category || '—'}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] p-3">
                  <p className="text-[9px] text-gray-600 font-black tracking-widest uppercase">ORIGINAL (PO)</p>
                  <p className="text-sm font-black tracking-widest uppercase text-gray-400 mt-1">{data?.original_category || '—'}</p>
                </div>
              </div>

              {/* Records */}
              <div>
                <p className="text-[10px] text-[#FCD535] font-black tracking-widest uppercase mb-3">
                  TRACKING RECORDS ({data?.records?.length || 0})
                </p>
                {!data?.records || data.records.length === 0 ? (
                  <div className="text-center py-8">
                    <History size={32} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-xs text-gray-600 font-bold tracking-widest uppercase">NO RECORDS YET</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.records.map(r => (
                      <div key={r.id} className={clsx(
                        'flex items-center gap-3 p-3 border',
                        r.completed
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-[#0a0a0a] border-[#222]'
                      )}>
                        {r.completed ? (
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Circle size={14} className="text-gray-700 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black tracking-widest uppercase text-gray-600 border border-[#333] px-1.5 py-0.5">
                              {r.workflow_name}
                            </span>
                            <span className={clsx(
                              'text-[10px] font-black tracking-widest uppercase truncate',
                              r.completed ? 'text-emerald-400' : 'text-gray-400'
                            )}>
                              {r.process_name}
                            </span>
                          </div>
                          {(r.completed_at || r.completed_by || r.notes) && (
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {r.completed_at && (
                                <span className="text-[8px] text-gray-600 font-bold flex items-center gap-1">
                                  <Clock size={8} />{new Date(r.completed_at).toLocaleString()}
                                </span>
                              )}
                              {r.completed_by && (
                                <span className="text-[8px] text-gray-600 font-bold flex items-center gap-1">
                                  <User size={8} />{r.completed_by}
                                </span>
                              )}
                              {r.notes && (
                                <span className="text-[8px] text-gray-500 font-bold flex items-center gap-1 italic">
                                  <MessageSquare size={8} />{r.notes.substring(0, 50)}{r.notes.length > 50 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Note Modal ───────────────────────────────────────────────────────────

function NoteModal({ invoiceId, onClose, onSuccess }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!note.trim()) return
    setLoading(true)
    try {
      await addTrackingNote(invoiceId, { note: note.trim() })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#111] border-2 border-[#FCD535] w-full max-w-md overflow-hidden">
        <div className="p-6 border-b-2 border-[#333] bg-black flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#FCD535] tracking-tighter uppercase">ADD NOTE</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">INVOICE #{invoiceId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ENTER NOTE..."
            rows={4}
            className="w-full bg-black border border-[#333] px-4 py-3 text-xs font-bold tracking-widest text-white focus:border-[#FCD535] outline-none uppercase placeholder:text-gray-700 resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="text-xs font-black tracking-widest uppercase text-gray-500 hover:text-white border border-[#333] hover:border-[#555] px-4 py-2 transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={!note.trim() || loading}
              className={clsx(
                'text-xs font-black tracking-widest uppercase px-4 py-2 transition-all flex items-center gap-2',
                note.trim()
                  ? 'text-[#FCD535] border border-[#FCD535]/30 hover:bg-[#FCD535] hover:text-black'
                  : 'text-gray-600 border border-[#222] cursor-not-allowed'
              )}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              ADD NOTE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageTracking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [reassignInvoice, setReassignInvoice] = useState(null) // { id, category }
  const [historyInvoice, setHistoryInvoice] = useState(null)
  const [noteInvoice, setNoteInvoice] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(null) // invoice_id
  const [revertConfirm, setRevertConfirm] = useState(null) // invoice_id
  const [actionLoading, setActionLoading] = useState(false)

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

  const fetchCategories = useCallback(async () => {
    try {
      const { data: resp } = await listCategories()
      setCategories(resp.items || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const summary = data?.summary || {}
  let items = (data?.items || []).filter(i => i.total_processes > 0)
  const allCategories = summary.categories || []

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    items = items.filter(i =>
      (i.invoice_number || '').toLowerCase().includes(term) ||
      (i.category || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term) ||
      (i.po_number || '').toLowerCase().includes(term)
    )
  }

  const overriddenCount = items.filter(i => i.is_overridden).length

  const handleReset = async (invoiceId) => {
    setActionLoading(true)
    try {
      await resetTracking(invoiceId)
      setResetConfirm(null)
      fetchDashboard()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reset')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevert = async (invoiceId) => {
    setActionLoading(true)
    try {
      await revertTrackingCategory(invoiceId)
      setRevertConfirm(null)
      fetchDashboard()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to revert')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="mb-8 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase flex items-center gap-5">
              <div className="w-14 h-14 bg-[#FCD535] flex items-center justify-center">
                <Settings2 size={30} className="text-black" />
              </div>
              MANAGE TRACKING
            </h1>
            <div className="text-sm font-bold tracking-widest text-gray-500 mt-3 flex items-center gap-4">
              <span>> REASSIGN · RESET · NOTES · HISTORY</span>
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
                {allCategories.map(c => (
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

        {/* Search */}
        <div className="relative mb-6">
          <Settings2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="SEARCH BY INVOICE #, CATEGORY, PO NUMBER..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-[#333] pl-10 pr-4 py-2.5 text-xs font-bold tracking-widest text-white focus:border-[#FCD535] outline-none uppercase placeholder:text-gray-700"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111] border border-[#333] p-4 flex items-center gap-3 hover:border-[#FCD535] transition-colors">
            <div className="w-10 h-10 bg-[#FCD535] text-black flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">TRACKED</p>
              <p className="text-xl font-black tracking-tight text-[#FCD535]">{items.length}</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4 flex items-center gap-3 hover:border-orange-500/50 transition-colors">
            <div className="w-10 h-10 bg-orange-500 text-black flex items-center justify-center shrink-0">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">OVERRIDDEN</p>
              <p className="text-xl font-black tracking-tight text-orange-400">{overriddenCount}</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4 flex items-center gap-3 hover:border-emerald-500/50 transition-colors">
            <div className="w-10 h-10 bg-emerald-500 text-black flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">COMPLETED</p>
              <p className="text-xl font-black tracking-tight text-emerald-400">
                {items.filter(i => i.progress >= 100).length}
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4 flex items-center gap-3 hover:border-purple-500/50 transition-colors">
            <div className="w-10 h-10 bg-purple-500 text-black flex items-center justify-center shrink-0">
              <GitBranch size={18} />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">CATEGORIES</p>
              <p className="text-xl font-black tracking-tight text-purple-400">{allCategories.length}</p>
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
                  {['INVOICE #', 'PO', 'CATEGORY', 'PROGRESS', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222] last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-600 font-bold tracking-widest">
                      <Settings2 size={48} className="mx-auto mb-4 opacity-20" />
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
                      <td className="py-3 px-4 text-xs text-gray-400 border-r border-[#222]">
                        {item.po_number || '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-[#222]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1">
                            {item.category || '—'}
                          </span>
                          {item.is_overridden && (
                            <span className="text-[8px] font-black tracking-widest uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5">
                              OVERRIDE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[130px] border-r border-[#222]">
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Reassign */}
                          <button
                            onClick={() => setReassignInvoice({ id: item.invoice_id, category: item.category })}
                            className="p-1.5 text-gray-600 hover:text-[#FCD535] hover:bg-[#FCD535]/10 border border-transparent hover:border-[#FCD535]/20 transition-all"
                            title="Reassign Workflow"
                          >
                            <ArrowRightLeft size={14} />
                          </button>

                          {/* Revert (only if overridden) */}
                          {item.is_overridden && (
                            <button
                              onClick={() => setRevertConfirm(item.invoice_id)}
                              className="p-1.5 text-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 transition-all"
                              title="Revert to PO Default"
                            >
                              <Undo2 size={14} />
                            </button>
                          )}

                          {/* History */}
                          <button
                            onClick={() => setHistoryInvoice(item.invoice_id)}
                            className="p-1.5 text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all"
                            title="View History"
                          >
                            <History size={14} />
                          </button>

                          {/* Add Note */}
                          <button
                            onClick={() => setNoteInvoice(item.invoice_id)}
                            className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all"
                            title="Add Note"
                          >
                            <MessageSquare size={14} />
                          </button>

                          {/* Reset */}
                          <button
                            onClick={() => setResetConfirm(item.invoice_id)}
                            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            title="Reset Tracking"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-widest text-gray-500 px-2 uppercase">
          <span>{items.length} TRACKED ITEMS</span>
          <span>·</span>
          <span className="text-orange-400">{overriddenCount} OVERRIDDEN</span>
          <span>·</span>
          <span>
            <ArrowRightLeft size={10} className="inline mr-1" />REASSIGN
            <span className="mx-2">|</span>
            <Undo2 size={10} className="inline mr-1" />REVERT
            <span className="mx-2">|</span>
            <History size={10} className="inline mr-1" />HISTORY
            <span className="mx-2">|</span>
            <MessageSquare size={10} className="inline mr-1" />NOTE
            <span className="mx-2">|</span>
            <Trash2 size={10} className="inline mr-1" />RESET
          </span>
        </div>
      </div>

      {/* Modals */}
      {reassignInvoice && (
        <ReassignModal
          invoiceId={reassignInvoice.id}
          currentCategory={reassignInvoice.category}
          categories={categories}
          onClose={() => setReassignInvoice(null)}
          onSuccess={() => { setReassignInvoice(null); fetchDashboard(); }}
        />
      )}

      {historyInvoice && (
        <HistoryModal
          invoiceId={historyInvoice}
          onClose={() => setHistoryInvoice(null)}
        />
      )}

      {noteInvoice && (
        <NoteModal
          invoiceId={noteInvoice}
          onClose={() => setNoteInvoice(null)}
          onSuccess={() => { setNoteInvoice(null); fetchDashboard(); }}
        />
      )}

      {resetConfirm && (
        <ConfirmModal
          title="RESET TRACKING"
          message="THIS WILL DELETE ALL TRACKING PROGRESS FOR THIS INVOICE. THIS ACTION CANNOT BE UNDONE."
          confirmLabel="RESET"
          danger={true}
          loading={actionLoading}
          onConfirm={() => handleReset(resetConfirm)}
          onCancel={() => setResetConfirm(null)}
        />
      )}

      {revertConfirm && (
        <ConfirmModal
          title="REVERT OVERRIDE"
          message="THIS WILL REMOVE THE WORKFLOW OVERRIDE AND REVERT TO THE PO'S ORIGINAL CATEGORY. EXISTING TRACKING PROGRESS WILL BE PRESERVED."
          confirmLabel="REVERT"
          danger={false}
          loading={actionLoading}
          onConfirm={() => handleRevert(revertConfirm)}
          onCancel={() => setRevertConfirm(null)}
        />
      )}
    </div>
  )
}
