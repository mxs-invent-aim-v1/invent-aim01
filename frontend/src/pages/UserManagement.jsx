import { useState, useEffect } from 'react'
import { listUsers, createUser, updateUser } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit, ShieldCheck, Upload } from 'lucide-react'
import clsx from 'clsx'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user: currentUser } = useAuth()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    can_upload: false,
    is_active: true
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await listUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', role: 'user', can_upload: false, is_active: true })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '', // blank unless changing
      role: user.role,
      can_upload: user.can_upload,
      is_active: user.is_active
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          role: formData.role,
          can_upload: formData.can_upload,
          is_active: formData.is_active
        })
      } else {
        if (!formData.password) {
          alert('Password is required for new users')
          return
        }
        await createUser(formData)
      }
      setIsModalOpen(false)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.detail || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-[#333] pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter uppercase">Users</h1>
            <div className="text-sm font-bold tracking-widest text-[#FCD535] mt-2 flex items-center gap-4">
              <span>&gt; ACCESS MANAGEMENT [{users.length}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="btn-brutal-dark px-6 py-3 flex items-center gap-2 text-sm font-black tracking-widest uppercase"
          >
            <Plus size={16} /> ADD USER
          </button>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {loading ? (
          <div className="text-center py-12 text-[#FCD535] font-black tracking-widest uppercase text-2xl animate-pulse">Loading Users...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black tracking-widest uppercase text-2xl">{error}</div>
        ) : (
          <div className="card-brutal-dark relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#111] border-b-2 border-[#333]">
                  <tr>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">USER</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">ROLE</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">PERMISSIONS</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap border-r border-[#222]">STATUS</th>
                    <th className="py-4 px-4 text-xs font-black tracking-widest text-[#FCD535] whitespace-nowrap">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.id} className={clsx("border-b border-[#222] hover:bg-[#1a1a1a] transition-colors", idx % 2 === 0 ? 'bg-black' : 'bg-[#0a0a0a]')}>
                      <td className="py-3 px-4 text-sm font-bold border-r border-[#222]">
                        {u.username}
                        {u.id === currentUser.id && <span className="ml-3 text-[10px] bg-[#FCD535] text-black px-1.5 py-0.5 tracking-widest uppercase">YOU</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold uppercase border-r border-[#222]">
                        {u.role === 'admin' ? <span className="text-purple-400 flex items-center gap-2"><ShieldCheck size={14}/> ADMIN</span> : <span className="text-gray-500">USER</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold uppercase border-r border-[#222]">
                        {u.role === 'admin' || u.can_upload ? <span className="text-emerald-500 flex items-center gap-2"><Upload size={14}/> CAN UPLOAD</span> : <span className="text-gray-600">READ-ONLY</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold uppercase border-r border-[#222]">
                        {u.is_active ? <span className="text-emerald-500">ACTIVE</span> : <span className="text-red-500">INACTIVE</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold uppercase">
                        <button onClick={() => handleOpenEdit(u)} className="text-[#FCD535] hover:text-white flex items-center gap-2 transition-colors">
                          <Edit size={14} /> EDIT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-[#333] shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-md overflow-hidden">
            <div className="p-6 border-b-2 border-[#333] bg-black">
              <h2 className="text-2xl font-black text-[#FCD535] tracking-tighter uppercase">
                {editingUser ? 'EDIT USER' : 'CREATE USER'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Username</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none disabled:opacity-50 disabled:bg-[#0a0a0a]"
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    disabled={editingUser?.id === currentUser.id}
                    className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none disabled:opacity-50 appearance-none uppercase"
                  >
                    <option value="user" className="bg-[#111]">USER</option>
                    <option value="admin" className="bg-[#111]">ADMIN</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    disabled={editingUser?.id === currentUser.id}
                    className="w-full bg-black border border-[#333] px-4 py-3 text-sm font-bold text-white focus:border-[#FCD535] outline-none disabled:opacity-50 appearance-none uppercase"
                  >
                    <option value="true" className="bg-[#111]">ACTIVE</option>
                    <option value="false" className="bg-[#111]">INACTIVE</option>
                  </select>
                </div>
              </div>

              {formData.role === 'user' && (
                <div>
                  <label className="flex items-center gap-4 p-4 border border-[#333] bg-black cursor-pointer hover:border-[#FCD535] transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.can_upload}
                      onChange={e => setFormData({...formData, can_upload: e.target.checked})}
                      className="w-5 h-5 bg-[#111] border-2 border-[#333] text-[#FCD535] focus:ring-0 checked:bg-[#FCD535]"
                    />
                    <div>
                      <span className="block text-sm font-black tracking-widest uppercase text-white">ALLOW UPLOADS</span>
                      <span className="block text-xs text-gray-500 font-bold uppercase mt-1">Can this user upload?</span>
                    </div>
                  </label>
                </div>
              )}

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
                  className="btn-brutal-dark px-8 py-3 text-xs font-black tracking-widest uppercase"
                >
                  {editingUser ? 'SAVE CHANGES' : 'CREATE USER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
