import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Crown, Star, Zap, TrendingUp, Lock, Sparkles } from 'lucide-react';

interface SubscriptionGatePopupProps {
  isVisible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  featureName: string;
  featureDescription: string;
}

export const SubscriptionGatePopup: React.FC<SubscriptionGatePopupProps> = ({
  isVisible,
  onClose,
  onSubscribe,
  featureName,
  featureDescription
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-start justify-center z-50 pt-16 sm:pt-20 px-4">
      <div className="relative">
        {/* 3D Effect Container */}
        <div className="relative transform perspective-1000">
          {/* Main Card with 3D effect */}
          <Card className="w-full max-w-lg transform rotate-y-2 shadow-2xl border-2 border-primary/30 bg-gradient-to-br from-background via-muted/20 to-background backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-orange-500/30 rounded-full blur-xl"></div>
                  <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-4">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Pro Feature Locked
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Unlock premium features with Statpedia Pro
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Feature Info */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-orange-500" />
                  <h3 className="text-xl font-semibold">{featureName}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {featureDescription}
                </p>
              </div>

              {/* Pro Benefits */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-center">With Statpedia Pro, you get:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                    <Star className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Advanced Analytics & Insights</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Premium Predictions & Models</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Real-time Data & Updates</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10">
                    <Crown className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Exclusive Features & Tools</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={onSubscribe}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Subscribe to Pro
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="px-4"
                >
                  Maybe Later
                </Button>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-40 animate-pulse delay-1000"></div>
            </CardContent>
          </Card>

          {/* Floating sparkles */}
          <div className="absolute -top-6 -left-6 w-3 h-3 bg-yellow-400 rounded-full opacity-70 animate-bounce"></div>
          <div className="absolute -top-4 -right-8 w-2 h-2 bg-orange-400 rounded-full opacity-60 animate-bounce delay-500"></div>
          <div className="absolute -bottom-4 -left-3 w-2 h-2 bg-purple-400 rounded-full opacity-50 animate-bounce delay-1000"></div>
          <div className="absolute -bottom-2 -right-4 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40 animate-bounce delay-1500"></div>
        </div>
      </div>
    </div>
  );
};
