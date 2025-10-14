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
  
  // White checkmark with glow, blur, and animation
  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center ml-1 relative',
        sizeClasses[size],
        className
      )}
      title={`Verified ${role}`}
    >
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 bg-white rounded-full blur-sm opacity-60 animate-pulse',
        sizeClasses[size]
      )} />
      
      {/* Main checkmark with glow */}
      <div className={cn(
        'relative bg-white rounded-full shadow-lg shadow-white/50',
        sizeClasses[size]
      )}>
        <Check className={cn(
          'text-white drop-shadow-lg',
          iconSizes[size]
        )} />
      </div>
      
      {/* Additional glow layers for enhanced effect */}
      <div className={cn(
        'absolute inset-0 bg-white rounded-full blur-md opacity-30 animate-ping',
        sizeClasses[size]
      )} />
    </div>
  );
};
