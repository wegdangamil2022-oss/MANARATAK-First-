import { Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createQrMatrix } from '@manaratak/shared';

export interface CertificateTemplatePreviewModel {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  accentColor?: string | null;
  secondaryColor?: string | null;
  layout?: 'LANDSCAPE' | 'PORTRAIT' | string;
  templateVersion?: string | null;
  signatoryNameAr?: string | null;
  signatoryTitleAr?: string | null;
  issuerName?: string | null;
}

export interface CertificatePreviewModel {
  recipientDisplayName?: string | null;
  achievementDisplayName?: string | null;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  serialNumber?: string | null;
  verificationCode?: string | null;
  verificationUrl?: string | null;
  issuerName?: string | null;
  issuedAt?: string | Date | null;
}

type CertificateTheme = {
  accentText: string;
  accentBorder: string;
  accentBg: string;
  accentBorderSoft: string;
  goldText: string;
  goldBorder: string;
  goldBorderSoft: string;
  goldBg: string;
};

const ACCENT_THEMES: Record<string, Pick<CertificateTheme, 'accentText' | 'accentBorder' | 'accentBg' | 'accentBorderSoft'>> = {
  '#142B5F': { accentText: 'text-[#142B5F]', accentBorder: 'border-[#142B5F]', accentBg: 'bg-[#142B5F]', accentBorderSoft: 'border-[#142B5F]/15' },
  '#0E7C86': { accentText: 'text-[#0E7C86]', accentBorder: 'border-[#0E7C86]', accentBg: 'bg-[#0E7C86]', accentBorderSoft: 'border-[#0E7C86]/15' },
  '#21A7B4': { accentText: 'text-[#21A7B4]', accentBorder: 'border-[#21A7B4]', accentBg: 'bg-[#21A7B4]', accentBorderSoft: 'border-[#21A7B4]/15' },
  '#075E45': { accentText: 'text-[#075E45]', accentBorder: 'border-[#075E45]', accentBg: 'bg-[#075E45]', accentBorderSoft: 'border-[#075E45]/15' },
};

const GOLD_THEMES: Record<string, Pick<CertificateTheme, 'goldText' | 'goldBorder' | 'goldBorderSoft' | 'goldBg'>> = {
  '#D6A43B': { goldText: 'text-[#D6A43B]', goldBorder: 'border-[#D6A43B]', goldBorderSoft: 'border-[#D6A43B]/40', goldBg: 'bg-[#D6A43B]' },
  '#F2CD78': { goldText: 'text-[#F2CD78]', goldBorder: 'border-[#F2CD78]', goldBorderSoft: 'border-[#F2CD78]/40', goldBg: 'bg-[#F2CD78]' },
  '#C9A227': { goldText: 'text-[#C9A227]', goldBorder: 'border-[#C9A227]', goldBorderSoft: 'border-[#C9A227]/40', goldBg: 'bg-[#C9A227]' },
};

function certificateTheme(template: CertificateTemplatePreviewModel): CertificateTheme {
  const accent = ACCENT_THEMES[String(template.accentColor || '#142B5F').toUpperCase()] || ACCENT_THEMES['#142B5F'];
  const gold = GOLD_THEMES[String(template.secondaryColor || '#D6A43B').toUpperCase()] || GOLD_THEMES['#D6A43B'];
  return { ...accent, ...gold };
}

