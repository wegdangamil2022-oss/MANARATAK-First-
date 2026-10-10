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
  public readonly rendererVersion = '1.3.0';
  constructor(
    private readonly visualAssets?: {
      resolve(id: string, hash: string): Promise<{ bytes: Uint8Array; mimeType: string }>;
    },
  ) {}
  private async materialize(input: CertificateRenderInput) {
    const provenance = input.templateVersion.metadata?.assetProvenance as
      Record<string, string> | undefined;
    const result: Record<string, { bytes: Uint8Array; mimeType: string }> = {};
    for (const role of [
      'logoAssetId',
      'sealAssetId',
      'signatureAssetId',
      'designAssetId',
    ] as const) {
      const id = input.templateVersion[role];
      if (!id) continue;
      if (!this.visualAssets || !provenance?.[id])
        throw new Error('CERTIFICATE_VISUAL_ASSET_RESOLVER_REQUIRED');
      const asset = await this.visualAssets.resolve(id, provenance[id]);
      if (
        !['image/png', 'image/jpeg'].includes(asset.mimeType) ||
        asset.bytes.byteLength > 2 * 1024 * 1024 ||
        createHash('sha256').update(asset.bytes).digest('hex') !== provenance[id]
      )
        throw new Error('CERTIFICATE_VISUAL_ASSET_INVALID');
      result[role] = asset;
    }
    return result;
  }

  public async render(input: CertificateRenderInput): Promise<CertificateRenderResult> {
    const visualAssets = await this.materialize(input);
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
    const font = await readFile(
      new URL('../../assets/certificates/NotoSansArabic-Regular.ttf', import.meta.url),
    );
    const layout = this.layout(input, font);
    const previewSvg = this.previewSvg(input, renderFingerprint, visualAssets, font, layout);
    const pdf = await this.pdf(input, visualAssets, font, layout);
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

  private layout(input: CertificateRenderInput, font: Buffer) {
    const landscape = input.templateVersion.layout === 'LANDSCAPE';
    const width = landscape ? 842 : 595,
      height = landscape ? 595 : 842;
    const metrics = new PDFDocument({ autoFirstPage: false });
    metrics.registerFont('NotoArabic', font);
    const arabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
    const measure = (value: string, size: number) =>
      value
        .split(/([\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]+)/u)
        .filter(Boolean)
        .reduce(
          (sum, run) =>
            sum +
            metrics
              .font(arabic.test(run) ? 'NotoArabic' : 'Helvetica')
              .fontSize(size)
              .widthOfString(run),
          0,
        );
    const lines: { text: string; y: number; size: number; rtl: boolean }[] = [];
    const add = (value: string | undefined | null, y: number, size: number, boxHeight: number) => {
      if (!value) return;
      if (value.length > 4000) throw new Error('CERTIFICATE_TEXT_OVERFLOW');
      let wrapped: string[] = [];
      for (; size >= 7; size--) {
        wrapped = [];
        let line = '';
        for (const word of value.trim().split(/\s+/u)) {
          if (measure(word, size) > width - 104) {
            wrapped = [];
            break;
          }
          const next = line ? line + ' ' + word : word;
          if (measure(next, size) > width - 104) {
            wrapped.push(line);
            line = word;
          } else line = next;
        }
        if (line) wrapped.push(line);
        if (wrapped.length && wrapped.length * size * 1.8 <= boxHeight) break;
      }
      if (size < 7 || !wrapped.length) throw new Error('CERTIFICATE_TEXT_OVERFLOW');
      wrapped.forEach((text, index) =>
        lines.push({ text, y: y + index * size * 1.8, size, rtl: arabic.test(text) }),
      );
    };
    const version = input.templateVersion,
      bilingual = version.language === 'BILINGUAL',
      ar = version.language === 'ARABIC';
    add(ar ? version.titleAr : version.titleEn, height * 0.12, 26, height * 0.095);
    if (bilingual) add(version.titleAr, height * 0.22, 18, height * 0.06);
    add(input.certificate.recipientDisplayName ?? '—', height * 0.29, 22, height * 0.11);
    add(
      ar ? version.bodyAr : version.bodyEn,
      height * 0.41,
      14,
      height * (bilingual ? 0.08 : 0.13),
    );
    if (bilingual) add(version.bodyAr, height * 0.5, 12, height * 0.06);
    add(input.certificate.achievementDisplayName, height * 0.57, 20, height * 0.1);
    add(input.certificate.issuerName, height * 0.68, 13, height * 0.04);
    add(ar ? version.signatoryNameAr : version.signatoryNameEn, height * 0.74, 12, height * 0.04);
    if (bilingual) add(version.signatoryNameAr, height * 0.78, 10, height * 0.035);
    add(input.certificate.issuedAt.toISOString().slice(0, 10), height * 0.82, 10, height * 0.035);
    metrics.end();
    return { width, height, lines };
  }

  private previewSvg(
    input: CertificateRenderInput,
    fingerprint: string,
    assets: Record<string, { bytes: Uint8Array; mimeType: string }>,
    font: Buffer,
    layout: ReturnType<ProviderNeutralCertificateRenderingService['layout']>,
  ): string {
    const { width, height, lines } = layout;
    const image = (role: string, x: number, y: number, w: number, h: number) =>
      assets[role]
        ? `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${assets[role].mimeType};base64,${Buffer.from(assets[role].bytes).toString('base64')}"/>`
        : '';
    const matrix = createQrMatrix(input.certificate.verificationUrl),
      qrSize = 92,
      unit = qrSize / (matrix.length + 8);
    const qr = `<g transform="translate(${width - qrSize - 48},${height - qrSize - 48})"><rect width="${qrSize}" height="${qrSize}" fill="white"/>${matrix.flatMap((row, y) => row.map((filled, x) => (filled ? `<rect x="${(x + 4) * unit}" y="${(y + 4) * unit}" width="${unit}" height="${unit}" fill="black"/>` : ''))).join('')}</g>`;
    const accent = /^#[0-9a-f]{6}$/i.test(input.templateVersion.accentColor)
      ? input.templateVersion.accentColor
      : '#142B5F';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Certificate ${xml(input.certificate.serialNumber)}"><defs><style>@font-face{font-family:CertificateArabic;src:url(data:font/ttf;base64,${font.toString('base64')})}text{font-family:CertificateArabic,Arial,sans-serif}</style></defs><rect width="100%" height="100%" fill="white"/><rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${accent}" stroke-width="3"/>
${image('designAssetId', 28, 28, width - 56, height - 56)}${image('logoAssetId', width / 2 - 42, 38, 84, 42)}${image('sealAssetId', 56, height - 147, 63, 63)}${image('signatureAssetId', width / 2 - 63, height * 0.72, 126, 20)}
${lines.map((line) => `<text x="${width / 2}" y="${line.y + line.size * 1.3}" font-size="${line.size}" text-anchor="middle" direction="${line.rtl ? 'rtl' : 'ltr'}" style="unicode-bidi:plaintext" fill="${accent}">${xml(line.text)}</text>`).join('')}
${qr}<text x="52" y="${height - 68}" font-size="9" style="font-family:monospace">${xml(input.certificate.serialNumber)}</text><text x="52" y="${height - 52}" font-size="8" textLength="${width - 230}" lengthAdjust="spacingAndGlyphs">${xml(input.certificate.verificationUrl)}</text><metadata data-render-fingerprint="${fingerprint}" data-template-version="${xml(input.templateVersion.versionNumber)}"/></svg>`;
  }

  private async pdf(
    input: CertificateRenderInput,
    assets: Record<string, { bytes: Uint8Array; mimeType: string }>,
    font: Buffer,
    layout: ReturnType<ProviderNeutralCertificateRenderingService['layout']>,
  ): Promise<Uint8Array> {
    const { width, height, lines } = layout;
    const accent = /^#[0-9a-f]{6}$/i.test(input.templateVersion.accentColor)
      ? input.templateVersion.accentColor
      : '#142B5F';
    return new Promise<Uint8Array>((resolve, reject) => {
      const document = new PDFDocument({
        size: [width, height],
        margin: 0,
        info: {
          Title:
            input.templateVersion.language === 'ARABIC'
              ? input.templateVersion.titleAr
              : input.templateVersion.titleEn,
          Author: input.certificate.issuerName,
          CreationDate: input.certificate.issuedAt,
          ModDate: input.certificate.issuedAt,
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      try {
        document.registerFont('NotoArabic', font);
        document
          .rect(24, 24, width - 48, height - 48)
          .lineWidth(3)
          .stroke(accent);
        const image = (role: string, x: number, y: number, w: number, h: number) => {
          if (!assets[role]) return;
          const bytes = Buffer.from(assets[role].bytes);
          const opened = (
            document as unknown as { openImage(bytes: Buffer): { width: number; height: number } }
          ).openImage(bytes);
          if (
            opened.width > 4096 ||
            opened.height > 4096 ||
            opened.width * opened.height > 16000000
          )
            throw new Error('CERTIFICATE_VISUAL_ASSET_DIMENSIONS_INVALID');
          document.image(bytes, x, y, { fit: [w, h], align: 'center', valign: 'center' });
        };
        image('designAssetId', 28, 28, width - 56, height - 56);
        image('logoAssetId', width / 2 - 42, 38, 84, 42);
        image('sealAssetId', 56, height - 147, 63, 63);
        image('signatureAssetId', width / 2 - 63, height * 0.72, 126, 20);
        for (const line of lines) {
          const runs = line.text
            .split(/([\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]+)/u)
            .filter(Boolean);
          runs.forEach((run, index) => {
            document
              .fillColor(accent)
              .font(
                /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(run) ? 'NotoArabic' : 'Helvetica',
              )
              .fontSize(line.size);
            const options = {
              width: width - 104,
              align: 'center' as const,
              continued: index < runs.length - 1,
              lineBreak: false,
            };
            if (index === 0) document.text(run, 52, line.y, options);
            else document.text(run, options);
          });
        }
        const matrix = createQrMatrix(input.certificate.verificationUrl),
          qrSize = 92,
          unit = qrSize / (matrix.length + 8),
          x = width - qrSize - 48,
          y = height - qrSize - 48;
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
          .fillColor(accent)
          .text(input.certificate.serialNumber, 52, height - 78, {
            width: width - 230,
            lineBreak: false,
          });
        const url = input.certificate.verificationUrl;
        const urlSize = Math.min(
          8,
          (8 * (width - 230)) / Math.max(1, document.fontSize(8).widthOfString(url)),
        );
        document
          .fontSize(urlSize)
          .text(url, 52, height - 61, { width: width - 230, lineBreak: false, link: url });
        document.end();
      } catch (error) {
        document.destroy();
        reject(error);
      }
    });
  }
}
