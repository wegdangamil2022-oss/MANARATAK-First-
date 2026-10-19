import React from 'react';
interface AbsheerLogoProps { className?: string; size?: number; }
/** Compatibility export: neutral stand-in, until ABSHEER supplies approved brand assets. */
export const AbsheerLogo: React.FC<AbsheerLogoProps> = ({ className = '', size = 48 }) => (
  <span aria-label="رمز مؤقت" role="img"
    style={{ width: size, height: size, lineHeight: '1' }}
    className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-slate-200 font-black text-slate-700 ${className}`}>
    A
  </span>
);
