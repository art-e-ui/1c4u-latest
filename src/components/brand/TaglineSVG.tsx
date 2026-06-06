import { FC } from 'react';

interface TaglineSVGProps {
  className?: string;
  variant?: 'default' | 'light';
  align?: 'start' | 'center';
}

/**
 * Tagline SVG — "Grab your dreams" in Kaushan Script.
 * Wide viewBox ensures full text is always visible without clipping.
 */
const TaglineSVG: FC<TaglineSVGProps> = ({ className = '', variant = 'default', align = 'start' }) => {
  const fillColor = variant === 'light' ? '#FFFFFF' : '#00AAFF';
  const isCentered = align === 'center';
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 280"
      preserveAspectRatio="xMinYMid meet"
      className={className}
      style={{ overflow: 'visible' }}
      aria-label="Grab your dreams"
      role="img"
    >
      <text
        x={isCentered ? "600" : "0"}
        y="220"
        textAnchor={isCentered ? "middle" : "start"}
        fill={fillColor}
        style={{ fontFamily: '"SweetGetaway", "Caveat", cursive', fontSize: '160px', fontWeight: '400' }}
      >
        Grab your dreams
      </text>
    </svg>
  );
};

export default TaglineSVG;
