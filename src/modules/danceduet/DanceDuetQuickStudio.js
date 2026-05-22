import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStoredAuthToken } from '../../utils/auth';
import {
  DANCE_STAGE_MODES,
  DANCE_OUTPUT_FORMATS,
  formatFileSize,
  getDanceReadinessScore,
  openWhatsAppShare,
  validateDanceVideoFile,
} from './danceDuetUpgradeUtils';
import './DanceDuetUpgrade.css';

const processingSteps = [
  'Uploading dancer videos',
  'Running preflight checks',
  'Queueing render job',
  'Merging dancers and audio',
  'Exporting MP4',
];
const DANCE_DUET_API_BASE = '/api/dance-duet';

const buildSimpleHash = (value = '') => {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash << 5) - hash + String(value).charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const DanceDuetQuickStudio = () => {
  const [video1File, setVideo1File] = useState(null);
  const [video2File, setVideo2File] = useState(null);
  const [musicFile, setMusicFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [stageMode, setStageMode] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('reel');
  const [backgroundColor, setBackgroundColor] = useState('black');
  const [delayB, setDelayB] = useState(0);
  const [trimStart1, setTrimStart1] = useState(0);
  const [trimEnd1, setTrimEnd1] = useState(0);
  const [trimStart2, setTrimStart2] = useState(0);
  const [trimEnd2, setTrimEnd2] = useState(0);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [syncAudio, setSyncAudio] = useState(true);
  const [mirrorSecondVideo, setMirrorSecondVideo] = useState(false);
  const [status, setStatus] = useState('Upload two dancer videos to create duet.');
  const [activeStep, setActiveStep] = useState(-1);
  const [outputUrl, setOutputUrl] = useState('');
  const [warning, setWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState('');
  const [preflightReport, setPreflightReport] = useState(null);
  const [growthPack, setGrowthPack] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [duetJobs, setDuetJobs] = useState([]);
  const [duetAnalytics, setDuetAnalytics] = useState(null);
  const [duetModes, setDuetModes] = useState([]);
  const [duetJobCounts, setDuetJobCounts] = useState(null);
  const [jobsError, setJobsError] = useState('');
  const [deletingJobId, setDeletingJobId] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobPage, setJobPage] = useState(1);
  const [jobPagination, setJobPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 12 });
  const [previewVideo1Url, setPreviewVideo1Url] = useState('');
  const [previewVideo2Url, setPreviewVideo2Url] = useState('');
  const previewRef1 = useRef(null);
  const previewRef2 = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const readiness = useMemo(
    () => getDanceReadinessScore({ video1File, video2File, removeBackground, stageMode, outputFormat }),
    [video1File, video2File, removeBackground, stageMode, outputFormat]
  );

  const canMerge = video1File && video2File && !isProcessing;

  const authHeaders = useMemo(() => {
    const token = getStoredAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchJson = useCallback(async (url, options = {}, timeoutMs = 45000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Request failed.');
      }
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setJobsLoading(true);
    setJobsError('');
    try {
      const statusParam = jobStatusFilter === 'all' ? '' : `&status=${encodeURIComponent(jobStatusFilter)}`;
      const [jobsPayload, analyticsPayload, countsPayload] = await Promise.all([
        fetchJson(`${DANCE_DUET_API_BASE}/jobs/me?limit=12&page=${jobPage}${statusParam}`, {
          headers: authHeaders,
        }),
        fetchJson(`${DANCE_DUET_API_BASE}/analytics/me`, { headers: authHeaders }),
        fetchJson(`${DANCE_DUET_API_BASE}/jobs/me/counts`, { headers: authHeaders }),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      setDuetJobs(jobsPayload?.data?.jobs || []);
      setJobPagination(jobsPayload?.data?.pagination || { page: 1, totalPages: 1, total: 0, limit: 12 });
      setDuetAnalytics(analyticsPayload?.data?.summary || null);
      setDuetModes(analyticsPayload?.data?.modes || []);
      setDuetJobCounts(countsPayload?.data?.counts || null);
    } catch (error) {
      if (isMountedRef.current) {
        setJobsError(error.message || 'Unable to load dance duet history.');
      }
    } finally {
      if (isMountedRef.current) {
        setJobsLoading(false);
      }
    }
  }, [authHeaders, fetchJson, jobPage, jobStatusFilter]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        window.clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setJobPage(1);
  }, [jobStatusFilter]);

  useEffect(() => {
    if (!video1File) {
      setPreviewVideo1Url('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(video1File);
    setPreviewVideo1Url(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [video1File]);

  useEffect(() => {
    if (!video2File) {
      setPreviewVideo2Url('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(video2File);
    setPreviewVideo2Url(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [video2File]);

  const handleVideoChange = (setter) => (event) => {
    const file = event.target.files?.[0] || null;
    const validation = validateDanceVideoFile(file);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      setter(null);
      return;
    }
    setErrorMessage('');
    setter(file);
  };

  const runStepAnimation = () => {
    setActiveStep(0);
    processingSteps.forEach((_, index) => {
      setTimeout(() => setActiveStep(index), index * 900);
    });
  };

  const previewSync = () => {
    if (!previewRef1.current || !previewRef2.current) {
      setErrorMessage('Upload both videos to preview sync.');
      return;
    }
    const delay = Math.max(0, Number(delayB || 0));
    previewRef1.current.pause();
    previewRef2.current.pause();
    previewRef1.current.currentTime = Math.max(0, Number(trimStart1 || 0));
    previewRef2.current.currentTime = Math.max(0, Number(trimStart2 || 0));
    previewRef1.current.play().catch(() => undefined);
    window.setTimeout(() => {
      previewRef2.current?.play().catch(() => undefined);
    }, delay * 1000);
  };

  const pollJobStatus = useCallback(
    async (jobId, afterSeconds = 3) => {
      if (!jobId) return;
      pollingTimeoutRef.current = window.setTimeout(async () => {
        try {
          const statusPayload = await fetchJson(
            `${DANCE_DUET_API_BASE}/jobs/${encodeURIComponent(jobId)}/status`,
            { headers: authHeaders },
            20000
          );
          const job = statusPayload?.data?.job || {};
          const nextPollSeconds = Math.max(1, Number(statusPayload?.pollAfterSeconds || 3));

          setWarning(job?.output?.warning || '');
          setPreflightReport(job?.preflight || null);
          setGrowthPack(job?.growthPack || null);

          if (job.status === 'completed') {
            setOutputUrl(job.outputUrl || '');
            setStatus('Your AI dance duet is ready.');
            setActiveStep(processingSteps.length - 1);
            setIsProcessing(false);
            pollingTimeoutRef.current = null;
            await refreshHistory();
            return;
          }

          if (job.status === 'failed') {
            setErrorMessage(job.errorMessage || 'Dance duet failed after retries.');
            setStatus('Dance duet failed after retries.');
            setIsProcessing(false);
            pollingTimeoutRef.current = null;
            await refreshHistory();
            return;
          }

          setStatus(`Job ${job.status}. Attempt ${job.attempts || 0}/${job.maxAttempts || 0}.`);
          void pollJobStatus(jobId, nextPollSeconds);
        } catch (pollError) {
          setErrorMessage(pollError.message || 'Unable to poll dance duet status.');
          setStatus('Could not poll job status. Please refresh history.');
          setIsProcessing(false);
          pollingTimeoutRef.current = null;
        }
      }, Math.max(1, Number(afterSeconds || 3)) * 1000);
    },
    [authHeaders, fetchJson, refreshHistory]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setWarning('');
    setOutputUrl('');
    setCurrentJobId('');
    setPreflightReport(null);
    setGrowthPack(null);
    setStatus('Creating your dance duet...');
    setIsProcessing(true);
    runStepAnimation();

    if (pollingTimeoutRef.current) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    try {
      const idempotencySeed = [
        video1File?.name || '',
        video1File?.size || 0,
        video1File?.lastModified || 0,
        video2File?.name || '',
        video2File?.size || 0,
        video2File?.lastModified || 0,
        musicFile?.name || '',
        musicFile?.size || 0,
        backgroundFile?.name || '',
        backgroundFile?.size || 0,
        stageMode,
        outputFormat,
        backgroundColor,
        delayB,
        trimStart1,
        trimEnd1,
        trimStart2,
        trimEnd2,
        removeBackground,
        syncAudio,
        mirrorSecondVideo,
      ].join('|');
      const idempotencyKey = `dd-${buildSimpleHash(idempotencySeed)}`;

      const formData = new FormData();
      formData.append('video1', video1File);
      formData.append('video2', video2File);
      if (backgroundFile) formData.append('backgroundImage', backgroundFile);
      if (musicFile) formData.append('music', musicFile);
      formData.append('mode', stageMode);
      formData.append('outputFormat', outputFormat);
      formData.append('backgroundColor', backgroundColor);
      formData.append('delayB', String(delayB || 0));
      formData.append('trimStart1', String(trimStart1 || 0));
      formData.append('trimEnd1', String(trimEnd1 || 0));
      formData.append('trimStart2', String(trimStart2 || 0));
      formData.append('trimEnd2', String(trimEnd2 || 0));
      formData.append('removeBackground', String(removeBackground));
      formData.append('syncAudio', String(syncAudio));
      formData.append('mirrorSecondVideo', String(mirrorSecondVideo));

      const token = getStoredAuthToken();
      const response = await fetch(`${DANCE_DUET_API_BASE}/merge`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-idempotency-key': idempotencyKey,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || 'Failed to merge dance videos.');
      }

      const returnedJobId = String(result?.jobId || result?.data?.job?.id || '');
      setCurrentJobId(returnedJobId);
      setPreflightReport(result?.data?.preflight || null);
      setGrowthPack(result?.data?.growthPack || null);

      const currentStatus = String(result?.data?.job?.status || '');
      const isAsync = response.status === 202 || currentStatus === 'queued' || currentStatus === 'processing';

      if (isAsync && returnedJobId) {
        setStatus('Dance duet queued. We are rendering it now...');
        void pollJobStatus(returnedJobId, Number(result?.pollAfterSeconds || 3));
      } else {
        setOutputUrl(result.outputUrl || result?.data?.job?.outputUrl || '');
        setWarning(result.warning || '');
        setStatus(result?.reused ? 'Existing duet result reused instantly.' : 'Your AI dance duet is ready.');
        setActiveStep(processingSteps.length - 1);
        setIsProcessing(false);
        await refreshHistory();
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create dance duet.');
      setStatus('Dance duet failed. Please try shorter clips.');
      setIsProcessing(false);
    }
  };

  const handleDeleteJob = async (job) => {
    const jobId = String(job?._id || job?.id || '');
    if (!jobId) return;
    const approved = window.confirm('Delete this dance duet job from your history?');
    if (!approved) return;
    setDeletingJobId(jobId);
    setJobsError('');
    try {
      await fetchJson(
        `${DANCE_DUET_API_BASE}/jobs/${encodeURIComponent(jobId)}`,
        {
          method: 'DELETE',
          headers: authHeaders,
        },
        20000
      );
      await refreshHistory();
    } catch (error) {
      setJobsError(error.message || 'Unable to delete dance duet job.');
    } finally {
      setDeletingJobId('');
    }
  };

  return (
    <main className="dance-duet-studio">
      <section className="dance-duet-hero">
        <div>
          <p className="dance-duet-eyebrow">MGRAND HUB AI Studio</p>
          <h1>Auto Dance Duet Maker</h1>
          <p>Merge two dance videos into one reel, shared stage, or premium split-screen performance.</p>
        </div>
        <div className="dance-duet-score-card">
          <span>{readiness.label}</span>
          <strong>{readiness.score}%</strong>
          <small>Duet readiness</small>
        </div>
      </section>

      <form className="dance-duet-card" onSubmit={handleSubmit}>
        <div className="dance-duet-upload-grid">
          <label className="dance-duet-upload-box">
            <span>Primary dancer video</span>
            <input type="file" accept="video/*" onChange={handleVideoChange(setVideo1File)} />
            <strong>{video1File ? video1File.name : 'Upload video 1'}</strong>
            {video1File && <small>{formatFileSize(video1File.size)}</small>}
          </label>

          <label className="dance-duet-upload-box">
            <span>Second dancer video</span>
            <input type="file" accept="video/*" onChange={handleVideoChange(setVideo2File)} />
            <strong>{video2File ? video2File.name : 'Upload video 2'}</strong>
            {video2File && <small>{formatFileSize(video2File.size)}</small>}
          </label>

          <label className="dance-duet-upload-box">
            <span>Optional background music</span>
            <input type="file" accept="audio/*" onChange={(event) => setMusicFile(event.target.files?.[0] || null)} />
            <strong>{musicFile ? musicFile.name : 'Upload music (optional)'}</strong>
          </label>
        </div>

        <div className="dance-duet-options-grid">
          <label>
            Stage style
            <select value={stageMode} onChange={(event) => setStageMode(event.target.value)}>
              {DANCE_STAGE_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>{DANCE_STAGE_MODES.find((item) => item.value === stageMode)?.helper}</small>
          </label>

          <label>
            Dancer B delay (seconds)
            <input type="number" min="0" max="10" step="0.1" value={delayB} onChange={(event) => setDelayB(event.target.value)} />
          </label>

          <label>
            Output format
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
              {DANCE_OUTPUT_FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Stage color
            <select value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)}>
              <option value="black">Black</option>
              <option value="white">White</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="pink">Pink</option>
            </select>
          </label>

          <label>
            Optional stage background
            <input type="file" accept="image/png,image/jpeg" onChange={(event) => setBackgroundFile(event.target.files?.[0] || null)} />
          </label>

          <label>
            Trim dancer 1 start/end (sec)
            <div className="dance-duet-trim-row">
              <input type="number" min="0" max="120" step="0.1" value={trimStart1} onChange={(event) => setTrimStart1(event.target.value)} />
              <input type="number" min="0" max="120" step="0.1" value={trimEnd1} onChange={(event) => setTrimEnd1(event.target.value)} />
            </div>
          </label>

          <label>
            Trim dancer 2 start/end (sec)
            <div className="dance-duet-trim-row">
              <input type="number" min="0" max="120" step="0.1" value={trimStart2} onChange={(event) => setTrimStart2(event.target.value)} />
              <input type="number" min="0" max="120" step="0.1" value={trimEnd2} onChange={(event) => setTrimEnd2(event.target.value)} />
            </div>
          </label>
        </div>

        <div className="dance-duet-switch-row">
          <label>
            <input type="checkbox" checked={removeBackground} onChange={(e) => setRemoveBackground(e.target.checked)} /> Remove green/blue background
          </label>
          <label>
            <input type="checkbox" checked={syncAudio} onChange={(e) => setSyncAudio(e.target.checked)} /> Use primary dancer audio
          </label>
          <label>
            <input type="checkbox" checked={mirrorSecondVideo} onChange={(e) => setMirrorSecondVideo(e.target.checked)} /> Mirror second dancer
          </label>
        </div>

        <div className="dance-duet-tips">
          {readiness.tips.map((tip) => (
            <span key={tip}>Tip: {tip}</span>
          ))}
        </div>

        {isProcessing && (
          <div className="dance-duet-progress">
            {processingSteps.map((step, index) => (
              <div key={step} className={index <= activeStep ? 'active' : ''}>
                <span>{index + 1}</span>
                {step}
              </div>
            ))}
          </div>
        )}

        <div className="dance-duet-action-row">
          <button type="button" onClick={previewSync} disabled={!video1File || !video2File || isProcessing}>
            Preview Sync
          </button>
          <button type="submit" disabled={!canMerge}>
            {isProcessing ? 'Creating...' : 'Create 10/10 Dance Duet'}
          </button>
          <p>{status}</p>
        </div>

        {warning && <div className="dance-duet-warning">Warning: {warning}</div>}
        {errorMessage && <div className="dance-duet-error">{errorMessage}</div>}
      </form>

      {preflightReport && (
        <section className="dance-duet-result-card">
          <h2>Preflight Check</h2>
          <div className="dance-duet-analytics-row">
            <span>Readiness: {preflightReport.readinessScore || 0}%</span>
            <span>Risk: {preflightReport.riskLevel || 'unknown'}</span>
            {currentJobId ? <span>Job: #{currentJobId.slice(-6)}</span> : null}
          </div>
          <p>{preflightReport.summary || ''}</p>
          {(preflightReport.checks || []).length > 0 && (
            <div className="dance-duet-tips">
              {preflightReport.checks.map((check) => (
                <span key={`check-${check}`}>Check: {check}</span>
              ))}
            </div>
          )}
          {(preflightReport.suggestions || []).length > 0 && (
            <div className="dance-duet-tips">
              {preflightReport.suggestions.map((suggestion) => (
                <span key={`suggestion-${suggestion}`}>Suggestion: {suggestion}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {growthPack && (
        <section className="dance-duet-result-card">
          <h2>Creator Growth Pack</h2>
          <div className="dance-duet-analytics-row">
            <span>{growthPack.challengeTitle || 'Dance Challenge'}</span>
            <span>{growthPack.thumbnailHook || ''}</span>
          </div>
          <p>{growthPack.shareCaption || ''}</p>
          <p>{growthPack.callToAction || ''}</p>
          {(growthPack.hashtags || []).length > 0 && <p>{growthPack.hashtags.join(' ')}</p>}
        </section>
      )}

      <section className={`dance-duet-preview-grid ${stageMode === 'vertical-reel' ? 'vertical' : ''}`}>
        <article>
          <h3>Dancer A Preview</h3>
          {previewVideo1Url ? <video ref={previewRef1} controls src={previewVideo1Url} /> : <p>Upload first video.</p>}
        </article>
        <article>
          <h3>Dancer B Preview</h3>
          {previewVideo2Url ? <video ref={previewRef2} controls src={previewVideo2Url} /> : <p>Upload second video.</p>}
        </article>
      </section>

      {outputUrl && (
        <section className="dance-duet-result-card">
          <h2>Duet Output</h2>
          <video controls src={outputUrl} className="dance-duet-result-video" />
          <div className="dance-duet-result-actions">
            <a href={outputUrl} download="MGRAND HUB-dance-duet.mp4">
              Download MP4
            </a>
            <button type="button" onClick={() => openWhatsAppShare(outputUrl)}>
              Share WhatsApp
            </button>
          </div>
        </section>
      )}

      <section className="dance-duet-result-card">
        <h2>My Dance Duet Studio History</h2>
        <div className="dance-duet-history-toolbar">
          <label>
            Status filter
            <select value={jobStatusFilter} onChange={(event) => setJobStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="queued">Queued</option>
            </select>
          </label>
          <button type="button" onClick={() => refreshHistory()} disabled={jobsLoading}>
            {jobsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {duetJobCounts && (
          <div className="dance-duet-analytics-row">
            <span>Queued: {duetJobCounts.queued || 0}</span>
            <span>Processing: {duetJobCounts.processing || 0}</span>
            <span>Completed: {duetJobCounts.completed || 0}</span>
            <span>Failed: {duetJobCounts.failed || 0}</span>
            <span>Dead-lettered: {duetJobCounts.deadLettered || 0}</span>
          </div>
        )}
        {duetAnalytics && (
          <div className="dance-duet-analytics-row">
            <span>Total jobs: {duetAnalytics.totalJobs || 0}</span>
            <span>Completed: {duetAnalytics.completedJobs || 0}</span>
            <span>Failed: {duetAnalytics.failedJobs || 0}</span>
            <span>Dead-lettered: {duetAnalytics.deadLetteredJobs || 0}</span>
            <span>Success rate: {duetAnalytics.completionRatePct || 0}%</span>
            <span>Avg render: {Math.max(0, Math.round((duetAnalytics.averageProcessingMs || 0) / 1000))}s</span>
            <span>Avg attempts: {duetAnalytics.averageAttempts || 0}</span>
          </div>
        )}
        {duetModes.length > 0 && (
          <div className="dance-duet-analytics-row">
            {duetModes.map((item) => (
              <span key={`${item.mode}-${item.count}`}>
                {item.mode || 'unknown'}: {item.count || 0}
              </span>
            ))}
          </div>
        )}
        {jobsLoading ? <p>Loading duet history...</p> : null}
        {jobsError ? <div className="dance-duet-error">{jobsError}</div> : null}
        {!jobsLoading && duetJobs.length === 0 ? <p>No jobs yet. Your duet history will appear here.</p> : null}
        {duetJobs.length > 0 && (
          <div className="dance-duet-history-list">
            {duetJobs.map((job) => {
              const jobId = String(job?._id || job?.id || '');
              const canDownload = job?.status === 'completed' && job?.output?.outputUrl;
              return (
                <article key={jobId} className="dance-duet-history-item">
                  <div>
                    <strong>Job #{jobId.slice(-6)}</strong>
                    <p>Status: {job.status}</p>
                    <p>
                      Mode: {job?.options?.mode || 'auto'} | Format: {job?.options?.outputFormat || 'reel'}
                    </p>
                    <p>{job?.createdAt ? new Date(job.createdAt).toLocaleString() : ''}</p>
                    {job?.output?.warning ? <p className="dance-duet-warning">{job.output.warning}</p> : null}
                    {job?.output?.errorMessage ? <p className="dance-duet-error">{job.output.errorMessage}</p> : null}
                  </div>
                  <div className="dance-duet-history-actions">
                    {canDownload ? (
                      <a href={job.output.outputUrl} download={`MGRAND HUB-dance-duet-${jobId.slice(-6)}.mp4`}>
                        Download
                      </a>
                    ) : (
                      <span>Output unavailable</span>
                    )}
                    <button type="button" onClick={() => handleDeleteJob(job)} disabled={deletingJobId === jobId}>
                      {deletingJobId === jobId ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {jobPagination.totalPages > 1 && (
          <div className="dance-duet-pagination">
            <button
              type="button"
              onClick={() => setJobPage((prev) => Math.max(1, prev - 1))}
              disabled={jobPage <= 1 || jobsLoading}
            >
              Previous
            </button>
            <span>
              Page {jobPagination.page || jobPage} of {jobPagination.totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setJobPage((prev) => Math.min(jobPagination.totalPages || 1, prev + 1))}
              disabled={jobPage >= (jobPagination.totalPages || 1) || jobsLoading}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default DanceDuetQuickStudio;
