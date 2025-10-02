import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield, AlertTriangle, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGatewayProps {
  onPaymentSuccess: (method: string, amount: number) => void;
  amount: number;
  plan: string;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({ 
  onPaymentSuccess, 
  amount, 
  plan 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: ''
  });

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
  };

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value.replace(/\D/g, ''));
      if (formattedValue.replace(/\s/g, '').length > 16) return;
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
      if (formattedValue.length > 5) return;
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 4) return;
    }

    setCardData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const processCardPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Validate card data
      if (!cardData.cardNumber || !cardData.expiryDate || !cardData.cvv || !cardData.cardholderName) {
        throw new Error('Please fill in all card details');
      }

      // Simulate Square payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // TODO: Integrate with Square Payment Gateway
      // 1. Initialize Square Web Payments SDK
      // 2. Create payment form and tokenize card
      // 3. Send payment token to backend edge function
      // 4. Process payment through Square Payments API
      // 5. Verify payment status
      
      // Update user's subscription tier in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: plan.toLowerCase(),
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }
      
      toast({
        title: "Payment Successful",
        description: `${plan} subscription activated successfully!`,
      });
      
      onPaymentSuccess('card', amount);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Payment processing failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayPalPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate PayPal processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // TODO: Initialize PayPal SDK and process payment
      
      // Update user's subscription tier in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: plan.toLowerCase(),
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }
      
      toast({
        title: "Payment Successful",
        description: `${plan} subscription activated via PayPal!`,
      });
      
      onPaymentSuccess('paypal', amount);
    } catch (error) {
      toast({
        title: "PayPal Payment Failed",
        description: "PayPal payment could not be processed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Warning */}
      <Alert className="border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Square Payment Gateway:</strong> This is a placeholder for Square integration. Connect to Square's Web Payments SDK to process real payments securely.
        </AlertDescription>
      </Alert>

      {/* Plan Summary */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Payment Summary
          </CardTitle>
          <CardDescription>
            Complete your subscription to {plan}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total:</span>
            <span className="text-success">${amount}/month</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Tabs defaultValue="card" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card">Credit Card</TabsTrigger>
          <TabsTrigger value="paypal">PayPal</TabsTrigger>
        </TabsList>

        {/* Credit Card Tab */}
        <TabsContent value="card" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Card Payment
              </CardTitle>
              <CardDescription>
                Enter your card details securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={cardData.expiryDate}
                      onChange={(e) => handleCardInputChange('expiryDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    placeholder="John Doe"
                    value={cardData.cardholderName}
                    onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <Input
                    id="billingAddress"
                    placeholder="123 Main St"
                    value={cardData.billingAddress}
                    onChange={(e) => setCardData(prev => ({ ...prev, billingAddress: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={cardData.city}
                      onChange={(e) => setCardData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="10001"
                      value={cardData.zipCode}
                      onChange={(e) => setCardData(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="USA"
                      value={cardData.country}
                      onChange={(e) => setCardData(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={processCardPayment} 
                disabled={isProcessing}
                className="w-full bg-gradient-primary hover:shadow-glow"
              >
                {isProcessing ? 'Processing...' : `Pay $${amount}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PayPal Tab */}
        <TabsContent value="paypal" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle>PayPal Payment</CardTitle>
              <CardDescription>
                Pay securely with your PayPal account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={processPayPalPayment} 
                disabled={isProcessing}
                className="w-full bg-gradient-accent hover:shadow-glow"
              >
                {isProcessing ? 'Redirecting...' : 'Pay with PayPal'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};