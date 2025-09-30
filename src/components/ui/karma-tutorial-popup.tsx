import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Minus, 
  TrendingUp, 
  Users, 
  Target,
  X,
  Sparkles,
  Zap,
  Trophy,
  Heart
} from 'lucide-react';

interface KarmaTutorialPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export const KarmaTutorialPopup: React.FC<KarmaTutorialPopupProps> = ({
  isVisible,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = [
    {
      title: "Welcome to Karma! 🌟",
      content: "Karma is your reputation score that grows as you participate in the community.",
      icon: <Sparkles className="w-8 h-8 text-yellow-500" />,
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Earn Karma from Predictions",
      content: "Make accurate predictions on player props to earn karma points!",
      icon: <Target className="w-8 h-8 text-blue-500" />,
      color: "from-blue-400 to-purple-500",
      details: [
        { text: "Correct Prediction", karma: "+2", color: "text-green-600" },
        { text: "Incorrect Prediction", karma: "-1", color: "text-red-600" }
      ]
    },
    {
      title: "Boost with Confidence",
      content: "Higher confidence in your predictions = more karma rewards!",
      icon: <Zap className="w-8 h-8 text-purple-500" />,
      color: "from-purple-400 to-pink-500",
      details: [
        { text: "Low Confidence (1)", karma: "0.6x", color: "text-orange-600" },
        { text: "High Confidence (5)", karma: "1.0x", color: "text-green-600" }
      ]
    },
    {
      title: "Join Popular Discussions",
      content: "Participate in trending predictions for bonus karma!",
      icon: <Users className="w-8 h-8 text-green-500" />,
      color: "from-green-400 to-teal-500",
      details: [
        { text: "100+ votes", karma: "+1 bonus", color: "text-green-600" },
        { text: "Under 50 votes", karma: "-1 penalty", color: "text-red-600" }
      ]
    },
    {
      title: "Build Your Reputation",
      content: "Higher karma = more respect in the community and special perks!",
      icon: <Trophy className="w-8 h-8 text-yellow-500" />,
      color: "from-yellow-400 to-red-500",
      details: [
        { text: "Community Recognition", karma: "🌟", color: "text-yellow-600" },
        { text: "Special Badges", karma: "🏆", color: "text-purple-600" },
        { text: "Leaderboard Status", karma: "📈", color: "text-blue-600" }
      ]
    }
  ];

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative">
        {/* 3D Bubble Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl scale-110 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-yellow-500/20 rounded-3xl blur-lg scale-105 animate-pulse delay-300" />
        
        {/* Main Card */}
        <Card className={`relative bg-gradient-to-br ${currentStepData.color} border-0 shadow-2xl transform transition-all duration-500 ${
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-between items-start">
              <div className="w-8" /> {/* Spacer */}
              <CardTitle className="text-white text-xl font-bold text-center">
                {currentStepData.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-white hover:bg-white/20 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            {/* Icon Animation */}
            <div className="flex justify-center">
              <div className={`p-4 bg-white/20 rounded-full backdrop-blur-sm transform transition-all duration-500 ${
                isAnimating ? 'scale-75 rotate-12' : 'scale-100 rotate-0'
              }`}>
                {currentStepData.icon}
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <p className="text-white/90 text-lg leading-relaxed">
                {currentStepData.content}
              </p>

              {/* Details */}
              {currentStepData.details && (
                <div className="space-y-2">
                  {currentStepData.details.map((detail, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm transform transition-all duration-300 ${
                        isAnimating ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'
                      }`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <span className="text-white/90 font-medium">{detail.text}</span>
                      <Badge 
                        variant="secondary" 
                        className={`bg-white/20 text-white border-0 ${
                          detail.karma.includes('+') ? 'text-green-200' : 
                          detail.karma.includes('-') ? 'text-red-200' : 
                          'text-white'
                        }`}
                      >
                        {detail.karma}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-white scale-125' 
                      : 'bg-white/40 scale-100'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </Button>

              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Heart className="w-4 h-4" />
                <span>{currentStep + 1} of {steps.length}</span>
              </div>

              <Button
                onClick={handleNext}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Floating Elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce" />
        <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-full animate-bounce delay-300" />
        <div className="absolute top-1/2 -right-8 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
      </div>
    </div>
  );
};
