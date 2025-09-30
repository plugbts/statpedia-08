import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Star, Zap, Crown, Shield, X, CreditCard, Lock, Gift, Percent, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlansProps {
  onSubscriptionSuccess: (plan: string) => void;
  onLogout?: () => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscriptionSuccess, onLogout }) => {
  const navigate = useNavigate();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoType, setPromoType] = useState<'percentage' | 'free_trial' | null>(null);
  const [showPromoTab, setShowPromoTab] = useState(false);

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

  // Check user's free trial status
  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Check if user has used free trial
        const { data: trialData } = await supabase
          .from('user_trials')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setHasUsedFreeTrial(!!trialData);
      }
    };
    
    checkUserStatus();
  }, []);

  // Validate promo code
  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoDiscount(0);
      setPromoType(null);
      return;
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setPromoDiscount(0);
      setPromoType(null);
      return;
    }

    // Check if promo code has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setPromoDiscount(0);
      setPromoType(null);
      return;
    }

    setPromoDiscount(data.discount_value);
    setPromoType(data.discount_type);
  };

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
      id: 'free_trial',
      name: '3-Day Free Trial',
      price: 0,
      originalPrice: 19.99,
      description: 'Try Pro features for 3 days, then $19.99/month',
      icon: Calendar,
      features: [
        'All Pro features for 3 days',
        'Unlimited predictions',
        'Complete player prop analysis',
        'Deep statistical insights',
        'Advanced metrics dashboard',
        'Real-time odds tracking',
        'Cancel anytime during trial'
      ],
      buttonText: hasUsedFreeTrial ? 'Trial Already Used' : 'Start Free Trial',
      gradient: 'bg-gradient-primary',
      popular: true,
      requiresCard: true,
      disabled: hasUsedFreeTrial
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
    if (planId === 'free') {
      // Free plan - no payment needed
      onSubscriptionSuccess(planId);
    } else if (planId === 'free_trial') {
      // Free trial - requires card but no payment
      setSelectedPlan(planId);
      setShowPaymentForm(true);
    } else {
      // Paid plan - show payment form
      setSelectedPlan(planId);
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !user) return;

    setIsProcessing(true);
    
    try {
      // Handle free trial
      if (selectedPlan === 'free_trial') {
        // Record free trial usage
        const { error: trialError } = await supabase
          .from('user_trials')
          .insert({
            user_id: user.id,
            plan_id: 'pro',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
            status: 'active'
          });

        if (trialError) throw trialError;

        // Record promo code usage if applicable
        if (promoCode && promoType) {
          const { error: promoError } = await supabase
            .from('promo_code_usage')
            .insert({
              user_id: user.id,
              promo_code: promoCode.toUpperCase(),
              used_at: new Date().toISOString(),
              discount_type: promoType,
              discount_value: promoDiscount
            });

          if (promoError) console.error('Promo code tracking error:', promoError);
        }

        onSubscriptionSuccess('free_trial');
        setShowPaymentForm(false);
        setSelectedPlan('');
        navigate('/');
        return;
      }

      // Handle regular subscription with promo code
      let finalPrice = plans.find(p => p.id === selectedPlan)?.price || 0;
      
      if (promoType === 'percentage' && promoDiscount > 0) {
        finalPrice = finalPrice * (1 - promoDiscount / 100);
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Record promo code usage if applicable
      if (promoCode && promoType) {
        const { error: promoError } = await supabase
          .from('promo_code_usage')
          .insert({
            user_id: user.id,
            promo_code: promoCode.toUpperCase(),
            used_at: new Date().toISOString(),
            discount_type: promoType,
            discount_value: promoDiscount
          });

        if (promoError) console.error('Promo code tracking error:', promoError);
      }

      // Success - call the subscription success callback
      onSubscriptionSuccess(selectedPlan);
      setShowPaymentForm(false);
      setSelectedPlan('');
      
      // Navigate back to dashboard after successful payment
      navigate('/');
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    onSubscriptionSuccess('free');
    // Navigate back to dashboard after selecting free plan
    navigate('/');
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <>
      <div className="min-h-screen bg-background overflow-y-auto">
        <div className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 relative">
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

        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Unlock the full power of Statpedia with detailed player prop analysis
          </p>
          <Alert className="max-w-4xl mx-auto border-warning bg-warning/10">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Payment processing is not yet configured. For production use, please integrate a secure payment processor like Stripe.
            </AlertDescription>
          </Alert>
        </div>

        {/* Promo Code Section */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-4 w-4 text-primary" />
                Promo Code
              </CardTitle>
              <CardDescription className="text-sm">
                Have a promo code? Enter it below to get discounts or free trials.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    validatePromoCode(e.target.value);
                  }}
                  className="flex-1"
                  size="sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => validatePromoCode(promoCode)}
                  disabled={!promoCode.trim()}
                >
                  Apply
                </Button>
              </div>
              {promoDiscount > 0 && promoType && (
                <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">
                      {promoType === 'percentage' 
                        ? `${promoDiscount}% discount applied!`
                        : 'Free trial unlocked!'
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${plan.gradient} mb-3 mx-auto`}>
                  <IconComponent className="h-5 w-5 text-white" />
                </div>
                
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                
                <div className="py-3">
                  <div className="text-3xl font-bold text-foreground">
                    ${plan.price}
                    {plan.price > 0 && <span className="text-base text-muted-foreground">/month</span>}
                  </div>
                  {plan.price === 0 && (
                    <div className="text-sm text-muted-foreground">Forever</div>
                  )}
                  {(plan as any).originalPrice && (
                    <div className="text-sm text-muted-foreground line-through">
                      ${(plan as any).originalPrice}/month after trial
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  {plan.features.slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="text-xs text-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 6 && (
                    <div className="text-xs text-muted-foreground">
                      +{plan.features.length - 6} more features
                    </div>
                  )}
                </div>

                {plan.limitations && (
                  <div className="pt-1 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Limitations:</div>
                    {plan.limitations.slice(0, 3).map((limitation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-3 w-3 shrink-0 rounded-full bg-destructive/20 flex items-center justify-center">
                          <div className="h-0.5 w-0.5 bg-destructive rounded-full"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3">
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={plan.id === 'free' ? 'outline' : 'default'}
                    size="sm"
                    className={plan.id === 'free' ? 'w-full' : `w-full ${plan.gradient} hover:shadow-glow transition-all duration-300`}
                    disabled={plan.id === 'free' || (plan as any).disabled}
                  >
                    {plan.buttonText}
                  </Button>
                  {(plan as any).requiresCard && (
                    <p className="text-xs text-muted-foreground mt-1.5 text-center">
                      Card required (no charge)
                    </p>
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
      </div>

      {/* Payment Form Modal */}
      <AlertDialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Complete Your Subscription
              </AlertDialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPaymentForm(false)}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              {selectedPlan === 'free_trial' 
                ? `You're starting a 3-day free trial of the Pro plan. No charge during trial.`
                : `You're upgrading to the ${selectedPlanData?.name} plan for $${selectedPlanData?.price}/month.`
              }
              {promoDiscount > 0 && promoType === 'percentage' && (
                <span className="block mt-2 text-success">
                  {promoDiscount}% discount applied! Final price: ${((selectedPlanData?.price || 0) * (1 - promoDiscount / 100)).toFixed(2)}
                </span>
              )}
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
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="AL">Alabama</SelectItem>
                      <SelectItem value="AK">Alaska</SelectItem>
                      <SelectItem value="AZ">Arizona</SelectItem>
                      <SelectItem value="AR">Arkansas</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="CO">Colorado</SelectItem>
                      <SelectItem value="CT">Connecticut</SelectItem>
                      <SelectItem value="DE">Delaware</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="GA">Georgia</SelectItem>
                      <SelectItem value="HI">Hawaii</SelectItem>
                      <SelectItem value="ID">Idaho</SelectItem>
                      <SelectItem value="IL">Illinois</SelectItem>
                      <SelectItem value="IN">Indiana</SelectItem>
                      <SelectItem value="IA">Iowa</SelectItem>
                      <SelectItem value="KS">Kansas</SelectItem>
                      <SelectItem value="KY">Kentucky</SelectItem>
                      <SelectItem value="LA">Louisiana</SelectItem>
                      <SelectItem value="ME">Maine</SelectItem>
                      <SelectItem value="MD">Maryland</SelectItem>
                      <SelectItem value="MA">Massachusetts</SelectItem>
                      <SelectItem value="MI">Michigan</SelectItem>
                      <SelectItem value="MN">Minnesota</SelectItem>
                      <SelectItem value="MS">Mississippi</SelectItem>
                      <SelectItem value="MO">Missouri</SelectItem>
                      <SelectItem value="MT">Montana</SelectItem>
                      <SelectItem value="NE">Nebraska</SelectItem>
                      <SelectItem value="NV">Nevada</SelectItem>
                      <SelectItem value="NH">New Hampshire</SelectItem>
                      <SelectItem value="NJ">New Jersey</SelectItem>
                      <SelectItem value="NM">New Mexico</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                      <SelectItem value="NC">North Carolina</SelectItem>
                      <SelectItem value="ND">North Dakota</SelectItem>
                      <SelectItem value="OH">Ohio</SelectItem>
                      <SelectItem value="OK">Oklahoma</SelectItem>
                      <SelectItem value="OR">Oregon</SelectItem>
                      <SelectItem value="PA">Pennsylvania</SelectItem>
                      <SelectItem value="RI">Rhode Island</SelectItem>
                      <SelectItem value="SC">South Carolina</SelectItem>
                      <SelectItem value="SD">South Dakota</SelectItem>
                      <SelectItem value="TN">Tennessee</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="UT">Utah</SelectItem>
                      <SelectItem value="VT">Vermont</SelectItem>
                      <SelectItem value="VA">Virginia</SelectItem>
                      <SelectItem value="WA">Washington</SelectItem>
                      <SelectItem value="WV">West Virginia</SelectItem>
                      <SelectItem value="WI">Wisconsin</SelectItem>
                      <SelectItem value="WY">Wyoming</SelectItem>
                      <SelectItem value="DC">District of Columbia</SelectItem>
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
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
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