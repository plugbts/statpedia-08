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
    sm: 'w-5 h-5',  // Made bigger
    md: 'w-6 h-6',  // Made bigger
    lg: 'w-7 h-7'   // Made bigger
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',  // Made bigger
    md: 'w-4 h-4',  // Made bigger
    lg: 'w-5 h-5'   // Made bigger
  };
  
  // White checkmark with white stroke circle, glow, and animation
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
      
      {/* White stroke circle around checkmark */}
      <div className={cn(
        'absolute inset-0 border-2 border-white rounded-full',
        sizeClasses[size]
      )} />
      
      {/* Main checkmark with glow */}
      <Check className={cn(
        'relative text-white drop-shadow-lg shadow-lg shadow-white/50 z-10',
        iconSizes[size]
      )} />
      
      {/* Additional glow layer */}
      <div className="absolute inset-0 blur-md opacity-30 animate-ping">
        <Check className={cn('text-white', iconSizes[size])} />
      </div>
    </div>
  );
};
