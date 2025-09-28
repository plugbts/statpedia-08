import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, Star, Zap, Crown } from 'lucide-react';
import { PaymentGateway } from '../payment/payment-gateway';

interface SubscriptionPlansProps {
  onSubscriptionSuccess: (plan: string) => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscriptionSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

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
      buttonText: 'Upgrade to Pro',
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
      buttonText: 'Go Premium',
      gradient: 'bg-gradient-success',
      popular: false
    }
  ];

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      onSubscriptionSuccess('free');
      return;
    }
    
    setSelectedPlan(planId);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (method: string, amount: number) => {
    setShowPayment(false);
    onSubscriptionSuccess(selectedPlan!);
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-muted-foreground">
          Unlock the full power of Statpedia with detailed player prop analysis
        </p>
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
                  {plan.id === 'free' ? (
                    <Button 
                      onClick={() => handlePlanSelect(plan.id)}
                      variant="outline" 
                      className="w-full"
                      disabled
                    >
                      {plan.buttonText}
                    </Button>
                  ) : (
                    <Dialog open={showPayment && selectedPlan === plan.id} onOpenChange={setShowPayment}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => handlePlanSelect(plan.id)}
                          className={`w-full ${plan.gradient} hover:shadow-glow transition-all duration-300`}
                        >
                          {plan.buttonText}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Subscribe to {selectedPlanData?.name}</DialogTitle>
                          <DialogDescription>
                            Complete your payment to unlock all features
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedPlanData && (
                          <PaymentGateway
                            amount={selectedPlanData.price}
                            plan={selectedPlanData.name}
                            onPaymentSuccess={handlePaymentSuccess}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
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
  );
};