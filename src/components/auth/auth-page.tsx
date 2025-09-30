import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

interface AuthPageProps {
  onAuthSuccess: (user: any, subscription: string) => void;
}

// Input validation schemas
const emailSchema = z.string().email('Invalid email address').max(255, 'Email too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long');
const displayNameSchema = z.string().trim().min(1, 'Display name required').max(100, 'Display name too long');

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'plans'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User already logged in, fetch profile and redirect
        fetchProfileAndRedirect(session.user);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfileAndRedirect(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRedirect = async (user: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      const subscription = profile?.subscription_tier || 'free';
      onAuthSuccess(user, subscription);
    } catch (error) {
      console.error('Error fetching profile:', error);
      onAuthSuccess(user, 'free');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    try {
      // Validate email
      emailSchema.parse(formData.email);
      
      // Validate password
      passwordSchema.parse(formData.password);

      if (authMode === 'signup') {
        // Validate display name
        displayNameSchema.parse(formData.displayName);
        
        // Check password confirmation
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match",
            variant: "destructive",
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        if (data.user) {
          toast({
            title: "Login Successful",
            description: "Welcome back to Statpedia!",
          });
          // fetchProfileAndRedirect will be called by onAuthStateChange
        }
      } else {
        // Signup
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: formData.displayName,
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Signup Failed",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Signup Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        if (data.user) {
          toast({
            title: "Account Created",
            description: "Please choose your subscription plan",
          });
          setAuthMode('plans');
        }
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionSuccess = async (plan: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "User session not found",
          variant: "destructive",
        });
        return;
      }

      // Update profile with subscription
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: plan,
          subscription_start_date: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating subscription:', error);
      }

      toast({
        title: "Welcome to Statpedia!",
        description: `Your ${plan} plan is now active`,
      });
      
      onAuthSuccess(user, plan);
    } catch (error) {
      console.error('Error handling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to activate subscription",
        variant: "destructive",
      });
    }
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