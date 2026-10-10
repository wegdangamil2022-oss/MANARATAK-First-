import { createQrMatrix } from '../qr/qrCode';

/** Immutable design identity: changing geometry requires a new design/version. */
export const APPROVED_CERTIFICATE_DESIGN = 'manaratak-completion-2026-10-10-v1';
export const approvedCertificateCopy = {
  titleAr: 'شهادة إتمام',
  titleEn: 'Certificate of Completion',
  bodyAr:
    'وتُمنح هذه الشهادة تقديرًا لإتمام الدورة بنجاح والجهود المبذولة في تطوير المعارف والمهارات والالتزام بالتعلّم والتنمية الشخصية.',
  bodyEn:
    'This certificate is awarded in recognition of the successful completion of the course and the demonstration of commitment to learning and personal development.',
  completionAr: 'قد أتم/ت بنجاح',
};
export interface ApprovedCertificateDesignInput {
  titleAr?: string;
  accentColor?: string | null;
  secondaryColor?: string | null;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  recipient: string;
  achievement: string;
  achievementAr?: string;
  achievementEn?: string;
  serial: string;
  issuedAt: string;
  verificationUrl: string;
  issuerName?: string;
  signatoryNameAr?: string | null;
  signatoryNameEn?: string | null;
  logoUrl: string;
  signatureUrl?: string;
  sealUrl?: string;
  /** Embedded fonts make the exported SVG portable without outlining editable text. */
  arabicFontUrl?: string;
  latinFontUrl?: string;
  arabicBoldFontUrl?: string;
  latinBoldFontUrl?: string;
  measure?: (text: string, size: number, arabic: boolean, bold?: boolean) => number;
}
const escape = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

