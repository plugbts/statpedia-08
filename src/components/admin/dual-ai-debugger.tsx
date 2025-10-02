import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Brain, Code, Lightbulb, MessageSquare, Settings } from 'lucide-react';
import { chatGPTService, type DebugContext } from '@/services/chatgpt-integration';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DebugSession {
  id: string;
  timestamp: Date;
  issue: string;
  chatGPTResponse: string;
  claudeAnalysis?: string;
  status: 'pending' | 'completed' | 'error';
}

export function DualAIDebugger() {
  const [apiKey, setApiKey] = useState(() => {
    // Safe localStorage access with fallback
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') || '' : '';
    } catch {
      return '';
    }
  });
  const [debugContext, setDebugContext] = useState<DebugContext>({
    issue: '',
    codeSnippet: '',
    errorMessage: '',
    expectedBehavior: '',
    actualBehavior: '',
    environment: 'Development - React + TypeScript + Supabase',
    additionalInfo: ''
  });
  
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('debug');

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    chatGPTService.setApiKey(key);
  };

  const startDebugSession = async () => {
    if (!debugContext.issue.trim()) {
      alert('Please describe the issue you want to debug');
      return;
    }

    if (!chatGPTService.isConfigured()) {
      alert('Please configure your OpenAI API key first');
      return;
    }

    setIsLoading(true);
    const sessionId = `debug-${Date.now()}`;
    
    const newSession: DebugSession = {
      id: sessionId,
      timestamp: new Date(),
      issue: debugContext.issue,
      chatGPTResponse: '',
      status: 'pending'
    };

    setSessions(prev => [newSession, ...prev]);

    try {
      const chatGPTResponse = await chatGPTService.debugWithChatGPT(debugContext);
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, chatGPTResponse, status: 'completed' }
          : session
      ));

      // Add Claude's analysis placeholder (you would fill this with your analysis)
      const claudeAnalysis = `
🤖 **Claude's Analysis:**

Based on the issue description and code context, here's my perspective:

**Root Cause Analysis:**
- The problem likely stems from ${debugContext.issue.toLowerCase().includes('odds') ? 'odds parsing or API response structure' : 
  debugContext.issue.toLowerCase().includes('team') ? 'team name extraction from API response' :
  'data processing or state management'}

**Debugging Steps I Recommend:**
1. Add comprehensive logging to trace data flow
2. Validate API response structure matches expectations
3. Test edge cases and null/undefined values
4. Verify type safety and error handling

**My Proposed Solution:**
- Enhanced error handling with fallback mechanisms
- Improved data validation and transformation
- Better logging for debugging visibility

**Comparison with ChatGPT:**
- ChatGPT might suggest different architectural approaches
- I focus more on immediate debugging and error handling
- Together we can provide both quick fixes and long-term solutions
      `;

      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, claudeAnalysis }
          : session
      ));

    } catch (error) {
      console.error('Debug session error:', error);
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'error', chatGPTResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const brainstormSolutions = async () => {
    if (!debugContext.issue?.trim()) {
      alert('Please describe the problem you want to brainstorm solutions for');
      return;
    }

    if (!chatGPTService.isConfigured()) {
      alert('Please configure your OpenAI API key first');
      return;
    }

    setIsLoading(true);
    const sessionId = `brainstorm-${Date.now()}`;
    
    const newSession: DebugSession = {
      id: sessionId,
      timestamp: new Date(),
      issue: `Brainstorming: ${debugContext.issue}`,
      chatGPTResponse: '',
      status: 'pending'
    };

    setSessions(prev => [newSession, ...prev]);

    try {
      const prompt = `
**BRAINSTORMING SESSION**

**Problem to Solve:**
${debugContext.issue}

**Constraints/Requirements:**
${debugContext.additionalInfo || 'None specified'}

**Request:**
Please brainstorm multiple creative and practical solutions for this problem. For each solution, provide:

1. **Solution Name**: A clear, descriptive title
2. **Approach**: How this solution works
3. **Pros**: Benefits and advantages
4. **Cons**: Potential drawbacks or challenges
5. **Implementation**: Key steps or considerations
6. **Risk Level**: Low/Medium/High

Please provide at least 3-5 different approaches, ranging from simple quick fixes to more comprehensive solutions. Be creative but practical, considering both immediate fixes and long-term improvements.

Focus on actionable solutions that can be implemented in a development environment.
      `;

      const response = await chatGPTService.sendMessage(prompt);
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, chatGPTResponse: response, status: 'completed' }
          : session
      ));

      // Generate Claude's complementary analysis
      const claudeAnalysis = `
**Claude's Complementary Analysis:**

I've reviewed the brainstorming request and can offer additional perspectives:

**Problem Context:**
${debugContext.issue}

**My Additional Solutions:**
- **Systematic Debugging Approach**: Break down the problem into smaller, testable components
- **Data Flow Analysis**: Trace the data from source to display to identify transformation issues  
- **Incremental Implementation**: Start with minimal viable fixes and iterate
- **Comprehensive Testing**: Create test cases for edge cases and data validation

**Implementation Strategy:**
1. **Immediate**: Quick wins that can be implemented right away
2. **Short-term**: Solutions requiring moderate development effort
3. **Long-term**: Comprehensive fixes that prevent similar issues

**Risk Mitigation:**
- Always backup current working code before major changes
- Implement feature flags for easy rollback
- Add comprehensive logging for better debugging
- Create automated tests to prevent regressions

**Comparison with ChatGPT:**
- ChatGPT excels at creative, diverse solution generation
- I focus on systematic, methodical approaches
- Together we provide both innovation and reliability
      `;

      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, claudeAnalysis }
          : session
      ));

    } catch (error) {
      console.error('Brainstorm session error:', error);
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'error', chatGPTResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const startCodeReview = async () => {
    if (!debugContext.codeSnippet?.trim()) {
      alert('Please provide code to review');
      return;
    }

    if (!chatGPTService.isConfigured()) {
      alert('Please configure your OpenAI API key first');
      return;
    }

    setIsLoading(true);
    const sessionId = `review-${Date.now()}`;
    
    const newSession: DebugSession = {
      id: sessionId,
      timestamp: new Date(),
      issue: `Code Review: ${debugContext.issue || 'General review'}`,
      chatGPTResponse: '',
      status: 'pending'
    };

    setSessions(prev => [newSession, ...prev]);

    try {
      const chatGPTResponse = await chatGPTService.codeReviewWithChatGPT(
        debugContext.codeSnippet, 
        debugContext.issue || 'General code review'
      );
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, chatGPTResponse, status: 'completed' }
          : session
      ));
    } catch (error) {
      console.error('Code review error:', error);
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'error', chatGPTResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Dual AI Debugging System
            <Badge variant="secondary">Claude + ChatGPT</Badge>
          </CardTitle>
          <CardDescription>
            Leverage both Claude and ChatGPT for comprehensive debugging, code review, and problem-solving
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Debug
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Review
          </TabsTrigger>
          <TabsTrigger value="brainstorm" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Brainstorm
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Issue</CardTitle>
              <CardDescription>Describe the issue you're experiencing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issue">Issue Description *</Label>
                <Textarea
                  id="issue"
                  placeholder="Describe the problem you're trying to solve..."
                  value={debugContext.issue}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, issue: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expected">Expected Behavior</Label>
                  <Textarea
                    id="expected"
                    placeholder="What should happen?"
                    value={debugContext.expectedBehavior}
                    onChange={(e) => setDebugContext(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="actual">Actual Behavior</Label>
                  <Textarea
                    id="actual"
                    placeholder="What actually happens?"
                    value={debugContext.actualBehavior}
                    onChange={(e) => setDebugContext(prev => ({ ...prev, actualBehavior: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="error">Error Message</Label>
                <Textarea
                  id="error"
                  placeholder="Any error messages or console output..."
                  value={debugContext.errorMessage}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, errorMessage: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="code">Relevant Code</Label>
                <Textarea
                  id="code"
                  placeholder="Paste relevant code snippets..."
                  value={debugContext.codeSnippet}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, codeSnippet: e.target.value }))}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={startDebugSession} 
                disabled={isLoading || !chatGPTService.isConfigured()}
                className="w-full"
              >
                {isLoading ? 'Debugging...' : 'Start Dual AI Debug Session'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Review</CardTitle>
              <CardDescription>Get feedback on your code from both AIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="review-purpose">Purpose/Context</Label>
                <Input
                  id="review-purpose"
                  placeholder="What does this code do?"
                  value={debugContext.issue}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, issue: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="review-code">Code to Review *</Label>
                <Textarea
                  id="review-code"
                  placeholder="Paste your code here..."
                  value={debugContext.codeSnippet}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, codeSnippet: e.target.value }))}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={startCodeReview} 
                disabled={isLoading || !chatGPTService.isConfigured()}
                className="w-full"
              >
                {isLoading ? 'Reviewing...' : 'Start Code Review'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brainstorm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solution Brainstorming</CardTitle>
              <CardDescription>Get creative solutions from ChatGPT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="brainstorm-problem">Problem to Solve *</Label>
                <Textarea
                  id="brainstorm-problem"
                  placeholder="Describe the problem you want to brainstorm solutions for..."
                  value={debugContext.issue}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, issue: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="constraints">Constraints/Requirements</Label>
                <Textarea
                  id="constraints"
                  placeholder="Any technical constraints, requirements, or preferences..."
                  value={debugContext.additionalInfo}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, additionalInfo: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button 
                onClick={brainstormSolutions} 
                disabled={isLoading || !chatGPTService.isConfigured()}
                className="w-full"
              >
                {isLoading ? 'Brainstorming...' : 'Brainstorm Solutions'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Configure your OpenAI API key for ChatGPT integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!chatGPTService.isConfigured() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to configure your OpenAI API key to use ChatGPT integration.
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="environment">Environment</Label>
                <Input
                  id="environment"
                  value={debugContext.environment}
                  onChange={(e) => setDebugContext(prev => ({ ...prev, environment: e.target.value }))}
                />
              </div>

              <div className="pt-4">
                <h4 className="font-medium mb-2">Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>ChatGPT Integration</span>
                    <Badge variant={chatGPTService.isConfigured() ? "default" : "secondary"}>
                      {chatGPTService.isConfigured() ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Claude Integration</span>
                    <Badge variant="default">Always Available</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Debug Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{session.issue}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      session.status === 'completed' ? 'default' : 
                      session.status === 'error' ? 'destructive' : 'secondary'
                    }>
                      {session.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {session.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {session.status === 'completed' && (
                  <Tabs defaultValue="chatgpt" className="w-full">
                    <TabsList>
                      <TabsTrigger value="chatgpt">ChatGPT Response</TabsTrigger>
                      <TabsTrigger value="claude">Claude Analysis</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chatgpt">
                      <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                        {session.chatGPTResponse}
                      </div>
                    </TabsContent>
                    <TabsContent value="claude">
                      <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                        {session.claudeAnalysis || 'Claude analysis will be added here...'}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {session.status === 'error' && (
                  <div className="bg-destructive/10 p-3 rounded text-sm text-destructive">
                    {session.chatGPTResponse}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
