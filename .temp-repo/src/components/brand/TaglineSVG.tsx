import { FC } from 'react';

interface TaglineSVGProps {
  className?: string;
}

/**
 * Tagline SVG — "Everything You Need!" in Kaushan Script.
 * Wide viewBox ensures full text is always visible without clipping.
 */
const TaglineSVG: FC<TaglineSVGProps> = ({ className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 200"
      preserveAspectRatio="xMinYMid meet"
      className={className}
      aria-label="Everything You Need!"
      role="img"
    >
      <style>
        {`@import url("https://fonts.googleapis.com/css2?family=Kaushan+Script&display=swap");
          .tagline-text {
            font-family: "Kaushan Script", cursive;
            font-size: 150px;
            fill: hsl(var(--brand-green));
          }`}
      </style>
      <text
        x="0"
        y="145"
        textAnchor="start"
        className="tagline-text"
      >
        Everything You Need!
      </text>
    </svg>
  );
};

export default TaglineSVG;
