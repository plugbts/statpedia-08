import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Check, X, Sparkles, Loader2, Home, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { socialService } from '@/services/social-service';
import { supabase } from '@/integrations/supabase/client';

interface UsernamePromptProps {
  isVisible: boolean;
  onClose: () => void;
  onUsernameSet: (username: string) => void;
  onReturnToDashboard?: () => void;
  currentEmail?: string;
}

export const UsernamePrompt: React.FC<UsernamePromptProps> = ({
  isVisible,
  onClose,
  onUsernameSet,
  onReturnToDashboard,
  currentEmail
}) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [error, setError] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'available' | 'taken' | 'checking'>('idle');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const { toast } = useToast();

  const validateUsername = (username: string): { isValid: boolean; error: string } => {
    if (!username.trim()) {
      return { isValid: false, error: 'Username is required' };
    }
    if (username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
      return { isValid: false, error: 'Username must be 20 characters or less' };
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and periods' };
    }
    // Check for reserved usernames
    const reservedUsernames = ['admin', 'administrator', 'moderator', 'support', 'help', 'api', 'www', 'mail', 'root', 'user', 'guest', 'test', 'demo'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return { isValid: false, error: 'This username is reserved and cannot be used' };
    }
    return { isValid: true, error: '' };
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim() || !validateUsername(username).isValid) {
      setAvailabilityStatus('idle');
      return;
    }

    setIsCheckingAvailability(true);
    setAvailabilityStatus('checking');

    try {
      const existingProfile = await socialService.getUserProfileByUsername(username);
      if (existingProfile) {
        setAvailabilityStatus('taken');
        setError('This username is already taken. Please choose a different one.');
      } else {
        setAvailabilityStatus('available');
        setError('');
      }
    } catch (error: any) {
      console.error('Error checking username availability:', error);
      // If there's an error (like table doesn't exist), assume username is available
      // This allows users to proceed even if the database isn't fully set up
      if (error.message?.includes('schema cache') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('Database table not found, assuming username is available');
        setAvailabilityStatus('available');
        setError('');
      } else {
        setAvailabilityStatus('idle');
        setError('Unable to check username availability. Please try again.');
      }
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Debounced username availability check
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username.trim()) {
        checkUsernameAvailability(username);
      } else {
        setAvailabilityStatus('idle');
        setError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    if (availabilityStatus !== 'available') {
      setError('Please wait for username availability check to complete.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call the callback to set the username
      await onUsernameSet(username.trim());
      
      // Mark username setup as complete in localStorage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const completionKey = `username_setup_complete_${user.id}`;
        localStorage.setItem(completionKey, 'true');
      }
      
      toast({
        title: "Welcome to Social!",
        description: `Your username @${username.trim()} has been set up successfully.`,
      });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to set username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  const handleCloseAttempt = () => {
    setShowExitConfirmation(true);
  };

  const handleReturnToDashboard = () => {
    console.log('Returning to dashboard from username prompt');
    setShowExitConfirmation(false);
    // Close the username prompt first
    onClose();
    // Then navigate to dashboard with a small delay to ensure prompt closes
    setTimeout(() => {
      if (onReturnToDashboard) {
        console.log('Calling onReturnToDashboard');
        onReturnToDashboard();
      } else {
        console.log('onReturnToDashboard function not provided');
      }
    }, 100);
  };

  const handleStayInSocial = () => {
    setShowExitConfirmation(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="relative">
        {/* 3D Effect Container */}
        <div className="relative transform perspective-1000">
          {/* Main Card with 3D effect */}
          <Card className="w-full max-w-md transform rotate-y-2 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-muted/50">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg"></div>
                  <div className="relative bg-primary rounded-full p-3">
                    <User className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Welcome to Social!
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Let's set up your social profile
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Choose your username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your username"
                    className={`pl-8 pr-10 ${
                      availabilityStatus === 'available' ? 'border-green-500 focus:border-green-500' :
                      availabilityStatus === 'taken' ? 'border-red-500 focus:border-red-500' :
                      availabilityStatus === 'checking' ? 'border-yellow-500 focus:border-yellow-500' : ''
                    }`}
                    maxLength={20}
                    disabled={isLoading}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    @
                  </div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {availabilityStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                    )}
                    {availabilityStatus === 'available' && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {availabilityStatus === 'taken' && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                {/* Availability Status */}
                {availabilityStatus === 'available' && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Username is available!
                  </div>
                )}
                {availabilityStatus === 'taken' && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Username is already taken
                  </div>
                )}
                {availabilityStatus === 'checking' && (
                  <div className="text-xs text-yellow-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking availability...
                  </div>
                )}

                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>• 3-20 characters</p>
                  <p>• Letters, numbers, underscores, and periods only</p>
                  <p>• Must be unique across all users</p>
                  <p>• This will be your unique social identity</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !username.trim() || availabilityStatus !== 'available'}
                  className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Setting up...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Create Profile
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseAttempt}
                  disabled={isLoading}
                  className="px-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-40 animate-pulse delay-1000"></div>
            </CardContent>
          </Card>

          {/* Floating sparkles */}
          <div className="absolute -top-4 -left-4 w-2 h-2 bg-yellow-400 rounded-full opacity-70 animate-bounce"></div>
          <div className="absolute -top-2 -right-6 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60 animate-bounce delay-500"></div>
          <div className="absolute -bottom-3 -left-2 w-1 h-1 bg-purple-400 rounded-full opacity-50 animate-bounce delay-1000"></div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" />
              Username Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You need to set up a username to access the Social tab. Without a username, you won't be able to:
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Create posts and comments</li>
                <li>• Connect with other users</li>
                <li>• Build your social profile</li>
                <li>• Participate in the community</li>
              </ul>
              Would you like to return to the dashboard instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleStayInSocial} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Stay Here
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReturnToDashboard} 
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
