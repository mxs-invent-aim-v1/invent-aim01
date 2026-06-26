import { useState, useEffect } from 'react'
import {
  listProducts, createProduct, updateProduct, deleteProduct,
  listCategories, createCategory, updateCategory, deleteCategory,
  createWorkflow, updateWorkflow, deleteWorkflow,
  createProcess, updateProcess, deleteProcess,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  Plus, Edit, Trash2, Tag, Search, ChevronDown, ChevronRight,
  Save, X, Settings2, Layers, GitBranch, Loader2, Pencil
} from 'lucide-react'
import clsx from 'clsx'

const COLOR_OPTIONS = [
  { value: 'cyan', label: 'CYAN', tw: 'bg-cyan-500' },
  { value: 'purple', label: 'PURPLE', tw: 'bg-purple-500' },
  { value: 'orange', label: 'ORANGE', tw: 'bg-orange-500' },
  { value: 'emerald', label: 'EMERALD', tw: 'bg-emerald-500' },
  { value: 'rose', label: 'ROSE', tw: 'bg-rose-500' },
  { value: 'amber', label: 'AMBER', tw: 'bg-amber-500' },
]

const COLOR_MAP = {
  cyan:    { color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30' },
  purple:  { color: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/30' },
  orange:  { color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30' },
  emerald: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  rose:    { color: 'text-rose-400',    bg: 'bg-rose-500/15',    border: 'border-rose-500/30' },
  amber:   { color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
}

// ─── Category Manager Drawer ──────────────────────────────────────────────────

function CategoryManagerDrawer({ open, onClose, categories, onRefresh }) {
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('cyan')
  const [editingCat, setEditingCat] = useState(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState('')
  const [expandedCat, setExpandedCat] = useState(null)
  const [expandedWf, setExpandedWf] = useState(null)
  const [newWfName, setNewWfName] = useState('')
  const [newProcName, setNewProcName] = useState('')
  const [editingWf, setEditingWf] = useState(null)
  const [editWfName, setEditWfName] = useState('')
  const [editingProc, setEditingProc] = useState(null)
  const [editProcName, setEditProcName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setLoading(true)
    try {
      await createCategory({ name: newCatName.trim(), color: newCatColor })
      setNewCatName('')
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameCategory = async (catId) => {
    if (!editCatName.trim()) return
    setLoading(true)
    try {
      await updateCategory(catId, { name: editCatName.trim(), color: editCatColor })
      setEditingCat(null)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Delete this category?')) return
    setLoading(true)
    try {
      await deleteCategory(catId)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete category')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWorkflow = async (catId) => {
    if (!newWfName.trim()) return
    setLoading(true)
    try {
      await createWorkflow(catId, { name: newWfName.trim() })
      setNewWfName('')
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create workflow')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameWorkflow = async (catId, wfId) => {
    if (!editWfName.trim()) return
    setLoading(true)
    try {
      await updateWorkflow(catId, wfId, { name: editWfName.trim() })
      setEditingWf(null)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWorkflow = async (catId, wfId) => {
    if (!confirm('Delete this workflow?')) return
    setLoading(true)
    try {
      await deleteWorkflow(catId, wfId)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProcess = async (catId, wfId) => {
    if (!newProcName.trim()) return
    setLoading(true)
    try {
      await createProcess(catId, wfId, { name: newProcName.trim() })
      setNewProcName('')
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameProcess = async (catId, wfId, procId) => {
    if (!editProcName.trim()) return
    setLoading(true)
    try {
      await updateProcess(catId, wfId, procId, { name: editProcName.trim() })
      setEditingProc(null)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProcess = async (catId, wfId, procId) => {
    if (!confirm('Delete this process?')) return
    setLoading(true)
    try {
      await deleteProcess(catId, wfId, procId)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0a0a0a] border-l-2 border-[#FCD535] h-full overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b-2 border-[#333] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FCD535] text-black flex items-center justify-center">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter uppercase text-white">MANAGE CATEGORIES</h2>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">&gt; WORKFLOWS · PROCESSES</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Category */}
          <div className="border border-[#333] bg-[#111] p-4">
            <label className="text-[10px] text-[#FCD535] font-black tracking-widest uppercase mb-3 block">ADD NEW CATEGORY</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-black border border-[#333] text-white px-3 py-2 text-xs outline-none focus:border-[#FCD535] font-bold placeholder-gray-700 uppercase"
                placeholder="CATEGORY NAME..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <select
                className="bg-black border border-[#333] text-white px-2 py-2 text-xs outline-none focus:border-[#FCD535] font-bold uppercase cursor-pointer"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
              >
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button
                onClick={handleAddCategory}
                disabled={loading || !newCatName.trim()}
                className="bg-[#FCD535] text-black px-4 py-2 text-xs font-black tracking-widest uppercase hover:bg-yellow-400 disabled:opacity-30 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Categories List */}
          {categories.map(cat => {
            const cc = COLOR_MAP[cat.color] || COLOR_MAP.cyan
            const isExpanded = expandedCat === cat.id
            return (
              <div key={cat.id} className="border border-[#333] bg-[#111]">
                {/* Category Header */}
                <div 
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  <button className="text-gray-500 hover:text-white transition-colors pointer-events-none">
                    <ChevronRight size={14} className={clsx('transition-transform', isExpanded && 'rotate-90')} />
                  </button>
                  <div className={clsx('w-3 h-3 rounded-sm', `bg-${cat.color}-500`)} />
                  {editingCat === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        className="flex-1 bg-black border border-[#FCD535] text-white px-2 py-1 text-xs font-bold outline-none uppercase"
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameCategory(cat.id)}
                        autoFocus
                      />
                      <select
                        className="bg-black border border-[#333] text-white px-1 py-1 text-xs font-bold uppercase cursor-pointer outline-none"
                        value={editCatColor}
                        onChange={e => setEditCatColor(e.target.value)}
                      >
                        {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <button onClick={() => handleRenameCategory(cat.id)} className="text-[#FCD535] hover:text-white"><Save size={14} /></button>
                      <button onClick={() => setEditingCat(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span className={clsx('text-sm font-black tracking-widest uppercase flex-1', cc.color)}>{cat.name}</span>
                      <span className="text-[10px] text-gray-600 font-bold tracking-widest">{cat.workflows?.length || 0} WORKFLOWS</span>
                      <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat.id); setEditCatName(cat.name); setEditCatColor(cat.color) }} className="text-gray-500 hover:text-[#FCD535] transition-colors p-1"><Pencil size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }} className="text-gray-500 hover:text-red-400 transition-colors p-1"><Trash2 size={12} /></button>
                    </>
                  )}
                </div>

                {/* Expanded: Workflows */}
                {isExpanded && (
                  <div className="border-t border-[#222] bg-[#0d0d0d] p-4 pl-10 space-y-4">
                    {/* Add Workflow */}
                    <div className="flex gap-2 items-center">
                      <GitBranch size={12} className="text-[#FCD535]" />
                      <input
                        className="flex-1 bg-black border border-[#333] text-white px-2 py-1.5 text-xs font-bold outline-none focus:border-[#FCD535] placeholder-gray-700 uppercase"
                        placeholder="NEW WORKFLOW NAME..."
                        value={newWfName}
                        onChange={e => setNewWfName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddWorkflow(cat.id)}
                      />
                      <button
                        onClick={() => handleAddWorkflow(cat.id)}
                        disabled={!newWfName.trim()}
                        className="text-[#FCD535] hover:text-white disabled:opacity-30 transition-colors text-xs font-black tracking-widest"
                      >
                        + ADD
                      </button>
                    </div>

                    {/* Workflow List */}
                    {(cat.workflows || []).map(wf => {
                      const wfExpanded = expandedWf === wf.id
                      return (
                        <div key={wf.id} className="border border-[#222] bg-[#111]">
                          <div 
                            className="p-3 flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                            onClick={() => setExpandedWf(wfExpanded ? null : wf.id)}
                          >
                            <button className="text-gray-500 hover:text-white transition-colors pointer-events-none">
                              <ChevronRight size={12} className={clsx('transition-transform', wfExpanded && 'rotate-90')} />
                            </button>
                            <GitBranch size={12} className="text-[#FCD535]" />
                            {editingWf === wf.id ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  className="flex-1 bg-black border border-[#FCD535] text-white px-2 py-1 text-xs font-bold outline-none uppercase"
                                  value={editWfName}
                                  onChange={e => setEditWfName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleRenameWorkflow(cat.id, wf.id)}
                                  autoFocus
                                />
                                <button onClick={() => handleRenameWorkflow(cat.id, wf.id)} className="text-[#FCD535]"><Save size={12} /></button>
                                <button onClick={() => setEditingWf(null)} className="text-gray-500"><X size={12} /></button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-black tracking-widest uppercase text-white flex-1">{wf.name}</span>
                                <span className="text-[10px] text-gray-600 font-bold">{wf.processes?.length || 0} STEPS</span>
                                <button onClick={(e) => { e.stopPropagation(); setEditingWf(wf.id); setEditWfName(wf.name) }} className="text-gray-500 hover:text-[#FCD535] p-1"><Pencil size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(cat.id, wf.id) }} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={10} /></button>
                              </>
                            )}
                          </div>

                          {/* Expanded: Processes */}
                          {wfExpanded && (
                            <div className="border-t border-[#1a1a1a] bg-[#080808] p-3 pl-10 space-y-2">
                              {/* Add Process */}
                              <div className="flex gap-2 items-center">
                                <Layers size={10} className="text-emerald-500" />
                                <input
                                  className="flex-1 bg-black border border-[#333] text-white px-2 py-1 text-[10px] font-bold outline-none focus:border-emerald-500 placeholder-gray-700 uppercase"
                                  placeholder="NEW PROCESS STEP..."
                                  value={newProcName}
                                  onChange={e => setNewProcName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddProcess(cat.id, wf.id)}
                                />
                                <button
                                  onClick={() => handleAddProcess(cat.id, wf.id)}
                                  disabled={!newProcName.trim()}
                                  className="text-emerald-500 hover:text-white disabled:opacity-30 transition-colors text-[10px] font-black tracking-widest"
                                >
                                  + ADD
                                </button>
                              </div>

                              {/* Process List */}
                              {(wf.processes || []).map((proc, idx) => (
                                <div key={proc.id} className="flex items-center gap-2 py-1 px-2 hover:bg-[#111] transition-colors group">
                                  <span className="text-[10px] text-gray-600 font-black w-6 shrink-0">{idx + 1}.</span>
                                  {editingProc === proc.id ? (
                                    <div className="flex-1 flex gap-2">
                                      <input
                                        className="flex-1 bg-black border border-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold outline-none uppercase"
                                        value={editProcName}
                                        onChange={e => setEditProcName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleRenameProcess(cat.id, wf.id, proc.id)}
                                        autoFocus
                                      />
                                      <button onClick={() => handleRenameProcess(cat.id, wf.id, proc.id)} className="text-emerald-500"><Save size={10} /></button>
                                      <button onClick={() => setEditingProc(null)} className="text-gray-500"><X size={10} /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase flex-1">{proc.name}</span>
                                      <button onClick={() => { setEditingProc(proc.id); setEditProcName(proc.name) }} className="text-gray-600 hover:text-[#FCD535] opacity-0 group-hover:opacity-100 transition-all"><Pencil size={10} /></button>
                                      <button onClick={() => handleDeleteProcess(cat.id, wf.id, proc.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={10} /></button>
                                    </>
                                  )}
                                </div>
                              ))}

                              {(wf.processes || []).length === 0 && (
                                <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase py-2">NO PROCESSES DEFINED YET</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {(cat.workflows || []).length === 0 && (
                      <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">NO WORKFLOWS — ADD ONE ABOVE</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-600 font-bold tracking-widest uppercase text-xs">
              NO CATEGORIES YET
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItemCodes() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const [formData, setFormData] = useState({
    item_name: '',
    item_code: '',
    category: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [search, categoryFilter])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter
      const { data } = await listProducts(params)
      setProducts(data.items)
    } catch (err) {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data } = await listCategories()
      setCategories(data.items)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  const refreshCategories = async () => {
    await fetchCategories()
    await fetchProducts() // Refresh products in case category names changed
  }

  const categoryNames = categories.map(c => c.name)

  const getWorkflowsForCategory = (catName) => {
    const cat = categories.find(c => c.name === catName)
    return cat?.workflows || []
  }

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setFormData({
      item_name: '',
      item_code: '',
      category: categoryNames[0] || 'Category 1',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      item_name: product.item_name,
      item_code: product.item_code,
      category: product.category,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = { ...formData }
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setIsModalOpen(false)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.detail || 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id)
      setDeleteConfirm(null)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete product')
    }
  }

  const selectedCategoryWorkflows = getWorkflowsForCategory(formData.category)

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">

      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        {/* Header */}
        <div className="mb-8 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase">Item Codes</h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-2 flex items-center gap-4">
              <span>&gt; PRODUCT CATALOG [{products.length}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="btn-brutal-dark px-5 py-3 flex items-center gap-2 text-xs font-black tracking-widest uppercase border-[#FCD535] text-[#FCD535] hover:bg-[#FCD535] hover:text-black transition-colors"
            >
              <Settings2 size={14} /> MANAGE CATEGORIES
            </button>
            <button
              onClick={handleOpenCreate}
              className="btn-brutal-dark px-6 py-3 flex items-center gap-2 text-sm font-black tracking-widest uppercase"
            >
              <Plus size={16} /> ADD ITEM
            </button>
          </div>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items or codes..."
              className="w-full bg-black border border-[#333] pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:border-[#FCD535] outline-none placeholder-gray-700"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-black border border-[#333] px-4 py-2.5 pr-10 text-xs font-black tracking-widest text-white focus:border-[#FCD535] outline-none uppercase cursor-pointer"
            >
              <option value="">ALL CATEGORIES</option>
              {categoryNames.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <span className="text-xs text-gray-600 font-bold tracking-widest">
            {products.length} ITEM{products.length !== 1 ? 'S' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-[#FCD535] font-black tracking-widest uppercase text-2xl animate-pulse">
            Loading Products...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black tracking-widest uppercase text-2xl">{error}</div>
        ) : products.length === 0 ? (
          <div className="card-brutal-dark p-16 text-center">
            <Tag size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-xl font-black tracking-widest text-gray-500 uppercase">No Products</p>
            <p className="text-sm text-gray-600 mt-2 font-bold">Click "ADD ITEM" to register your first product.</p>
          </div>
        ) : (
          <div className="card-brutal-dark relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#111] border-b-2 border-[#333]">
                  <tr>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">ITEM CODE</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">ITEM NAME</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">CATEGORY</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => {
                    const cat = categories.find(c => c.name === product.category)
                    const cc = COLOR_MAP[cat?.color] || COLOR_MAP.cyan
                    return (
                      <tr
                        key={product.id}
                        className={clsx(
                          'border-b border-[#222] hover:bg-[#1a1a1a] transition-colors',
                          idx % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]'
                        )}
                      >
                        <td className="py-3 px-4 text-sm font-bold text-[#FCD535] border-r border-[#222] font-mono">
                          {product.item_code}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold border-r border-[#222]">
                          {product.item_name}
                        </td>
                        <td className="py-3 px-4 border-r border-[#222]">
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-sm border',
                            cc.bg, cc.color, cc.border
                          )}>
                            {product.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(product)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase text-[#FCD535] hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit size={12} /> EDIT
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} /> DELETE
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-[#333] shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-md overflow-hidden">
            <div className="p-6 border-b-2 border-[#333] bg-black">
              <h2 className="text-2xl font-black text-[#FCD535] tracking-tighter uppercase">
                {editingProduct ? 'EDIT ITEM' : 'ADD NEW ITEM'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g. Office Chair Ergonomic"
                  className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none placeholder-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Item Code</label>
                <input
                  type="text"
                  required
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. OFC-001"
                  className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none placeholder-gray-700 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full appearance-none bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none uppercase cursor-pointer"
                  >
                    {categoryNames.map(c => (
                      <option key={c} value={c} className="bg-[#111]">{c.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                
                {/* Process Preview */}
                {selectedCategoryWorkflows.length > 0 && (
                  <div className="mt-4 border border-[#222] bg-[#0a0a0a] p-3 space-y-4">
                    <p className="text-[10px] text-[#FCD535] font-black tracking-widest uppercase">TRACKED WORKFLOWS & PROCESSES</p>
                    {selectedCategoryWorkflows.map(wf => (
                      <div key={wf.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch size={10} className="text-gray-500" />
                          <span className="text-[10px] font-black text-gray-300 uppercase">{wf.name}</span>
                        </div>
                        <div className="space-y-1 pl-4 border-l border-[#333] ml-1.5">
                          {wf.processes?.length > 0 ? wf.processes.map((proc, idx) => (
                            <div key={proc.id} className="flex items-center gap-2 text-[10px] text-gray-400 font-bold tracking-widest">
                              <span className="text-gray-600 w-4">{idx + 1}.</span>
                              <span className="uppercase">{proc.name}</span>
                            </div>
                          )) : (
                            <p className="text-[10px] text-gray-600 font-bold tracking-widest">NO PROCESSES</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-[#333]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase text-gray-500 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-brutal-dark px-8 py-3 text-xs font-black tracking-widest uppercase disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={14} />
                  {submitting ? 'SAVING...' : editingProduct ? 'SAVE CHANGES' : 'ADD ITEM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-[#333] shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b-2 border-[#333] bg-black">
              <h2 className="text-xl font-black text-red-400 tracking-tighter uppercase">CONFIRM DELETE</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-400 font-bold mb-6">This will permanently remove this item from the product catalog.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase text-gray-500 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Drawer */}
      <CategoryManagerDrawer
        open={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onRefresh={refreshCategories}
      />
    </div>
  )
}
