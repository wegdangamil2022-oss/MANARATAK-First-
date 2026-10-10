import { useEffect, useState } from 'react';
import {
  renderApprovedCertificateSvg,
  type ApprovedCertificateDesignInput,
} from '@manaratak/shared';

let assetsPromise:
  | Promise<{
      logoUrl: string;
      arabicFontUrl: string;
      latinFontUrl: string;
      arabicBoldFontUrl: string;
      latinBoldFontUrl: string;
    }>
  | undefined;
const dataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تحميل أصول القالب');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('تعذر تحميل أصول القالب'));
    reader.readAsDataURL(blob);
  });
};
type Assets = {
  logoUrl: string;
  arabicFontUrl: string;
  latinFontUrl: string;
  arabicBoldFontUrl: string;
  latinBoldFontUrl: string;
};
function loadAssets(): Promise<Assets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      dataUrl(`${import.meta.env.BASE_URL}brand/manaratak-logo-official.png`),
      dataUrl(`${import.meta.env.BASE_URL}fonts/certificate-arabic.ttf`),
      dataUrl(`${import.meta.env.BASE_URL}fonts/certificate-latin.ttf`),
      dataUrl(`${import.meta.env.BASE_URL}fonts/certificate-arabic-bold.ttf`),
      dataUrl(`${import.meta.env.BASE_URL}fonts/certificate-latin-bold.ttf`),
    ])
      .then(async ([logoUrl, arabicFontUrl, latinFontUrl, arabicBoldFontUrl, latinBoldFontUrl]) => {
        const font = await new FontFace('CertificateArabic', `url(${arabicFontUrl})`).load();
        document.fonts.add(font);
        document.fonts.add(await new FontFace('CertificateLatin', `url(${latinFontUrl})`).load());
        document.fonts.add(
          await new FontFace('CertificateArabic', `url(${arabicBoldFontUrl})`, {
            weight: '700',
          }).load(),
        );
        document.fonts.add(
          await new FontFace('CertificateLatin', `url(${latinBoldFontUrl})`, {
            weight: '700',
          }).load(),
        );
        return { logoUrl, arabicFontUrl, latinFontUrl, arabicBoldFontUrl, latinBoldFontUrl };
      })
      .catch((error) => {
        assetsPromise = undefined;
        throw error;
      });
  }
  return assetsPromise;
}

export function ApprovedCertificatePreview({
  input,
}: {
  input: Omit<ApprovedCertificateDesignInput, 'logoUrl'>;
}) {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void loadAssets()
      .then((value) => {
        if (active) setAssets(value);
      })
      .catch(() => {
        if (active) setError('تعذر تحميل معاينة الشهادة. حدّث الصفحة.');
      });
    return () => {
      active = false;
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!assets) return <p role="status">جارٍ تجهيز معاينة الشهادة…</p>;
  const context = document.createElement('canvas').getContext('2d');
  let svg: string;
  try {
    svg = renderApprovedCertificateSvg({
      ...input,
      ...assets,
      measure: (value, size, arabic, bold) => {
        if (!context) return value.length * size * 0.6;
        context.font = `${bold ? 'bold ' : ''}${size}px ${arabic ? 'CertificateArabic' : 'CertificateLatin'}`;
        return context.measureText(value).width;
      },
    });
  } catch {
    return <p role="alert">النص أطول من مساحة القالب. اختصر النص أو العنوان قبل الحفظ.</p>;
  }
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div className="space-y-2">
      <img
        src={url}
        alt="معاينة قالب منارتك المعتمد"
        className="w-full border"
        width={842}
        height={595}
      />
      <a href={url} download="manaratak-certificate-editable.svg" className="text-xs underline">
        تنزيل القالب القابل للتعديل SVG
      </a>
    </div>
  );
}
