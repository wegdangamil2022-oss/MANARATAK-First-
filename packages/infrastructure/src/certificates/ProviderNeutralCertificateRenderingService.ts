import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import {
  CertificateRenderInput,
  CertificateRenderResult,
  ICertificateRenderingService,
} from '@manaratak/domain';
import { createQrMatrix, qrMatrixToSvg } from '@manaratak/shared';

const encode = (value: string) => new TextEncoder().encode(value);
const xml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c,
  );

/**
 * Provider-neutral deterministic renderer. It consumes immutable template data;
 * visual assets remain EAP references and no future brand layout is hard-coded
 * into certificate business rules.
 */
export class ProviderNeutralCertificateRenderingService implements ICertificateRenderingService {
  public readonly rendererId = 'manaratak-provider-neutral-certificate-renderer';
  public readonly rendererVersion = '1.1.0';

  public async render(input: CertificateRenderInput): Promise<CertificateRenderResult> {
    const canonical = JSON.stringify({
      rendererId: this.rendererId,
      rendererVersion: this.rendererVersion,
      certificateId: input.certificate.id,
      publicId: input.certificate.publicId,
      serialNumber: input.certificate.serialNumber,
      verificationUrl: input.certificate.verificationUrl,
      recipientDisplayName: input.certificate.recipientDisplayName ?? null,
      achievementDisplayName: input.certificate.achievementDisplayName,
      issuedAt: input.certificate.issuedAt.toISOString(),
      templateVersionId: input.templateVersion.id,
      templateVersionNumber: input.templateVersion.versionNumber,
      template: {
        language: input.templateVersion.language,
        layout: input.templateVersion.layout,
        accentColor: input.templateVersion.accentColor,
        secondaryColor: input.templateVersion.secondaryColor,
        titleAr: input.templateVersion.titleAr,
        titleEn: input.templateVersion.titleEn,
        bodyAr: input.templateVersion.bodyAr,
        bodyEn: input.templateVersion.bodyEn,
        signatoryNameAr: input.templateVersion.signatoryNameAr ?? null,
        signatoryNameEn: input.templateVersion.signatoryNameEn ?? null,
        logoAssetId: input.templateVersion.logoAssetId ?? null,
        sealAssetId: input.templateVersion.sealAssetId ?? null,
        signatureAssetId: input.templateVersion.signatureAssetId ?? null,
        designAssetId: input.templateVersion.designAssetId ?? null,
      },
    });
    const renderFingerprint = createHash('sha256').update(canonical).digest('hex');
    const qrSvg = qrMatrixToSvg(createQrMatrix(input.certificate.verificationUrl), {
      moduleSize: 6,
      quietZone: 4,
    });
    const previewSvg = this.previewSvg(input, renderFingerprint);
    const pdf = await this.pdf(input);
    const stem = `certificate-${input.certificate.serialNumber}-${renderFingerprint.slice(0, 12)}`;
    return {
      rendererId: this.rendererId,
      rendererVersion: this.rendererVersion,
      templateVersionId: input.templateVersion.id,
      templateVersionNumber: input.templateVersion.versionNumber,
      renderFingerprint,
      artifacts: [
        {
          kind: 'PDF',
          bytes: pdf,
          mimeType: 'application/pdf',
          fileExtension: 'pdf',
          filename: `${stem}.pdf`,
        },
        {
          kind: 'PREVIEW',
          bytes: encode(previewSvg),
          mimeType: 'image/svg+xml',
          fileExtension: 'svg',
          filename: `${stem}-preview.svg`,
        },
        {
          kind: 'QR',
          bytes: encode(qrSvg),
          mimeType: 'image/svg+xml',
          fileExtension: 'svg',
          filename: `${stem}-qr.svg`,
        },
      ],
    };
  }

