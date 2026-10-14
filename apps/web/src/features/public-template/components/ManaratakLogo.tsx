import React from 'react';
import { useTranslation } from '../../../i18n/I18nProvider';

interface ManaratakLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official MANARATAK logo asset.
 * Do not redraw, recolor, crop, stretch, or replace with an inline SVG.
 */
export const ManaratakLogo: React.FC<ManaratakLogoProps> = ({ className = '', size = 48 }) => {
  const { t } = useTranslation();
  return (
    <img
      src="/brand/manaratak-logo.png"
      width={size}
      height={size}
      alt={t('public_brand_logo')}
      draggable={false}
      className={`block shrink-0 select-none rounded-full object-contain ${className}`}
    />
  );
};
