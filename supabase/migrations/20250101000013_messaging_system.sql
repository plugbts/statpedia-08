-- Messaging System Migration
-- Creates tables for direct messaging, message requests, and user blocking

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Requests Table
CREATE TABLE IF NOT EXISTS message_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_blocked ON conversations(is_blocked);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

CREATE INDEX IF NOT EXISTS idx_message_requests_sender_id ON message_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_id ON message_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_status ON message_requests(status);
CREATE INDEX IF NOT EXISTS idx_message_requests_created_at ON message_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_created_at ON blocked_users(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- RLS Policies for Messages
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- RLS Policies for Message Requests
CREATE POLICY "Users can view their own message requests" ON message_requests
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create message requests" ON message_requests
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update message requests they received" ON message_requests
  FOR UPDATE USING (receiver_id = auth.uid());

-- RLS Policies for Blocked Users
CREATE POLICY "Users can view their own blocks" ON blocked_users
  FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" ON blocked_users
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their own blocks" ON blocked_users
  FOR DELETE USING (blocker_id = auth.uid());

-- Functions for updating conversation data
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation with the new last message
  UPDATE conversations
  SET 
    last_message_id = NEW.id,
    last_message_content = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Increment unread count for the receiver
  UPDATE conversations
  SET unread_count = unread_count + 1
  WHERE id = NEW.conversation_id
  AND (participant1_id = NEW.receiver_id OR participant2_id = NEW.receiver_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
  AND receiver_id = p_user_id
  AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Reset unread count for the conversation
  UPDATE conversations
  SET unread_count = 0
  WHERE id = p_conversation_id;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID, p_other_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_other_user_id
    AND blocked_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation_id(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT id INTO conversation_id
  FROM conversations
  WHERE (participant1_id = p_user1_id AND participant2_id = p_user2_id)
     OR (participant1_id = p_user2_id AND participant2_id = p_user1_id);
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

CREATE TRIGGER trigger_message_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_id(UUID, UUID) TO authenticated;
