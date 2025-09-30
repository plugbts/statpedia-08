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
  
  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center bg-blue-500 rounded-full ml-1',
        sizeClasses[size],
        className
      )}
      title={`Verified ${role}`}
    >
      <Check className={cn('text-white', iconSizes[size])} />
    </div>
  );
};
