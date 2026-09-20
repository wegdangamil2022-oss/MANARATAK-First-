import { createHash } from 'node:crypto';
import {
  CertificateRenderInput,
  CertificateRenderResult,
  ICertificateRenderingService,
} from '@manaratak/domain';
import { createQrMatrix, qrMatrixToSvg } from '@manaratak/shared';

const encode = (value: string) => new TextEncoder().encode(value);
const xml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[c] ?? c);
const pdfText = (value: unknown) => String(value ?? '').normalize('NFKC').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, (c) => `\\${c}`);

/**
 * Provider-neutral deterministic renderer. It consumes immutable template data;
 * visual assets remain EAP references and no future brand layout is hard-coded
 * into certificate business rules.
 */
export class ProviderNeutralCertificateRenderingService implements ICertificateRenderingService {
  public readonly rendererId = 'manaratak-provider-neutral-certificate-renderer';
  public readonly rendererVersion = '1.0.0';

  public async render(input: CertificateRenderInput): Promise<CertificateRenderResult> {
    const canonical = JSON.stringify({
      rendererId: this.rendererId, rendererVersion: this.rendererVersion,
      certificateId: input.certificate.id, publicId: input.certificate.publicId,
      serialNumber: input.certificate.serialNumber, verificationUrl: input.certificate.verificationUrl,
      recipientDisplayName: input.certificate.recipientDisplayName ?? null,
      achievementDisplayName: input.certificate.achievementDisplayName,
      issuedAt: input.certificate.issuedAt.toISOString(), templateVersionId: input.templateVersion.id,
      templateVersionNumber: input.templateVersion.versionNumber,
      template: {
        language: input.templateVersion.language, layout: input.templateVersion.layout,
        accentColor: input.templateVersion.accentColor, secondaryColor: input.templateVersion.secondaryColor,
        titleAr: input.templateVersion.titleAr, titleEn: input.templateVersion.titleEn,
        bodyAr: input.templateVersion.bodyAr, bodyEn: input.templateVersion.bodyEn,
        signatoryNameAr: input.templateVersion.signatoryNameAr ?? null,
        signatoryNameEn: input.templateVersion.signatoryNameEn ?? null,
        logoAssetId: input.templateVersion.logoAssetId ?? null,
        sealAssetId: input.templateVersion.sealAssetId ?? null,
        signatureAssetId: input.templateVersion.signatureAssetId ?? null,
        designAssetId: input.templateVersion.designAssetId ?? null,
      },
    });
    const renderFingerprint = createHash('sha256').update(canonical).digest('hex');
    const qrSvg = qrMatrixToSvg(createQrMatrix(input.certificate.verificationUrl), { moduleSize: 6, quietZone: 4 });
    const previewSvg = this.previewSvg(input, renderFingerprint);
    const pdf = this.pdf(input, renderFingerprint);
    const stem = `certificate-${input.certificate.serialNumber}-${renderFingerprint.slice(0, 12)}`;
    return {
      rendererId: this.rendererId, rendererVersion: this.rendererVersion,
      templateVersionId: input.templateVersion.id, templateVersionNumber: input.templateVersion.versionNumber,
      renderFingerprint,
      artifacts: [
        { kind: 'PDF', bytes: pdf, mimeType: 'application/pdf', fileExtension: 'pdf', filename: `${stem}.pdf` },
        { kind: 'PREVIEW', bytes: encode(previewSvg), mimeType: 'image/svg+xml', fileExtension: 'svg', filename: `${stem}-preview.svg` },
        { kind: 'QR', bytes: encode(qrSvg), mimeType: 'image/svg+xml', fileExtension: 'svg', filename: `${stem}-qr.svg` },
      ],
    };
  }

  private previewSvg(input: CertificateRenderInput, fingerprint: string): string {
    const landscape = input.templateVersion.layout === 'LANDSCAPE';
    const width = landscape ? 1200 : 850;
    const height = landscape ? 850 : 1200;
    const title = input.templateVersion.language === 'ARABIC' ? input.templateVersion.titleAr : input.templateVersion.titleEn;
    const body = input.templateVersion.language === 'ARABIC' ? input.templateVersion.bodyAr : input.templateVersion.bodyEn;
    const recipient = input.certificate.recipientDisplayName ?? input.certificate.studentReferenceId;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Certificate ${xml(input.certificate.serialNumber)}">
<rect width="100%" height="100%" fill="#fff"/><rect x="28" y="28" width="${width-56}" height="${height-56}" rx="12" fill="none" stroke="${xml(input.templateVersion.accentColor)}" stroke-width="8"/>
<text x="50%" y="18%" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="${xml(input.templateVersion.accentColor)}">${xml(title)}</text>
<text x="50%" y="34%" text-anchor="middle" font-family="sans-serif" font-size="34" direction="auto">${xml(recipient)}</text>
<text x="50%" y="47%" text-anchor="middle" font-family="sans-serif" font-size="24" direction="auto">${xml(body)}</text>
<text x="50%" y="57%" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="600" direction="auto">${xml(input.certificate.achievementDisplayName)}</text>
<text x="50%" y="72%" text-anchor="middle" font-family="sans-serif" font-size="18">${xml(input.certificate.issuerName)} · ${xml(input.certificate.issuedAt.toISOString().slice(0,10))}</text>
<text x="50%" y="80%" text-anchor="middle" font-family="monospace" font-size="16">${xml(input.certificate.serialNumber)}</text>
<text x="50%" y="86%" text-anchor="middle" font-family="sans-serif" font-size="13">${xml(input.certificate.verificationUrl)}</text>
<metadata data-render-fingerprint="${fingerprint}" data-template-version="${xml(input.templateVersion.versionNumber)}"/>
</svg>`;
  }

  private pdf(input: CertificateRenderInput, fingerprint: string): Uint8Array {
    const title = input.templateVersion.titleEn || input.templateVersion.titleAr;
    const recipient = input.certificate.recipientDisplayName ?? input.certificate.studentReferenceId;
    const lines = [title, recipient, input.certificate.achievementDisplayName, input.certificate.issuerName,
      input.certificate.serialNumber, input.certificate.verificationUrl, `Render ${fingerprint}`, `Template ${input.templateVersion.versionNumber}`];
    const stream = `BT /F1 22 Tf 72 740 Td ${lines.map((line, i) => `${i ? '0 -42 Td ' : ''}(${pdfText(line)}) Tj`).join(' ')} ET`;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let out = '%PDF-1.4\n%MANARATAK\n';
    const offsets = [0];
    objects.forEach((obj, index) => { offsets.push(Buffer.byteLength(out, 'utf8')); out += `${index+1} 0 obj\n${obj}\nendobj\n`; });
    const xref = Buffer.byteLength(out, 'utf8');
    out += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for (let i=1;i<=objects.length;i+=1) out += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return encode(out);
  }
}
