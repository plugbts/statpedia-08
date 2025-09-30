import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Users, 
  Heart, 
  Share2,
  Target,
  X,
  Check
} from 'lucide-react';
import { betSlipSharingService, type BetSlipNotification } from '@/services/bet-slip-sharing';
import { useToast } from '@/hooks/use-toast';

interface BetSlipNotificationsProps {
  userId: string;
}

export const BetSlipNotifications: React.FC<BetSlipNotificationsProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<BetSlipNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await betSlipSharingService.getNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await betSlipSharingService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(unreadNotifications.map(n => 
        betSlipSharingService.markNotificationAsRead(n.id)
      ));
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bet_shared':
        return <Share2 className="w-4 h-4 text-blue-500" />;
      case 'bet_tailed':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'bet_liked':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'bet_commented':
        return <Target className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'bet_shared':
        return 'border-l-blue-500';
      case 'bet_tailed':
        return 'border-l-green-500';
      case 'bet_liked':
        return 'border-l-red-500';
      case 'bet_commented':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <BellOff className="w-8 h-8 mx-auto mb-2" />
            <p>No notifications yet</p>
            <p className="text-sm">You'll see notifications when people interact with your bet slips</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${
                    notification.isRead ? 'bg-muted/20' : 'bg-background'
                  } ${getNotificationColor(notification.type)}`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={notification.actorUserAvatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(notification.actorUserName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNotificationIcon(notification.type)}
                        <span className="font-medium text-sm">
                          {notification.actorUserName}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        
                        {notification.type === 'bet_tailed' && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            Tailed
                          </Badge>
                        )}
                        
                        {notification.type === 'bet_liked' && (
                          <Badge variant="outline" className="text-xs">
                            <Heart className="w-3 h-3 mr-1" />
                            Liked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
