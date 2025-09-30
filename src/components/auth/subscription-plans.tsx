import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle, Star, Zap, Crown, Shield, X } from 'lucide-react';

interface SubscriptionPlansProps {
  onSubscriptionSuccess: (plan: string) => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscriptionSuccess }) => {
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      description: 'Limited access to get you started',
      icon: Star,
      features: [
        'View total predictions count',
        'See overall win rate',
        'Access to wins summary',
        'Only 2 predictions visible',
        'Max 65% prediction accuracy shown',
        'All detailed analysis blurred'
      ],
      limitations: [
        'No access to player prop details',
        'No deep analysis features',
        'Limited prediction visibility'
      ],
      buttonText: 'Current Plan',
      gradient: 'bg-gradient-accent',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29.99,
      description: 'Full access to all predictions and analysis',
      icon: Zap,
      features: [
        'All predictions visible',
        'Complete player prop analysis',
        'Deep statistical insights',
        'Potential assists/rebounds data',
        'Advanced metrics dashboard',
        'Real-time odds tracking',
        'Historical performance data',
        'Custom filters and search'
      ],
      buttonText: 'Select Plan',
      gradient: 'bg-gradient-primary',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 49.99,
      description: 'Professional-grade analytics for serious bettors',
      icon: Crown,
      features: [
        'Everything in Pro',
        'Priority customer support',
        'Advanced AI predictions',
        'Custom betting strategies',
        'Portfolio tracking',
        'Risk management tools',
        'Multi-sport coverage',
        'API access',
        'White-label options'
      ],
      buttonText: 'Select Plan',
      gradient: 'bg-gradient-success',
      popular: false
    }
  ];

  const handlePlanSelect = (planId: string) => {
    // For demo purposes - in production, integrate with Square payment gateway
    onSubscriptionSuccess(planId);
  };

  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    onSubscriptionSuccess('free');
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
  };

  return (
    <>
      <div className="space-y-8 relative">
        {/* Exit button */}
        <button
          onClick={handleExitClick}
          className="absolute -top-4 left-4 z-10 p-2 rounded-full bg-background border border-border hover:bg-accent transition-colors"
          aria-label="Skip subscription"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-muted-foreground">
            Unlock the full power of Statpedia with detailed player prop analysis
          </p>
          <Alert className="max-w-2xl mx-auto border-warning bg-warning/10">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Payment processing is not yet configured. For production use, please integrate a secure payment processor like Stripe.
            </AlertDescription>
          </Alert>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative bg-gradient-card border-border/50 transition-all duration-300 hover:shadow-card-hover ${
                plan.popular ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${plan.gradient} mb-4 mx-auto`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="py-4">
                  <div className="text-4xl font-bold text-foreground">
                    ${plan.price}
                    {plan.price > 0 && <span className="text-lg text-muted-foreground">/month</span>}
                  </div>
                  {plan.price === 0 && (
                    <div className="text-sm text-muted-foreground">Forever</div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {plan.limitations && (
                  <div className="pt-2 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Limitations:</div>
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-4 w-4 shrink-0 rounded-full bg-destructive/20 flex items-center justify-center">
                          <div className="h-1 w-1 bg-destructive rounded-full"></div>
                        </div>
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={plan.id === 'free' ? 'outline' : 'default'}
                    className={plan.id === 'free' ? 'w-full' : `w-full ${plan.gradient} hover:shadow-glow transition-all duration-300`}
                    disabled={plan.id === 'free'}
                  >
                    {plan.buttonText}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to continue with the Free plan. You'll have limited access to predictions and analysis features. You can upgrade to a paid plan anytime from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExit}>
              No, show me plans
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-gradient-primary">
              Yes, continue with Free
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};