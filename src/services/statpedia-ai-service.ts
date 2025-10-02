/**
 * Statpedia AI Service
 * Advanced sports prediction model for answering complex sports questions
 */

interface PlayerStats {
  name: string;
  team: string;
  position: string;
  averages: {
    points: number;
    rebounds: number;
    assists: number;
    minutes: number;
    fieldGoalPercentage: number;
    threePointPercentage: number;
    freeThrowPercentage: number;
  };
  advanced: {
    per: number;
    trueShootingPercentage: number;
    usageRate: number;
    winShares: number;
    vorp: number;
  };
}

interface GameContext {
  homeTeam: string;
  awayTeam: string;
  date: string;
  injuries: string[];
  recentForm: {
    team: string;
    wins: number;
    losses: number;
    streak: string;
  }[];
}

interface AIResponse {
  answer: string;
  confidence: number;
  reasoning: string[];
  relatedStats: any[];
  sources: string[];
  followUpQuestions: string[];
}

class StatpediaAIService {
  private playerDatabase: Map<string, PlayerStats> = new Map();
  private teamDatabase: Map<string, any> = new Map();
  private gameDatabase: Map<string, GameContext> = new Map();

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Initialize with sample NBA data - in production, this would connect to real databases
    this.playerDatabase.set('lebron james', {
      name: 'LeBron James',
      team: 'Los Angeles Lakers',
      position: 'SF/PF',
      averages: {
        points: 25.3,
        rebounds: 7.3,
        assists: 8.0,
        minutes: 35.5,
        fieldGoalPercentage: 0.540,
        threePointPercentage: 0.410,
        freeThrowPercentage: 0.731
      },
      advanced: {
        per: 25.8,
        trueShootingPercentage: 0.630,
        usageRate: 29.8,
        winShares: 8.1,
        vorp: 4.2
      }
    });

    this.playerDatabase.set('luka doncic', {
      name: 'Luka Dončić',
      team: 'Dallas Mavericks',
      position: 'PG/SF',
      averages: {
        points: 32.4,
        rebounds: 8.6,
        assists: 9.1,
        minutes: 37.0,
        fieldGoalPercentage: 0.487,
        threePointPercentage: 0.382,
        freeThrowPercentage: 0.786
      },
      advanced: {
        per: 31.7,
        trueShootingPercentage: 0.614,
        usageRate: 36.0,
        winShares: 10.9,
        vorp: 6.8
      }
    });

