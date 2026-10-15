import { useState } from 'react';
import { BookOpen, Landmark } from 'lucide-react';

/** Missing/broken owner imagery uses an icon, never an unrelated institution or stock photo. */
export function FeaturedCatalogImage({ src, alt, kind }: { src: string; alt: string; kind: 'universities' | 'courses' }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (src && src !== failedSource) {
    return <img src={src} alt={alt} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />;
  }
  const Icon = kind === 'universities' ? Landmark : BookOpen;
  return <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-[var(--mn-text-muted)] bg-[var(--mn-surface-muted)]"><Icon className="h-5 w-5" /></span>;
}
