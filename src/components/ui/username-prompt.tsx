import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Check, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UsernamePromptProps {
  isVisible: boolean;
  onClose: () => void;
  onUsernameSet: (username: string) => void;
  currentEmail?: string;
}

export const UsernamePrompt: React.FC<UsernamePromptProps> = ({
  isVisible,
  onClose,
  onUsernameSet,
  currentEmail
}) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
    return { isValid: true, error: '' };
  };

  const handleSubmit = async () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call the callback to set the username
      await onUsernameSet(username.trim());
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
                    className="pl-8"
                    maxLength={20}
                    disabled={isLoading}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    @
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>• 3-20 characters</p>
                  <p>• Letters, numbers, underscores, and periods only</p>
                  <p>• This will be your unique social identity</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !username.trim()}
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
                  onClick={onClose}
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
    </div>
  );
};
