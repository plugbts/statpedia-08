// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Bot, 
  HelpCircle, 
  Send, 
  X, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Mail,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { UserDisplay } from '@/components/ui/user-display';

interface SupportCenterProps {
  // No props needed - using useAuth hook
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'admin';
  content: string;
  timestamp: Date;
  senderName?: string;
  senderRole?: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  userEmail: string;
  userName: string;
  messages: Message[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export const SupportCenter: React.FC<SupportCenterProps> = ({ 
  userRole: propUserRole, 
  userEmail: propUserEmail, 
  userName: propUserName 
}) => {
  const { 
    userIdentity, 
    userRole: contextUserRole, 
    getUserDisplayName,
    getUserUsername,
    getUserInitials 
  } = useUser();
  
  // Use context values if no props provided
  const userRole = propUserRole || contextUserRole;
  const userEmail = propUserEmail || userIdentity?.email || '';
  const userName = propUserName || getUserDisplayName();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFAQs, setFilteredFAQs] = useState<FAQItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock FAQ data
  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'How do I upgrade my subscription?',
      answer: 'You can upgrade your subscription by clicking on the "Plans" tab in the navigation bar or by clicking "Upgrade to Pro" on any blurred content. Choose your desired plan and complete the payment process.',
      category: 'Subscription',
      tags: ['upgrade', 'subscription', 'payment', 'plans']
    },
    {
      id: '2',
      question: 'What features are available in the free plan?',
      answer: 'The free plan includes: viewing total predictions count, seeing overall win rate, access to wins summary, viewing up to 2 predictions, and seeing prediction accuracy up to 65%. All detailed analysis is blurred.',
      category: 'Subscription',
      tags: ['free', 'features', 'limitations', 'plan']
    },
    {
      id: '3',
      question: 'How do I view player analysis?',
      answer: 'Click on any player prop card and then click the blue chart icon (📊) to open the comprehensive player analysis overlay. This includes injury reports, advanced stats, and matchup analysis.',
      category: 'Features',
      tags: ['player', 'analysis', 'stats', 'props']
    },
    {
      id: '4',
      question: 'What sports are supported?',
      answer: 'Statpedia supports NFL, NBA, MLB, NHL, NCAAF, NCAAB, UFC, and Soccer. You can filter by sport using the sports filter in the navigation bar.',
      category: 'Sports',
      tags: ['sports', 'nfl', 'nba', 'mlb', 'nhl', 'filter']
    },
    {
      id: '5',
      question: 'How do I change my display name?',
      answer: 'Go to Settings (click your profile icon → Settings) and update your display name. Note: You can only change your name twice every 30 days.',
      category: 'Account',
      tags: ['display', 'name', 'settings', 'profile']
    },
    {
      id: '6',
      question: 'How do I contact live support?',
      answer: 'Type "live agent" or "agent" in the chat, and you\'ll be given the option to create a support ticket. Our team will respond via email within 24 hours.',
      category: 'Support',
      tags: ['live', 'agent', 'support', 'ticket', 'email']
    },
    {
      id: '7',
      question: 'What is the difference between Pro and Premium plans?',
      answer: 'Pro includes all predictions, player prop analysis, statistical insights, filtering, real-time updates, and priority support. Premium adds exclusive predictions, AI insights, custom models, API access, and dedicated account management.',
      category: 'Subscription',
      tags: ['pro', 'premium', 'comparison', 'features']
    },
    {
      id: '8',
      question: 'How do I cancel my subscription?',
      answer: 'Go to Settings → Subscription tab and click "Cancel Auto-Renewal". Your subscription will remain active until the end of your current billing period.',
      category: 'Subscription',
      tags: ['cancel', 'subscription', 'billing', 'settings']
    }
  ];

  // AI responses for common queries
  const getAIResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Check for live agent request
    if (lowerMessage.includes('live agent') || lowerMessage.includes('agent') || lowerMessage.includes('human')) {
      return 'I understand you\'d like to speak with a live agent. I can help you create a support ticket that will be reviewed by our team. Would you like to proceed with creating a ticket?';
    }
    
    // Check for FAQ matches
    const matchingFAQ = faqData.find(faq => 
      faq.question.toLowerCase().includes(lowerMessage) ||
      faq.answer.toLowerCase().includes(lowerMessage) ||
      faq.tags.some(tag => lowerMessage.includes(tag))
    );
    
    if (matchingFAQ) {
      return matchingFAQ.answer;
    }
    
    // General responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! I\'m Statpedia\'s AI assistant. How can I help you today? You can ask me about our features, subscription plans, or type "live agent" to speak with a human representative.';
    }
    
    if (lowerMessage.includes('help')) {
      return 'I\'m here to help! You can ask me about:\n• Subscription plans and features\n• How to use Statpedia\n• Account settings\n• Player analysis\n• Sports coverage\n\nOr type "live agent" for human support.';
    }
    
    if (lowerMessage.includes('subscription') || lowerMessage.includes('plan')) {
      return 'We offer three plans:\n• **Free**: Limited access with blurred content\n• **Pro**: Full access to all predictions and analysis ($29.99/month)\n• **Premium**: Everything in Pro plus exclusive features ($49.99/month)\n\nClick the "Plans" tab to upgrade!';
    }
    
    if (lowerMessage.includes('feature') || lowerMessage.includes('what can')) {
      return 'Statpedia offers:\n• Sports predictions and analysis\n• Player prop betting insights\n• Advanced statistical analysis\n• Real-time updates\n• Custom alerts and notifications\n• Export functionality (Pro+)\n• API access (Premium)\n\nTry the player analysis feature by clicking the chart icon on any prop card!';
    }
    
    // Default response
    return 'I\'m not sure I understand your question. Could you try rephrasing it? You can also ask about our features, subscription plans, or type "live agent" to speak with a human representative.';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'ai',
        content: 'Hello! I\'m Statpedia\'s AI assistant. How can I help you today? You can ask me about our features, subscription plans, or type "live agent" to speak with a human representative.',
        timestamp: new Date(),
        senderName: 'AI Assistant'
      }]);
    }
  }, []);

  useEffect(() => {
    // Filter FAQs based on search
    if (searchQuery.trim()) {
      const filtered = faqData.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredFAQs(filtered);
    } else {
      setFilteredFAQs(faqData);
    }
  }, [searchQuery]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      senderName: userName || 'You'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = getAIResponse(inputMessage);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        senderName: 'AI Assistant'
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and description.",
        variant: "destructive",
      });
      return;
    }

    const newTicket: Ticket = {
      id: Date.now().toString(),
      subject: ticketForm.subject,
      description: ticketForm.description,
      status: 'open',
      priority: ticketForm.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      userEmail: userEmail,
      userName: userName,
      messages: []
    };

    setTickets(prev => [...prev, newTicket]);
    setShowTicketForm(false);
    setTicketForm({ subject: '', description: '', priority: 'medium' });

    toast({
      title: "Ticket Created",
      description: "Your support ticket has been created. We'll respond via email within 24 hours.",
      variant: "success",
    });
  };

  const isAdmin = userRole === 'admin' || userRole === 'owner';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      
      {/* Close Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="h-10 w-10 rounded-full hover:bg-muted/50 transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-6xl font-display font-bold text-foreground mb-4 animate-fade-in">
            Support Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Get help from our AI assistant or connect with our support team
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {isAdmin ? 'Admin Tickets' : 'My Tickets'}
            </TabsTrigger>
          </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Ask me anything about Statpedia. Type "live agent" to speak with a human.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.type === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        message.type === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          {message.type === 'ai' ? (
                            <Bot className="w-4 h-4" />
                          ) : message.type === 'admin' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">
                            {message.senderName}
                            {message.senderRole && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {message.senderRole}
                              </Badge>
                            )}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="bg-muted text-muted-foreground rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-4 h-4" />
                          <span className="text-xs font-medium">AI Assistant</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Typing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything about Statpedia..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Find answers to common questions about Statpedia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <Card key={faq.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">{faq.question}</h3>
                            <Badge variant="outline">{faq.category}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">{faq.answer}</p>
                          <div className="flex flex-wrap gap-1">
                            {faq.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {isAdmin ? 'Support Tickets' : 'My Support Tickets'}
                    </CardTitle>
                    <CardDescription>
                      {isAdmin ? 'Manage all support tickets' : 'Track your support requests'}
                    </CardDescription>
                  </div>
                  {!isAdmin && (
                    <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
                      <DialogTrigger asChild>
                        <Button>Create Ticket</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Support Ticket</DialogTitle>
                          <DialogDescription>
                            Describe your issue and we'll get back to you via email within 24 hours.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Input
                              placeholder="Brief description of your issue"
                              value={ticketForm.subject}
                              onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                              placeholder="Detailed description of your issue..."
                              value={ticketForm.description}
                              onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={4}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Priority</label>
                            <select
                              value={ticketForm.priority}
                              onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowTicketForm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateTicket}>
                            Create Ticket
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No tickets yet</h3>
                      <p className="text-muted-foreground">
                        {isAdmin ? 'No support tickets have been created.' : 'You haven\'t created any support tickets yet.'}
                      </p>
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{ticket.subject}</h3>
                                <Badge
                                  variant={
                                    ticket.status === 'open' ? 'default' :
                                    ticket.status === 'pending' ? 'secondary' :
                                    ticket.status === 'resolved' ? 'outline' : 'destructive'
                                  }
                                >
                                  {ticket.status}
                                </Badge>
                                <Badge
                                  variant={
                                    ticket.priority === 'urgent' ? 'destructive' :
                                    ticket.priority === 'high' ? 'default' :
                                    ticket.priority === 'medium' ? 'secondary' : 'outline'
                                  }
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm mb-2">{ticket.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Created: {ticket.createdAt.toLocaleDateString()}</span>
                                <span>Updated: {ticket.updatedAt.toLocaleDateString()}</span>
                                {isAdmin && (
                                  <span>From: {ticket.userName} ({ticket.userEmail})</span>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  Reply
                                </Button>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Resolve
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
