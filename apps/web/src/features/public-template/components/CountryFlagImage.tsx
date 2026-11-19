import React, { useState } from 'react';
import { Globe2 } from 'lucide-react';
export const CountryFlagImage: React.FC<{
  countryId: string;
  countryName: string;
  flagEmoji?: string;
  flagUrl?: string;
  iso2Code?: string;
}> = ({ countryId, countryName, flagEmoji, flagUrl, iso2Code }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const key = `${countryId} ${countryName} ${iso2Code || ''}`.toLowerCase();

  if (key.includes('china') || key.includes('الصين') || iso2Code?.toUpperCase() === 'CN') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#DE2910" />
        <polygon points="16,14 18.5,21.5 12,16.8 20,16.8 13.5,21.5" fill="#FFDE00" />
        <polygon points="26,10 27,13 24.5,11.2 27.5,11.2 25,13" fill="#FFDE00" />
        <polygon points="29,16 30,19 27.5,17.2 30.5,17.2 28,19" fill="#FFDE00" />
        <polygon points="29,23 30,26 27.5,24.2 30.5,24.2 28,26" fill="#FFDE00" />
        <polygon points="25,28 26,31 23.5,29.2 26.5,29.2 24,31" fill="#FFDE00" />
      </svg>
    );
  }

  if (key.includes('turkey') || key.includes('تركيا') || iso2Code?.toUpperCase() === 'TR') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#E30A17" />
        <circle cx="28" cy="32" r="14" fill="#FFFFFF" />
        <circle cx="31" cy="32" r="11" fill="#E30A17" />
        <polygon
          points="40,32 42.5,33.5 41.5,30.5 44,28.5 41,28.5 40,25.5 39,28.5 36,28.5 38.5,30.5 37.5,33.5"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (key.includes('malaysia') || key.includes('ماليزيا') || iso2Code?.toUpperCase() === 'MY') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipMy">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipMy)">
          <rect x="0" y="0" width="64" height="64" fill="#FFFFFF" />
          <rect x="0" y="0" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="9" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="18" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="27" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="36" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="45" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="54" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="0" width="34" height="34" fill="#000066" />
          <circle cx="15" cy="17" r="10" fill="#FFCC00" />
          <circle cx="18" cy="17" r="8" fill="#000066" />
          <polygon
            points="25,17 26.5,19 24.5,20.5 27,20.5 28,23 29,20.5 31.5,20.5 29.5,19 31,17 28.5,18 28,15.5 27.5,18"
            fill="#FFCC00"
          />
        </g>
      </svg>
    );
  }

  if (key.includes('germany') || key.includes('ألمانيا') || iso2Code?.toUpperCase() === 'DE') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipDe">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipDe)">
          <rect x="0" y="0" width="64" height="21.3" fill="#000000" />
          <rect x="0" y="21.3" width="64" height="21.3" fill="#DD0000" />
          <rect x="0" y="42.6" width="64" height="21.4" fill="#FFCE00" />
        </g>
      </svg>
    );
  }

  if (
    key.includes('uk') ||
    key.includes('united kingdom') ||
    key.includes('المملكة المتحدة') ||
    key.includes('بريطانيا') ||
    iso2Code?.toUpperCase() === 'GB'
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipUk">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipUk)">
          <rect width="64" height="64" fill="#012169" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#FFFFFF" strokeWidth="8" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#C8102E" strokeWidth="4" />
          <path d="M32,0 V64 M0,32 H64" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M32,0 V64 M0,32 H64" stroke="#C8102E" strokeWidth="7" />
        </g>
      </svg>
    );
  }

  if (key.includes('saudi') || key.includes('السعودية') || iso2Code?.toUpperCase() === 'SA') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#006C35" />
        <path d="M16,30 Q32,24 48,30" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <rect x="18" y="38" width="28" height="3" fill="#FFFFFF" />
        <polygon points="18,39.5 22,36 22,43" fill="#FFFFFF" />
      </svg>
    );
  }

  if (key.includes('france') || key.includes('فرنسا') || iso2Code?.toUpperCase() === 'FR') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipFr">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipFr)">
          <rect x="0" y="0" width="21.34" height="64" fill="#002395" />
          <rect x="21.33" y="0" width="21.34" height="64" fill="#FFFFFF" />
          <rect x="42.66" y="0" width="21.34" height="64" fill="#ED2939" />
        </g>
      </svg>
    );
  }

  if (key.includes('japan') || key.includes('اليابان') || iso2Code?.toUpperCase() === 'JP') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#FFFFFF" />
        <circle cx="32" cy="32" r="14" fill="#BC002D" />
      </svg>
    );
  }

  if (
    key.includes('usa') ||
    key.includes('united states') ||
    key.includes('الولايات المتحدة') ||
    key.includes('أمريكا') ||
    iso2Code?.toUpperCase() === 'US'
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipUs">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipUs)">
          <rect width="64" height="64" fill="#FFFFFF" />
          <rect y="0" width="64" height="5" fill="#B22234" />
          <rect y="10" width="64" height="5" fill="#B22234" />
          <rect y="20" width="64" height="5" fill="#B22234" />
          <rect y="30" width="64" height="5" fill="#B22234" />
          <rect y="40" width="64" height="5" fill="#B22234" />
          <rect y="50" width="64" height="5" fill="#B22234" />
          <rect y="59" width="64" height="5" fill="#B22234" />
          <rect width="30" height="35" fill="#3C3B6E" />
          <circle cx="10" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="20" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="15" cy="17" r="2" fill="#FFFFFF" />
          <circle cx="10" cy="24" r="2" fill="#FFFFFF" />
          <circle cx="20" cy="24" r="2" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  if (key.includes('canada') || key.includes('كندا') || iso2Code?.toUpperCase() === 'CA') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipCa">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipCa)">
          <rect x="0" y="0" width="16" height="64" fill="#FF0000" />
          <rect x="16" y="0" width="32" height="64" fill="#FFFFFF" />
          <rect x="48" y="0" width="16" height="64" fill="#FF0000" />
          <polygon points="32,16 35,24 42,23 37,29 41,35 33,35 33,44 31,44 31,35 23,35 27,29 22,23 29,24" fill="#FF0000" />
        </g>
      </svg>
    );
  }

  if (key.includes('russia') || key.includes('روسيا') || iso2Code?.toUpperCase() === 'RU') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipRu">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipRu)">
          <rect x="0" y="0" width="64" height="21.3" fill="#FFFFFF" />
          <rect x="0" y="21.3" width="64" height="21.3" fill="#0039A6" />
          <rect x="0" y="42.6" width="64" height="21.4" fill="#D52B1E" />
        </g>
      </svg>
    );
  }

  if (flagUrl && /^(https?:\/\/|\/)/i.test(flagUrl) && !imgFailed) {
    return (
      <img
        src={flagUrl}
        alt={countryName}
        className="w-full h-full object-cover rounded-full"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span className="text-xl sm:text-2xl leading-none">{flagEmoji || '🌍'}</span>;
};
