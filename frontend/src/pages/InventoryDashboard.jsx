import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Clock, Search, Filter, Eye, Download, Trash2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listInvoices, deleteInvoice, getPWSItems, getPWSAssignments, updateInvoice } from '../api/client'

export default function InventoryDashboard() {
  const [registerPopupOpen, setRegisterPopupOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // PWS Data
  const [pwsItems, setPwsItems] = useState([])
  const [pwsAssignments, setPwsAssignments] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Edit expanded row state
  const [expandedRow, setExpandedRow] = useState(null)
  const [editData, setEditData] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, pwsRes, assignRes] = await Promise.all([
        listInvoices({ limit: 100 }),
        getPWSItems(),
        getPWSAssignments()
      ])
      setInvoices(invRes.data.items || [])
      setTotal(invRes.data.total || 0)
      setPwsItems(pwsRes.data || [])
      setPwsAssignments(assignRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const navigate = useNavigate()

  const handleToggleExpand = (item) => {
    if (expandedRow === item.id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(item.id)
      setEditData({ ...item })
    }
  }

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async (id) => {
    try {
      await updateInvoice(id, {
        invoice_number: editData.invoice_number,
        invoice_date: editData.invoice_date,
        order_id: editData.order_id,
        seller_gstin: editData.seller_gstin,
        grand_total: parseFloat(editData.grand_total) || 0,
        status: editData.status,
        hsn_code: editData.hsn_code,
        total_tax: editData.total_tax
      })
      alert("Invoice updated successfully!")
      setExpandedRow(null)
      fetchData()
    } catch (err) {
      console.error(err)
      alert("Failed to update invoice")
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id)
        fetchData()
      } catch (err) {
        console.error("Failed to delete invoice:", err)
      }
    }
  }

  const handleDownload = (item) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `invoice_${item.id}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRegisterSave = () => {
    alert("Invoice successfully registered to the selected project hierarchy!")
    closeRegisterPopup()
  }

  const projects = pwsItems.filter(i => i.type === 'project')
  const workflows = pwsItems.filter(i => i.type === 'workflow')
  const states = pwsItems.filter(i => i.type === 'state')

  // Get connected workflows for the selected project
  const connectedWorkflows = pwsAssignments
    .filter(a => a.parent_id === selectedProjectId)
    .map(a => workflows.find(w => w.id === a.child_id))
    .filter(Boolean)

  const onDrop = useCallback((accepted) => {
    // Handle drop
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const openRegisterPopup = (invoice) => {
    setSelectedInvoice(invoice)
    setRegisterPopupOpen(true)
  }

  const closeRegisterPopup = () => {
    setRegisterPopupOpen(false)
    setSelectedInvoice(null)
  }

  // Calculate simple mock stats based on actual data
  const parsedCount = invoices.filter(i => i.status === 'processed' || i.status === 'needs_review').length
  const failedCount = invoices.filter(i => i.status === 'error').length
  const pendingCount = invoices.filter(i => !i.status || i.status === 'pending').length

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col relative -m-8 p-8 rounded-tl-xl shadow-inner">
      <div className="max-w-7xl w-full mx-auto pb-20">
        
        {/* Upload Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-blue-700 tracking-tight">UPLOAD</h1>
          <p className="text-[14px] text-gray-600 font-medium mt-1">Upload invoice files and extract data automatically</p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer relative overflow-hidden mb-8 transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
             <div className="mb-4 text-blue-600">
               <UploadIcon size={42} strokeWidth={2} />
             </div>
             <p className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
               Drag & Drop invoice files here or
             </p>
             <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-6 rounded-md transition-colors mb-4 shadow-sm">
               Browse Files
             </button>
             <p className="text-gray-500 text-xs font-medium">Supports: PDF, JPG, PNG, Excel, CSV (Max size: 20MB)</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-5 mb-10">
          <div className="bg-white border border-gray-100 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <UploadIcon size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-blue-700">Total Uploaded</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{total || invoices.length || 0}</p>
          </div>
          
          <div className="bg-white border border-gray-100 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-green-600">Parsed Successfully</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{parsedCount}</p>
          </div>
          
          <div className="bg-white border border-gray-100 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-sm">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-orange-500">Pending Parsing</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{pendingCount}</p>
          </div>
          
          <div className="bg-white border border-gray-100 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                <XCircle size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-red-500">Failed</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{failedCount}</p>
          </div>
          
          <div className="bg-white border border-gray-100 p-5 rounded-xl flex flex-col shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <FileText size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold text-indigo-700">Duplicates</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">0</p>
          </div>
        </div>

        {/* Table Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Upload History</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg py-2 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              <Filter size={16} /> Filters
            </button>
            <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">File Name</th>
                <th className="py-4 px-6">File Type</th>
                <th className="py-4 px-6">Invoice ID</th>
                <th className="py-4 px-6">Uploaded On</th>
                <th className="py-4 px-6">Parse Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] font-medium text-gray-800">
              {invoices.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                    No upload history found.
                  </td>
                </tr>
              ) : (
                invoices.map((item) => {
                  const parseStatus = item.status === 'processed' || item.status === 'needs_review' ? 'Parsed' : item.status === 'error' ? 'Failed' : 'Pending';
                  const isExpanded = expandedRow === item.id;
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6 max-w-[200px] truncate" title={item.file_name || item.invoice_number}>
                          {item.file_name || item.invoice_number || `INV-${item.id}`}
                        </td>
                        <td className="py-4 px-6 text-gray-500">
                          {item.file_name ? item.file_name.split('.').pop().toUpperCase() : 'PDF'}
                        </td>
                        <td className="py-4 px-6 text-gray-600">{item.invoice_number || item.id}</td>
                        <td className="py-4 px-6 text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.invoice_date || '—')}
                        </td>
                        <td className="py-4 px-6">
                          {parseStatus === 'Parsed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-200/60">
                              Parsed
                            </span>
                          )}
                          {parseStatus === 'Failed' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                              Failed
                            </span>
                          )}
                          {parseStatus === 'Pending' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 flex items-center justify-end gap-3 text-gray-400">
                          <button onClick={() => handleToggleExpand(item)} className="hover:text-blue-600 transition-colors" title="View/Edit"><Eye size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDownload(item)} className="hover:text-blue-600 transition-colors" title="Download"><Download size={18} strokeWidth={1.5} /></button>
                          <button onClick={() => handleDelete(item.id)} className="hover:text-red-500 transition-colors" title="Delete"><Trash2 size={18} strokeWidth={1.5} /></button>
                          <button 
                            onClick={() => openRegisterPopup({ ...item, fileName: item.file_name || item.invoice_number || `INV-${item.id}` })}
                            className="ml-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3.5 rounded-md transition-colors shadow-sm"
                          >
                            Register
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/50 p-6 border-b border-gray-100">
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm w-full">
                              <h3 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" />
                                Edit Invoice Details
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice Number</label>
                                  <input 
                                    type="text" 
                                    value={editData.invoice_number || ''} 
                                    onChange={(e) => handleEditChange('invoice_number', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice Date</label>
                                  <input 
                                    type="text" 
                                    value={editData.invoice_date || ''} 
                                    onChange={(e) => handleEditChange('invoice_date', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Order ID</label>
                                  <input 
                                    type="text" 
                                    value={editData.order_id || ''} 
                                    onChange={(e) => handleEditChange('order_id', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Seller GSTIN</label>
                                  <input 
                                    type="text" 
                                    value={editData.seller_gstin || ''} 
                                    onChange={(e) => handleEditChange('seller_gstin', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">HSN Code</label>
                                  <input 
                                    type="text" 
                                    value={editData.hsn_code || ''} 
                                    onChange={(e) => handleEditChange('hsn_code', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Tax</label>
                                  <input 
                                    type="number" 
                                    value={editData.total_tax || ''} 
                                    onChange={(e) => handleEditChange('total_tax', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Grand Total</label>
                                  <input 
                                    type="number" 
                                    value={editData.grand_total || ''} 
                                    onChange={(e) => handleEditChange('grand_total', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                                  <select 
                                    value={editData.status || ''} 
                                    onChange={(e) => handleEditChange('status', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processed">Processed</option>
                                    <option value="needs_review">Needs Review</option>
                                    <option value="error">Error</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-6 flex justify-end gap-3">
                                <button 
                                  onClick={() => setExpandedRow(null)}
                                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm flex items-center gap-2"
                                >
                                  <CheckCircle size={16} /> Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blank Popup Modal for Register */}
      {registerPopupOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative border border-gray-100">
            <button 
              onClick={closeRegisterPopup} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={20} strokeWidth={2} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Register Invoice
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              {selectedInvoice?.fileName}
            </p>
            
            {/* PWS Hierarchy Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Select Project</label>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="">-- Choose a Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProjectId && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Connected Hierarchy</h3>
                {connectedWorkflows.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">No workflows connected to this project.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {connectedWorkflows.map(w => {
                      const connectedStates = pwsAssignments
                        .filter(a => a.parent_id === w.id)
                        .map(a => states.find(s => s.id === a.child_id))
                        .filter(Boolean)

                      return (
                        <div key={w.id} className="bg-white border border-gray-200 p-3 rounded shadow-sm">
                          <div className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                            <span className="text-blue-600">Workflow:</span> {w.name}
                          </div>
                          <div className="pl-4 border-l-2 border-gray-100 flex flex-wrap gap-2">
                            {connectedStates.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No states assigned</span>
                            ) : (
                              connectedStates.map(s => (
                                <span key={s.id} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  State: {s.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={closeRegisterPopup}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRegisterSave}
                disabled={!selectedProjectId}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
