import { FC } from 'react';

type LogoVariant = 'header' | 'footer' | 'default';

const variantSizes: Record<LogoVariant, number> = {
  header: 40,
  footer: 60,
  default: 80,
};

interface LogoIconProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}

const LogoIcon: FC<LogoIconProps> = ({ size, variant = 'default', className = '' }) => {
  const resolvedSize = size ?? variantSizes[variant];

  return (
    <svg
      width={resolvedSize}
      height={resolvedSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cart handle bar */}
      <line x1="5" y1="28" x2="22" y2="28" stroke="hsl(var(--brand-gold))" strokeWidth="5" strokeLinecap="round" />
      {/* Handle to basket connector */}
      <line x1="22" y1="28" x2="32" y2="48" stroke="hsl(var(--brand-gold))" strokeWidth="5" strokeLinecap="round" />
      {/* Cart basket */}
      <path
        d="M28 48 L98 48 Q100 48 99 52 L89 82 Q88 85 85 85 L39 85 Q36 85 35 82 L27 52 Q26 48 28 48 Z"
        stroke="hsl(var(--brand-gold))" strokeWidth="4.5" strokeLinejoin="round" fill="none"
      />
      {/* Wheel connectors */}
      <line x1="42" y1="85" x2="46" y2="93" stroke="hsl(var(--brand-gold))" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="82" y1="85" x2="78" y2="93" stroke="hsl(var(--brand-gold))" strokeWidth="3.5" strokeLinecap="round" />
      {/* Wheels */}
      <circle cx="46" cy="100" r="8" stroke="hsl(var(--brand-gold))" strokeWidth="4" fill="none" />
      <circle cx="78" cy="100" r="8" stroke="hsl(var(--brand-gold))" strokeWidth="4" fill="none" />

      {/* Shopping bags */}
      <rect x="45" y="64" width="14" height="17" rx="2" fill="hsl(var(--brand-green))" />
      <path d="M48 64 Q48 58 52 58 Q56 58 56 64" stroke="hsl(var(--brand-green))" strokeWidth="2" fill="none" />
      <rect x="57" y="68" width="11" height="13" rx="1.5" fill="hsl(var(--brand-gold))" />
      <path d="M59.5 68 Q59.5 63.5 62.5 63.5 Q65.5 63.5 65.5 68" stroke="hsl(var(--brand-gold))" strokeWidth="1.5" fill="none" />

      {/* Globe */}
      <g transform="translate(64.5, 60) scale(1.3)">
        <defs>
          <radialGradient id="globe-grad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="hsl(var(--brand-green))" stopOpacity="0.5" />
            <stop offset="60%" stopColor="hsl(var(--brand-green))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--brand-green))" stopOpacity="1" />
          </radialGradient>
        </defs>
        <circle cx="9" cy="9" r="8" fill="url(#globe-grad)" />
        <path d="M5,6 L8,5 L10,6 L9,7 L8,8 L6,8 Z" fill="hsl(var(--brand-gold))" />
        <path d="M8,9 L9,10 L8,12 L7,13 L6,12 L6,10 Z" fill="hsl(var(--brand-gold))" />
        <path d="M12,7 L13,8 L13,10 L12,11 L11,10 L11,8 Z" fill="hsl(var(--brand-gold))" />
      </g>

      {/* GC text */}
      <text x="62" y="56" textAnchor="middle" dominantBaseline="auto" fill="hsl(var(--brand-gold))" fontFamily="'Poppins', sans-serif" fontWeight="800" fontSize="62" transform="rotate(-30, 62, 56)">G</text>
      <text x="97" y="56" textAnchor="middle" dominantBaseline="auto" fill="hsl(var(--brand-green))" fontFamily="'Poppins', sans-serif" fontWeight="800" fontSize="62" transform="rotate(-30, 97, 56)">C</text>
    </svg>
  );
};

export default LogoIcon;