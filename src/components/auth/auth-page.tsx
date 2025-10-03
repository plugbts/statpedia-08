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
import { 
  validateEmail, 
  validatePasswordStrength, 
  validateUsername, 
  sanitizeInput, 
  detectSuspiciousPatterns,
  logSecurityEvent,
  checkRateLimit
} from '@/utils/security';
import { rateLimitingService } from '@/services/rate-limiting-service';
import { backupService } from '@/services/backup-service';
import { sessionService } from '@/services/session-service';

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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // Try to restore from backup if profile doesn't exist
        const restored = await backupService.restoreUserData(user.id);
        if (restored) {
          console.log('✅ User data restored from backup');
          onAuthSuccess(user, 'free'); // Will be updated after restoration
          return;
        }
        
        // If profiles table doesn't exist and no backup, use default subscription
        onAuthSuccess(user, 'free');
        return;
      }

      const subscription = profile?.subscription_tier || 'free';
      onAuthSuccess(user, subscription);
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Try to restore from backup as fallback
      try {
        const restored = await backupService.restoreUserData(user.id);
        if (restored) {
          console.log('✅ User data restored from backup after error');
          onAuthSuccess(user, 'free');
          return;
        }
      } catch (restoreError) {
        console.error('Error restoring from backup:', restoreError);
      }
      
      // Final fallback to free subscription
      onAuthSuccess(user, 'free');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetRateLimit = () => {
    rateLimitingService.resetLimit('auth:login', formData.email);
    rateLimitingService.resetLimit('auth:signup', formData.email);
    toast({
      title: "Rate Limit Reset",
      description: "Rate limit has been reset. You can try logging in again.",
    });
  };

  const validateForm = () => {
    try {
      // Sanitize inputs first
      const sanitizedEmail = sanitizeInput(formData.email);
      const sanitizedPassword = sanitizeInput(formData.password);
      const sanitizedDisplayName = sanitizeInput(formData.displayName);

      // Check for suspicious patterns
      const emailSuspicious = detectSuspiciousPatterns(sanitizedEmail);
      const passwordSuspicious = detectSuspiciousPatterns(sanitizedPassword);
      const displayNameSuspicious = detectSuspiciousPatterns(sanitizedDisplayName);

      if (emailSuspicious.isSuspicious) {
        logSecurityEvent('Suspicious email input detected', {
          email: sanitizedEmail,
          patterns: emailSuspicious.patterns
        });
        toast({
          title: "Security Alert",
          description: "Invalid email format detected",
          variant: "destructive",
        });
        return false;
      }

      if (passwordSuspicious.isSuspicious) {
        logSecurityEvent('Suspicious password input detected', {
          patterns: passwordSuspicious.patterns
        });
        toast({
          title: "Security Alert",
          description: "Invalid password format detected",
          variant: "destructive",
        });
        return false;
      }

      if (displayNameSuspicious.isSuspicious) {
        logSecurityEvent('Suspicious display name input detected', {
          displayName: sanitizedDisplayName,
          patterns: displayNameSuspicious.patterns
        });
        toast({
          title: "Security Alert",
          description: "Invalid display name format detected",
          variant: "destructive",
        });
        return false;
      }

      // Enhanced email validation
      if (!validateEmail(sanitizedEmail)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return false;
      }

      // Enhanced password validation
      const passwordValidation = validatePasswordStrength(sanitizedPassword);
      if (!passwordValidation.isValid) {
        toast({
          title: "Password Requirements",
          description: passwordValidation.errors[0],
          variant: "destructive",
        });
        return false;
      }

      if (authMode === 'signup') {
        // Enhanced display name validation
        const displayNameValidation = validateUsername(sanitizedDisplayName);
        if (!displayNameValidation.isValid) {
          toast({
            title: "Invalid Display Name",
            description: displayNameValidation.errors[0],
            variant: "destructive",
          });
          return false;
        }
        
        // Check password confirmation
        if (sanitizedPassword !== sanitizeInput(formData.confirmPassword)) {
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
      logSecurityEvent('Form validation error', { error: error.message });
      toast({
        title: "Validation Error",
        description: "An error occurred during validation",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    
    // Check rate limiting
    const rateLimitKey = authMode === 'login' ? 'auth:login' : 'auth:signup';
    const rateLimitResult = rateLimitingService.checkLimit(rateLimitKey, formData.email);
    
    if (!rateLimitResult.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: `Too many login attempts. Try again in ${rateLimitResult.retryAfter} seconds. You can also try refreshing the page to reset the rate limit.`,
        variant: "destructive",
      });
      console.log('Rate limit exceeded for:', formData.email, 'Retry after:', rateLimitResult.retryAfter, 'seconds');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          console.error('Login error:', error);
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please check your credentials and try again.",
              variant: "destructive",
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: "Email Not Confirmed",
              description: "Please check your email and click the confirmation link before logging in.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: `Error: ${error.message}. Please try again or contact support if the issue persists.`,
              variant: "destructive",
            });
          }
          return;
        }

        if (data.user) {
          // Create backup of user data on successful login
          await backupService.createUserBackup(data.user.id);
          await backupService.createAuthBackup(data.user);
          
          toast({
            title: "Login Successful",
            description: "Welcome back to Statpedia!",
          });
          // fetchProfileAndRedirect will be called by onAuthStateChange
        }
      } else {
        // Check if display name is already taken
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('display_name', formData.displayName)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          toast({
            title: "Error",
            description: "Failed to verify display name availability",
            variant: "destructive",
          });
          return;
        }

        if (existingProfile) {
          toast({
            title: "Display Name Unavailable",
            description: "This display name is already in use. Please choose a different one.",
            variant: "destructive",
          });
          return;
        }

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
          // Create backup of new user data
          await backupService.createUserBackup(data.user.id);
          await backupService.createAuthBackup(data.user);
          
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
      const sessionResult = await sessionService.getCurrentSession();
      let user = null;
      
      if (!sessionResult.isValid || !sessionResult.user) {
        // Try to recover session
        const recoveryResult = await sessionService.handleSessionError(sessionResult.error);
        
        if (!recoveryResult.isValid || !recoveryResult.user) {
          toast({
            title: "Session Error",
            description: "Your session has expired. Please log in again to continue.",
            variant: "destructive",
          });
          return;
        }
        
        // Use recovered user
        user = recoveryResult.user;
      } else {
        user = sessionResult.user;
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setAuthMode('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (authMode === 'plans') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <SubscriptionPlans 
            onSubscriptionSuccess={handleSubscriptionSuccess} 
            onLogout={handleLogout}
          />
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
            
            {/* Debug: Rate Limit Reset Button (temporary) */}
            {authMode === 'login' && formData.email && (
              <Button 
                onClick={resetRateLimit}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Reset Rate Limit (Debug)
              </Button>
            )}
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