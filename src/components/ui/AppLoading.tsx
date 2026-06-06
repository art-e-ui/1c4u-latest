import React from 'react';
import { cn } from '@/lib/utils';

interface AppLoadingProps {
  className?: string;
  text?: string;
}

export const AppLoading: React.FC<AppLoadingProps> = ({ 
  className, 
  text = "Loading your products..." 
}) => {
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-background",
      className
    )}>
      {/* Cart track area */}
      <div className="w-full relative h-[140px]">
        <div className="cart-container absolute bottom-0 left-0">
          <div className="cart-body relative w-[120px] h-[120px] flex items-end justify-center">
            {/* Using the provided LogocartforU.svg */}
            <img src="/LogocartforU.svg" alt="Loading Cart" className="w-[100px] h-auto object-contain" />
          </div>
        </div>
        {/* Ground line */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
      </div>

      {/* Loading text */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xl font-bold tracking-wide text-[#00AAFF] font-sans">
          {text}
        </p>
        <div className="flex gap-1.5">
          <span className="dot w-2 h-2 rounded-full bg-[#ff5500]"></span>
          <span className="dot w-2 h-2 rounded-full bg-[#ff5500]"></span>
          <span className="dot w-2 h-2 rounded-full bg-[#ff5500]"></span>
        </div>
      </div>
    </div>
  );
};
