import { FC } from 'react';
import LogoWordmark from './LogoWordmark';
import TaglineSVG from './TaglineSVG';

interface LogoFullProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'light';
  className?: string;
  align?: 'start' | 'center';
}

const wordmarkSizeMap = { sm: 'md' as const, md: 'lg' as const, lg: 'xl' as const };

const LogoFull: FC<LogoFullProps> = ({ size = 'md', variant = 'default', className = '', align = 'start' }) => {
  return (
    <LogoWordmark 
      size={wordmarkSizeMap[size]} 
      variant={variant} 
      showTagline={true}
      className={className}
      align={align}
    />
  );
};

export default LogoFull;
