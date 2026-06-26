import { useEffect, useState, useCallback } from 'react'
import { listInvoices, deleteInvoice, updateInvoice, listCategories } from '../api/client'
import {
  Trash2, Edit2, Save, X, Search, Filter, CheckSquare, Square,
  AlertTriangle, CheckCircle, RefreshCw, Loader2, ChevronLeft,
  ChevronRight, Settings2, Pencil,
} from 'lucide-react'
import clsx from 'clsx'

const STATUSES = ['', 'processed', 'needs_review', 'error']
const PAGE_SIZE = 20

function StatusBadge({ status }) {
  const cls = {
    processed: 'bg-emerald-500 text-black',
    needs_review: 'bg-[#FCD535] text-black',
    error: 'bg-red-500 text-white',
    duplicate: 'bg-blue-500 text-white',
  }
  const label = { processed: 'PROCESSED', needs_review: 'REVIEW', error: 'ERROR', duplicate: 'DUP' }
  return <span className={clsx('text-[10px] font-black px-2 py-1 tracking-widest uppercase border border-black', cls[status] || 'bg-gray-500 text-white')}>{label[status] || status}</span>
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={clsx(
      'fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 border-2 shadow-[8px_8px_0_0_#000] animate-slide-up font-mono uppercase tracking-widest font-bold text-xs',
      type === 'success' && 'bg-emerald-500 border-black text-black',
      type === 'error' && 'bg-red-500 border-black text-black',
      type === 'info' && 'bg-[#FCD535] border-black text-black',
    )}>
      {type === 'success' && <CheckCircle size={18} />}
      {type === 'error' && <AlertTriangle size={18} />}
      {type === 'info' && <Settings2 size={18} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 hover:opacity-50 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

function ConfirmModal({ title, message, confirmLabel = 'DELETE', onConfirm, onCancel, danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono animate-fade-in p-4">
      <div className="bg-[#111] border-2 border-[#333] p-8 max-w-md w-full shadow-[12px_12px_0_0_#000] relative">
        <div className="flex items-start gap-4 mb-6">
          <div className={clsx(
            'w-12 h-12 border-2 flex items-center justify-center shrink-0',
            danger ? 'bg-red-500 border-black text-black' : 'bg-[#FCD535] border-black text-black'
          )}>
            {danger ? <AlertTriangle size={24} /> : <Settings2 size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{title}</h3>
            <p className="text-sm text-gray-400 mt-2 font-bold tracking-widest leading-relaxed uppercase">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onCancel} className="text-sm font-black text-gray-500 hover:text-white uppercase tracking-widest px-4 py-2">CANCEL</button>
          <button
            onClick={onConfirm}
            className={clsx(
              'px-6 py-3 text-sm font-black uppercase tracking-widest border-2 border-black hover:-translate-y-1 hover:translate-x-1 transition-transform',
              danger ? 'bg-red-500 text-black shadow-[4px_4px_0_0_#fff]' : 'bg-[#FCD535] text-black shadow-[4px_4px_0_0_#fff]'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ invoice, onSave, onCancel, saving, categories }) {
  const [values, setValues] = useState({
    invoice_number: invoice.invoice_number || '',
    invoice_date: invoice.invoice_date || '',
    order_id: invoice.order_id || '',
    seller_gstin: invoice.seller_gstin || '',
    grand_total: invoice.grand_total || '',
    status: invoice.status || 'processed',
    category: invoice.category || '',
  })

  const handleChange = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const fields = [
    { key: 'invoice_number', label: 'INVOICE NUMBER', type: 'text' },
    { key: 'invoice_date', label: 'INVOICE DATE', type: 'text', placeholder: 'YYYY-MM-DD' },
    { key: 'order_id', label: 'ORDER ID', type: 'text' },
    { key: 'seller_gstin', label: 'SELLER GSTIN', type: 'text' },
    { key: 'grand_total', label: 'GRAND TOTAL', type: 'number' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono animate-fade-in p-4">
      <div className="bg-[#111] border-2 border-[#FCD535] p-8 max-w-lg w-full relative">
        <div className="flex items-center gap-4 mb-8 border-b border-[#333] pb-4">
          <div className="w-12 h-12 bg-[#FCD535] text-black flex items-center justify-center">
            <Pencil size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">EDIT INVOICE</h3>
            <p className="text-xs text-[#FCD535] font-bold tracking-widest mt-1">ID #{invoice.id} · {invoice.product_description || 'NO DESCRIPTION'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{f.label}</label>
              <input
                type={f.type}
                className="w-full bg-black border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#FCD535] transition-colors mt-1 font-bold placeholder-gray-700"
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={e => handleChange(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">STATUS</label>
            <select
              className="w-full bg-black border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#FCD535] transition-colors mt-1 font-bold cursor-pointer uppercase tracking-widest"
              value={values.status}
              onChange={e => handleChange('status', e.target.value)}
            >
              <option value="processed" className="bg-[#111]">PROCESSED</option>
              <option value="needs_review" className="bg-[#111]">NEEDS REVIEW</option>
              <option value="error" className="bg-[#111]">ERROR</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">CATEGORY</label>
            <select
              className="w-full bg-black border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#FCD535] transition-colors mt-1 font-bold cursor-pointer uppercase tracking-widest"
              value={values.category}
              onChange={e => handleChange('category', e.target.value)}
            >
              <option value="" className="bg-[#111]">NONE</option>
              {categories.map(c => (
                <option key={c.name} value={c.name} className="bg-[#111]">{c.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#333]">
          <button onClick={onCancel} className="text-sm font-black text-gray-500 hover:text-white uppercase tracking-widest px-4 py-2 flex items-center gap-2">
            <X size={14} /> CANCEL
          </button>
          <button
            onClick={() => onSave(values)}
            disabled={saving}
            className="bg-[#FCD535] text-black border border-[#FCD535] hover:bg-black hover:text-[#FCD535] font-black uppercase px-6 py-2 transition-all flex items-center gap-2 text-sm tracking-widest"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Modify() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { ids: number[], label: string }
  const [editInvoice, setEditInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingCategories, setPendingCategories] = useState({})
  
  const INVOICE_TYPES = ['SERVICE', 'ITEM']

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listInvoices({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
      })
      setInvoices(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(0) }, [search, status])

  // (Removed API fetch for Item Categories since Invoice Types are hardcoded)

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(invoices.map(i => i.id)))
    }
  }

  const allSelected = invoices.length > 0 && selected.size === invoices.length

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const ids = confirmDelete.ids
    let successCount = 0
    let failCount = 0

    for (const id of ids) {
      try {
        await deleteInvoice(id)
        successCount++
      } catch {
        failCount++
      }
    }

    setConfirmDelete(null)
    setDeleting(false)
    setSelected(new Set())

    if (failCount === 0) {
      setToast({ message: `Deleted ${successCount} invoice${successCount > 1 ? 's' : ''} successfully`, type: 'success' })
    } else {
      setToast({ message: `${successCount} deleted, ${failCount} failed`, type: 'error' })
    }

    fetchInvoices()
  }

  const askDeleteSingle = (inv) => {
    setConfirmDelete({
      ids: [inv.id],
      label: `Delete invoice #${inv.id} (${inv.invoice_number || inv.product_description || 'untitled'})?`,
    })
  }

  const askDeleteSelected = () => {
    if (selected.size === 0) return
    setConfirmDelete({
      ids: [...selected],
      label: `Delete ${selected.size} selected invoice${selected.size > 1 ? 's' : ''}? This cannot be undone.`,
    })
  }

  const handleBatchCategorize = async (category) => {
    if (selected.size === 0 || !category) return
    
    // Instead of saving immediately, apply to pendingCategories
    const nextPending = { ...pendingCategories }
    for (const id of selected) {
      nextPending[id] = category
    }
    setPendingCategories(nextPending)
    setSelected(new Set())
    setToast({ message: `Marked ${selected.size} invoices as ${category}. Don't forget to save!`, type: 'info' })
  }

  // ── Save Pending Categories ────────────────────────────────────────────────
  const handleSavePendingCategories = async () => {
    const entries = Object.entries(pendingCategories)
    if (entries.length === 0) return
    setSaving(true)
    let successCount = 0
    for (const [id, category] of entries) {
      try {
        await updateInvoice(id, { category })
        successCount++
      } catch (err) {}
    }
    setSaving(false)
    setToast({ message: `Saved ${successCount} category changes successfully`, type: 'success' })
    setPendingCategories({})
    fetchInvoices()
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (values) => {
    if (!editInvoice) return
    setSaving(true)
    try {
      await updateInvoice(editInvoice.id, values)
      setToast({ message: `Invoice #${editInvoice.id} updated`, type: 'success' })
      setEditInvoice(null)
      fetchInvoices()
    } catch {
      setToast({ message: 'Failed to update invoice', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase flex items-center gap-6">
              <div className="w-16 h-16 bg-[#FCD535] flex items-center justify-center border-4 border-[#FCD535]">
                <Settings2 size={36} className="text-black" />
              </div>
              MODIFY
            </h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-4 flex items-center gap-4">
              <span>&gt; BATCH · EDIT · DATABASE</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <div className="flex gap-4">
            {selected.size > 0 && (
              <>
                <select
                  className="bg-black text-[#FCD535] border border-[#FCD535] font-black uppercase tracking-widest px-4 py-2 text-xs hover:bg-[#FCD535] hover:text-black transition-colors outline-none cursor-pointer"
                  onChange={(e) => {
                    handleBatchCategorize(e.target.value)
                    e.target.value = "" // Reset dropdown after selection
                  }}
                  disabled={saving}
                >
                  <option value="">SET INVOICE TYPE...</option>
                  {INVOICE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  onClick={askDeleteSelected}
                  className="bg-red-500 text-white font-black uppercase tracking-widest px-4 py-2 text-xs flex items-center gap-2 hover:bg-red-600 transition-colors"
                  disabled={saving}
                >
                  <Trash2 size={14} />
                  DELETE [{selected.size}]
                </button>
              </>
            )}
            <button onClick={fetchInvoices} className="btn-brutal-dark p-3 text-xs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FCD535]" />
            <input
              className="w-full bg-black border border-[#333] text-white placeholder-gray-600 px-4 py-3 pl-10 text-sm outline-none focus:border-[#FCD535] transition-colors font-bold uppercase tracking-widest"
              placeholder="SEARCH INVOICE #, ORDER ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-48 bg-black border border-[#333] text-white px-4 py-3 text-sm outline-none focus:border-[#FCD535] transition-colors cursor-pointer uppercase tracking-widest font-bold"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUSES.map(s => <option key={s} value={s} className="bg-[#111]">{s || 'ALL STATUSES'}</option>)}
          </select>
        </div>

        {/* Selection info bar */}
        {selected.size > 0 && (
          <div className="bg-[#1a1a1a] border border-[#FCD535] px-6 py-4 mb-8 flex items-center justify-between font-bold uppercase tracking-widest">
            <span className="text-sm text-[#FCD535]">
              &gt; {selected.size} RECORD{selected.size > 1 ? 'S' : ''} SELECTED
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              [ CLEAR SELECTION ]
            </button>
          </div>
        )}

        <div className="divider-striped-yellow mb-8"></div>

        {/* Table */}
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
                  <th className="py-4 px-4 border-r border-[#222] w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-500 hover:text-[#FCD535] transition-colors">
                      {allSelected ? <CheckSquare size={18} className="text-[#FCD535]" /> : <Square size={18} />}
                    </button>
                  </th>
                  {['INVOICE #', 'PRODUCT', 'DATE', 'GSTIN', 'TOTAL', 'INV TYPE', 'STATUS', 'ACT'].map(h => (
                    <th key={h} className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222] last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-gray-600 font-bold tracking-widest">
                      <Settings2 size={48} className="mx-auto mb-4 opacity-20" />
                      NO INVOICES FOUND.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={clsx(
                        "border-b border-[#222] transition-colors cursor-pointer",
                        selected.has(inv.id) ? 'bg-[#FCD535]/10' : (idx % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]'),
                        !selected.has(inv.id) && 'hover:bg-[#1a1a1a]'
                      )}
                    >
                      <td className="py-3 px-4 border-r border-[#222] text-center" onClick={(e) => { e.stopPropagation(); toggleSelect(inv.id); }}>
                        <button className="text-gray-500 hover:text-[#FCD535] transition-colors">
                          {selected.has(inv.id)
                            ? <CheckSquare size={18} className="text-[#FCD535]" />
                            : <Square size={18} />
                          }
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>{inv.invoice_number || '—'}</td>
                      <td className="py-3 px-4 text-xs max-w-xs border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>
                        <span className="truncate block font-bold text-gray-300">{inv.product_description || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>{inv.invoice_date || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>{inv.seller_gstin || '—'}</td>
                      <td className="py-3 px-4 text-sm font-black text-white border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>{formatCurrency(inv.grand_total)}</td>
                      <td className="py-3 px-4 border-r border-[#222]" onClick={() => toggleSelect(inv.id)}>
                        <select
                          className={clsx(
                            "bg-black border outline-none text-[10px] font-black px-1 py-1 uppercase tracking-widest cursor-pointer transition-colors",
                            pendingCategories[inv.id] !== undefined 
                              ? "text-[#FCD535] border-[#FCD535]" 
                              : inv.category ? "text-[#FCD535] border-black" : "text-gray-500 border-[#333]"
                          )}
                          value={pendingCategories[inv.id] !== undefined ? pendingCategories[inv.id] : (inv.category || '')}
                          onChange={(e) => {
                            e.stopPropagation()
                            setPendingCategories(prev => ({ ...prev, [inv.id]: e.target.value }))
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">NONE</option>
                          {['SERVICE', 'ITEM'].map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 border-r border-[#222]" onClick={() => toggleSelect(inv.id)}><StatusBadge status={inv.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditInvoice(inv); }}
                            className="p-2 text-gray-400 hover:text-[#FCD535] hover:bg-[#222] transition-colors"
                            title="EDIT"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); askDeleteSingle(inv); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-[#222] transition-colors"
                            title="DELETE"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-[#111] border-t-2 border-[#333]">
              <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-brutal-dark p-2 disabled:opacity-30 disabled:hover:bg-[#111] disabled:hover:text-[#FCD535]"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-brutal-dark p-2 disabled:opacity-30 disabled:hover:bg-[#111] disabled:hover:text-[#FCD535]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick stats footer */}
        <div className="mt-6 flex items-center gap-6 text-[10px] font-black tracking-widest text-gray-500 px-2 uppercase">
          <span>{total} TOTAL RECORDS</span>
          <span>·</span>
          <span className="text-[#FCD535]">{selected.size} SELECTED</span>
          <span>·</span>
          <span>TIP: SELECT MULTIPLE FOR BATCH DELETION</span>
        </div>
      </div>

      {/* Pending Changes Action Bar */}
      {Object.keys(pendingCategories).length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-[#FCD535] text-black border-4 border-black p-4 flex items-center gap-8 shadow-[8px_8px_0_0_#000] animate-slide-up">
          <span className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings2 size={18} />
            {Object.keys(pendingCategories).length} UNSAVED CHANGES
          </span>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setPendingCategories({})} 
              className="text-xs font-black uppercase tracking-widest hover:opacity-50 transition-opacity"
            >
              DISCARD
            </button>
            <button 
              onClick={handleSavePendingCategories} 
              disabled={saving}
              className="bg-black text-[#FCD535] px-8 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'SAVING...' : 'SAVE ALL CHANGES'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.ids.length > 1 ? 'BATCH DELETE' : 'DELETE INVOICE'}
          message={confirmDelete.label}
          confirmLabel={deleting ? 'DELETING...' : `DELETE${confirmDelete.ids.length > 1 ? ` [${confirmDelete.ids.length}]` : ''}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}

      {editInvoice && (
        <EditModal
          invoice={editInvoice}
          onSave={handleSaveEdit}
          onCancel={() => setEditInvoice(null)}
          saving={saving}
          categories={categoryList}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
