/**
 * ChatGPT Integration Service
 * Provides dual AI debugging and coding assistance
 */

interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatGPTResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DebugContext {
  issue: string;
  codeSnippet?: string;
  errorMessage?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
  additionalInfo?: string;
}

class ChatGPTIntegrationService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    // Try to get API key from environment or localStorage
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || 
                  localStorage.getItem('openai_api_key') || 
                  null;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async sendMessage(messages: ChatGPTMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`ChatGPT API error: ${error.error?.message || response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response received';
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw error;
    }
  }

  async debugWithChatGPT(context: DebugContext): Promise<string> {
    const systemPrompt = `You are a senior software engineer specializing in TypeScript, React, and sports betting applications. You're working alongside Claude (Anthropic's AI) to debug and solve coding issues. 

Your role is to:
1. Provide a fresh perspective on the problem
2. Suggest alternative approaches Claude might not have considered
3. Identify potential edge cases or overlooked issues
4. Offer specific code solutions and debugging strategies

Be concise but thorough. Focus on actionable solutions.`;

    const userPrompt = `
DEBUGGING CONTEXT:
Issue: ${context.issue}

${context.codeSnippet ? `CODE SNIPPET:
\`\`\`typescript
${context.codeSnippet}
\`\`\`` : ''}

${context.errorMessage ? `ERROR MESSAGE:
${context.errorMessage}` : ''}

${context.expectedBehavior ? `EXPECTED BEHAVIOR:
${context.expectedBehavior}` : ''}

${context.actualBehavior ? `ACTUAL BEHAVIOR:
${context.actualBehavior}` : ''}

${context.environment ? `ENVIRONMENT:
${context.environment}` : ''}

${context.additionalInfo ? `ADDITIONAL INFO:
${context.additionalInfo}` : ''}

Please provide:
1. Your analysis of the root cause
2. Specific code fixes or debugging steps
3. Alternative approaches to consider
4. Potential edge cases to test
`;

    const messages: ChatGPTMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.sendMessage(messages);
  }

  async codeReviewWithChatGPT(code: string, purpose: string): Promise<string> {
    const systemPrompt = `You are a senior code reviewer working with Claude AI to improve code quality. Focus on:
1. Code correctness and potential bugs
2. Performance optimizations
3. TypeScript best practices
4. React/Frontend specific improvements
5. Security considerations
6. Maintainability and readability

Provide specific, actionable feedback.`;

    const userPrompt = `
PURPOSE: ${purpose}

CODE TO REVIEW:
\`\`\`typescript
${code}
\`\`\`

Please provide:
1. Potential issues or bugs
2. Performance improvements
3. Code quality suggestions
4. Alternative implementations
5. Testing recommendations
`;

    const messages: ChatGPTMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.sendMessage(messages);
  }

  async brainstormSolutionsWithChatGPT(problem: string, constraints?: string): Promise<string> {
    const systemPrompt = `You are a creative problem solver working with Claude AI. Your goal is to think outside the box and provide innovative solutions that Claude might not consider. Focus on:
1. Alternative architectural approaches
2. Creative use of existing technologies
3. Novel debugging techniques
4. Unconventional but effective solutions
5. Industry best practices from other domains that could apply

Be creative but practical.`;

    const userPrompt = `
PROBLEM TO SOLVE:
${problem}

${constraints ? `CONSTRAINTS:
${constraints}` : ''}

Please brainstorm:
1. 3-5 different approaches to solve this problem
2. Pros and cons of each approach
3. Implementation complexity estimates
4. Potential risks and mitigation strategies
5. Recommended approach with reasoning
`;

    const messages: ChatGPTMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.sendMessage(messages);
  }

  async getSecondOpinion(claudeAnalysis: string, issue: string): Promise<string> {
    const systemPrompt = `You are reviewing an analysis provided by Claude AI. Your job is to:
1. Validate Claude's analysis
2. Identify any gaps or missed considerations
3. Suggest additional debugging steps
4. Provide alternative solutions
5. Highlight potential risks Claude might have missed

Be constructive and collaborative.`;

    const userPrompt = `
ORIGINAL ISSUE:
${issue}

CLAUDE'S ANALYSIS:
${claudeAnalysis}

Please provide:
1. Your assessment of Claude's analysis (agree/disagree and why)
2. Additional considerations or edge cases
3. Alternative debugging approaches
4. Supplementary solutions
5. Risk assessment and mitigation strategies
`;

    const messages: ChatGPTMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.sendMessage(messages);
  }
}

export const chatGPTService = new ChatGPTIntegrationService();
export type { DebugContext };
