import { useState, useEffect } from 'react'
import { getUnmatchedInvoices, suggestPOs, linkPO, listPOs } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Check, X, Search, Link2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export default function POMatching() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [suggestionsMap, setSuggestionsMap] = useState({}) // invoiceId -> suggestions array
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // For manual selection modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [selectedInvoiceForManual, setSelectedInvoiceForManual] = useState(null)
  const [approvedPOs, setApprovedPOs] = useState([])
  const [searchPO, setSearchPO] = useState('')

  useEffect(() => {
    fetchUnmatched()
    fetchApprovedPOs()
  }, [])

  const fetchApprovedPOs = async () => {
    try {
      const { data } = await listPOs({ status: 'approved', limit: 1000 })
      setApprovedPOs(data.items)
    } catch (err) {
      console.error('Failed to load approved POs', err)
    }
  }

  const fetchUnmatched = async () => {
    try {
      setLoading(true)
      const { data } = await getUnmatchedInvoices({ limit: 100 })
      setInvoices(data.items)
      
      // Fetch suggestions for all
      const suggMap = {}
      for (const inv of data.items) {
        try {
          const { data: sData } = await suggestPOs(inv.id)
          suggMap[inv.id] = sData.suggestions
        } catch (err) {
          suggMap[inv.id] = []
        }
      }
      setSuggestionsMap(suggMap)
    } catch (err) {
      setError('Failed to load unmatched invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmMatch = async (invoiceId, poId) => {
    try {
      await linkPO(invoiceId, poId)
      // Remove from list
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to link PO')
    }
  }

  const handleOpenManual = (invoice) => {
    setSelectedInvoiceForManual(invoice)
    setSearchPO('')
    setIsManualModalOpen(true)
  }

  const filteredApprovedPOs = approvedPOs.filter(po => 
    po.po_number.toLowerCase().includes(searchPO.toLowerCase()) || 
    po.item_name.toLowerCase().includes(searchPO.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">

      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-8 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase">PO Matching</h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-2 flex items-center gap-4">
              <span>&gt; BULK VERIFICATION [{invoices.length}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {loading ? (
          <div className="text-center py-12 text-[#FCD535] font-black tracking-widest uppercase text-2xl animate-pulse">
            Finding Matches...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black tracking-widest uppercase text-2xl">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="card-brutal-dark p-16 text-center">
            <Check size={48} className="mx-auto mb-4 text-emerald-400" />
            <p className="text-xl font-black tracking-widest text-emerald-400 uppercase">All Caught Up</p>
            <p className="text-sm text-gray-600 mt-2 font-bold">No unmatched invoices pending verification.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {invoices.map(invoice => {
              const suggestions = suggestionsMap[invoice.id] || []
              const bestMatch = suggestions.length > 0 ? suggestions[0] : null
              
              return (
                <div key={invoice.id} className="card-brutal-dark p-6 border-l-4 border-[#FCD535]">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Invoice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-black tracking-widest bg-[#111] px-2 py-1 text-gray-400 border border-[#333]">
                          INVOICE #{invoice.id}
                        </span>
                        {invoice.invoice_number && (
                          <span className="text-xs font-bold text-gray-500">Ref: {invoice.invoice_number}</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Description</p>
                          <p className="text-sm font-bold truncate" title={invoice.product_description}>
                            {invoice.product_description || '—'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Quantity</p>
                            <p className="text-sm font-bold text-[#FCD535]">{invoice.quantity || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Grand Total</p>
                            <p className="text-sm font-bold">₹{invoice.grand_total?.toFixed(2) || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0 bg-black p-4 border border-[#333] relative">
                      <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-4 h-4 text-[#FCD535]">
                        <Link2 size={16} />
                      </div>
                      
                      {bestMatch ? (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1">
                              <Check size={14} /> SUGGESTED MATCH
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 tracking-widest border border-[#333] px-2 py-0.5">
                              SCORE: {bestMatch.score}%
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">PO Number</p>
                              <p className="text-sm font-bold text-[#FCD535]">{bestMatch.po.po_number}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Item Name</p>
                              <p className="text-sm font-bold truncate" title={bestMatch.po.item_name}>
                                {bestMatch.po.item_name}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                          <AlertCircle size={24} className="mb-2" />
                          <p className="text-xs font-bold tracking-widest uppercase">No Confident Match Found</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-center gap-3 shrink-0 w-full md:w-auto">
                      {bestMatch && (
                        <button
                          onClick={() => handleConfirmMatch(invoice.id, bestMatch.po.id)}
                          className="btn-brutal-dark px-6 py-3 text-xs font-black tracking-widest uppercase text-emerald-400 hover:text-white"
                        >
                          CONFIRM MATCH
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenManual(invoice)}
                        className="px-6 py-3 text-xs font-black tracking-widest uppercase text-gray-500 hover:text-[#FCD535] border border-[#333] hover:border-[#FCD535] transition-colors bg-black"
                      >
                        MANUAL SELECT
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manual Selection Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-[#333] shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b-2 border-[#333] bg-black shrink-0">
              <h2 className="text-xl font-black text-[#FCD535] tracking-tighter uppercase flex justify-between items-center">
                MANUAL PO SELECT
                <button onClick={() => setIsManualModalOpen(false)} className="text-gray-500 hover:text-red-400">
                  <X size={20} />
                </button>
              </h2>
            </div>
            
            <div className="p-6 shrink-0 border-b border-[#222]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                  placeholder="Search by PO Number or Item Name..."
                  className="w-full bg-black border border-[#333] pl-9 pr-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none placeholder-gray-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filteredApprovedPOs.length === 0 ? (
                <div className="text-center text-gray-500 font-bold uppercase text-xs py-8">
                  No approved POs found
                </div>
              ) : (
                filteredApprovedPOs.map(po => (
                  <div key={po.id} className="flex items-center justify-between p-4 bg-black border border-[#222] hover:border-[#FCD535] transition-colors group">
                    <div>
                      <p className="text-sm font-bold text-[#FCD535]">{po.po_number}</p>
                      <p className="text-xs font-bold text-gray-400">{po.item_name} — Qty: {po.quantity}</p>
                    </div>
                    <button
                      onClick={() => {
                        handleConfirmMatch(selectedInvoiceForManual.id, po.id)
                        setIsManualModalOpen(false)
                      }}
                      className="px-4 py-2 text-[10px] font-black tracking-widest uppercase border border-[#333] group-hover:border-[#FCD535] group-hover:text-[#FCD535] transition-colors"
                    >
                      SELECT
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
