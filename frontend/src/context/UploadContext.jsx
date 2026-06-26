import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { uploadInvoices, getJobStatus } from '../api/client';

const UploadContext = createContext(null);

const POLL_INTERVAL = 1500;

export const UploadProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const clearAll = useCallback(() => {
    setFiles([]);
    setJob(null);
    setJobId(null);
    setError(null);
    setUploadPct(0);
    clearInterval(pollRef.current);
  }, []);

  const startUpload = useCallback(async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setJob(null);
    try {
      const { data } = await uploadInvoices(files, setUploadPct);
      setJobId(data.job_id);
      setUploading(false);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed');
      setUploading(false);
    }
  }, [files]);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const { data } = await getJobStatus(jobId);
        setJob(data);
        if (data.status === 'done' || data.status === 'failed' || data.status === 'partial_failure') {
          clearInterval(pollRef.current);
        }
      } catch (_) {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  return (
    <UploadContext.Provider value={{
      files, setFiles,
      uploading,
      uploadPct,
      jobId,
      job,
      error, setError,
      clearAll,
      startUpload
    }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => useContext(UploadContext);
