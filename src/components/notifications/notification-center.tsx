import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck,
  Settings,
  Filter,
  MoreHorizontal,
  ExternalLink,
  X
} from 'lucide-react';
import { notificationService, type Notification } from '@/services/notification-service';
import { useToast } from '@/hooks/use-toast';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  userId, 
  isOpen, 
  onClose 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications(userId);
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
      await notificationService.markAsRead(notificationId);
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
      await notificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'betting':
        return notifications.filter(n => n.category === 'betting');
      case 'social':
        return notifications.filter(n => n.category === 'social');
      case 'system':
        return notifications.filter(n => n.category === 'system');
      case 'achievement':
        return notifications.filter(n => n.category === 'achievement');
      default:
        return notifications;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'betting':
        return '🎯';
      case 'social':
        return '👥';
      case 'system':
        return '⚙️';
      case 'achievement':
        return '🏆';
      default:
        return '🔔';
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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-lg sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] mx-auto">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 sm:ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">All</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 sm:p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mx-2 sm:mx-4 mb-2 sm:mb-4 h-8 sm:h-10">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-1 sm:px-3">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs sm:text-sm px-1 sm:px-3">
                <span className="hidden sm:inline">Unread</span>
                <span className="sm:hidden">New</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="betting" className="text-xs sm:text-sm px-1 sm:px-3">
                <span className="hidden sm:inline">🎯 Betting</span>
                <span className="sm:hidden">🎯</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs sm:text-sm px-1 sm:px-3">
                <span className="hidden sm:inline">👥 Social</span>
                <span className="sm:hidden">👥</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs sm:text-sm px-1 sm:px-3">
                <span className="hidden sm:inline">⚙️ System</span>
                <span className="sm:hidden">⚙️</span>
              </TabsTrigger>
              <TabsTrigger value="achievement" className="text-xs sm:text-sm px-1 sm:px-3">
                <span className="hidden sm:inline">🏆 Achievement</span>
                <span className="sm:hidden">🏆</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="px-2 sm:px-4 pb-2 sm:pb-4">
              <ScrollArea className="h-64 sm:h-80 md:h-96">
                {isLoading ? (
                  <div className="flex items-center justify-center h-24 sm:h-32">
                    <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <BellOff className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                    <p className="text-sm sm:text-base">No notifications</p>
                    <p className="text-xs sm:text-sm">
                      {activeTab === 'unread' 
                        ? "You're all caught up!" 
                        : `No ${activeTab} notifications`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredNotifications.map((notification, index) => (
                      <div key={notification.id}>
                        <div
                          className={`p-2 sm:p-3 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${
                            notification.isRead ? 'bg-muted/20' : 'bg-background'
                          } ${getPriorityColor(notification.priority)}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="text-sm sm:text-lg flex-shrink-0">
                              {notification.icon || getCategoryIcon(notification.category)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <span className="font-medium text-xs sm:text-sm truncate">
                                  {notification.title}
                                </span>
                                {!notification.isRead && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                                <Badge 
                                  variant="outline" 
                                  className="text-xs hidden sm:inline-flex"
                                >
                                  {notification.category}
                                </Badge>
                              </div>
                              
                              <p className="text-xs sm:text-sm text-muted-foreground mb-1 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                
                                <div className="flex items-center gap-1">
                                  {notification.actionUrl && (
                                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {index < filteredNotifications.length - 1 && <Separator className="mx-2 sm:mx-3" />}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
