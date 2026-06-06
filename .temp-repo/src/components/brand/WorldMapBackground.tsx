import { FC } from 'react';

interface WorldMapBackgroundProps {
  opacity?: number;
  className?: string;
}

const WorldMapBackground: FC<WorldMapBackgroundProps> = ({ opacity = 0.15, className = '' }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
    >
      <img
        src="/brand/world-map.png"
        alt=""
        className="absolute"
        style={{
          opacity,
          width: '140%',
          height: '140%',
          top: '50%',
          right: 0,
          transform: 'translateY(-55%)',
        }}
        draggable={false}
      />
    </div>
  );
};

export default WorldMapBackground;