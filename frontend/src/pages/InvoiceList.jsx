import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInvoices, exportCSV, exportExcel } from '../api/client'
import { Search, Filter, Download, FileText, ChevronLeft, ChevronRight, RefreshCw, Loader2, Edit2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'


const STATUSES = ['', 'processed', 'needs_review', 'error']
const PAGE_SIZE = 25

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

function ConfidenceDot({ score }) {
  if (score == null) return <span className="text-gray-500">—</span>
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[#FCD535]' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-3 h-3 border border-[#333]', color)} />
      <span className="text-xs text-white font-bold">{pct}%</span>
    </div>
  )
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

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

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, status])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase">Invoices</h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-2 flex items-center gap-4">
              <span>&gt; DATABASE · RECORDS [{total}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <div className="flex gap-4">
            {(user?.role === 'admin' || user?.can_upload) && (
              <button onClick={() => navigate('/modify')} className="btn-brutal-dark px-4 py-2 flex items-center gap-2 text-xs text-[#FCD535] border-[#FCD535] hover:bg-[#FCD535] hover:text-black transition-colors">
                <Edit2 size={14} /> EDIT
              </button>
            )}
            <button onClick={() => exportCSV({ status })} className="btn-brutal-dark px-4 py-2 flex items-center gap-2 text-xs">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => exportExcel({ status })} className="btn-brutal-dark px-4 py-2 flex items-center gap-2 text-xs">
              <Download size={14} /> EXCEL
            </button>
            <button onClick={fetchInvoices} className="btn-brutal-dark p-2 text-xs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FCD535]" />
            <input
              className="w-full bg-black border border-[#333] text-white placeholder-gray-600 px-4 py-3 pl-10 text-sm outline-none focus:border-[#FCD535] transition-colors"
              placeholder="SEARCH INVOICE #, SELLER, ORDER ID..."
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
                  {['INVOICE #', 'DATE', 'PRODUCT', 'QTY', 'TOTAL', 'PO #', 'ITEM CODE', 'ITEM CATEGORY', 'CONF.', 'STATUS'].map(h => (
                    <th key={h} className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222] last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-20 text-gray-600 font-bold tracking-widest">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      NO INVOICES FOUND.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={clsx(
                        "border-b border-[#222] hover:bg-[#1a1a1a] cursor-pointer transition-colors",
                        idx % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]'
                      )}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-3 px-4 text-sm font-bold border-r border-[#222]">{inv.invoice_number || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap border-r border-[#222]">{inv.invoice_date || '—'}</td>
                      <td className="py-3 px-4 text-xs max-w-xs border-r border-[#222]">
                        <span className="truncate block">{inv.product_description || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-center border-r border-[#222]">{inv.quantity != null ? inv.quantity : '—'}</td>
                      <td className="py-3 px-4 text-sm font-black text-white border-r border-[#222]">{formatCurrency(inv.grand_total)}</td>
                      <td className="py-3 px-4 text-xs font-bold text-[#FCD535] border-r border-[#222]">{inv.po_number || '—'}</td>
                      <td className="py-3 px-4 text-xs font-bold text-cyan-400 font-mono border-r border-[#222]">{inv.linked_po?.item_code || '—'}</td>
                      <td className="py-3 px-4 border-r border-[#222]">
                        {inv.linked_po?.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black tracking-widest uppercase rounded-sm border bg-purple-500/15 text-purple-400 border-purple-500/30">
                            {inv.linked_po.category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-[#222]"><ConfidenceDot score={inv.confidence_score} /></td>
                      <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-[#111] border-t-2 border-[#333]">
              <span className="text-xs font-bold tracking-widest text-gray-500">
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
      </div>
    </div>
  )
}
