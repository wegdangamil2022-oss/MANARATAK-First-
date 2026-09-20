import React from 'react';

interface ManaratakLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official MANARATAK logo asset.
 * Do not redraw, recolor, crop, stretch, or replace with an inline SVG.
 */
export const ManaratakLogo: React.FC<ManaratakLogoProps> = ({ className = '', size = 48 }) => {
  return (
    <img
      src="/brand/manaratak-logo.png"
      width={size}
      height={size}
      alt="منارتك للفرص التعليمية — MANARATAK"
      draggable={false}
      className={`block shrink-0 select-none rounded-full object-contain ${className}`}
    />
  );
};
