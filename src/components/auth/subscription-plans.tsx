import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Star, Zap, Crown, Shield, X, CreditCard, Lock, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SubscriptionPlansProps {
  onSubscriptionSuccess?: (plan: string) => void;
  onLogout?: () => void;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  limitations?: string[];
  buttonText: string;
  gradient: string;
  popular: boolean;
  billingCycle: 'monthly' | 'yearly';
  originalPrice?: number;
  discount?: number;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscriptionSuccess, onLogout }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentSubscription, setCurrentSubscription] = useState<string>('free');

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const plans: Plan[] = [
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
      popular: false,
      billingCycle: 'monthly'
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
        'Advanced filtering options',
        'Real-time updates',
        'Priority customer support',
        'Custom alerts and notifications',
        'Export data functionality'
      ],
      buttonText: 'Upgrade to Pro',
      gradient: 'bg-gradient-primary',
      popular: true,
      billingCycle: 'monthly',
      originalPrice: 39.99,
      discount: 25
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 49.99,
      description: 'Everything in Pro plus exclusive features',
      icon: Crown,
      features: [
        'Everything in Pro',
        'Exclusive premium predictions',
        'Advanced AI-powered insights',
        'Custom prediction models',
        'White-label options',
        'API access',
        'Dedicated account manager',
        '24/7 priority support',
        'Advanced analytics dashboard',
        'Custom reporting tools'
      ],
      buttonText: 'Upgrade to Premium',
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
      popular: false,
      billingCycle: 'monthly',
      originalPrice: 69.99,
      discount: 29
    }
  ];

  // Load user data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Get current subscription from user metadata
        setCurrentSubscription(user.user_metadata?.subscription || 'free');
      }
    };
    getUser();
  }, []);

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      toast({
        title: "Already on Free Plan",
        description: "You're currently using the free plan.",
      });
      return;
    }
    setSelectedPlan(planId);
    setShowPaymentForm(true);
  };

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
  };

  const handleClose = () => {
    if (showPaymentForm) {
      setShowPaymentForm(false);
      setSelectedPlan('');
    } else {
      setShowExitConfirmation(true);
    }
  };

  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    navigate('/');
  };

  const getPlanPrice = (plan: Plan | undefined) => {
    if (!plan) return 0;
    if (plan.id === 'free') return 0;
    if (billingCycle === 'yearly') {
      return Math.round(plan.price * 12 * 0.8); // 20% discount for yearly
    }
    return plan.price;
  };

  const getBillingText = (plan: Plan | undefined) => {
    if (!plan || plan.id === 'free') return '';
    return billingCycle === 'yearly' ? '/year' : '/month';
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      
      {/* Close Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-10 w-10 rounded-full hover:bg-muted/50 transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-5xl font-display font-bold text-foreground mb-3 animate-fade-in">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Unlock the full power of Statpedia with our premium plans.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="bg-muted/50 rounded-lg p-1 flex">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
              className="px-4 text-sm"
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('yearly')}
              className="px-4 text-sm"
            >
              Yearly
              <Badge variant="secondary" className="ml-1 text-xs">Save 20%</Badge>
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer animate-fade-in h-full",
                plan.popular && "ring-2 ring-primary shadow-glow",
                currentSubscription === plan.id && "ring-2 ring-green-500 bg-green-500/5",
                "bg-gradient-card border-border/50"
              )}
              style={{ animationDelay: `${300 + index * 100}ms` }}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {currentSubscription === plan.id && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-4 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-3">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3", plan.gradient)}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{plan.description}</CardDescription>
                
                <div className="mt-3">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold text-foreground">${getPlanPrice(plan)}</span>
                    <span className="text-muted-foreground ml-1 text-sm">{getBillingText(plan)}</span>
                  </div>
                  {plan.originalPrice && billingCycle === 'monthly' && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground line-through">${plan.originalPrice}</span>
                      <Badge variant="secondary" className="text-xs">
                        {plan.discount}% OFF
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="space-y-2 flex-1">
                  {plan.features.slice(0, 6).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 6 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{plan.features.length - 6} more features
                    </div>
                  )}
                </div>

                {plan.limitations && (
                  <div className="space-y-1 pt-2 border-t">
                    <h4 className="text-xs font-medium text-muted-foreground">Limitations:</h4>
                    {plan.limitations.slice(0, 2).map((limitation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  className={cn(
                    "w-full mt-4",
                    plan.id === 'free' ? "bg-muted text-muted-foreground cursor-not-allowed" : plan.gradient,
                    currentSubscription === plan.id && "bg-green-500 hover:bg-green-600"
                  )}
                  disabled={plan.id === 'free' || currentSubscription === plan.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.id);
                  }}
                >
                  {currentSubscription === plan.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};