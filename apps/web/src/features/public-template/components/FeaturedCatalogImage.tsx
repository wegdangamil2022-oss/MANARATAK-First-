import { useState } from 'react';

/** Missing/broken owner imagery uses an icon, never an unrelated institution or stock photo. */
export function FeaturedCatalogImage({ src, alt, kind }: { src: string; alt: string; kind: 'universities' | 'courses' }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (src && src !== failedSource) {
    return <img src={src} alt={alt} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />;
  }
  return <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[var(--mn-surface-muted)]"><img src={`/preview-art/${kind}.svg`} alt="" className="h-full w-full object-cover" loading="lazy" /></span>;
}
