import { FC } from 'react';
import LogoIcon from './LogoIcon';
import LogoWordmark from './LogoWordmark';
import WorldMapBackground from './WorldMapBackground';

interface LogoFullProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconSizeMap = { sm: 48, md: 80, lg: 120 };
const wordmarkSizeMap = { sm: 'sm' as const, md: 'md' as const, lg: 'lg' as const };

const LogoFull: FC<LogoFullProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`relative flex flex-col items-center gap-1 overflow-hidden ${className}`}>
      <WorldMapBackground opacity={0.12} />
      <LogoIcon size={iconSizeMap[size]} className="relative z-10" />
      <LogoWordmark size={wordmarkSizeMap[size]} className="relative z-10" />
    </div>
  );
};

export default LogoFull;
