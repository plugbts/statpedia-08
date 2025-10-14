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
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/utils/user-display';
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

interface AuthPageProps {
  onAuthSuccess: (user: any, subscription: string) => void;
}

// Input validation schemas
const emailSchema = z.string().email('Invalid email address').max(255, 'Email too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long');
const displayNameSchema = z.string().trim().min(1, 'Display name required').max(100, 'Display name too long');

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const { user, isAuthenticated, isLoading, login, signup, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'plans'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  useEffect(() => {
    // If user is already authenticated, redirect them
    if (isAuthenticated && user) {
      fetchProfileAndRedirect(user);
    }
  }, [isAuthenticated, user]);

  const fetchProfileAndRedirect = async (user: any) => {
    try {
      // Show personalized greeting using the new display logic
      const userDisplayName = getUserDisplayName(user);
      
      toast({
        title: `Hey, ${userDisplayName}!`,
        description: "Welcome back to Statpedia!",
      });
      
      // For now, we'll use the user data directly from our auth context
      // In the future, we can fetch additional profile data from Hasura
      onAuthSuccess(user, 'free'); // Default to free subscription
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
        description: `Too many attempts. Try again in ${rateLimitResult.retryAfter} seconds.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (authMode === 'login') {
        await login(formData.email, formData.password);
        // fetchProfileAndRedirect will be called by useEffect, which will show personalized greeting
      } else {
        // Signup with our custom auth system
        await signup(formData.email, formData.password, formData.displayName);
        
        toast({
          title: "Account Created",
          description: "Welcome to Statpedia! Please choose your subscription plan",
        });
        setAuthMode('plans');
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscriptionSuccess = async (plan: string) => {
    try {
      // User is already authenticated from our auth context
      
      if (!user) {
        toast({
          title: "Error",
          description: "User session not found",
          variant: "destructive",
        });
        return;
      }

      // For now, we'll just redirect with the plan
      // In the future, we can store subscription data in our custom auth system
      
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
      await logout();
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
              disabled={isSubmitting || isLoading}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              {(isSubmitting || isLoading) ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
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