  private previewSvg(input: CertificateRenderInput, fingerprint: string): string {
    const landscape = input.templateVersion.layout === 'LANDSCAPE';
    const width = landscape ? 1200 : 850;
    const height = landscape ? 850 : 1200;
    const title =
      input.templateVersion.language === 'ARABIC'
        ? input.templateVersion.titleAr
        : input.templateVersion.titleEn;
    const body =
      input.templateVersion.language === 'ARABIC'
        ? input.templateVersion.bodyAr
        : input.templateVersion.bodyEn;
    const recipient =
      input.certificate.recipientDisplayName ?? input.certificate.studentReferenceId;
    const matrix = createQrMatrix(input.certificate.verificationUrl);
    const qrSize = 120;
    const unit = qrSize / (matrix.length + 8);
    const qr = `<g transform="translate(${width - 185},${height - 195})"><rect width="${qrSize}" height="${qrSize}" fill="white"/>${matrix.flatMap((row, y) => row.map((filled, x) => (filled ? `<rect x="${(x + 4) * unit}" y="${(y + 4) * unit}" width="${unit}" height="${unit}" fill="black"/>` : ''))).join('')}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Certificate ${xml(input.certificate.serialNumber)}">
<rect width="100%" height="100%" fill="#fff"/><rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="12" fill="none" stroke="${xml(input.templateVersion.accentColor)}" stroke-width="8"/>
<text x="50%" y="18%" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="${xml(input.templateVersion.accentColor)}">${xml(title)}</text>
<text x="50%" y="34%" text-anchor="middle" font-family="sans-serif" font-size="34" direction="auto">${xml(recipient)}</text>
<text x="50%" y="47%" text-anchor="middle" font-family="sans-serif" font-size="24" direction="auto">${xml(body)}</text>
<text x="50%" y="57%" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="600" direction="auto">${xml(input.certificate.achievementDisplayName)}</text>
<text x="50%" y="72%" text-anchor="middle" font-family="sans-serif" font-size="18">${xml(input.certificate.issuerName)} · ${xml(input.certificate.issuedAt.toISOString().slice(0, 10))}</text>
<text x="50%" y="80%" text-anchor="middle" font-family="monospace" font-size="16">${xml(input.certificate.serialNumber)}</text>
<text x="50%" y="86%" text-anchor="middle" font-family="sans-serif" font-size="13">${xml(input.certificate.verificationUrl)}</text>
${qr}
<metadata data-render-fingerprint="${fingerprint}" data-template-version="${xml(input.templateVersion.versionNumber)}"/>
</svg>`;
  }

  private async pdf(input: CertificateRenderInput): Promise<Uint8Array> {
    // Embed the licensed Arabic font so rendering does not depend on server fonts.
    const font = await readFile(
      new URL('../../assets/certificates/NotoSansArabic-Regular.ttf', import.meta.url),
    );
    const arabic = input.templateVersion.language === 'ARABIC';
    const landscape = input.templateVersion.layout === 'LANDSCAPE';
    const width = landscape ? 842 : 595;
    const height = landscape ? 595 : 842;
    const accent = /^#[0-9a-f]{6}$/i.test(input.templateVersion.accentColor)
      ? input.templateVersion.accentColor
      : '#142B5F';
    return new Promise<Uint8Array>((resolve, reject) => {
      const document = new PDFDocument({
        size: [width, height],
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: arabic ? input.templateVersion.titleAr : input.templateVersion.titleEn,
          Author: input.certificate.issuerName,
          CreationDate: input.certificate.issuedAt,
          ModDate: input.certificate.issuedAt,
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.registerFont('NotoArabic', font);
      document
        .rect(24, 24, width - 48, height - 48)
        .lineWidth(3)
        .stroke(accent);
      document.font('NotoArabic');
      const text = (value: string, y: number, size: number, boxHeight: number) => {
        // Noto Arabic has no Latin glyphs. Rich text runs keep both scripts visible.
        const runs = value.split(/([\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]+)/u).filter(Boolean);
        runs.forEach((run, index) => {
          document
            .fillColor(accent)
            .font(
              /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(run) ? 'NotoArabic' : 'Helvetica',
            )
            .fontSize(size);
          const options = {
            width: width - 104,
            height: boxHeight,
            align: 'center' as const,
            ellipsis: true,
            lineGap: 4,
            continued: index < runs.length - 1,
          };
          if (index === 0) document.text(run, 52, y, options);
          else document.text(run, options);
        });
      };
      text(
        arabic ? input.templateVersion.titleAr : input.templateVersion.titleEn,
        height * 0.12,
        26,
        height * 0.13,
      );
      text(
        input.certificate.recipientDisplayName ?? input.certificate.studentReferenceId,
        height * 0.29,
        22,
        height * 0.11,
      );
      text(
        arabic ? input.templateVersion.bodyAr : input.templateVersion.bodyEn,
        height * 0.41,
        14,
        height * 0.13,
      );
      text(input.certificate.achievementDisplayName, height * 0.55, 20, height * 0.11);
      text(input.certificate.issuerName, height * 0.68, 13, 30);
      const signatory = arabic
        ? input.templateVersion.signatoryNameAr
        : input.templateVersion.signatoryNameEn;
      if (signatory) text(signatory, height * 0.73, 12, 26);
      text(input.certificate.issuedAt.toISOString().slice(0, 10), height * 0.78, 11, 24);
      const matrix = createQrMatrix(input.certificate.verificationUrl);
      const qrSize = 92;
      const unit = qrSize / (matrix.length + 8);
      const x = width - qrSize - 48;
      const y = height - qrSize - 48;
      document.save().rect(x, y, qrSize, qrSize).fill('white').fillColor('black');
      matrix.forEach((row, iy) =>
        row.forEach((filled, ix) => {
          if (filled) document.rect(x + (ix + 4) * unit, y + (iy + 4) * unit, unit, unit).fill();
        }),
      );
      document.restore();
      document
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#142B5F')
        .text(input.certificate.serialNumber, 52, height - 78, { width: width - 230, height: 14 });
      document.fontSize(8).text(input.certificate.verificationUrl, 52, height - 61, {
        width: width - 230,
        height: 16,
        link: input.certificate.verificationUrl,
        ellipsis: true,
      });
      document.end();
    });
  }
}