export function CertificatePreview({
  template,
  certificate,
  compact = false,
}: {
  template: CertificateTemplatePreviewModel;
  certificate?: CertificatePreviewModel;
  compact?: boolean;
}) {
  const theme = certificateTheme(template);
  const recipient = certificate?.recipientDisplayName || 'اسم المتعلم الكامل';
  const achievement = certificate?.achievementDisplayName || certificate?.courseDisplayName || certificate?.learningPathDisplayName || 'اسم الدورة أو المسار التعليمي';
  const serial = certificate?.serialNumber || 'MNR-CRS-2026-PREVIEW';
  const code = certificate?.verificationCode || 'MNR-PREVIEW-VERIFY';
  const verificationUrl = certificate?.verificationUrl || `https://app.manaratak.org/certificates/verify?code=${encodeURIComponent(code)}`;
  const issuedAt = certificate?.issuedAt ? new Date(certificate.issuedAt) : new Date();

  return (
    <article
      dir="rtl"
      className={`relative overflow-hidden border-8 bg-[#fffdf7] font-sans text-right shadow-xl ${theme.accentBorder} ${template.layout === 'PORTRAIT' ? 'aspect-[0.707]' : 'aspect-[1.414]'} ${compact ? 'rounded-xl p-5' : 'rounded-2xl p-7 sm:p-10'}`}
    >
      <div className={`pointer-events-none absolute inset-2 border ${theme.goldBorderSoft}`} />
      <div className={`pointer-events-none absolute inset-4 border ${theme.accentBorderSoft}`} />
      <div className={`pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full opacity-[0.07] ${theme.accentBg}`} />
      <div className={`pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full opacity-[0.09] ${theme.goldBg}`} />

      <div className="relative flex h-full flex-col justify-between text-center">
        <header className={`flex items-start justify-between gap-4 border-b pb-3 ${theme.goldBorderSoft}`}>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Award className={`h-6 w-6 ${theme.goldText}`} />
              <strong className={`text-lg ${theme.accentText}`}>مـنـارتـك</strong>
            </div>
            <p className="text-[9px] font-bold tracking-[0.28em] text-slate-500">MANARATAK</p>
          </div>
          <div className={`rounded-full border-2 p-2.5 ${theme.goldBorder} ${theme.accentText}`}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="text-left text-[9px] text-slate-500" dir="ltr">
            <p>Certificate No.</p>
            <strong className={`font-mono ${theme.accentText}`}>{serial}</strong>
          </div>
        </header>

        <section className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
          <p className={`text-[9px] font-black tracking-[0.28em] ${theme.goldText}`}>
            شهادة إتمام رقمية قابلة للتحقق
          </p>
          <h1 className={`${compact ? 'text-xl' : 'text-3xl sm:text-4xl'} font-black ${theme.accentText}`}>
            {template.titleAr || 'شهادة إتمام'}
          </h1>
          <p className="text-[9px] font-black tracking-[0.2em] text-slate-500" dir="ltr">
            {template.titleEn || 'CERTIFICATE OF COMPLETION'}
          </p>
          <p className="text-[11px] text-slate-600">تُمنح إلى</p>
          <h2 className={`${compact ? 'text-lg' : 'text-2xl sm:text-3xl'} mx-auto w-fit border-b-2 px-7 pb-1 font-black ${theme.accentText} ${theme.goldBorder}`}>
            {recipient}
          </h2>
          <p className="mx-auto max-w-2xl text-[10px] leading-5 text-slate-600">
            {template.bodyAr || 'تشهد منصة منارتك بأن المتعلم قد أتم بنجاح متطلبات هذه الدورة واستحق شهادة الإتمام الرقمية القابلة للتحقق.'}
          </p>
          <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-black text-slate-900`}>{achievement}</h3>
          {!compact ? (
            <p className="mx-auto max-w-xl text-[9px] leading-4 text-slate-500" dir="ltr">
              {template.bodyEn || 'MANARATAK confirms successful completion of the course requirements and issuance of this digitally verifiable certificate of completion.'}
            </p>
          ) : null}
        </section>

        <footer className={`grid grid-cols-3 items-end gap-3 border-t pt-3 text-[8px] ${theme.goldBorderSoft}`}>
          <div>
            <div className={`mx-auto mb-1 w-24 border-b pb-1 font-bold ${theme.accentBorder}`}>
              {template.signatoryNameAr || 'إدارة الشهادات — منارتك'}
            </div>
            <span className="text-slate-500">{template.signatoryTitleAr || 'توقيع الإصدار الرقمي'}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`relative grid h-16 w-16 place-items-center bg-white p-1 ring-1 ring-slate-200 ${theme.accentText}`}>
              <QrCode value={verificationUrl} />
              <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-emerald-600" />
            </div>
            <span className="mt-1 max-w-[140px] truncate font-mono text-[7px]" dir="ltr">{code}</span>
            <span className="text-slate-400">امسح للتحقق</span>
          </div>
          <div>
            <strong className={theme.accentText}>{certificate?.issuerName || template.issuerName || 'MANARATAK'}</strong>
            <p className="text-slate-500">تاريخ الإصدار: {issuedAt.toLocaleDateString('ar')}</p>
            <p className="font-mono text-slate-400" dir="ltr">Template v{template.templateVersion || '1.0.0'}</p>
          </div>
        </footer>
      </div>
    </article>
  );
}

function QrCode({ value }: { value: string }) {
  const matrix = createQrMatrix(value);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full bg-white" shapeRendering="crispEdges" aria-label="رمز QR للتحقق">
      <rect width={size} height={size} fill="white" />
      <g fill="currentColor">
        {matrix.flatMap((row, y) => row.map((dark, x) => dark ? <rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width="1" height="1" /> : null))}
      </g>
    </svg>
  );
}
