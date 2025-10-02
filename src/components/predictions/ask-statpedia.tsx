import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Brain, 
  TrendingUp, 
  Target, 
  Users, 
  Activity,
  Lightbulb,
  MessageCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { statpediaAI, AIResponse } from '@/services/statpedia-ai-service';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  confidence?: number;
  reasoning?: string[];
  relatedStats?: any[];
  followUpQuestions?: string[];
}

interface AskStatpediaProps {
  playerProp?: any;
  gameContext?: any;
}

export function AskStatpedia({ playerProp, gameContext }: AskStatpediaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when component mounts
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        content: `👋 Hi! I'm Statpedia AI, your advanced sports analytics assistant. I can help you with detailed player analysis, injury impact assessments, prop betting recommendations, and team matchup insights. ${playerProp ? `I see you're looking at ${playerProp.playerName}'s ${playerProp.propType} prop. Feel free to ask me anything about it!` : 'What would you like to know?'}`,
        timestamp: new Date(),
        confidence: 100,
        followUpQuestions: [
          playerProp ? `How does ${playerProp.playerName} perform in similar matchups?` : "How well does LeBron play when AD is out?",
          playerProp ? `Should I bet the ${playerProp.propType} prop?` : "What props offer the best value tonight?",
          "Which team has the better matchup tonight?",
          "How do injuries affect player performance?"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [playerProp]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Create context for AI
      const context = {
        playerProp,
        gameContext,
        currentPlayer: playerProp?.playerName,
        currentProp: playerProp?.propType,
        line: playerProp?.line,
        odds: { over: playerProp?.overOdds, under: playerProp?.underOdds }
      };

      const aiResponse: AIResponse = await statpediaAI.askQuestion(inputValue, context);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiResponse.answer,
        timestamp: new Date(),
        confidence: aiResponse.confidence,
        reasoning: aiResponse.reasoning,
        relatedStats: aiResponse.relatedStats,
        followUpQuestions: aiResponse.followUpQuestions
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: "I'm having trouble processing your question right now. Please try again in a moment.",
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleFollowUpClick = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const handleSampleQuestionClick = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (confidence >= 70) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <Target className="h-3 w-3" />;
    if (confidence >= 70) return <TrendingUp className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  const sampleQuestions = statpediaAI.getSampleQuestions();
  const questionCategories = statpediaAI.getQuestionCategories();

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-slate-700/60 bg-slate-900/80">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">Ask Statpedia</h3>
          <p className="text-sm text-slate-400">Advanced Sports Analytics AI</p>
        </div>
        <div className="flex-1" />
        <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-300 border-blue-500/30">
          <Zap className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.type === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg p-3",
                  message.type === 'user'
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : "bg-slate-800/60 border border-slate-700/60 text-slate-200"
                )}
              >
                {message.type === 'ai' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">Statpedia AI</span>
                    {message.confidence !== undefined && (
                      <Badge className={cn("text-xs", getConfidenceColor(message.confidence))}>
                        {getConfidenceIcon(message.confidence)}
                        <span className="ml-1">{message.confidence}%</span>
                      </Badge>
                    )}
                  </div>
                )}
                
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                
                {message.reasoning && message.reasoning.length > 0 && (
                  <div className="mt-3 p-2 rounded bg-slate-900/40 border border-slate-600/40">
                    <div className="flex items-center space-x-1 mb-2">
                      <BarChart3 className="h-3 w-3 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-400">Analysis</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      {message.reasoning.map((reason, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center space-x-1 mb-2">
                      <Lightbulb className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs font-semibold text-slate-400">Follow-up Questions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.followUpQuestions.slice(0, 3).map((question, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFollowUpClick(question)}
                          className="h-auto p-2 text-xs text-slate-300 hover:text-blue-300 hover:bg-blue-500/10 border border-slate-600/40 hover:border-blue-500/40"
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500 mt-2">
                  {message.timestamp.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 max-w-[85%]">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-400">Statpedia AI is thinking...</span>
                </div>
                <div className="flex space-x-1 mt-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Sample Questions (shown when no messages or only welcome) */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center space-x-1 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-semibold text-slate-300">Try asking:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {sampleQuestions.slice(0, 4).map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleSampleQuestionClick(question)}
                className="justify-start h-auto p-2 text-xs text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 border border-slate-700/40 hover:border-blue-500/40"
              >
                <MessageCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-left">{question}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700/60 bg-slate-900/80">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about sports analytics, player performance, or prop betting..."
            className="flex-1 bg-slate-800/60 border-slate-600/60 text-slate-200 placeholder-slate-500 focus:border-blue-500/60 focus:ring-blue-500/20"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1 text-xs text-slate-500">
            <Users className="h-3 w-3" />
            <span>Powered by advanced sports analytics</span>
          </div>
          <div className="text-xs text-slate-500">
            Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}
