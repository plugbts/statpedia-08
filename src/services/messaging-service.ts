// Direct Messaging Service
// Handles private messaging between users

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  senderName: string;
  senderAvatar?: string;
  replyToId?: string;
  editedAt?: string;
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isBlocked: boolean;
  blockedBy?: string;
  createdAt: string;
  updatedAt: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
}

export interface MessageRequest {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  senderName: string;
  senderAvatar?: string;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: string;
  blockedUser: {
    id: string;
    name: string;
    avatar?: string;
  };
}

class MessagingService {
  private supabase: any;

  constructor() {
    // Import Supabase client dynamically to avoid SSR issues
    import('@/integrations/supabase/client').then(({ supabase }) => {
      this.supabase = supabase;
    });
  }

  // Get all conversations for a user
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          participant1:user_profiles!conversations_participant1_id_fkey(user_id, display_name, avatar_url),
          participant2:user_profiles!conversations_participant2_id_fkey(user_id, display_name, avatar_url),
          last_message:messages(*)
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((conv: any) => this.formatConversation(conv, userId));
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(user_id, display_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((msg: any) => this.formatMessage(msg));
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  // Send a message
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    replyToId?: string
  ): Promise<Message> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Check if conversation exists
      let conversationId = await this.getConversationId(senderId, receiverId);
      
      if (!conversationId) {
        // Create new conversation
        conversationId = await this.createConversation(senderId, receiverId);
      }

      // Check if user is blocked
      const isBlocked = await this.isUserBlocked(senderId, receiverId);
      if (isBlocked) {
        throw new Error('Cannot send message: User has blocked you');
      }

      // Get sender info
      const { data: senderProfile } = await this.supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('user_id', senderId)
        .single();

      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        is_read: false,
        is_deleted: false,
        reply_to_id: replyToId,
        sender_name: senderProfile?.display_name || 'Unknown User',
        sender_avatar: senderProfile?.avatar_url,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Update conversation last message
      await this.updateConversationLastMessage(conversationId, data.id, content);

      return this.formatMessage(data);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Send message request
  async sendMessageRequest(
    senderId: string,
    receiverId: string,
    message: string
  ): Promise<MessageRequest> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Check if user is blocked
      const isBlocked = await this.isUserBlocked(senderId, receiverId);
      if (isBlocked) {
        throw new Error('Cannot send message request: User has blocked you');
      }

      // Get sender info
      const { data: senderProfile } = await this.supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('user_id', senderId)
        .single();

      const requestData = {
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        status: 'pending',
        sender_name: senderProfile?.display_name || 'Unknown User',
        sender_avatar: senderProfile?.avatar_url,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('message_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      return this.formatMessageRequest(data);
    } catch (error) {
      console.error('Failed to send message request:', error);
      throw error;
    }
  }