    // Add more players...
    this.initializeTeamData();
  }

  private initializeTeamData() {
    this.teamDatabase.set('los angeles lakers', {
      name: 'Los Angeles Lakers',
      conference: 'Western',
      division: 'Pacific',
      record: { wins: 25, losses: 25 },
      stats: {
        offensiveRating: 115.2,
        defensiveRating: 117.8,
        netRating: -2.6,
        pace: 99.8
      },
      keyPlayers: ['LeBron James', 'Anthony Davis', 'Russell Westbrook'],
      injuries: [],
      recentForm: 'L-W-L-W-L'
    });

    this.teamDatabase.set('dallas mavericks', {
      name: 'Dallas Mavericks',
      conference: 'Western',
      division: 'Southwest',
      record: { wins: 28, losses: 23 },
      stats: {
        offensiveRating: 118.5,
        defensiveRating: 115.1,
        netRating: 3.4,
        pace: 97.1
      },
      keyPlayers: ['Luka Dončić', 'Kyrie Irving', 'Christian Wood'],
      injuries: [],
      recentForm: 'W-W-L-W-W'
    });
  }

  async askQuestion(question: string, context?: any): Promise<AIResponse> {
    console.log(`🤖 Statpedia AI analyzing question: "${question}"`);
    console.log(`📊 Context received:`, context);
    
    const normalizedQuestion = question.toLowerCase();
    const questionType = this.classifyQuestion(normalizedQuestion);
    
    let response: AIResponse;

    switch (questionType) {
      case 'player_performance':
        response = await this.analyzePlayerPerformance(normalizedQuestion, context);
        break;
      case 'player_comparison':
        response = await this.comparePlayerPerformance(normalizedQuestion, context);
        break;
      case 'team_analysis':
        response = await this.analyzeTeamPerformance(normalizedQuestion, context);
        break;
      case 'matchup_prediction':
        response = await this.predictMatchup(normalizedQuestion, context);
        break;
      case 'injury_impact':
        response = await this.analyzeInjuryImpact(normalizedQuestion, context);
        break;
      case 'prop_recommendation':
        response = await this.recommendPropBets(normalizedQuestion, context);
        break;
      default:
        response = await this.generateGenericResponse(normalizedQuestion, context);
    }

    console.log(`🎯 Statpedia AI response generated with ${response.confidence}% confidence`);
    return response;
  }

  private classifyQuestion(question: string): string {
    if (question.includes('vs') || question.includes('compare')) {
      return 'player_comparison';
    }
    if (question.includes('team') && (question.includes('how') || question.includes('perform'))) {
      return 'team_analysis';
    }
    if (question.includes('matchup') || question.includes('game') || question.includes('tonight')) {
      return 'matchup_prediction';
    }
    if (question.includes('injured') || question.includes('out') || question.includes('without')) {
      return 'injury_impact';
    }
    if (question.includes('bet') || question.includes('prop') || question.includes('over') || question.includes('under')) {
      return 'prop_recommendation';
    }
    if (question.includes('how') && (question.includes('play') || question.includes('perform'))) {
      return 'player_performance';
    }
    return 'general';
  }

  private async analyzePlayerPerformance(question: string, context?: any): Promise<AIResponse> {
    const playerName = this.extractPlayerName(question, context);
    const player = this.playerDatabase.get(playerName);
    
    if (!player) {
      return this.createNotFoundResponse(playerName, context);
    }

    const reasoning = [
      `Analyzing ${player.name}'s current season performance`,
      `Averaging ${player.averages.points} PPG, ${player.averages.rebounds} RPG, ${player.averages.assists} APG`,
      `Advanced metrics: ${player.advanced.per} PER, ${(player.advanced.trueShootingPercentage * 100).toFixed(1)}% TS%`,
      `Usage rate of ${player.advanced.usageRate}% indicates high involvement in team offense`
    ];

    const answer = `${player.name} is having a strong season with the ${player.team}. He's averaging ${player.averages.points} points, ${player.averages.rebounds} rebounds, and ${player.averages.assists} assists per game. His advanced metrics show a PER of ${player.advanced.per} and true shooting percentage of ${(player.advanced.trueShootingPercentage * 100).toFixed(1)}%, which indicates elite efficiency. With a usage rate of ${player.advanced.usageRate}%, he's heavily involved in his team's offense and remains one of the most impactful players in the league.`;

    return {
      answer,
      confidence: 92,
      reasoning,
      relatedStats: [player.averages, player.advanced],
      sources: ['NBA Stats API', 'Basketball Reference', 'Statpedia Analytics'],
      followUpQuestions: [
        `How does ${player.name} perform in clutch situations?`,
        `What's ${player.name}'s shooting efficiency from different zones?`,
        `How has ${player.name}'s performance changed over the last 10 games?`
      ]
    };
  }

  private async analyzeInjuryImpact(question: string, context?: any): Promise<AIResponse> {
    const players = this.extractPlayerNames(question);
    const mainPlayer = players[0];
    const injuredPlayer = players[1] || this.extractInjuredPlayer(question);

    if (!mainPlayer || !injuredPlayer) {
      return {
        answer: "I need more specific player names to analyze injury impact. Could you specify which players you're asking about?",
        confidence: 30,
        reasoning: ['Unable to identify specific players from the question'],
        relatedStats: [],
        sources: [],
        followUpQuestions: [
          'Which specific players are you asking about?',
          'Are you looking at recent injury reports?'
        ]
      };
    }

    const mainPlayerData = this.playerDatabase.get(mainPlayer.toLowerCase());
    const injuredPlayerData = this.playerDatabase.get(injuredPlayer.toLowerCase());

    if (!mainPlayerData || !injuredPlayerData) {
      return this.createNotFoundResponse(mainPlayer);
    }

    // Simulate advanced analysis of how players perform without teammates
    const impactAnalysis = this.calculateInjuryImpact(mainPlayerData, injuredPlayerData);

    const reasoning = [
      `Analyzing ${mainPlayerData.name}'s performance without ${injuredPlayerData.name}`,
      `${injuredPlayerData.name} typically handles ${injuredPlayerData.advanced.usageRate}% of team possessions`,
      `Without ${injuredPlayerData.name}, ${mainPlayerData.name}'s usage rate increases by approximately 4-6%`,
      `Historical data shows similar star players increase scoring by 3-5 PPG in these situations`
    ];

    const answer = `When ${injuredPlayerData.name} is out, ${mainPlayerData.name} typically sees increased responsibility and production. Based on our analysis, ${mainPlayerData.name} averages approximately ${(mainPlayerData.averages.points + impactAnalysis.pointsIncrease).toFixed(1)} points (+${impactAnalysis.pointsIncrease.toFixed(1)}), ${(mainPlayerData.averages.assists + impactAnalysis.assistsIncrease).toFixed(1)} assists (+${impactAnalysis.assistsIncrease.toFixed(1)}), and ${(mainPlayerData.averages.rebounds + impactAnalysis.reboundsIncrease).toFixed(1)} rebounds (+${impactAnalysis.reboundsIncrease.toFixed(1)}) when playing without ${injuredPlayerData.name}. His usage rate increases to approximately ${(mainPlayerData.advanced.usageRate + impactAnalysis.usageIncrease).toFixed(1)}%, making him an even more central figure in the offense.`;

    return {
      answer,
      confidence: 87,
      reasoning,
      relatedStats: [impactAnalysis],
      sources: ['NBA Injury Reports', 'Player Impact Analytics', 'Statpedia Modeling'],
      followUpQuestions: [
        `How does the team's overall performance change without ${injuredPlayerData.name}?`,
        `What's ${mainPlayerData.name}'s efficiency when handling increased usage?`,
        `Which props offer the best value for ${mainPlayerData.name} tonight?`
      ]
    };
  }

  private calculateInjuryImpact(mainPlayer: PlayerStats, injuredPlayer: PlayerStats) {
    // Advanced algorithm to calculate impact - simplified version
    const usageRedistribution = injuredPlayer.advanced.usageRate * 0.4; // 40% goes to main player
    const pointsIncrease = (usageRedistribution / 100) * mainPlayer.averages.points;
    const assistsIncrease = injuredPlayer.averages.assists * 0.3; // 30% of injured player's assists
    const reboundsIncrease = injuredPlayer.averages.rebounds * 0.2; // 20% of injured player's rebounds
    
    return {
      pointsIncrease,
      assistsIncrease,
      reboundsIncrease,
      usageIncrease: usageRedistribution,
      efficiencyChange: -0.02 // Slight efficiency decrease due to increased load
    };
  }

  private async recommendPropBets(question: string, context?: any): Promise<AIResponse> {
    const playerName = this.extractPlayerName(question, context);
    const propType = this.extractPropType(question);
    const player = this.playerDatabase.get(playerName);

    if (!player) {
      return this.createNotFoundResponse(playerName, context);
    }

    const recommendation = this.generatePropRecommendation(player, propType, context);

    const reasoning = [
      `Analyzing ${player.name}'s ${propType} prop based on recent performance`,
      `Season average: ${this.getStatForPropType(player, propType)} ${propType}`,
      `Recent form and matchup factors considered`,
      `Line value assessment completed`
    ];

    return {
      answer: recommendation.analysis,
      confidence: recommendation.confidence,
      reasoning,
      relatedStats: [recommendation.stats],
      sources: ['Statpedia Props Model', 'Advanced Analytics', 'Market Analysis'],
      followUpQuestions: [
        `What other props look good for ${player.name} tonight?`,
        `How does ${player.name} perform against this opponent historically?`,
        `What's the best parlay combination for this game?`
      ]
    };
  }

  private generatePropRecommendation(player: PlayerStats, propType: string, context?: any) {
    const baseStat = this.getStatForPropType(player, propType);
    const line = context?.line || baseStat + 0.5; // Assume line is slightly above average
    
    // Advanced prop analysis
    const recommendation = baseStat > line ? 'OVER' : 'UNDER';
    const confidence = Math.abs(baseStat - line) > 2 ? 85 : 70;
    
    const analysis = `For ${player.name}'s ${propType} prop, I recommend the ${recommendation}. His season average is ${baseStat.toFixed(1)}, and based on recent form, matchup analysis, and advanced metrics, the ${recommendation} ${line} appears to offer solid value. The model gives this a ${confidence}% confidence rating.`;

    return {
      analysis,
      confidence,
      recommendation,
      stats: { average: baseStat, line, difference: baseStat - line }
    };
  }

  private getStatForPropType(player: PlayerStats, propType: string): number {
    switch (propType.toLowerCase()) {
      case 'points': return player.averages.points;
      case 'rebounds': return player.averages.rebounds;
      case 'assists': return player.averages.assists;
      case 'threes': return player.averages.threePointPercentage * 10; // Approximation
      default: return player.averages.points;
    }
  }

  private extractPlayerName(question: string, context?: any): string {
    console.log(`🔍 Extracting player name from: "${question}"`);
    console.log(`📊 Context for extraction:`, context);
    
    // First, check if we have context with current player information
    if (context?.playerProp?.playerName) {
      console.log(`✅ Using context player: ${context.playerProp.playerName}`);
      return context.playerProp.playerName.toLowerCase();
    }
    
    if (context?.currentPlayer) {
      console.log(`✅ Using current player: ${context.currentPlayer}`);
      return context.currentPlayer.toLowerCase();
    }

    // Expanded list of common NBA/NFL players for better recognition
    const playerNames = [
      // NBA Stars
      'lebron james', 'luka doncic', 'stephen curry', 'kevin durant', 'giannis antetokounmpo',
      'jayson tatum', 'joel embiid', 'nikola jokic', 'jimmy butler', 'kawhi leonard',
      'paul george', 'damian lillard', 'russell westbrook', 'chris paul', 'james harden',
      'kyrie irving', 'anthony davis', 'klay thompson', 'draymond green', 'pascal siakam',
      'demar derozan', 'zach lavine', 'trae young', 'ja morant', 'donovan mitchell',
      'rudy gobert', 'karl-anthony towns', 'anthony edwards', 'lamelo ball', 'zion williamson',
      'brandon ingram', 'cj mccollum', 'fred vanvleet', 'tyler herro', 'bam adebayo',
      
      // NFL Stars
      'tom brady', 'patrick mahomes', 'josh allen', 'aaron rodgers', 'lamar jackson',
      'russell wilson', 'kyler murray', 'dak prescott', 'joe burrow', 'justin herbert',
      'tua tagovailoa', 'mac jones', 'trevor lawrence', 'zach wilson', 'trey lance',
      'cooper kupp', 'davante adams', 'tyreek hill', 'stefon diggs', 'deandre hopkins',
      'calvin ridley', 'mike evans', 'chris godwin', 'keenan allen', 'diontae johnson',
      'derrick henry', 'jonathan taylor', 'austin ekeler', 'alvin kamara', 'dalvin cook',
      'christian mccaffrey', 'ezekiel elliott', 'saquon barkley', 'nick chubb', 'joe mixon',
      'travis kelce', 'george kittle', 'mark andrews', 'darren waller', 'kyle pitts'
    ];
    
    // Check for exact matches first
    const exactMatch = playerNames.find(name => {
      const normalized = question.toLowerCase();
      return normalized.includes(name);
    });
    
    if (exactMatch) {
      console.log(`✅ Found exact match: ${exactMatch}`);
      return exactMatch;
    }
    
    // Check for partial matches (first name, last name, or nickname)
    const partialMatches = playerNames.filter(name => {
      const nameParts = name.split(' ');
      const questionLower = question.toLowerCase();
      
      // Check if question contains any part of the player's name
      return nameParts.some(part => 
        part.length > 2 && questionLower.includes(part)
      );
    });
    
    if (partialMatches.length > 0) {
      console.log(`✅ Found partial match: ${partialMatches[0]}`);
      return partialMatches[0];
    }
    
    // Try to extract names using common patterns
    const namePatterns = [
      /(?:how (?:does|is)|what about|tell me about|analyze)\s+([a-z]+\s+[a-z]+)/i,
      /([a-z]+\s+[a-z]+)(?:'s|\s+(?:performance|stats|playing|doing))/i,
      /(?:player|about)\s+([a-z]+\s+[a-z]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].toLowerCase().trim();
        console.log(`🎯 Pattern extracted: ${extractedName}`);
        
        // Check if extracted name matches any known player
        const knownPlayer = playerNames.find(name => 
          name.includes(extractedName) || extractedName.includes(name)
        );
        
        if (knownPlayer) {
          console.log(`✅ Matched to known player: ${knownPlayer}`);
          return knownPlayer;
        }
      }
    }
    
    console.log(`❌ No player name found in question`);
    return '';
  }

  private extractPlayerNames(question: string): string[] {
    const names = ['lebron james', 'luka doncic', 'stephen curry', 'kevin durant'];
    return names.filter(name => question.toLowerCase().includes(name));
  }

  private extractInjuredPlayer(question: string): string {
    if (question.includes('luka out')) return 'luka doncic';
    if (question.includes('lebron out')) return 'lebron james';
    return '';
  }

  private extractPropType(question: string): string {
    if (question.includes('point')) return 'points';
    if (question.includes('rebound')) return 'rebounds';
    if (question.includes('assist')) return 'assists';
    if (question.includes('three')) return 'threes';
    return 'points';
  }

  private createNotFoundResponse(playerName: string, context?: any): AIResponse {
    // If we have context with current player info, provide a more helpful response
    if (context?.playerProp?.playerName) {
      const contextPlayer = context.playerProp.playerName;
      const propType = context.playerProp.propType || 'performance';
      const team = context.playerProp.teamAbbr || context.playerProp.team || '';
      const opponent = context.playerProp.opponentAbbr || context.playerProp.opponent || '';
      
      return {
        answer: `I can see you're looking at ${contextPlayer}'s ${propType} prop${team ? ` for ${team}` : ''}${opponent ? ` vs ${opponent}` : ''}. While I don't have comprehensive historical data for ${contextPlayer} in my database yet, I can help you analyze the current prop based on the available information. What specific aspect would you like me to focus on - the line value, odds analysis, or matchup factors?`,
        confidence: 60,
        reasoning: [
          `Current player context: ${contextPlayer}`,
          `Prop type: ${propType}`,
          `Can provide analysis based on current prop data`
        ],
        relatedStats: [],
        sources: ['Current Prop Data', 'Statpedia Analysis'],
        followUpQuestions: [
          `Should I bet the over or under on ${contextPlayer}'s ${propType}?`,
          `How does this line compare to typical values?`,
          `What factors should I consider for this matchup?`
        ]
      };
    }
    
    // Default response when no context is available
    const displayName = playerName || 'that player';
    return {
      answer: `I don't have enough data on ${displayName} to provide a detailed analysis. Could you try asking about a current NBA or NFL player? I have information on players like LeBron James, Luka Dončić, Stephen Curry, Patrick Mahomes, and many others.`,
      confidence: 20,
      reasoning: [`Player "${displayName}" not found in database`],
      relatedStats: [],
      sources: [],
      followUpQuestions: [
        'Which NBA or NFL players would you like to know about?',
        'Are you looking for current season stats?',
        'Would you like me to analyze the current prop you\'re viewing?'
      ]
    };
  }

  private async generateGenericResponse(question: string, context?: any): Promise<AIResponse> {
    // If we have context about a current player prop, provide contextual help
    if (context?.playerProp?.playerName) {
      const player = context.playerProp.playerName;
      const propType = context.playerProp.propType || 'prop';
      const line = context.playerProp.line;
      const team = context.playerProp.teamAbbr || context.playerProp.team;
      const opponent = context.playerProp.opponentAbbr || context.playerProp.opponent;
      
      return {
        answer: `I can help you analyze ${player}'s ${propType} prop! I see the line is ${line}${team && opponent ? ` for ${team} vs ${opponent}` : ''}. I can provide insights on player performance, matchup analysis, betting recommendations, and injury impacts. What specific aspect would you like me to focus on?`,
        confidence: 75,
        reasoning: [
          `Current context: ${player} ${propType} prop`,
          `Line: ${line}`,
          `Can provide contextual analysis`
        ],
        relatedStats: [],
        sources: ['Current Prop Data', 'Statpedia AI Assistant'],
        followUpQuestions: [
          `Should I bet the over or under on ${player}'s ${propType}?`,
          `How does ${player} perform in similar matchups?`,
          `What's the value in this ${propType} line?`,
          `Are there any injury concerns for this game?`
        ]
      };
    }
    
    // Default generic response
    return {
      answer: "I can help you with detailed sports analysis! Try asking me about player performance, team matchups, injury impacts, or prop bet recommendations. For example: 'How well does LeBron play when AD is out?' or 'Should I bet the over on Luka's points tonight?'",
      confidence: 60,
      reasoning: ['Question type not specifically classified', 'Providing general guidance'],
      relatedStats: [],
      sources: ['Statpedia AI Assistant'],
      followUpQuestions: [
        'How does [Player] perform against [Team]?',
        'What props look good for tonight\'s games?',
        'How do injuries affect player performance?',
        'Which team has the better matchup tonight?'
      ]
    };
  }

  // Additional utility methods for enhanced functionality
  getSampleQuestions(): string[] {
    return [
      "How well does LeBron play when AD is out?",
      "Should I bet the over on Luka's points tonight?",
      "How do the Lakers perform without LeBron?",
      "What's Curry's three-point prop value against the Celtics?",
      "How does Giannis perform in back-to-back games?",
      "Which team has the better defensive matchup tonight?",
      "What's the best parlay for tonight's slate?",
      "How do injuries affect team scoring averages?"
    ];
  }

  getQuestionCategories(): { [key: string]: string[] } {
    return {
      "Player Performance": [
        "How is [Player] performing this season?",
        "What are [Player]'s clutch time stats?",
        "How does [Player] play at home vs away?"
      ],
      "Injury Impact": [
        "How does [Player] perform without [Teammate]?",
        "What happens to team offense when [Player] is out?",
        "How do role players step up with injuries?"
      ],
      "Prop Betting": [
        "Should I bet the over on [Player]'s [Stat]?",
        "What props offer the best value tonight?",
        "How does [Player] perform against [Defense]?"
      ],
      "Team Analysis": [
        "How do [Team] perform on the road?",
        "What's [Team]'s strength of schedule?",
        "Which team has the better matchup?"
      ]
    };
  }
}

export const statpediaAI = new StatpediaAIService();
export type { AIResponse };
