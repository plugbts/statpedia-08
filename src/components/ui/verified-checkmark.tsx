import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedCheckmarkProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerifiedCheckmark: React.FC<VerifiedCheckmarkProps> = ({ 
  role, 
  size = 'md',
  className 
}) => {
  if (!['mod', 'admin', 'owner'].includes(role)) return null;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  const iconSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };
  
  // Just a white checkmark with glow and animation (no circle)
  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center ml-1 relative',
        className
      )}
      title={`Verified ${role}`}
    >
      {/* Glow effect behind checkmark */}
      <div className="absolute inset-0 blur-sm opacity-60 animate-pulse">
        <Check className={cn('text-white', iconSizes[size])} />
      </div>
      
      {/* Main checkmark with glow */}
      <Check className={cn(
        'relative text-white drop-shadow-lg shadow-lg shadow-white/50',
        iconSizes[size]
      )} />
      
      {/* Additional glow layer */}
      <div className="absolute inset-0 blur-md opacity-30 animate-ping">
        <Check className={cn('text-white', iconSizes[size])} />
      </div>
    </div>
  );
};
