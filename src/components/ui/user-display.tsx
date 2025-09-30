// User Display Component
// Consistently displays user information using display name, username, and user ID

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserIdentity } from '@/services/user-identification-service';
import { useUser } from '@/contexts/user-context';
import { User, Mail, Shield, Crown, Star } from 'lucide-react';

interface UserDisplayProps {
  userIdentity?: UserIdentity | null;
  showAvatar?: boolean;
  showUsername?: boolean;
  showEmail?: boolean;
  showRole?: boolean;
  showSubscription?: boolean;
  showKarma?: boolean;
  showROI?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
  onClick?: () => void;
}

export const UserDisplay: React.FC<UserDisplayProps> = ({
  userIdentity,
  showAvatar = true,
  showUsername = true,
  showEmail = false,
  showRole = false,
  showSubscription = false,
  showKarma = false,
  showROI = false,
  size = 'md',
  variant = 'default',
  className = '',
  onClick
}) => {
  const { userIdentity: currentUserIdentity } = useUser();
  const identity = userIdentity || currentUserIdentity;

  if (!identity) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAvatar && (
          <Avatar className={getSizeClasses(size).avatar}>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
        <span className="text-muted-foreground">Unknown User</span>
      </div>
    );
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          avatar: 'w-6 h-6',
          text: 'text-xs',
          username: 'text-xs',
          badge: 'text-xs px-1 py-0'
        };
      case 'md':
        return {
          avatar: 'w-8 h-8',
          text: 'text-sm',
          username: 'text-sm',
          badge: 'text-xs px-2 py-1'
        };
      case 'lg':
        return {
          avatar: 'w-12 h-12',
          text: 'text-base',
          username: 'text-base',
          badge: 'text-sm px-2 py-1'
        };
    }
  };

  const getUserInitials = (identity: UserIdentity): string => {
    const displayName = identity.display_name || identity.username || `User ${identity.user_id.slice(0, 8)}`;
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3" />;
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'mod':
        return <Star className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      case 'admin':
        return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'mod':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSubscriptionColor = (subscription?: string) => {
    switch (subscription) {
      case 'pro':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 'premium':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const classes = getSizeClasses(size);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`} onClick={onClick}>
        {showAvatar && (
          <Avatar className={classes.avatar}>
            <AvatarImage src={identity.avatar_url} />
            <AvatarFallback className={classes.text}>
              {getUserInitials(identity)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className={`${classes.text} font-medium`}>
          {identity.display_name || identity.username}
        </span>
        {showUsername && identity.username && (
          <span className={`${classes.username} text-muted-foreground`}>
            @{identity.username}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`} onClick={onClick}>
        <div className="flex items-center gap-3">
          {showAvatar && (
            <Avatar className={classes.avatar}>
              <AvatarImage src={identity.avatar_url} />
              <AvatarFallback className={classes.text}>
                {getUserInitials(identity)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`${classes.text} font-semibold truncate`}>
                {identity.display_name || identity.username}
              </h3>
              {showRole && identity.role && (
                <Badge variant="outline" className={`${classes.badge} ${getRoleColor(identity.role)}`}>
                  {getRoleIcon(identity.role)}
                  <span className="ml-1">{identity.role}</span>
                </Badge>
              )}
            </div>
            {showUsername && identity.username && (
              <p className={`${classes.username} text-muted-foreground`}>
                @{identity.username}
              </p>
            )}
            {showEmail && identity.email && (
              <p className={`${classes.username} text-muted-foreground flex items-center gap-1`}>
                <Mail className="w-3 h-3" />
                {identity.email}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {showSubscription && identity.subscription_tier && (
            <Badge variant="outline" className={`${classes.badge} ${getSubscriptionColor(identity.subscription_tier)}`}>
              {identity.subscription_tier.toUpperCase()}
            </Badge>
          )}
          {showKarma && 'karma' in identity && (
            <Badge variant="outline" className={`${classes.badge} bg-yellow-500/20 text-yellow-600`}>
              ⭐ {(identity as any).karma || 0} Karma
            </Badge>
          )}
          {showROI && 'roi_percentage' in identity && (
            <Badge variant="outline" className={`${classes.badge} bg-green-500/20 text-green-600`}>
              📈 {(identity as any).roi_percentage?.toFixed(1) || 0}% ROI
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`} onClick={onClick}>
            {showAvatar && (
              <Avatar className={classes.avatar}>
                <AvatarImage src={identity.avatar_url} />
                <AvatarFallback className={classes.text}>
                  {getUserInitials(identity)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`${classes.text} font-medium truncate`}>
                  {identity.display_name || identity.username}
                </span>
                {showRole && identity.role && (
                  <Badge variant="outline" className={`${classes.badge} ${getRoleColor(identity.role)}`}>
                    {getRoleIcon(identity.role)}
                  </Badge>
                )}
                {showSubscription && identity.subscription_tier && (
                  <Badge variant="outline" className={`${classes.badge} ${getSubscriptionColor(identity.subscription_tier)}`}>
                    {identity.subscription_tier.toUpperCase()}
                  </Badge>
                )}
              </div>
              {showUsername && identity.username && (
                <p className={`${classes.username} text-muted-foreground`}>
                  @{identity.username}
                </p>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">{identity.display_name || identity.username}</div>
            <div className="text-sm text-muted-foreground">@{identity.username}</div>
            {showEmail && identity.email && (
              <div className="text-sm text-muted-foreground">{identity.email}</div>
            )}
            {showRole && identity.role && (
              <div className="text-sm text-muted-foreground">Role: {identity.role}</div>
            )}
            {showSubscription && identity.subscription_tier && (
              <div className="text-sm text-muted-foreground">Plan: {identity.subscription_tier}</div>
            )}
            <div className="text-xs text-muted-foreground">ID: {identity.user_id.slice(0, 8)}...</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Convenience components for common use cases
export const UserAvatar: React.FC<{ userIdentity?: UserIdentity | null; size?: 'sm' | 'md' | 'lg' }> = ({ 
  userIdentity, 
  size = 'md' 
}) => (
  <UserDisplay 
    userIdentity={userIdentity} 
    showAvatar={true} 
    showUsername={false} 
    showRole={false} 
    showSubscription={false}
    size={size}
    variant="compact"
  />
);

export const UserName: React.FC<{ userIdentity?: UserIdentity | null; showUsername?: boolean }> = ({ 
  userIdentity, 
  showUsername = true 
}) => (
  <UserDisplay 
    userIdentity={userIdentity} 
    showAvatar={false} 
    showUsername={showUsername} 
    showRole={false} 
    showSubscription={false}
    variant="compact"
  />
);

export const UserCard: React.FC<{ userIdentity?: UserIdentity | null; showKarma?: boolean; showROI?: boolean }> = ({ 
  userIdentity, 
  showKarma = false, 
  showROI = false 
}) => (
  <UserDisplay 
    userIdentity={userIdentity} 
    showAvatar={true} 
    showUsername={true} 
    showEmail={true} 
    showRole={true} 
    showSubscription={true}
    showKarma={showKarma}
    showROI={showROI}
    size="lg"
    variant="detailed"
  />
);
