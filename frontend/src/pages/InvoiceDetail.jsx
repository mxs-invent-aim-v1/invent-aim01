import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoice, updateInvoice, deleteInvoice } from '../api/client'
import { ArrowLeft, Edit2, Save, Trash2, X, FileText, Package, Receipt, Link2 } from 'lucide-react'
import clsx from 'clsx'

function Field({ label, value, editable, editKey, editValues, onChange }) {
  const val = editable ? (editValues[editKey] ?? value ?? '') : (value ?? '—')
  if (editable) {
    return (
      <div>
        <label className="text-[10px] text-[#FCD535] font-black uppercase tracking-widest">{label}</label>
        <input
          className="w-full bg-black border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#FCD535] transition-colors mt-1 font-bold"
          value={val}
          onChange={e => onChange(editKey, e.target.value)}
        />
      </div>
    )
  }
  return (
    <div>
      <p className="text-[10px] text-[#FCD535] font-black uppercase tracking-widest">{label}</p>
      <p className="text-sm text-white mt-1 font-bold">{value || '—'}</p>
    </div>
  )
}

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

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    getInvoice(id).then(r => {
      setInvoice(r.data)
      setLoading(false)
    })
  }, [id])

  const handleEdit = (key, val) => setEditValues(ev => ({ ...ev, [key]: val }))

  const saveEdits = async () => {
    setSaving(true)
    try {
      const { data } = await updateInvoice(id, editValues)
      setInvoice(prev => ({ ...prev, ...data }))
      setEditing(false)
      setEditValues({})
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice from the database?')) return
    await deleteInvoice(id)
    navigate('/invoices')
  }

  const formatCurrency = (v) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-surface-500">Invoice not found.</div>
    )
  }

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-6xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b border-[#333] pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/invoices')} className="btn-brutal-dark p-2 rounded-none">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase truncate max-w-lg">
                INV {invoice.invoice_number || `#${invoice.id}`}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge status={invoice.status} />
                <span className="text-xs font-bold tracking-widest text-gray-500">ID #{invoice.id}</span>
                {invoice.confidence_score != null && (
                  <span className="text-xs font-bold tracking-widest text-gray-500">
                    · CONF {(invoice.confidence_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setEditValues({}) }} className="btn-brutal-dark px-4 py-2 flex items-center gap-2 text-xs">
                  <X size={14} /> CANCEL
                </button>
                <button onClick={saveEdits} disabled={saving} className="bg-[#FCD535] text-black border border-[#FCD535] hover:bg-black hover:text-[#FCD535] font-black uppercase px-4 py-2 transition-all flex items-center gap-2 text-xs">
                  <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-brutal-dark px-4 py-2 flex items-center gap-2 text-xs">
                  <Edit2 size={14} /> EDIT
                </button>
                <button onClick={handleDelete} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500 px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-2">
                  <Trash2 size={14} /> DELETE
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Invoice details */}
            <div className="card-brutal-dark p-8 relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#FCD535]" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Receipt size={18} className="text-[#FCD535]" /> INVOICE DETAILS
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <Field label="INVOICE NUMBER" value={invoice.invoice_number} editable={editing} editKey="invoice_number" editValues={editValues} onChange={handleEdit} />
                <Field label="INVOICE DATE" value={invoice.invoice_date} editable={editing} editKey="invoice_date" editValues={editValues} onChange={handleEdit} />
                <Field label="INVOICE TYPE" value={invoice.category} editable={editing} editKey="category" editValues={editValues} onChange={handleEdit} />
                <Field label="ORDER ID" value={invoice.order_id} editable={editing} editKey="order_id" editValues={editValues} onChange={handleEdit} />
              </div>
            </div>

            {/* Linked PO */}
            {invoice.linked_po && (
              <div className="card-brutal-dark p-8 relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400" />
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Link2 size={18} /> LINKED PURCHASE ORDER
                  </h2>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 text-xs font-black tracking-widest uppercase">
                    {invoice.linked_po.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Field label="PO NUMBER" value={invoice.linked_po.po_number} editable={false} />
                  <Field label="ITEM CODE" value={invoice.linked_po.item_code} editable={false} />
                  <Field label="CATEGORY" value={invoice.linked_po.category} editable={false} />
                  <Field label="QUANTITY" value={`${invoice.linked_po.quantity} ${invoice.linked_po.unit.toUpperCase()}`} editable={false} />
                </div>
                <div className="mt-6 pt-6 border-t border-[#333]">
                  <Field label="ITEM NAME" value={invoice.linked_po.item_name} editable={false} />
                </div>
              </div>
            )}

            {/* Seller */}
            <div className="card-brutal-dark p-8 relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#FCD535]" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">SELLER</h2>
              <div className="grid grid-cols-2 gap-6">
                <Field label="GSTIN" value={invoice.seller_gstin} editable={editing} editKey="seller_gstin" editValues={editValues} onChange={handleEdit} />
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items?.length > 0 && (
              <div className="card-brutal-dark relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#FCD535]" />
                <div className="px-8 py-6 border-b border-[#333]">
                  <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Package size={18} className="text-[#FCD535]" /> LINE ITEMS [{invoice.line_items.length}]
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black border-b border-[#333]">
                      <tr>
                        {['ITEM', 'HSN', 'QTY', 'UNIT PRICE', 'TOTAL', 'TAX'].map(h => (
                          <th key={h} className="py-3 px-4 text-[10px] font-black tracking-widest text-[#FCD535] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item, i) => (
                        <tr key={i} className="border-b border-[#222] last:border-0 hover:bg-[#151515] transition-colors">
                          <td className="py-3 px-4 font-bold text-white max-w-xs text-sm">
                            <span className="block truncate">{item.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.hsn_code || '—'}</td>
                          <td className="py-3 px-4 text-center font-bold text-sm">{item.quantity}</td>
                          <td className="py-3 px-4 font-bold text-sm text-gray-300">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 px-4 font-black text-white text-sm">{formatCurrency(item.total_price)}</td>
                          <td className="py-3 px-4 text-xs font-bold text-gray-500">
                            {item.tax_rate != null ? `${item.tax_rate}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Financials + Taxes + Metadata */}
          <div className="space-y-8">
            {/* Totals */}
            <div className="card-brutal-dark p-8">
              <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">FINANCIALS</h2>
              <div className="space-y-4">
                {invoice.taxes?.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm font-bold border-b border-[#222] pb-2">
                    <span className="text-gray-400">{t.tax_type} {t.rate != null ? `(${t.rate}%)` : ''}</span>
                    <span className="text-gray-300">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-end">
                  <span className="text-[#FCD535] font-black tracking-widest text-sm">GRAND TOTAL</span>
                  <span className="text-3xl font-black text-white">{formatCurrency(invoice.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Processing metadata */}
            <div className="card-brutal-dark p-8">
              <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">METADATA</h2>
              <div className="space-y-4 text-sm font-bold">
                <div className="flex justify-between items-center border-b border-[#222] pb-2">
                  <span className="text-gray-500 text-xs tracking-widest">SOURCE</span>
                  <span className="text-xs text-black bg-[#FCD535] px-2 py-0.5 uppercase tracking-widest">{invoice.source_type}</span>
                </div>
                {invoice.ocr_confidence != null && (
                  <div className="flex justify-between items-center border-b border-[#222] pb-2">
                    <span className="text-gray-500 text-xs tracking-widest">OCR CONF</span>
                    <span className="text-white">{invoice.ocr_confidence?.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-[#222] pb-2">
                  <span className="text-gray-500 text-xs tracking-widest">AI CONF</span>
                  <span className="text-white">{invoice.confidence_score != null ? `${(invoice.confidence_score * 100).toFixed(0)}%` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Raw text toggle */}
            {invoice.raw_text && (
              <div className="card-brutal-dark overflow-hidden">
                <button
                  onClick={() => setShowRaw(r => !r)}
                  className="w-full px-6 py-4 text-sm font-black text-[#FCD535] hover:bg-[#FCD535] hover:text-black uppercase tracking-widest flex items-center justify-between transition-colors"
                >
                  <span>RAW TEXT</span>
                  <span className="text-xs">{showRaw ? '[ HIDE ]' : '[ SHOW ]'}</span>
                </button>
                {showRaw && (
                  <pre className="text-[10px] text-gray-500 font-mono p-6 max-h-64 overflow-y-auto whitespace-pre-wrap bg-black border-t border-[#333]">
                    {invoice.raw_text}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
