// Comprehensive Notification Service
// Handles all types of notifications across the platform

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data specific to notification type
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  category: 'social' | 'betting' | 'system' | 'achievement';
  actionUrl?: string; // URL to navigate to when clicked
  icon?: string; // Icon name for display
}

export type NotificationType = 
  | 'bet_won' | 'bet_lost' | 'bet_pending' | 'bet_cashed_out'
  | 'bet_slip_shared' | 'bet_slip_tailed' | 'bet_slip_liked' | 'bet_slip_commented'
  | 'friend_request' | 'friend_accepted' | 'friend_removed'
  | 'post_liked' | 'post_commented' | 'post_shared'
  | 'prediction_correct' | 'prediction_incorrect' | 'prediction_updated'
  | 'subscription_expired' | 'subscription_renewed' | 'trial_ending'
  | 'achievement_unlocked' | 'milestone_reached'
  | 'system_maintenance' | 'feature_announcement' | 'security_alert';

class NotificationService {
  private supabase: any;
  private unreadCount: number = 0;
  private listeners: ((count: number) => void)[] = [];

  constructor() {
    // Import Supabase client dynamically to avoid SSR issues
    import('@/integrations/supabase/client').then(({ supabase }) => {
      this.supabase = supabase;
    });
  }

  // Subscribe to unread count changes
  subscribeToUnreadCount(callback: (count: number) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify listeners of count changes
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.unreadCount));
  }

  // Get all notifications for a user
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const notifications = data.map((n: any) => this.formatNotification(n));
      
      // Update unread count
      this.unreadCount = notifications.filter(n => !n.isRead).length;
      this.notifyListeners();

      return notifications;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      this.unreadCount = count || 0;
      this.notifyListeners();
      return this.unreadCount;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      // Update local count
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      this.unreadCount = 0;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  // Create a new notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    priority: 'low' | 'medium' | 'high' = 'medium',
    category: 'social' | 'betting' | 'system' | 'achievement' = 'system',
    actionUrl?: string
  ): Promise<Notification> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const notificationData = {
        user_id: userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        is_read: false,
        priority,
        category,
        action_url: actionUrl,
        icon: this.getNotificationIcon(type),
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      // Update unread count
      this.unreadCount += 1;
      this.notifyListeners();

      return this.formatNotification(data);
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Bet tracking notifications
  async notifyBetResult(
    userId: string,
    betId: string,
    result: 'won' | 'lost' | 'pending' | 'cashed_out',
    betDetails: any
  ): Promise<void> {
    const notifications = {
      won: {
        title: '🎉 Bet Won!',
        message: `Your bet on ${betDetails.playerName} ${betDetails.propType} won!`,
        priority: 'high' as const,
        category: 'betting' as const,
        actionUrl: '/bet-tracking'
      },
      lost: {
        title: '❌ Bet Lost',
        message: `Your bet on ${betDetails.playerName} ${betDetails.propType} didn't hit.`,
        priority: 'medium' as const,
        category: 'betting' as const,
        actionUrl: '/bet-tracking'
      },
      pending: {
        title: '⏳ Bet Pending',
        message: `Your bet on ${betDetails.playerName} ${betDetails.propType} is still pending.`,
        priority: 'low' as const,
        category: 'betting' as const,
        actionUrl: '/bet-tracking'
      },
      cashed_out: {
        title: '💰 Bet Cashed Out',
        message: `You cashed out your bet on ${betDetails.playerName} ${betDetails.propType}.`,
        priority: 'medium' as const,
        category: 'betting' as const,
        actionUrl: '/bet-tracking'
      }
    };

    await this.createNotification(
      userId,
      `bet_${result}` as NotificationType,
      notifications[result].title,
      notifications[result].message,
      { betId, ...betDetails },
      notifications[result].priority,
      notifications[result].category,
      notifications[result].actionUrl
    );
  }

  // Social notifications
  async notifySocialInteraction(
    userId: string,
    type: 'bet_slip_shared' | 'bet_slip_tailed' | 'bet_slip_liked' | 'bet_slip_commented' | 'post_liked' | 'post_commented' | 'friend_request' | 'friend_accepted',
    actorUserId: string,
    actorName: string,
    data?: any
  ): Promise<void> {
    const messages = {
      bet_slip_shared: `${actorName} shared a new bet slip`,
      bet_slip_tailed: `${actorName} tailed your bet slip`,
      bet_slip_liked: `${actorName} liked your bet slip`,
      bet_slip_commented: `${actorName} commented on your bet slip`,
      post_liked: `${actorName} liked your post`,
      post_commented: `${actorName} commented on your post`,
      friend_request: `${actorName} sent you a friend request`,
      friend_accepted: `${actorName} accepted your friend request`
    };

    await this.createNotification(
      userId,
      type,
      'Social Update',
      messages[type],
      { actorUserId, actorName, ...data },
      'medium',
      'social',
      '/social'
    );
  }

  // Prediction notifications
  async notifyPredictionResult(
    userId: string,
    predictionId: string,
    result: 'correct' | 'incorrect',
    predictionDetails: any
  ): Promise<void> {
    const notifications = {
      correct: {
        title: '🎯 Prediction Correct!',
        message: `Your prediction on ${predictionDetails.playerName} ${predictionDetails.propType} was correct!`,
        priority: 'high' as const
      },
      incorrect: {
        title: '❌ Prediction Incorrect',
        message: `Your prediction on ${predictionDetails.playerName} ${predictionDetails.propType} was incorrect.`,
        priority: 'medium' as const
      }
    };

    await this.createNotification(
      userId,
      `prediction_${result}` as NotificationType,
      notifications[result].title,
      notifications[result].message,
      { predictionId, ...predictionDetails },
      notifications[result].priority,
      'betting',
      '/predictions'
    );
  }

  // System notifications
  async notifySystemEvent(
    userId: string,
    type: 'subscription_expired' | 'subscription_renewed' | 'trial_ending' | 'system_maintenance' | 'feature_announcement' | 'security_alert',
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.createNotification(
      userId,
      type,
      title,
      message,
      data,
      type === 'security_alert' ? 'high' : 'medium',
      'system'
    );
  }

  // Achievement notifications
  async notifyAchievement(
    userId: string,
    achievementId: string,
    title: string,
    description: string,
    data?: any
  ): Promise<void> {
    await this.createNotification(
      userId,
      'achievement_unlocked',
      `🏆 ${title}`,
      description,
      { achievementId, ...data },
      'high',
      'achievement'
    );
  }

  // Get notification icon based on type
  private getNotificationIcon(type: NotificationType): string {
    const icons = {
      // Betting
      bet_won: '🎉',
      bet_lost: '❌',
      bet_pending: '⏳',
      bet_cashed_out: '💰',
      
      // Social
      bet_slip_shared: '📊',
      bet_slip_tailed: '👥',
      bet_slip_liked: '❤️',
      bet_slip_commented: '💬',
      post_liked: '👍',
      post_commented: '💬',
      friend_request: '👤',
      friend_accepted: '✅',
      
      // Predictions
      prediction_correct: '🎯',
      prediction_incorrect: '❌',
      prediction_updated: '🔄',
      
      // System
      subscription_expired: '⚠️',
      subscription_renewed: '✅',
      trial_ending: '⏰',
      system_maintenance: '🔧',
      feature_announcement: '📢',
      security_alert: '🔒',
      
      // Achievements
      achievement_unlocked: '🏆',
      milestone_reached: '🎖️'
    };

    return icons[type] || '🔔';
  }

  // Format notification from database
  private formatNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data ? JSON.parse(data.data) : undefined,
      isRead: data.is_read,
      createdAt: data.created_at,
      priority: data.priority,
      category: data.category,
      actionUrl: data.action_url,
      icon: data.icon
    };
  }

  // Get current unread count (synchronous)
  getCurrentUnreadCount(): number {
    return this.unreadCount;
  }
}

export const notificationService = new NotificationService();
