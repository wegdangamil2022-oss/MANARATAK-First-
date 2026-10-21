import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { StudentCertificateActions } from '../../src/features/certificates/StudentCertificateActions';
import { ApiClient, type StudentCertificateProjectionDto } from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  ApiClient: { getMyCertificateArtifactBlob: vi.fn() },
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'ar' }) }));
vi.mock('@manaratak/shared', () => ({
  certificateCopy: (_language: string, value: string) => value,
  createQrMatrix: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const certificate = {
  id: 'owned-certificate',
  serialNumber: 'MNR-OWNED',
  certificatePdfAssetId: 'owned-pdf',
  previewImageAssetId: 'owned-preview',
  verificationCode: 'OWNED-CODE',
} as StudentCertificateProjectionDto;

let view: ReactTestRenderer | undefined;
let downloadedName = '';
const clickAnchor = vi.fn();
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:certificate');
const revokeObjectURL = vi.fn();
const fetchSpy = vi.fn();

async function mount() {
  await act(async () => {
    view = create(<MemoryRouter><StudentCertificateActions certificate={certificate} /></MemoryRouter>);
  });
  return view!;
}

async function click(label: string) {
  await act(async () => {
    view!.root.findAllByType('button').find(button => button.children.includes(label))!.props.onClick();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', 'live');
  vi.stubGlobal('window', { location: { origin: 'https://app.example.test' } });
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
  vi.stubGlobal('document', {
    createElement: () => ({
      href: '',
      set download(value: string) { downloadedName = value; },
      click: clickAnchor,
    }),
  });
  vi.useFakeTimers();
  downloadedName = '';
});

afterEach(async () => {
  if (view) await act(async () => view!.unmount());
  view = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('certificate actions after integrating the student preview', () => {
  it('uses authenticated artifact delivery for a live preview and revokes its object URL', async () => {
    const blob = new Blob(['preview'], { type: 'image/png' });
    vi.mocked(ApiClient.getMyCertificateArtifactBlob).mockResolvedValue(blob);
    await mount();
    await click('عرض الشهادة');
    expect(ApiClient.getMyCertificateArtifactBlob).toHaveBeenCalledWith(certificate.id, 'preview', expect.any(AbortSignal));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(view!.root.findByType('img').props.src).toBe('blob:certificate');
    await click('إغلاق');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });

  it('downloads the authenticated live PDF and releases its object URL', async () => {
    vi.mocked(ApiClient.getMyCertificateArtifactBlob).mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
    await mount();
    await click('تحميل الشهادة PDF');
    expect(ApiClient.getMyCertificateArtifactBlob).toHaveBeenCalledWith(certificate.id, 'pdf');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(downloadedName).toBe('MNR-OWNED.pdf');
    expect(clickAnchor).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });

  it('shows an access failure without starting a download', async () => {
    vi.mocked(ApiClient.getMyCertificateArtifactBlob).mockRejectedValue(new Error('CERTIFICATE_ACCESS_DENIED'));
    await mount();
    await click('تحميل الشهادة PDF');
    expect(view!.root.findByProps({ role: 'alert' }).children).toContain('CERTIFICATE_ACCESS_DENIED');
    expect(clickAnchor).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects a non-PDF response before download', async () => {
    vi.mocked(ApiClient.getMyCertificateArtifactBlob).mockResolvedValue(new Blob(['not a PDF'], { type: 'text/html' }));
    await mount();
    await click('تحميل الشهادة PDF');
    expect(view!.root.findByProps({ role: 'alert' }).children).toContain('تعذر تنزيل الشهادة.');
    expect(clickAnchor).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('keeps prototype preview, download and verification away from real student endpoints', async () => {
    vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', 'prototype');
    await mount();
    await click('عرض الشهادة');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain('NOT A VALID CERTIFICATE');
    await click('تحميل الشهادة PDF');
    expect(JSON.stringify(view!.toJSON())).toContain('لا توجد شهادة رسمية');
    await click('التحقق من الشهادة');
    expect(JSON.stringify(view!.toJSON())).toContain('هذه شهادة توضيحية فقط');
    expect(ApiClient.getMyCertificateArtifactBlob).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(clickAnchor).not.toHaveBeenCalled();
    expect(view!.root.findAllByType('a')).toHaveLength(0);
  });
});
