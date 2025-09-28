import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Zap, Mail, Lock, User } from 'lucide-react';
import { SubscriptionPlans } from './subscription-plans';
import { toast } from '@/hooks/use-toast';

interface AuthPageProps {
  onAuthSuccess: (user: any, subscription: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'plans'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return false;
    }

    if (authMode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return false;
      }
      
      if (formData.password.length < 6) {
        toast({
          title: "Weak Password",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (authMode === 'login') {
        // Mock successful login
        const mockUser = {
          id: '1',
          email: formData.email,
          displayName: formData.displayName || formData.email.split('@')[0],
          subscription: 'free' // Default to free plan
        };
        
        toast({
          title: "Login Successful",
          description: "Welcome back to Statpedia!",
        });
        
        onAuthSuccess(mockUser, 'free');
      } else {
        // For signup, show subscription plans
        toast({
          title: "Account Created",
          description: "Please choose your subscription plan",
        });
        
        setAuthMode('plans');
      }
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionSuccess = (plan: string) => {
    const mockUser = {
      id: '1',
      email: formData.email,
      displayName: formData.displayName || formData.email.split('@')[0],
      subscription: plan
    };
    
    toast({
      title: "Welcome to Statpedia!",
      description: `Your ${plan} plan is now active`,
    });
    
    onAuthSuccess(mockUser, plan);
  };

  if (authMode === 'plans') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <SubscriptionPlans onSubscriptionSuccess={handleSubscriptionSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-gradient-primary rounded-lg p-2">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Statpedia</h1>
          </div>
          
          <div className="space-y-2">
            <Badge variant="default" className="bg-gradient-success">
              <TrendingUp className="w-3 h-3 mr-1" />
              73.4% WIN RATE
            </Badge>
            <p className="text-sm text-muted-foreground">
              Advanced Sports Analytics Platform
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-2 mt-4">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to access your Statpedia dashboard
                </CardDescription>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-2 mt-4">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Join thousands of successful sports bettors
                </CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    placeholder="Your name"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {authMode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {authMode === 'signup' && (
              <Alert className="border-warning bg-warning/10">
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  After signup, you'll choose a subscription plan to access all predictions and analysis features.
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleAuth}
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              {isLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="text-primary hover:underline"
          >
            {authMode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};