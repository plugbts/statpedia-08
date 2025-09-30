import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import { notificationService } from '@/services/notification-service';
import { NotificationCenter } from './notification-center';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Load initial unread count
    loadUnreadCount();

    // Subscribe to unread count changes
    const unsubscribe = notificationService.subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });

    return unsubscribe;
  }, [userId]);

  const loadUnreadCount = async () => {
    try {
      setIsLoading(true);
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBellClick = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleNotificationCenterClose = () => {
    setIsNotificationCenterOpen(false);
    // Refresh unread count when closing
    loadUnreadCount();
  };

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        disabled
      >
        <Bell className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className="relative"
      >
        {unreadCount > 0 ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
        
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationCenter
        userId={userId}
        isOpen={isNotificationCenterOpen}
        onClose={handleNotificationCenterClose}
      />
    </>
  );
};
