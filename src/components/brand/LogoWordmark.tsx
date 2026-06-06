import { FC } from 'react';
import TaglineSVG from './TaglineSVG';

interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'light';
  showTagline?: boolean;
  className?: string;
  align?: 'start' | 'center';
}

const heightMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
  '2xl': 'h-16',
  '3xl': 'h-24',
};

const textMap = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
  '3xl': 'text-6xl',
};

const gapMap = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
  xl: 'gap-3',
  '2xl': 'gap-4',
  '3xl': 'gap-6',
};

const taglineWidthMap = {
  sm: 'w-[75px]',
  md: 'w-[95px]',
  lg: 'w-[120px]',
  xl: 'w-[150px]',
  '2xl': 'w-[220px]',
  '3xl': 'w-[330px]',
};

const LogoWordmark: FC<LogoWordmarkProps> = ({ size = 'md', variant = 'default', showTagline = false, className = '', align = 'start' }) => {
  const alignmentClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const taglineMargin = size === 'sm' || size === 'md' ? 'mt-0' : 'mt-0.5';

  return (
    <div className={`flex flex-col ${alignmentClass} ${className} transition-all duration-300 relative`}>
      <div className={`flex items-start ${gapMap[size]}`}>
        <img 
          src="/LogocartforU.svg" 
          alt="1-CartForU Logo"
          className={`object-contain flex-shrink-0 ${heightMap[size]} hover:scale-105 transition-transform duration-300 mt-0.5`}
        />
        <div className="flex flex-col items-start">
          <div className={`font-black tracking-tight ${textMap[size]} leading-none flex items-baseline`}>
            <span className={variant === 'light' ? 'text-white' : 'text-[#00AAFF]'}>1-Cart</span>
            <span className={variant === 'light' ? 'text-white' : 'text-[#ff5500]'}>ForU</span>
          </div>
          {showTagline && align === 'start' && (
            <div className={`${taglineMargin} overflow-visible`}>
              <TaglineSVG 
                variant={variant} 
                align="start"
                className={`block ${taglineWidthMap[size]} h-auto animate-in fade-in duration-700`} 
              />
            </div>
          )}
        </div>
      </div>
      {showTagline && align === 'center' && (
        <div className={`${taglineMargin} overflow-visible w-full flex justify-center`}>
          <TaglineSVG 
            variant={variant} 
            align="center"
            className={`block ${taglineWidthMap[size]} h-auto animate-in fade-in duration-700`} 
          />
        </div>
      )}
    </div>
  );
};

export default LogoWordmark;