/** The editable SVG and production PDF consume this same vector scene. No recipient bitmap. */
export function renderApprovedCertificateSvg(input: ApprovedCertificateDesignInput): string {
  const navy =
      input.accentColor && /^#[0-9a-f]{6}$/i.test(input.accentColor)
        ? input.accentColor
        : '#142B5F',
    teal = '#08758B',
    gold =
      input.secondaryColor && /^#[0-9a-f]{6}$/i.test(input.secondaryColor)
        ? input.secondaryColor
        : '#D6A43B';
  const measure = input.measure ?? ((text, size) => Array.from(text).length * size * 0.6);
  const text = (
    id: string,
    value: string,
    cx: number,
    y: number,
    width: number,
    size: number,
    arabic = false,
    color = navy,
    maxLines = 1,
  ) => {
    const bold = /^(title|recipient|achievement)-/.test(id);
    if (value.length > 4000) throw new Error('CERTIFICATE_TEXT_OVERFLOW');
    let rows: string[] = [];
    for (; size >= 7; size -= 0.5) {
      rows = [];
      let line = '';
      for (const word of value.trim().split(/\s+/u)) {
        if (measure(word, size, arabic, bold) > width) {
          rows = [];
          line = '';
          break;
        }
        const next = line ? `${line} ${word}` : word;
        if (measure(next, size, arabic, bold) > width) {
          rows.push(line);
          line = word;
        } else line = next;
      }
      if (line) rows.push(line);
      if (rows.length && rows.length <= maxLines) break;
    }
    if (size < 7 || !rows.length) throw new Error('CERTIFICATE_TEXT_OVERFLOW');
    return `<g id="${id}">${rows.map((row, index) => `<text x="${cx}" y="${y + index * size * 1.8}" font-family="${arabic ? 'CertificateArabic, Noto Sans Arabic, sans-serif' : 'CertificateLatin, DejaVu Serif, serif'}" font-weight="${bold ? 'bold' : 'normal'}" font-size="${size}" text-anchor="middle" direction="${arabic ? 'rtl' : 'ltr'}" fill="${color}">${escape(row)}</text>`).join('')}</g>`;
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = gold) =>
    `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="0.8"/>`;
  const diamond = (x: number, y: number) =>
    `<path d="M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z" fill="${gold}"/>`;
  const laurel = (side: number) =>
    `<g transform="translate(${421 + side * 124} 76) scale(${side} 1)" fill="${gold}"><path d="M0 58Q-30 36-8 0" fill="none" stroke="${gold}" stroke-width="0.9"/>${Array.from(
      { length: 7 },
      (_, i) => {
        const y = 5 + i * 7;
        const x = -9 - 8 * Math.sin((i / 6) * Math.PI);
        return `<path d="M${x} ${y}q-10 -5-7 -12q9 2 7 12Z M${x} ${y + 2}q9 -3 12 -10q-10 0-12 10Z"/>`;
      },
    ).join('')}</g>`;
  const qr = createQrMatrix(input.verificationUrl),
    unit = 55 / (qr.length + 8);
  const qrSvg = `<g id="verification-qr" transform="translate(55 457)"><rect x="-3" y="-3" width="61" height="61" fill="white" stroke="${gold}"/><rect width="55" height="55" fill="white"/>${qr.flatMap((row, y) => row.map((dark, x) => (dark ? `<rect x="${(x + 4) * unit}" y="${(y + 4) * unit}" width="${unit}" height="${unit}" fill="black"/>` : ''))).join('')}</g>`;
  // Clip the official brand bitmap to its icon + two wordmarks only. No recreation of emblem.
  const logo = `<g id="official-logo"><svg x="586" y="51" width="77" height="88" viewBox="130 200 600 620" overflow="hidden"><image href="${escape(input.logoUrl)}" width="1536" height="1024"/></svg><svg x="667" y="76" width="103" height="45" viewBox="735 345 715 280" overflow="hidden"><image href="${escape(input.logoUrl)}" width="1536" height="1024"/></svg></g>`;
  const arName = /[\u0600-\u06ff]/u.test(input.recipient);
  const achievementAr = input.achievementAr || input.achievement;
  const achievementEn = input.achievementEn || input.achievement;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="842" height="595" viewBox="0 0 842 595" role="img" aria-label="${escape(input.serial || 'معاينة شهادة إتمام')}" data-design-id="${APPROVED_CERTIFICATE_DESIGN}">
  <defs><style>${input.arabicFontUrl ? `@font-face{font-family:CertificateArabic;src:url('${escape(input.arabicFontUrl)}')}` : ''}${input.latinFontUrl ? `@font-face{font-family:CertificateLatin;src:url('${escape(input.latinFontUrl)}')}` : ''}${input.arabicBoldFontUrl ? `@font-face{font-family:CertificateArabic;font-weight:700;src:url('${escape(input.arabicBoldFontUrl)}')}` : ''}${input.latinBoldFontUrl ? `@font-face{font-family:CertificateLatin;font-weight:700;src:url('${escape(input.latinBoldFontUrl)}')}` : ''}text{font-kerning:normal}</style></defs>
  <rect width="842" height="595" fill="white"/>
  <g id="border"><rect x="10" y="10" width="822" height="575" fill="none" stroke="${gold}" stroke-width="2"/><rect x="17" y="17" width="808" height="561" fill="none" stroke="${navy}" stroke-width="1"/></g>
  <g id="corner-ribbons"><path d="M10 10H197L10 143Z" fill="${navy}"/><path d="M10 87L144 10H197L10 143Z" fill="${teal}"/><path d="M10 126L175 10H190L10 140Z" fill="${gold}"/><path d="M10 67L81 10H99L10 84Z" fill="${gold}"/><path d="M832 585H710L832 499Z" fill="${navy}"/><path d="M832 533L747 585H710L832 499Z" fill="${teal}"/><path d="M832 511L728 585H740L832 522Z" fill="${gold}"/><path d="M768 23H821V68Z" fill="${navy}"/><path d="M22 525V575H77Z" fill="${navy}"/></g>
  <g id="lighthouse-watermark" opacity="0.075" fill="${teal}"><path d="M717 143L779 107L824 143Z"/><path d="M732 147H808V195H732ZM747 200H793L822 429L771 456L716 427Z"/><path d="M721 188Q769 166 818 188V212Q769 190 721 212Z"/><path d="M746 233L718 422L771 444L790 418Z" fill="white"/></g>
  <g id="side-waves" opacity="0.08"><path d="M22 185Q144 241 153 355Q84 262 22 259Z" fill="${gold}"/><path d="M22 291Q113 304 131 402Q67 345 22 354Z" fill="${teal}"/></g>
  ${logo}${laurel(-1)}${laurel(1)}
  ${text('title-ar', input.titleAr || approvedCertificateCopy.titleAr, 421, 111, 225, 30, true)}
  ${line(332, 133, 402, 133)}${line(440, 133, 510, 133)}<path d="M407 130L421 123L435 130L421 137Z M412 135V141Q421 146 430 141V135" fill="${gold}"/>
  ${text('title-en', input.titleEn || approvedCertificateCopy.titleEn, 421, 163, 280, 24)}
  ${text('intro-en', `${input.issuerName || 'MANARATAK'} certifies that`, 250, 210, 325, 17)}
  ${text('intro-ar', `تشهد ${input.issuerName && input.issuerName !== 'MANARATAK' ? input.issuerName : 'منصة منارتك'} بأن`, 602, 210, 315, 18, true)}
  ${text('recipient-en', input.recipient, 250, 246, 325, 20, arName)}
  ${text('recipient-ar', input.recipient, 602, 246, 325, 20, arName)}
  ${line(120, 272, 406, 272)}${line(436, 272, 724, 272)}${diamond(421, 272)}
  ${text('completion-en', 'has successfully completed the', 250, 302, 325, 16)}
  ${text('completion-ar', approvedCertificateCopy.completionAr, 602, 302, 325, 18, true)}
  ${text('achievement-en', achievementEn, 250, 338, 320, 25, /[\u0600-\u06ff]/u.test(achievementEn), teal)}
  ${text('achievement-ar', achievementAr, 602, 338, 320, 25, /[\u0600-\u06ff]/u.test(achievementAr), teal)}
  ${line(421, 350, 421, 450)}${diamond(421, 400)}
  ${text('body-en', input.bodyEn || approvedCertificateCopy.bodyEn, 250, 376, 310, 15, false, navy, 4)}
  ${text('body-ar', input.bodyAr || approvedCertificateCopy.bodyAr, 602, 376, 310, 16, true, navy, 3)}
  ${qrSvg}${text('qr-label-ar', 'تحقق من الشهادة', 82, 533, 105, 8, true)}${text('qr-label-en', 'Verify Certificate', 82, 546, 105, 8)}
  ${line(158, 485, 158, 553)}${line(575, 485, 575, 553)}
  ${text('serial-label-ar', 'رقم الشهادة', 251, 491, 160, 10, true)}${text('serial-label-en', 'Certificate No.', 251, 506, 160, 11)}
  ${text('serial-value', input.serial, 251, 529, 170, 10)}${line(195, 533, 309, 533, navy)}
  ${text('date-label-ar', 'تاريخ الإصدار', 481, 491, 145, 10, true)}${text('date-label-en', 'Issue Date', 481, 506, 145, 11)}
  ${text('date-value', input.issuedAt, 481, 529, 145, 11)}${line(425, 533, 537, 533, navy)}
  ${input.signatureUrl ? `<image id="signature" href="${escape(input.signatureUrl)}" x="613" y="469" width="119" height="47" preserveAspectRatio="xMidYMid meet"/>` : ''}
  ${input.sealUrl ? `<image id="seal" href="${escape(input.sealUrl)}" x="745" y="473" width="35" height="35"/>` : ''}
  ${line(612, 519, 749, 519, navy)}
  ${text('signatory-ar', input.signatoryNameAr || 'إدارة منصة منارتك', 681, 538, 170, 9, true)}
  ${text('signatory-en', input.signatoryNameEn || 'MANARATAK Management', 681, 552, 170, 9)}
  <g id="book-footer" fill="white" stroke="${gold}" stroke-width="1.5"><rect x="397" y="564" width="48" height="27" stroke="none"/><path d="M421 581Q408 570 401 574L399 582Q410 580 421 586Q432 580 443 582L441 574Q434 570 421 581ZM421 581Q414 567 407 567L410 578M421 581Q428 567 435 567L432 578"/></g>
  </svg>`;
}
