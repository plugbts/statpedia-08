import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  Search, 
  MoreVertical,
  Block,
  UserPlus,
  Check,
  X,
  Clock,
  Reply,
  Edit,
  Trash2
} from 'lucide-react';
import { messagingService, type Conversation, type Message, type MessageRequest } from '@/services/messaging-service';
import { useToast } from '@/hooks/use-toast';

interface DirectMessagesProps {
  userId: string;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({ userId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'requests'>('conversations');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [conversationsData, requestsData] = await Promise.all([
        messagingService.getConversations(userId),
        messagingService.getMessageRequests(userId)
      ]);
      
      setConversations(conversationsData);
      setMessageRequests(requestsData);
    } catch (error) {
      console.error('Failed to load messaging data:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const messagesData = await messagingService.getMessages(conversationId);
      setMessages(messagesData.reverse()); // Reverse to show oldest first
      
      // Mark messages as read
      await messagingService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      const message = await messagingService.sendMessage(
        userId,
        selectedConversation.otherParticipant.id,
        newMessage.trim()
      );

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Update conversation in list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessageContent: message.content, lastMessageAt: message.createdAt }
            : conv
        )
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await messagingService.acceptMessageRequest(requestId);
      setMessageRequests(prev => prev.filter(req => req.id !== requestId));
      await loadData(); // Reload conversations
      toast({
        title: "Success",
        description: "Message request accepted"
      });
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast({
        title: "Error",
        description: "Failed to accept message request",
        variant: "destructive"
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await messagingService.declineMessageRequest(requestId);
      setMessageRequests(prev => prev.filter(req => req.id !== requestId));
      toast({
        title: "Success",
        description: "Message request declined"
      });
    } catch (error) {
      console.error('Failed to decline request:', error);
      toast({
        title: "Error",
        description: "Failed to decline message request",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    try {
      await messagingService.blockUser(userId, userIdToBlock);
      await loadData();
      if (selectedConversation?.otherParticipant.id === userIdToBlock) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast({
        title: "Success",
        description: "User blocked successfully"
      });
    } catch (error) {
      console.error('Failed to block user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const filteredConversations = conversations.filter(conv =>
    conv.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'conversations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('conversations')}
              >
                Chats
              </Button>
              <Button
                variant={activeTab === 'requests' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('requests')}
                className="relative"
              >
                Requests
                {messageRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {messageRequests.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2"
          />
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {activeTab === 'conversations' ? (
              <div className="space-y-1">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a conversation with someone!</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={conversation.otherParticipant.avatar} />
                          <AvatarFallback>
                            {getInitials(conversation.otherParticipant.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {conversation.otherParticipant.name}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessageContent || 'No messages yet'}
                          </p>
                          
                          <p className="text-xs text-muted-foreground">
                            {conversation.lastMessageAt ? formatTimeAgo(conversation.lastMessageAt) : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {messageRequests.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <UserPlus className="w-8 h-8 mx-auto mb-2" />
                    <p>No message requests</p>
                  </div>
                ) : (
                  messageRequests.map((request) => (
                    <div key={request.id} className="p-3 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={request.senderAvatar} />
                          <AvatarFallback>
                            {getInitials(request.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {request.senderName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(request.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeclineRequest(request.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedConversation.otherParticipant.avatar} />
                    <AvatarFallback>
                      {getInitials(selectedConversation.otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedConversation.otherParticipant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.otherParticipant.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBlockUser(selectedConversation.otherParticipant.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Block className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[500px]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.senderId === userId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatTimeAgo(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={isSending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[500px]">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
