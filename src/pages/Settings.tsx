import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Shield, 
  Palette, 
  CreditCard, 
  FileText, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SettingsProps {
  user: SupabaseUser | null;
  userRole?: string;
  onUserUpdate?: (user: SupabaseUser) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, userRole = 'user', onUserUpdate }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: user?.user_metadata?.display_name || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: '',
    profilePicture: user?.user_metadata?.avatar_url || ''
  });

  // Name change restrictions
  const [nameChangeHistory, setNameChangeHistory] = useState<Array<{date: string, oldName: string, newName: string}>>([]);
  const [canChangeName, setCanChangeName] = useState(true);
  const [nameChangeCount, setNameChangeCount] = useState(0);
  const [nextNameChangeDate, setNextNameChangeDate] = useState<string | null>(null);

  // Subscription state
  const [subscription, setSubscription] = useState({
    status: 'active',
    plan: 'premium',
    nextBilling: '2024-02-15',
    amount: '$29.99',
    autoRenew: true,
    cancelDate: null as string | null
  });

  // Payment methods
  const [paymentMethods] = useState([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiry: '12/25',
      isDefault: true
    }
  ]);

  // Invoice history
  const [invoices] = useState([
    {
      id: 'INV-001',
      date: '2024-01-15',
      amount: '$29.99',
      status: 'paid',
      description: 'Premium Subscription - January 2024'
    },
    {
      id: 'INV-002',
      date: '2023-12-15',
      amount: '$29.99',
      status: 'paid',
      description: 'Premium Subscription - December 2023'
    }
  ]);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('statpedia-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Load name change restrictions
  useEffect(() => {
    if (!user) return;
    
    const userId = user.id;
    const nameChangeData = localStorage.getItem(`statpedia_name_changes_${userId}`);
    
    if (nameChangeData) {
      try {
        const data = JSON.parse(nameChangeData);
        setNameChangeHistory(data.history || []);
        setNameChangeCount(data.count || 0);
        
        // Check if user can change name (max 2 changes per 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentChanges = data.history?.filter((change: any) => 
          new Date(change.date) > thirtyDaysAgo
        ) || [];
        
        if (recentChanges.length >= 2) {
          setCanChangeName(false);
          // Find the earliest change in the last 30 days to calculate next available date
          const earliestChange = recentChanges.reduce((earliest: any, current: any) => 
            new Date(current.date) < new Date(earliest.date) ? current : earliest
          );
          const nextAvailable = new Date(earliestChange.date);
          nextAvailable.setDate(nextAvailable.getDate() + 30);
          setNextNameChangeDate(nextAvailable.toISOString().split('T')[0]);
        } else {
          setCanChangeName(true);
          setNextNameChangeDate(null);
        }
      } catch (error) {
        console.error('Error loading name change data:', error);
      }
    }
  }, [user]);

  // Handle theme change
  const handleThemeChange = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('statpedia-theme', isDark ? 'dark' : 'light');
    
    // Apply theme to document with smooth transition
    const html = document.documentElement;
    
    // Add transition class for smooth theme switching
    html.style.transition = 'all 0.3s ease-in-out';
    
    if (isDark) {
      html.classList.remove('light');
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
    
    // Remove transition after animation completes
    setTimeout(() => {
      html.style.transition = '';
    }, 300);
    
    toast({
      title: "Theme Updated",
      description: `Switched to ${isDark ? 'dark' : 'light'} mode`,
    });
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updates: any = {};
      
      // Update display name with restrictions
      if (profileForm.displayName !== user.user_metadata?.display_name) {
        // Check if user can change name
        if (!canChangeName) {
          throw new Error(`You can only change your display name twice every 30 days. Next change available: ${nextNameChangeDate}`);
        }
        
        // Check if new name is different from current
        if (profileForm.displayName === user.user_metadata?.display_name) {
          throw new Error('New display name must be different from current name');
        }
        
        // Store the old name to make it available again
        const oldName = user.user_metadata?.display_name;
        const newName = profileForm.displayName;
        
        // Make old name available again by removing it from any "taken" list
        const takenNames = JSON.parse(localStorage.getItem('statpedia_taken_names') || '[]');
        const updatedTakenNames = takenNames.filter((name: string) => name !== oldName);
        localStorage.setItem('statpedia_taken_names', JSON.stringify(updatedTakenNames));
        
        // Check if new name is available
        if (takenNames.includes(newName)) {
          throw new Error('This display name is already taken. Please choose a different one.');
        }
        
        // Add new name to taken names
        updatedTakenNames.push(newName);
        localStorage.setItem('statpedia_taken_names', JSON.stringify(updatedTakenNames));
        
        // Record the name change
        const userId = user.id;
        const nameChangeData = JSON.parse(localStorage.getItem(`statpedia_name_changes_${userId}`) || '{"history": [], "count": 0}');
        
        const newChange = {
          date: new Date().toISOString(),
          oldName: oldName,
          newName: newName
        };
        
        nameChangeData.history.push(newChange);
        nameChangeData.count += 1;
        
        // Keep only last 10 changes to prevent storage bloat
        if (nameChangeData.history.length > 10) {
          nameChangeData.history = nameChangeData.history.slice(-10);
        }
        
        localStorage.setItem(`statpedia_name_changes_${userId}`, JSON.stringify(nameChangeData));
        
        // Update local state
        setNameChangeHistory(nameChangeData.history);
        setNameChangeCount(nameChangeData.count);
        
        // Check if user has reached the limit
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentChanges = nameChangeData.history.filter((change: any) => 
          new Date(change.date) > thirtyDaysAgo
        );
        
        if (recentChanges.length >= 2) {
          setCanChangeName(false);
          const earliestChange = recentChanges.reduce((earliest: any, current: any) => 
            new Date(current.date) < new Date(earliest.date) ? current : earliest
          );
          const nextAvailable = new Date(earliestChange.date);
          nextAvailable.setDate(nextAvailable.getDate() + 30);
          setNextNameChangeDate(nextAvailable.toISOString().split('T')[0]);
        }
        
        updates.data = {
          ...user.user_metadata,
          display_name: profileForm.displayName
        };
      }
      
      // Update email
      if (profileForm.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileForm.email
        });
        
        if (emailError) throw emailError;
        
        setEmailVerificationSent(true);
        toast({
          title: "Email Update Initiated",
          description: "Please check your new email for verification link",
        });
      }
      
      // Update password
      if (profileForm.newPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: profileForm.newPassword
        });
        
        if (passwordError) throw passwordError;
        
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated",
        });
      }
      
      // Update user metadata
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.auth.updateUser(updates);
        if (updateError) throw updateError;
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      // Reset password fields
      setProfileForm(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubscription(prev => ({
        ...prev,
        autoRenew: false,
        cancelDate: '2024-02-15'
      }));
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will not auto-renew. You'll retain access until the end of your billing period.",
      });
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resubscription
  const handleResubscribe = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubscription(prev => ({
        ...prev,
        autoRenew: true,
        cancelDate: null
      }));
      
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription will auto-renew on the next billing date.",
      });
    } catch (error: any) {
      toast({
        title: "Reactivation Failed",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account, preferences, and subscription</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-semibold">
                      {profileForm.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full p-0"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">Click to upload a new profile picture</p>
                  </div>
                </div>

                <Separator />

                {/* Display Name */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="displayName">Display Name</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={canChangeName ? "default" : "secondary"}>
                        {canChangeName ? `${2 - nameChangeCount} changes left` : 'No changes left'}
                      </Badge>
                    </div>
                  </div>
                  <Input
                    id="displayName"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your display name"
                    disabled={!canChangeName}
                  />
                  {!canChangeName && nextNameChangeDate && (
                    <p className="text-sm text-muted-foreground">
                      Next name change available: {nextNameChangeDate}
                    </p>
                  )}
                  {nameChangeCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      You've changed your name {nameChangeCount} time{nameChangeCount !== 1 ? 's' : ''} in the last 30 days
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                  {emailVerificationSent && (
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Verification email sent. Please check your inbox and click the verification link.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button onClick={handleProfileUpdate} disabled={isLoading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Name Change History */}
            {nameChangeHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Name Change History
                  </CardTitle>
                  <CardDescription>
                    Your display name change history (last 30 days)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {nameChangeHistory
                      .filter(change => {
                        const changeDate = new Date(change.date);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return changeDate > thirtyDaysAgo;
                      })
                      .slice(-5) // Show only last 5 changes
                      .reverse()
                      .map((change, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {change.oldName} → {change.newName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(change.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            Change #{nameChangeHistory.length - index}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Theme Settings
                </CardTitle>
                <CardDescription>
                  Customize the appearance of your interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Switch between dark and light themes
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleThemeChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <div className="w-full h-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded mb-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20"></div>
                      <div className="absolute top-2 left-2 w-3 h-3 bg-cyan-400 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-8 h-1 bg-gray-700 rounded"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-1 bg-gray-600 rounded"></div>
                    </div>
                    <h4 className="font-medium text-foreground">Dark Theme</h4>
                    <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                  </div>
                  <div className={`p-4 rounded-lg border-2 ${!isDarkMode ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <div className="w-full h-20 bg-gradient-to-br from-blue-50 to-white rounded mb-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
                      <div className="absolute top-2 left-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-8 h-1 bg-gray-200 rounded"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-1 bg-gray-300 rounded"></div>
                    </div>
                    <h4 className="font-medium text-foreground">Light Theme</h4>
                    <p className="text-sm text-muted-foreground">Clean and bright</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button onClick={handleProfileUpdate} disabled={isLoading} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription Status
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground capitalize">{subscription.plan} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscription.autoRenew ? 'Auto-renewal enabled' : 'Auto-renewal disabled'}
                    </p>
                  </div>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                    <p className="font-semibold text-foreground">{subscription.nextBilling}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-foreground">{subscription.amount}</p>
                  </div>
                </div>

                {subscription.cancelDate && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Your subscription will end on {subscription.cancelDate}. You'll retain access until then.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  {subscription.autoRenew ? (
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelSubscription}
                      disabled={isLoading}
                    >
                      Cancel Subscription
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleResubscribe}
                      disabled={isLoading}
                    >
                      Reactivate Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your payment methods and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {method.brand} •••• {method.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice History
                </CardTitle>
                <CardDescription>
                  View and download your billing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                          <p className="text-sm text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{invoice.amount}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
