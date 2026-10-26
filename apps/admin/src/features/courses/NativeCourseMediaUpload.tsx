import { useEffect, useState } from 'react';
import { Upload, ShieldCheck, Link2, RefreshCw } from 'lucide-react';
import { reviewReasonHeaders } from '@manaratak/shared';
import { adminApiClient } from '../../api/client';
import { useCourseCopy } from './useCourseCopy';

type Capabilities = {
  upload: boolean;
  delivery: boolean;
  scanning: boolean;
  sanitization: boolean;
  maxMediaBytes: number;
  maxTextBytes: number;
};
type MediaStatus = {
  assetId: string;
  state: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  uploadVerified: boolean;
  scan: string | null;
  sanitized: boolean;
};
type Grant = {
  assetId: string;
  uploadGrant: {
    uploadUrl: string;
    method: 'PUT' | 'POST';
    headers: Record<string, string>;
    expiresAt: string;
  };
};
export function NativeCourseMediaUpload({
  courseId,
  lessonId,
  version,
  reason,
  attachedAssetIds,
  onAttach,
  onDirty,
}: {
  courseId: string;
  lessonId: string;
  version: number;
  reason: string;
  attachedAssetIds: string[];
  onAttach: (asset: { assetId: string; assetType: string; title: string }) => Promise<unknown>;
  onDirty: (value: boolean) => void;
}) {
  const { tr, number } = useCourseCopy(),
    key = `course-media:${courseId}:${lessonId}`;
  const [capabilities, setCapabilities] = useState<Capabilities>(),
    [status, setStatus] = useState<MediaStatus>(),
    [file, setFile] = useState<File>(),
    [rights, setRights] = useState(''),
    [attribution, setAttribution] = useState(''),
    [title, setTitle] = useState('');
  const [pending, setPending] = useState(() => {
    const value = sessionStorage.getItem(key);
    return value && /^[0-9a-f-]{36}$/i.test(value) ? value : '';
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [phase, setPhase] = useState(''),
    [refresh, setRefresh] = useState(0);
  const endpoint = `/admin/courses/${courseId}/media`;
  useEffect(() => {
    // Do not let a status read started during transfer overwrite finalization.
    if (busy) return;
    const abort = new AbortController();
    void Promise.all([
      adminApiClient.request<Capabilities>(endpoint + '/capabilities', { signal: abort.signal }),
      pending
        ? adminApiClient.request<MediaStatus>(endpoint + '/' + pending, { signal: abort.signal })
        : Promise.resolve(undefined),
    ])
      .then(([caps, value]) => {
        if (!abort.signal.aborted) {
          setCapabilities(caps);
          setStatus(value);
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(String(error.message));
      });
    return () => abort.abort();
  }, [endpoint, pending, refresh, busy]);
  useEffect(() => {
    if (pending && attachedAssetIds.includes(pending)) {
      sessionStorage.removeItem(key);
      setPending('');
      setStatus(undefined);
    }
  }, [attachedAssetIds, pending, key]);
  const ready =
    capabilities &&
    capabilities.upload &&
    capabilities.scanning &&
    capabilities.sanitization &&
    capabilities.delivery;
  const stateLabels: Record<string, string> = {
    INITIATED: tr('بانتظار اكتمال الرفع', 'Awaiting upload'),
    QUARANTINED: tr('في الحجر', 'Quarantined'),
    VALIDATING: tr('قيد الفحص', 'Validating'),
    SANITIZING: tr('قيد المعالجة', 'Sanitizing'),
    ACTIVE: tr('نشط وجاهز للربط', 'Active and ready to attach'),
    MALWARE_SCAN_FAILED: tr('رفضه فحص الأمان', 'Security scan rejected'),
    ARCHIVED: tr('مؤرشف', 'Archived'),
  };
  const write = <T,>(path: string, body: object) => {
    if (reason.trim().length < 3)
      throw Error(
        tr('اكتب مبرر الإجراء في أعلى المحرر.', 'Enter an action reason above the editor.'),
      );
    return adminApiClient.request<T>(endpoint + path, {
      method: 'POST',
      headers: { 'If-Match': String(version), ...reviewReasonHeaders(reason) },
      body: JSON.stringify(body),
    });
  };
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (error) {
      setError(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
      setPhase('');
    }
  };
  return (
    <section className="course-panel native-media-upload" aria-busy={busy}>
      <header className="course-section-heading">
        <h3>
          <Upload size={18} />
          {tr('رفع ومعالجة ملفات المحاضرة', 'Upload and process lecture media')}
        </h3>
        <button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>
          <RefreshCw size={16} />
          {tr('تحديث الحالة', 'Refresh status')}
        </button>
      </header>
      <p className="course-hint">
        {tr(
          'الرفع إلى الحجر أولًا؛ لا يربط الملف بالمحاضرة قبل التحقق من البايتات والفحص والمعالجة والتفعيل. الفيديو والصوت والصورة وPDF حتى 64 MB؛ النص والترجمة VTT حتى 2 MB. التخزين وروابط التسليم يملكهما EAP.',
          'Uploads enter quarantine; attaching is blocked until bytes are verified, scanned, sanitized and activated. Video/audio/images/PDF up to 64 MB; text/VTT up to 2 MB. EAP owns storage and delivery grants.',
        )}
      </p>
      {!capabilities ? (
        <p role="status">{tr('جارٍ التحقق من خدمة الوسائط…', 'Checking media service…')}</p>
      ) : (
        !ready && (
          <p role="status" className="course-hint">
            {tr(
              'خدمة رفع/فحص/معالجة/تسليم الوسائط غير مكتملة الإعداد. يمكنك اختيار أصل نشط من ملفات المحاضرة؛ لن يظهر نجاح رفع وهمي.',
              'Media upload/scanning/sanitization/delivery is not fully configured. You can reuse an active asset; an upload success will not be simulated.',
            )}
          </p>
        )
      )}
      {ready && !pending && (
        <form
          className="course-section-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) return;
            void run(async () => {
              setPhase(tr('تخصيص رفع آمن…', 'Allocating a secure upload…'));
              const ext = file.name.split('.').at(-1)?.toLowerCase() ?? '',
                mime =
                  file.type ||
                  (
                    {
                      vtt: 'text/vtt',
                      wav: 'audio/wav',
                      mp3: 'audio/mpeg',
                      webm: 'video/webm',
                    } as Record<string, string>
                  )[ext] ||
                  'application/octet-stream';
              const grant = await write<Grant>(`/lessons/${lessonId}/uploads`, {
                originalFilename: file.name,
                fileExtension: ext,
                mimeType: mime,
                byteSize: file.size,
                rightsSource: rights,
                attribution,
              });
              if (!grant.uploadGrant) throw Error('COURSE_MEDIA_UPLOAD_PROVIDER_UNAVAILABLE');
              const target = new URL(grant.uploadGrant.uploadUrl);
              if (
                target.protocol !== 'https:' ||
                target.username ||
                target.password ||
                !['PUT', 'POST'].includes(grant.uploadGrant.method) ||
                Date.parse(grant.uploadGrant.expiresAt) <= Date.now() ||
                !Number.isFinite(Date.parse(grant.uploadGrant.expiresAt))
              )
                throw Error('COURSE_MEDIA_UPLOAD_GRANT_INVALID');
              sessionStorage.setItem(key, grant.assetId);
              setPending(grant.assetId);
              setPhase(tr('جارٍ نقل الملف إلى الحجر…', 'Uploading the file to quarantine…'));
              const response = await fetch(target, {
                method: grant.uploadGrant.method,
                headers: grant.uploadGrant.headers,
                body: file,
                credentials: 'omit',
                redirect: 'error',
              });
              if (!response.ok) throw Error('COURSE_MEDIA_UPLOAD_TRANSFER_FAILED');
              setPhase(tr('التحقق من الملف المرفوع…', 'Verifying uploaded bytes…'));
              setStatus(await write<MediaStatus>(`/${grant.assetId}/finalize`, {}));
              onDirty(false);
            });
          }}
        >
          <label className="course-field">
            <span>{tr('ملف المحاضرة', 'Lecture file')}</span>
            <input
              type="file"
              required
              accept=".mp4,.webm,.mp3,.wav,.ogg,.png,.jpg,.jpeg,.pdf,.txt,.vtt"
              onChange={(event) => {
                setFile(event.target.files?.[0]);
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('مصدر حق استخدام الملف', 'Source of the right to use this file')}</span>
            <input
              required
              minLength={3}
              maxLength={2000}
              value={rights}
              onChange={(event) => {
                setRights(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label className="course-field">
            <span>{tr('نسبة الملف لصاحبه — اختياري', 'Attribution — optional')}</span>
            <input
              maxLength={2000}
              value={attribution}
              onChange={(event) => {
                setAttribution(event.target.value);
                onDirty(true);
              }}
            />
          </label>
          <button type="submit" className="course-primary" disabled={busy}>
            {tr('رفع إلى الحجر والتحقق', 'Upload to quarantine and verify')}
          </button>
        </form>
      )}
      {pending && (
        <>
          <p className="course-code" dir="ltr">
            {pending}
          </p>
          {status ? (
            <div className="course-metrics">
              <article className="course-metric">
                <div>
                  <span>{tr('حالة الملف', 'Asset state')}</span>
                  <strong>
                    {stateLabels[status.state] ?? tr('حالة غير متاحة', 'State unavailable')}
                  </strong>
                  <small>
                    {status.filename} · {number(status.byteSize)} B
                  </small>
                </div>
              </article>
              <article className="course-metric">
                <div>
                  <span>
                    {tr('التحقق / الفحص / المعالجة', 'Verification / scan / sanitization')}
                  </span>
                  <small>
                    {status.uploadVerified
                      ? tr('البايتات متحققة', 'Bytes verified')
                      : tr('التحقق لم يكتمل', 'Verification pending')}{' '}
                    ·{' '}
                    {status.scan === 'PASSED'
                      ? tr('اجتاز الفحص', 'Scan passed')
                      : status.scan === 'FAILED'
                        ? tr('لم يجتز الفحص', 'Scan failed')
                        : tr('لم يفحص', 'Not scanned')}{' '}
                    ·{' '}
                    {status.sanitized
                      ? tr('تمت المعالجة', 'Sanitized')
                      : tr('المعالجة لم تكتمل', 'Sanitization pending')}
                  </small>
                </div>
              </article>
            </div>
          ) : (
            <p>
              {tr(
                'لم تكتمل قراءة حالة الملف؛ أعد تحديثها.',
                'Asset status was not read completely; refresh it.',
              )}
            </p>
          )}
          {ready && status?.state === 'INITIATED' && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setStatus(await write<MediaStatus>(`/${pending}/finalize`, {}));
                })
              }
            >
              {tr('إعادة التحقق بعد اكتمال النقل', 'Retry verification after upload completes')}
            </button>
          )}
          {ready && status?.state === 'INITIATED' && (
            <form
              className="course-section-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  if (!file || file.name !== status.filename || file.size !== status.byteSize)
                    throw Error(
                      tr(
                        'اختر الملف الأصلي بالاسم والحجم نفسيهما لاستئناف الرفع.',
                        'Choose the original file with the same name and size to resume.',
                      ),
                    );
                  const grant = await write<Grant>(`/${pending}/refresh-upload`, {}),
                    url = new URL(grant.uploadGrant.uploadUrl);
                  if (
                    url.protocol !== 'https:' ||
                    url.username ||
                    url.password ||
                    !['PUT', 'POST'].includes(grant.uploadGrant.method) ||
                    !Number.isFinite(Date.parse(grant.uploadGrant.expiresAt)) ||
                    Date.parse(grant.uploadGrant.expiresAt) <= Date.now()
                  )
                    throw Error('COURSE_MEDIA_UPLOAD_GRANT_INVALID');
                  setPhase(tr('استئناف النقل…', 'Resuming upload…'));
                  const response = await fetch(url, {
                    method: grant.uploadGrant.method,
                    headers: grant.uploadGrant.headers,
                    body: file,
                    credentials: 'omit',
                    redirect: 'error',
                  });
                  if (!response.ok) throw Error('COURSE_MEDIA_UPLOAD_TRANSFER_FAILED');
                  setStatus(await write<MediaStatus>(`/${pending}/finalize`, {}));
                });
              }}
            >
              <label className="course-field">
                <span>{tr('الملف الأصلي لاستئناف الرفع', 'Original file for upload retry')}</span>
                <input
                  type="file"
                  required
                  onChange={(event) => setFile(event.target.files?.[0])}
                />
              </label>
              <button type="submit" disabled={busy}>
                {tr('استئناف رفع الملف نفسه', 'Retry the same upload')}
              </button>
            </form>
          )}
          {ready &&
            status &&
            ['QUARANTINED', 'VALIDATING', 'SANITIZING'].includes(status.state) && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setPhase(
                      tr('الفحص والمعالجة والتفعيل…', 'Scanning, sanitizing and activating…'),
                    );
                    setStatus(await write<MediaStatus>(`/${pending}/process`, {}));
                  })
                }
              >
                <ShieldCheck size={16} />
                {tr('فحص ومعالجة وتفعيل الملف', 'Scan, sanitize and activate file')}
              </button>
            )}
          {status?.state === 'ACTIVE' && (
            <>
              <label className="course-field">
                <span>{tr('اسم الملف داخل المحاضرة', 'Attachment title')}</span>
                <input
                  value={title || status.filename}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    onDirty(true);
                  }}
                />
              </label>
              <button
                type="button"
                className="course-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const mime = status.mimeType,
                      assetType = mime.startsWith('video/')
                        ? 'VIDEO'
                        : mime.startsWith('audio/')
                          ? 'AUDIO'
                          : mime.startsWith('image/')
                            ? 'IMAGE'
                            : mime === 'application/pdf'
                              ? 'PDF'
                              : mime === 'text/vtt'
                                ? 'SUBTITLE'
                                : 'DOCUMENT';
                    await onAttach({
                      assetId: pending,
                      assetType,
                      title: title || status.filename,
                    });
                    sessionStorage.removeItem(key);
                    setPending('');
                    setStatus(undefined);
                    onDirty(false);
                  })
                }
              >
                <Link2 size={16} />
                {tr('ربط الملف بالمحاضرة', 'Attach file to lecture')}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  tr(
                    'بدء رفع آخر؟ سيبقى الأصل الحالي وسجله في خدمة الأصول، ولن يُحذف.',
                    'Start another upload? The existing asset and its history remain in EAP; it will not be deleted.',
                  ),
                )
              ) {
                sessionStorage.removeItem(key);
                setPending('');
                setStatus(undefined);
              }
            }}
          >
            {tr('بدء رفع آخر', 'Start another upload')}
          </button>
        </>
      )}
      {phase && <p role="status">{phase}</p>}
      {error && (
        <p role="alert" className="course-error">
          {error}
        </p>
      )}
    </section>
  );
}