  // Get message requests
  async getMessageRequests(userId: string): Promise<MessageRequest[]> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
        .from('message_requests')
        .select(`
          *,
          sender:user_profiles!message_requests_sender_id_fkey(user_id, display_name, avatar_url)
        `)
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((request: any) => this.formatMessageRequest(request));
    } catch (error) {
      console.error('Failed to get message requests:', error);
      return [];
    }
  }

  // Accept message request
  async acceptMessageRequest(requestId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Get request details
      const { data: request } = await this.supabase
        .from('message_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Message request not found');

      // Update request status
      await this.supabase
        .from('message_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      // Create conversation
      await this.createConversation(request.sender_id, request.receiver_id);
    } catch (error) {
      console.error('Failed to accept message request:', error);
      throw error;
    }
  }

  // Decline message request
  async declineMessageRequest(requestId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      await this.supabase
        .from('message_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
    } catch (error) {
      console.error('Failed to decline message request:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      await this.supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  // Block user
  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Check if already blocked
      const { data: existingBlock } = await this.supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single();

      if (existingBlock) {
        throw new Error('User is already blocked');
      }

      // Block user
      await this.supabase
        .from('blocked_users')
        .insert({
          blocker_id: blockerId,
          blocked_id: blockedId,
          reason,
          created_at: new Date().toISOString()
        });

      // Block conversation if exists
      await this.supabase
        .from('conversations')
        .update({ is_blocked: true, blocked_by: blockerId })
        .or(`participant1_id.eq.${blockerId},participant2_id.eq.${blockerId}`)
        .or(`participant1_id.eq.${blockedId},participant2_id.eq.${blockedId}`);
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  // Unblock user
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Remove block
      await this.supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      // Unblock conversation if exists
      await this.supabase
        .from('conversations')
        .update({ is_blocked: false, blocked_by: null })
        .or(`participant1_id.eq.${blockerId},participant2_id.eq.${blockerId}`)
        .or(`participant1_id.eq.${blockedId},participant2_id.eq.${blockedId}`);
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }

  // Get blocked users
  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
        .from('blocked_users')
        .select(`
          *,
          blocked_user:user_profiles!blocked_users_blocked_id_fkey(user_id, display_name, avatar_url)
        `)
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((block: any) => this.formatBlockedUser(block));
    } catch (error) {
      console.error('Failed to get blocked users:', error);
      return [];
    }
  }

  // Check if user is blocked
  async isUserBlocked(userId: string, otherUserId: string): Promise<boolean> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data } = await this.supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_id', userId)
        .single();

      return !!data;
    } catch (error) {
      console.error('Failed to check if user is blocked:', error);
      return false;
    }
  }

  // Private helper methods
  private async getConversationId(userId1: string, userId2: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${userId1},participant2_id.eq.${userId2}),and(participant1_id.eq.${userId2},participant2_id.eq.${userId1})`)
      .single();

    return data?.id || null;
  }

  private async createConversation(userId1: string, userId2: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        participant1_id: userId1,
        participant2_id: userId2,
        unread_count: 0,
        is_blocked: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateConversationLastMessage(conversationId: string, messageId: string, content: string): Promise<void> {
    await this.supabase
      .from('conversations')
      .update({
        last_message_id: messageId,
        last_message_content: content,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  }

  private formatConversation(data: any, currentUserId: string): Conversation {
    const otherParticipant = data.participant1_id === currentUserId ? data.participant2 : data.participant1;
    
    return {
      id: data.id,
      participant1Id: data.participant1_id,
      participant2Id: data.participant2_id,
      lastMessageId: data.last_message_id,
      lastMessageContent: data.last_message_content,
      lastMessageAt: data.last_message_at,
      unreadCount: data.unread_count || 0,
      isBlocked: data.is_blocked || false,
      blockedBy: data.blocked_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      otherParticipant: {
        id: otherParticipant.user_id,
        name: otherParticipant.display_name || 'Unknown User',
        avatar: otherParticipant.avatar_url,
        isOnline: false, // This would be tracked separately
        lastSeen: undefined
      }
    };
  }

  private formatMessage(data: any): Message {
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      content: data.content,
      messageType: data.message_type,
      isRead: data.is_read,
      isDeleted: data.is_deleted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      senderName: data.sender_name,
      senderAvatar: data.sender_avatar,
      replyToId: data.reply_to_id,
      editedAt: data.edited_at
    };
  }

  private formatMessageRequest(data: any): MessageRequest {
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
      senderName: data.sender_name,
      senderAvatar: data.sender_avatar
    };
  }

  private formatBlockedUser(data: any): BlockedUser {
    return {
      id: data.id,
      blockerId: data.blocker_id,
      blockedId: data.blocked_id,
      reason: data.reason,
      createdAt: data.created_at,
      blockedUser: {
        id: data.blocked_user.user_id,
        name: data.blocked_user.display_name || 'Unknown User',
        avatar: data.blocked_user.avatar_url
      }
    };
  }
}

export const messagingService = new MessagingService();
