import { FC } from 'react';

interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
};

const LogoWordmark: FC<LogoWordmarkProps> = ({ size = 'md', className = '' }) => {
  return (
    <h1
      className={`font-poppins font-bold tracking-tight ${sizeMap[size]} ${className}`}
      style={{ lineHeight: 1.1 }}
    >
      <span className="text-brand-gold">Global</span>
      <span className="text-brand-green">Cart</span>
    </h1>
  );
};

export default LogoWordmark;