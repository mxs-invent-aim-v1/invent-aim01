import { useEffect, useState, useCallback } from 'react'
import { listJsonFiles, downloadJsonFile, getJsonFileUrl } from '../api/client'
import { FileJson, Download, RefreshCw, Loader2, Eye, X } from 'lucide-react'
import axios from 'axios'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function JsonPanel() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewFile, setViewFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [contentLoading, setContentLoading] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listJsonFiles()
      setFiles(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const handleView = async (file) => {
    setViewFile(file)
    setContentLoading(true)
    try {
      const { data } = await axios.get(getJsonFileUrl(file.job_id, file.filename))
      setFileContent(JSON.stringify(data, null, 2))
    } catch (e) {
      setFileContent('Error loading file content')
    } finally {
      setContentLoading(false)
    }
  }

  const closeView = () => {
    setViewFile(null)
    setFileContent(null)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Extracted JSON Data</h1>
          <p className="text-surface-500 mt-0.5 text-sm">{files.length} JSON files generated from uploads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchFiles} className="btn-ghost p-2.5">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-surface-1000 flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="animate-spin text-brand-400" size={24} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-surface-200">
              <tr>
                <th className="table-head">File Name</th>
                <th className="table-head">Job ID (Batch)</th>
                <th className="table-head">Size</th>
                <th className="table-head">Date Created</th>
                <th className="table-head text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-surface-400">
                    <FileJson size={32} className="mx-auto mb-2 opacity-40" />
                    No JSON files found. Upload some invoices first.
                  </td>
                </tr>
              ) : (
                files.map((file, i) => (
                  <tr key={`${file.job_id}-${file.filename}-${i}`} className="table-row">
                    <td className="table-cell font-medium text-surface-50">
                      <div className="flex items-center gap-2">
                        <FileJson size={14} className="text-brand-400 shrink-0" />
                        <span className="truncate text-sm max-w-[200px]">{file.filename}</span>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-surface-500">{file.job_id}</td>
                    <td className="table-cell text-xs text-surface-600">{formatBytes(file.size)}</td>
                    <td className="table-cell text-xs text-surface-600">
                      {new Date(file.created_at * 1000).toLocaleString()}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(file)}
                          className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-600 hover:text-surface-50 transition-colors"
                          title="View JSON"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => downloadJsonFile(file.job_id, file.filename)}
                          className="p-1.5 hover:bg-surface-100 rounded-lg text-brand-400 hover:text-brand-300 transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
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

      {/* View Modal */}
      {viewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-900 border border-surface-200 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-50">{viewFile.filename}</h3>
                <p className="text-xs text-surface-500 font-mono mt-1">{viewFile.job_id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadJsonFile(viewFile.job_id, viewFile.filename)}
                  className="btn-primary py-1.5 px-3 text-sm flex items-center gap-2"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={closeView}
                  className="p-2 hover:bg-surface-100 rounded-lg text-surface-600 hover:text-surface-50 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-surface-1000">
              {contentLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-brand-400" size={32} />
                </div>
              ) : (
                <pre className="text-sm font-mono text-emerald-400 bg-surface-900 p-4 rounded-xl overflow-x-auto">
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
