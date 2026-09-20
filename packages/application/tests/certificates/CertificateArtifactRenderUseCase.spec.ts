import { describe, expect, it, vi } from 'vitest';
import { CertificateArtifactRenderUseCase } from '../../src/certificates/use-cases/CertificateArtifactRenderUseCase';

describe('CertificateArtifactRenderUseCase', () => {
  it('stores PDF, preview and QR then attaches deterministic render metadata', async () => {
    const certificate: any = { id:'c1', templateId:'t1', templateVersionId:'tv1', templateVersion:'1.0.0', metadata:{} };
    const version: any = { id:'tv1', templateId:'t1', versionNumber:'1.0.0' };
    const repository: any = { findById:vi.fn().mockResolvedValue(certificate), findTemplateVersionById:vi.fn().mockResolvedValue(version), attachArtifacts:vi.fn().mockResolvedValue({}) };
    const renderer: any = { render:vi.fn().mockResolvedValue({ rendererId:'r', rendererVersion:'1', templateVersionId:'tv1', templateVersionNumber:'1.0.0', renderFingerprint:'abc', artifacts:[
      {kind:'PDF',bytes:new Uint8Array([1]),mimeType:'application/pdf',fileExtension:'pdf',filename:'a.pdf'},
      {kind:'PREVIEW',bytes:new Uint8Array([2]),mimeType:'image/svg+xml',fileExtension:'svg',filename:'a.svg'},
      {kind:'QR',bytes:new Uint8Array([3]),mimeType:'image/svg+xml',fileExtension:'svg',filename:'q.svg'}] }) };
    const store:any = { store:vi.fn().mockImplementation(async ({artifact}:any)=>`${artifact.kind}-asset`) };
    const result = await new CertificateArtifactRenderUseCase(repository, renderer, store).renderCertificate('c1');
    expect(result.replayed).toBe(false); expect(store.store).toHaveBeenCalledTimes(3); expect(repository.attachArtifacts).toHaveBeenCalledOnce();
  });

  it('replays already attached artifacts without regenerating', async () => {
    const repository:any={ findById:vi.fn().mockResolvedValue({id:'c1',certificatePdfAssetId:'p',previewImageAssetId:'i',verificationQrAssetId:'q',metadata:{render:{renderFingerprint:'f',rendererVersion:'1'}}}) };
    const renderer:any={render:vi.fn()}; const store:any={store:vi.fn()};
    const result=await new CertificateArtifactRenderUseCase(repository,renderer,store).renderCertificate('c1');
    expect(result.replayed).toBe(true); expect(renderer.render).not.toHaveBeenCalled();
  });
});
