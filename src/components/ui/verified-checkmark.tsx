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
  // Remove checkmark completely - return null for all roles
  return null;
};
