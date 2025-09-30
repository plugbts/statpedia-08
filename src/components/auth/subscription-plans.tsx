import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle, Star, Zap, Crown, Shield, X } from 'lucide-react';

interface SubscriptionPlansProps {
  onSubscriptionSuccess: (plan: string) => void;
  onLogout?: () => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscriptionSuccess, onLogout }) => {
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

<<<<<<< HEAD
  const handleExitClick = () => {
    setShowExitConfirmation(true);
=======
  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !user) return;

    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user subscription in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          subscription: selectedPlan,
          subscriptionDate: new Date().toISOString(),
          billingCycle: billingCycle
        }
      });

      if (error) throw error;

      // Update local state
      setCurrentSubscription(selectedPlan);
      setShowPaymentForm(false);
      setSelectedPlan('');

      toast({
        title: "Subscription Successful!",
        description: `Welcome to ${plans.find(p => p.id === selectedPlan)?.name} plan!`,
        variant: "success",
      });

      if (onSubscriptionSuccess) {
        onSubscriptionSuccess(selectedPlan);
      }

      // Navigate back to dashboard after successful subscription
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
>>>>>>> 1c196b4a00ba70be76100c3512f7f38f82aea63a
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
        {/* Exit and Logout buttons */}
        <div className="absolute -top-4 left-4 z-10 flex gap-2">
          <button
            onClick={handleExitClick}
            className="p-2 rounded-full bg-background border border-border hover:bg-accent transition-colors"
            aria-label="Skip subscription"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              Logout
            </Button>
          )}
        </div>

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
<<<<<<< HEAD
          );
        })}
=======
          ))}
        </div>

        {/* Payment Form Modal */}
        <AlertDialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Complete Your Subscription
              </AlertDialogTitle>
              <AlertDialogDescription>
                You're upgrading to the {selectedPlanData?.name} plan for ${getPlanPrice(selectedPlanData)} {getBillingText(selectedPlanData)}.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-6 py-4">
              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Payment Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Cardholder Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={paymentData.name}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Billing Address</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={paymentData.email}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St"
                      value={paymentData.address}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={paymentData.city}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select value={paymentData.state} onValueChange={(value) => setPaymentData(prev => ({ ...prev, state: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="10001"
                      value={paymentData.zipCode}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <Alert className="bg-green-500/10 text-green-600 border-green-500">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                </AlertDescription>
              </Alert>
            </div>

            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel onClick={() => setShowPaymentForm(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePaymentSubmit}
                disabled={isProcessing}
                className="bg-gradient-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Complete Payment
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exit Confirmation */}
        <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Subscription Plans?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave? You can always come back to upgrade your plan later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay Here</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>
                Exit Plans
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
>>>>>>> 1c196b4a00ba70be76100c3512f7f38f82aea63a
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