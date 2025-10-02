import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SportsbookIcon, SportsbookNames } from './sportsbook-icons';

interface SportsbookOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sportsbooks: string[];
  propInfo?: {
    playerName: string;
    propType: string;
    line: number;
  };
}

export const SportsbookOverlay: React.FC<SportsbookOverlayProps> = ({
  isOpen,
  onClose,
  sportsbooks,
  propInfo
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 shadow-2xl">
        <DialogHeader className="relative pb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 rounded-t-lg" />
          <div className="relative z-10 flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-white">
              Available Sportsbooks
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {propInfo && (
            <div className="relative z-10 text-sm text-slate-300 mt-2">
              <div className="font-medium">{propInfo.playerName}</div>
              <div className="text-slate-400">{propInfo.propType} {propInfo.line}</div>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-slate-400 mb-4">
            This prop is available on the following sportsbooks:
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {sportsbooks.map((book, index) => {
              const displayName = SportsbookNames[book as keyof typeof SportsbookNames] || 
                                book.charAt(0).toUpperCase() + book.slice(1);
              
              return (
                <div
                  key={book}
                  className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
                >
                  <SportsbookIcon sportsbookKey={book} />
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{displayName}</div>
                    <div className="text-xs text-slate-400">Live odds available</div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live" />
                </div>
              );
            })}
          </div>

          {sportsbooks.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-sm">No sportsbooks available for this prop</div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-500 text-center">
              Odds and availability may vary by location and time
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
