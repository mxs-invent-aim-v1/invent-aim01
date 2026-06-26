import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useUpload } from '../context/UploadContext'
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'



function FileRow({ file, removed, onRemove }) {
  const sizeKB = (file.size / 1024).toFixed(0)
  return (
    <div className="flex items-center justify-between bg-black border border-[#333] px-4 py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={16} className="text-[#FCD535] shrink-0" />
        <span className="text-sm font-bold truncate">{file.name}</span>
        <span className="text-xs text-gray-500 shrink-0">{sizeKB} KB</span>
      </div>
      <button
        onClick={() => onRemove(file)}
        className="text-gray-600 hover:text-red-500 transition-colors ml-2 shrink-0"
      >
        <XCircle size={16} />
      </button>
    </div>
  )
}

function ResultRow({ result, navigate }) {
  const statusIcons = {
    ok: <CheckCircle size={16} className="text-[#FCD535]" />,
    error: <XCircle size={16} className="text-red-500" />,
    duplicate: <RefreshCw size={16} className="text-gray-400" />,
    pending: <Loader2 size={16} className="text-gray-500 animate-spin" />,
  }
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-[#222] last:border-0 hover:bg-[#151515] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {statusIcons[result.status] || <Clock size={16} className="text-gray-600" />}
        <span className="text-sm font-bold truncate">{result.file_name}</span>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0 font-mono">
        {result.status === 'ok' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">#{result.invoice_id} · CONF {(result.confidence * 100).toFixed(0)}%</span>
            <button 
              onClick={() => navigate(`/inventory/register/${result.invoice_id}`)}
              className="text-[10px] font-black tracking-widest text-black bg-[#FCD535] px-2 py-1 uppercase hover:bg-white transition-colors"
            >
              REGISTER
            </button>
          </div>
        )}
        {result.status === 'error' && (
          <span className="text-xs text-red-500 max-w-xs truncate" title={result.error}>{result.error}</span>
        )}
        {result.status === 'duplicate' && (
          <span className="text-xs text-gray-500">EXISTS (#{result.invoice_id})</span>
        )}
      </div>
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
  const {
    files, setFiles,
    uploading, uploadPct,
    jobId, job,
    error, setError,
    clearAll, startUpload
  } = useUpload()

  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !names.has(f.name))]
    })
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  })

  const removeFile = (target) =>
    setFiles(prev => prev.filter(f => f.name !== target.name))



  const processPct = job
    ? Math.round(((job.processed + job.failed) / Math.max(job.total_files, 1)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-brutal-dark text-white font-mono flex flex-col">
      
      <div className="max-w-5xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-[#333] pb-6 flex items-end justify-between">
          <h1 className="text-7xl font-black tracking-tighter uppercase">Upload</h1>
          <div className="text-sm font-bold tracking-widest text-[#FCD535] mb-2 flex items-center gap-4">
            <span>&gt; BATCH · EXTRACTION · QUEUE</span>
            <div className="w-32 h-[1px] bg-[#FCD535]"></div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={clsx(
            'card-brutal-dark border-2 border-dashed border-[#555] p-16 text-center cursor-pointer relative overflow-hidden',
            isDragActive && 'border-[#FCD535] bg-[#FCD535]/5',
          )}
        >
          {isDragActive && (
            <div className="absolute inset-0 border-[6px] border-[#FCD535] pointer-events-none z-10" />
          )}
          <input {...getInputProps()} />
          <div className={clsx(
            'w-20 h-20 bg-black border-2 border-[#333] flex items-center justify-center mx-auto mb-6 transition-transform duration-300',
            isDragActive && 'scale-110 border-[#FCD535] text-[#FCD535]'
          )}>
            <UploadIcon size={32} />
          </div>
          <p className="font-black text-2xl uppercase tracking-widest mb-2">
            {isDragActive ? 'DROP TO QUEUE' : 'DRAG & DROP INVOICES'}
          </p>
          <p className="text-gray-500 text-sm font-bold mb-6 tracking-wider">OR CLICK TO BROWSE FILES</p>
          <p className="text-gray-600 text-xs tracking-widest">PDF, JPG, PNG, TIFF, WEBP · MAX 50MB EACH</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="divider-striped-yellow mb-8"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold tracking-widest text-[#FCD535]">
                &gt; QUEUE [{files.length}]
              </span>
              <button onClick={clearAll} className="text-xs font-bold tracking-widest text-gray-500 hover:text-white transition-colors">
                [ CLEAR ALL ]
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {files.map(f => <FileRow key={f.name} file={f} onRemove={removeFile} />)}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={startUpload}
                disabled={uploading || !!jobId}
                className="btn-brutal-dark px-8 py-4 flex items-center gap-3 text-lg"
              >
                {uploading ? (
                  <><Loader2 size={20} className="animate-spin" /> UPLOADING... {uploadPct}%</>
                ) : jobId ? (
                  <><CheckCircle size={20} /> UPLOAD COMPLETE</>
                ) : (
                  <><UploadIcon size={20} /> PROCESS {files.length} FILE{files.length !== 1 ? 'S' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 border-l-4 border-red-500 bg-red-500/10 p-4 font-bold text-red-500 uppercase tracking-widest">
            ERROR: {error}
          </div>
        )}

        {/* Job progress */}
        {job && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-black uppercase tracking-tighter">Processing Job</h2>
               <p className="text-gray-500 text-xs font-bold tracking-widest">ID: {jobId}</p>
            </div>
            
            <div className="card-brutal-dark p-6">
              <div className="flex items-center justify-between mb-4 text-sm font-bold tracking-widest uppercase">
                <div className="flex gap-4">
                  <span className="text-[#FCD535]">DONE: {job.processed}</span>
                  {job.failed > 0 && <span className="text-red-500">FAIL: {job.failed}</span>}
                  {job.pending > 0 && <span className="text-gray-500">PEND: {job.pending}</span>}
                </div>
                <span className={clsx(
                  job.status === 'done' && 'text-[#FCD535]',
                  job.status === 'failed' && 'text-red-500',
                  job.status === 'processing' && 'text-white'
                )}>
                  STATUS: {job.status.replace('_', ' ')}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-4 border border-[#333] bg-black mb-6">
                <div
                  className={clsx(
                    'h-full transition-all duration-500',
                    job.status === 'done' ? 'bg-[#FCD535]' :
                    job.status === 'failed' ? 'bg-red-500' :
                    'bg-white progress-stripe',
                  )}
                  style={{ width: `${processPct}%` }}
                />
              </div>

              {/* Per-file results */}
              {job.results.length > 0 && (
                <div className="max-h-80 overflow-y-auto border border-[#333] bg-black">
                  {job.results.map((r, i) => <ResultRow key={i} result={r} navigate={navigate} />)}
                </div>
              )}

              {job.status === 'done' && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-[#FCD535] font-bold tracking-widest flex items-center gap-2">
                    <CheckCircle size={20} /> BATCH COMPLETED
                  </p>
                  <button onClick={clearAll} className="text-sm font-bold tracking-widest text-gray-400 hover:text-white border-b border-transparent hover:border-white transition-all">
                    START NEW BATCH
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
