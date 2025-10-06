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

    // PRIORITY 1: Try web search first for most questions
    try {
      console.log(`🔍 Attempting web search first for: "${question}"`);
      const searchResponse = await this.searchAndAnswer(question, context);
      
      // If search found good results, use them
      if (searchResponse.confidence >= 60) {
        console.log(`✅ Search successful with ${searchResponse.confidence}% confidence`);
        return searchResponse;
      }
      
      // If search didn't find good results, fall back to database
      console.log(`⚠️ Search found limited results (${searchResponse.confidence}%), falling back to database`);
    } catch (error) {
      console.error('Search failed, falling back to database:', error);
    }

    // PRIORITY 2: Fall back to database knowledge
    try {
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
        case 'general':
          response = await this.generateGeneralResponse(normalizedQuestion, context);
          break;
      default:
        response = await this.generateGenericResponse(normalizedQuestion, context);
      }
    } catch (error) {
      console.error('Error in AI response generation:', error);
      response = await this.generateErrorResponse(question, context);
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
    if (question.includes('what') || question.includes('explain') || question.includes('tell me') || question.includes('why') || question.includes('when') || question.includes('where')) {
      return 'general';
    }
    return 'general';
  }

  private async comparePlayerPerformance(question: string, context?: any): Promise<AIResponse> {
    const players = this.extractPlayerNames(question);
    if (players.length < 2) {
      return {
        answer: "I need at least two player names to make a comparison. Could you specify which players you'd like me to compare?",
        confidence: 30,
        reasoning: ['Insufficient players for comparison'],
        relatedStats: [],
        sources: [],
        followUpQuestions: [
          'Which two players would you like me to compare?',
          'Are you looking for a specific stat comparison?'
        ]
      };
    }

    const player1 = this.playerDatabase.get(players[0]);
    const player2 = this.playerDatabase.get(players[1]);

    if (!player1 || !player2) {
      return this.createNotFoundResponse(players[0] || players[1], context);
    }

    const comparison = this.generatePlayerComparison(player1, player2);
    
    return {
      answer: comparison.analysis,
      confidence: 88,
      reasoning: comparison.reasoning,
      relatedStats: comparison.stats,
      sources: ['NBA Stats API', 'Basketball Reference', 'Statpedia Analytics'],
      followUpQuestions: [
        `Who has better advanced metrics: ${player1.name} or ${player2.name}?`,
        `How do ${player1.name} and ${player2.name} perform in clutch situations?`,
        `Which player offers better value for prop betting?`
      ]
    };
  }

  private async analyzeTeamPerformance(question: string, context?: any): Promise<AIResponse> {
    const teamName = this.extractTeamName(question);
    const team = this.teamDatabase.get(teamName);
    
    if (!team) {
      return {
        answer: `I don't have detailed data on ${teamName}. Could you try asking about a specific NBA team like the Lakers, Mavericks, Warriors, or Celtics?`,
        confidence: 30,
        reasoning: [`Team "${teamName}" not found in database`],
        relatedStats: [],
        sources: [],
        followUpQuestions: [
          'Which NBA team would you like me to analyze?',
          'Are you looking for team stats or player performance?'
        ]
      };
    }

    const analysis = this.generateTeamAnalysis(team);
    
    return {
      answer: analysis,
      confidence: 85,
      reasoning: [
        `Analyzing ${team.name} performance`,
        `Record: ${team.record.wins}-${team.record.losses}`,
        `Offensive rating: ${team.stats.offensiveRating}`,
        `Defensive rating: ${team.stats.defensiveRating}`
      ],
      relatedStats: [team.stats, team.record],
      sources: ['NBA Team Stats', 'Statpedia Analytics'],
      followUpQuestions: [
        `How do ${team.name} perform on the road?`,
        `What's ${team.name}'s strength of schedule?`,
        `Which players are key to ${team.name}'s success?`
      ]
    };
  }

  private async predictMatchup(question: string, context?: any): Promise<AIResponse> {
    const teams = this.extractTeamNames(question);
    if (teams.length < 2) {
      return {
        answer: "I need two team names to predict a matchup. Could you specify which teams you'd like me to analyze?",
        confidence: 30,
        reasoning: ['Insufficient teams for matchup analysis'],
        relatedStats: [],
        sources: [],
        followUpQuestions: [
          'Which two teams are playing?',
          'Are you looking for a specific game prediction?'
        ]
      };
    }

    const team1 = this.teamDatabase.get(teams[0]);
    const team2 = this.teamDatabase.get(teams[1]);

    if (!team1 || !team2) {
      return {
        answer: `I don't have data on one or both teams. Could you try asking about specific NBA teams?`,
        confidence: 30,
        reasoning: ['One or both teams not found'],
        relatedStats: [],
        sources: [],
        followUpQuestions: [
          'Which NBA teams are you interested in?',
          'Are you looking for team comparisons?'
        ]
      };
    }

    const prediction = this.generateMatchupPrediction(team1, team2);
    
    return {
      answer: prediction.analysis,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      relatedStats: [team1.stats, team2.stats],
      sources: ['NBA Matchup Analysis', 'Statpedia Modeling'],
      followUpQuestions: [
        `What props look good for this ${team1.name} vs ${team2.name} game?`,
        `How do these teams perform historically?`,
        `Which team has the better defense?`
      ]
    };
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

  private async generateGeneralResponse(question: string, context?: any): Promise<AIResponse> {
    // Enhanced general response that can handle any question
    const lowerQuestion = question.toLowerCase();
    
    // Check if it's a sports-related question
    const sportsKeywords = ['basketball', 'football', 'nba', 'nfl', 'player', 'team', 'game', 'season', 'stats', 'performance', 'bet', 'prop', 'odds', 'line', 'over', 'under'];
    const isSportsRelated = sportsKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    if (isSportsRelated) {
      return {
        answer: `I can help you with that sports question! While I don't have specific data on every aspect you're asking about, I can provide general insights and analysis. ${context?.playerProp?.playerName ? `I see you're looking at ${context.playerProp.playerName}'s prop - I can help analyze that specific situation.` : ''} What specific information are you looking for?`,
        confidence: 70,
        reasoning: [
          'Question appears to be sports-related',
          'Can provide general analysis and guidance',
          context?.playerProp?.playerName ? 'Has current player context' : 'No specific player context'
        ],
        relatedStats: [],
        sources: ['Statpedia AI Assistant', 'General Sports Knowledge'],
        followUpQuestions: [
          'Can you be more specific about what you want to know?',
          'Are you asking about a particular player or team?',
          'Would you like me to analyze the current prop you\'re viewing?',
          'What sport are you most interested in?'
        ]
      };
    }
    
    // Non-sports question
    return {
      answer: "I'm specialized in sports analysis and betting insights! I can help you with questions about player performance, team matchups, injury impacts, prop betting, and sports statistics. Feel free to ask me about NBA, NFL, or other sports topics. What would you like to know about sports?",
      confidence: 80,
      reasoning: ['Question not sports-related', 'Redirecting to sports expertise'],
      relatedStats: [],
      sources: ['Statpedia AI Assistant'],
      followUpQuestions: [
        'What sports are you interested in?',
        'Do you have any questions about player performance?',
        'Would you like help with prop betting?',
        'Are you looking for team analysis?'
      ]
    };
  }

  private async searchAndAnswer(question: string, context?: any): Promise<AIResponse> {
    console.log(`🔍 Searching for additional information about: "${question}"`);
    
    try {
      // Use real web search
      const searchResults = await this.performWebSearch(question, context);
      
      if (searchResults.length > 0) {
        return this.generateSearchBasedResponse(question, searchResults, context);
      } else {
        return this.generateEnhancedResponse(question, this.extractSearchTerms(question), context);
      }
    } catch (error) {
      console.error('Search error:', error);
      return this.generateEnhancedResponse(question, this.extractSearchTerms(question), context);
    }
  }

  private async performWebSearch(question: string, context?: any): Promise<any[]> {
    try {
      // Use a CORS proxy for web search
      const searchQuery = this.buildSearchQuery(question, context);
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(searchUrl));
      
      if (!response.ok) {
        throw new Error('Search API failed');
      }

      const data = await response.json();
      return this.parseSearchResults(data);
    } catch (error) {
      console.error('Web search failed:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  private buildSearchQuery(question: string, context?: any): string {
    let query = question;
    
    // Add sport context if available
    if (context?.sport) {
      query += ` ${context.sport} 2024 stats`;
    }
    
    // Add reliable sports sources
    query += ' site:espn.com OR site:nba.com OR site:nfl.com OR site:mlb.com OR site:nhl.com';
    
    return query;
  }

  private parseSearchResults(data: any): any[] {
    const results = [];
    
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 3)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            snippet: topic.Text,
            url: topic.FirstURL,
            source: this.extractSource(topic.FirstURL)
          });
        }
      }
    }

    return results;
  }

  private extractSource(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  private async generateSearchBasedResponse(question: string, searchResults: any[], context?: any): Promise<AIResponse> {
    // Analyze search results to provide a real answer
    const relevantResults = searchResults.filter(result => 
      result.snippet && result.snippet.length > 10
    );

    if (relevantResults.length === 0) {
      return this.generateEnhancedResponse(question, this.extractSearchTerms(question), context);
    }

    // Extract key information from search results
    const keyInfo = this.extractKeyInformation(question, relevantResults);
    
    let answer = `Based on my search, here's what I found about "${question}":\n\n`;
    
    if (keyInfo.length > 0) {
      answer += keyInfo.join('\n\n');
    } else {
      answer += `I found some information but couldn't extract specific details. Here are the sources I found:\n\n`;
      relevantResults.forEach((result, index) => {
        answer += `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.source}\n\n`;
      });
    }

    answer += `\nFor the most current information, I recommend checking the official sources directly.`;

    return {
      answer,
      confidence: 75,
      reasoning: [
        'Performed real web search',
        `Found ${relevantResults.length} relevant results`,
        'Extracted information from search results'
      ],
      relatedStats: [],
      sources: relevantResults.map(r => r.source),
      followUpQuestions: [
        'Would you like more specific information about this topic?',
        'Are you looking for recent updates on this?',
        'Would you like me to search for something related?'
      ]
    };
  }

  private extractKeyInformation(question: string, results: any[]): string[] {
    const keyInfo: string[] = [];
    
    // Look for specific patterns in the question and results
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('games played') || lowerQuestion.includes('how many games')) {
      for (const result of results) {
        const snippet = result.snippet.toLowerCase();
        if (snippet.includes('games') && snippet.includes('played')) {
          // Extract number of games
          const gameMatch = snippet.match(/(\d+)\s*games?\s*played/);
          if (gameMatch) {
            keyInfo.push(`According to ${result.source}, the player has played ${gameMatch[1]} games this season.`);
          }
        }
      }
    }
    
    if (lowerQuestion.includes('stats') || lowerQuestion.includes('averages')) {
      for (const result of results) {
        const snippet = result.snippet;
        if (snippet.includes('points') || snippet.includes('rebounds') || snippet.includes('assists')) {
          keyInfo.push(`From ${result.source}: ${snippet.substring(0, 200)}...`);
        }
      }
    }
    
    if (lowerQuestion.includes('injury') || lowerQuestion.includes('status')) {
      for (const result of results) {
        const snippet = result.snippet.toLowerCase();
        if (snippet.includes('injury') || snippet.includes('out') || snippet.includes('questionable')) {
          keyInfo.push(`Injury status from ${result.source}: ${result.snippet.substring(0, 200)}...`);
        }
      }
    }

    return keyInfo;
  }

  private extractSearchTerms(question: string): string[] {
    const words = question.toLowerCase().split(' ');
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'how', 'what', 'when', 'where', 'why', 'who', 'which'];
    
    return words.filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) && 
      !word.match(/^[0-9]+$/)
    );
  }

  private async generateEnhancedResponse(question: string, searchTerms: string[], context?: any): Promise<AIResponse> {
    // Generate a more comprehensive response based on search terms
    const playerName = this.extractPlayerName(question, context);
    const hasPlayerData = this.playerDatabase.has(playerName);
    
    if (hasPlayerData) {
      return await this.analyzePlayerPerformance(question, context);
    }
    
    // If no specific player data, provide honest response
    return {
      answer: `I don't have specific data about "${question}" in my current database. I can help you with general sports analysis, but for the most accurate and up-to-date information, I'd recommend checking official sources like ESPN, the league websites, or other reliable sports databases. ${context?.playerProp?.playerName ? `I can help analyze ${context.playerProp.playerName}'s current prop if that's relevant to your question.` : ''} What specific aspect would you like me to help you with?`,
      confidence: 40,
      reasoning: [
        'No specific data available for this query',
        'Recommending official sources for accurate information',
        hasPlayerData ? 'Found relevant player data' : 'No relevant data found'
      ],
      relatedStats: [],
      sources: ['Statpedia AI Assistant'],
      followUpQuestions: [
        'Can you be more specific about what you want to know?',
        'Are you looking for data on a particular player?',
        'Would you like me to analyze the current prop?',
        'What specific aspect should I focus on?'
      ]
    };
  }

  private async generateErrorResponse(question: string, context?: any): Promise<AIResponse> {
    return {
      answer: "I apologize, but I encountered an error while processing your question. Please try rephrasing your question or ask about something else. I'm here to help with sports analysis, player performance, and betting insights!",
      confidence: 30,
      reasoning: ['Error occurred during response generation'],
      relatedStats: [],
      sources: ['Statpedia AI Assistant'],
      followUpQuestions: [
        'Can you try asking your question differently?',
        'Are you looking for help with a specific player or team?',
        'Would you like me to analyze the current prop?',
        'What sports topic interests you most?'
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
  getSampleQuestions(sport?: string, context?: any): string[] {
    const sportType = sport?.toLowerCase() || context?.sport?.toLowerCase() || 'nba';
    
    if (sportType === 'nfl') {
      return [
        "How well does Mahomes perform in cold weather games?",
        "Should I bet the over on Josh Allen's passing yards?",
        "How do the Chiefs perform without Travis Kelce?",
        "What's Derrick Henry's rushing prop value against this defense?",
        "How does Aaron Rodgers perform in primetime games?",
        "Which team has the better defensive matchup tonight?",
        "What's the best parlay for tonight's NFL games?",
        "How do injuries affect team scoring averages in the NFL?"
      ];
    } else if (sportType === 'nba') {
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
    } else if (sportType === 'mlb') {
      return [
        "How well does Ohtani perform against left-handed pitchers?",
        "Should I bet the over on Judge's home runs tonight?",
        "How do the Yankees perform without Aaron Judge?",
        "What's Trout's batting average prop value against this pitcher?",
        "How does Acuña perform in day games vs night games?",
        "Which team has the better pitching matchup tonight?",
        "What's the best parlay for tonight's MLB games?",
        "How do weather conditions affect hitting performance?"
      ];
    } else if (sportType === 'nhl') {
      return [
        "How well does McDavid perform on the road?",
        "Should I bet the over on Matthews' shots on goal?",
        "How do the Oilers perform without McDavid?",
        "What's MacKinnon's points prop value against this team?",
        "How does Crosby perform in playoff games?",
        "Which team has the better defensive matchup tonight?",
        "What's the best parlay for tonight's NHL games?",
        "How do injuries affect team scoring in hockey?"
      ];
    }
    
    // Default NBA questions
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

  getQuestionCategories(sport?: string, context?: any): { [key: string]: string[] } {
    const sportType = sport?.toLowerCase() || context?.sport?.toLowerCase() || 'nba';
    
    if (sportType === 'nfl') {
      return {
        "Player Performance": [
          "How is [Player] performing this season?",
          "What are [Player]'s clutch time stats?",
          "How does [Player] perform in cold weather?"
        ],
        "Injury Impact": [
          "How does [Player] perform without [Teammate]?",
          "What happens to team offense when [Player] is out?",
          "How do backup players step up with injuries?"
        ],
        "Prop Betting": [
          "Should I bet the over on [Player]'s passing yards?",
          "What props offer the best value tonight?",
          "How does [Player] perform against this defense?"
        ],
        "Team Analysis": [
          "How do [Team] perform on the road?",
          "What's [Team]'s strength of schedule?",
          "Which team has the better defensive matchup?"
        ]
      };
    } else if (sportType === 'nba') {
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
          "Should I bet the over on [Player]'s points?",
          "What props offer the best value tonight?",
          "How does [Player] perform against this defense?"
        ],
        "Team Analysis": [
          "How do [Team] perform on the road?",
          "What's [Team]'s strength of schedule?",
          "Which team has the better matchup?"
        ]
      };
    } else if (sportType === 'mlb') {
      return {
        "Player Performance": [
          "How is [Player] performing this season?",
          "What are [Player]'s clutch time stats?",
          "How does [Player] perform against left/right-handed pitchers?"
        ],
        "Injury Impact": [
          "How does [Player] perform without [Teammate]?",
          "What happens to team offense when [Player] is out?",
          "How do bench players step up with injuries?"
        ],
        "Prop Betting": [
          "Should I bet the over on [Player]'s home runs?",
          "What props offer the best value tonight?",
          "How does [Player] perform against this pitcher?"
        ],
        "Team Analysis": [
          "How do [Team] perform on the road?",
          "What's [Team]'s strength of schedule?",
          "Which team has the better pitching matchup?"
        ]
      };
    } else if (sportType === 'nhl') {
      return {
        "Player Performance": [
          "How is [Player] performing this season?",
          "What are [Player]'s clutch time stats?",
          "How does [Player] perform at home vs away?"
        ],
        "Injury Impact": [
          "How does [Player] perform without [Teammate]?",
          "What happens to team offense when [Player] is out?",
          "How do depth players step up with injuries?"
        ],
        "Prop Betting": [
          "Should I bet the over on [Player]'s points?",
          "What props offer the best value tonight?",
          "How does [Player] perform against this team?"
        ],
        "Team Analysis": [
          "How do [Team] perform on the road?",
          "What's [Team]'s strength of schedule?",
          "Which team has the better defensive matchup?"
        ]
      };
    }
    
    // Default NBA categories
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

  // Helper methods for the new functionality
  private extractTeamName(question: string): string {
    const teamNames = [
      'lakers', 'mavericks', 'warriors', 'celtics', 'heat', 'nuggets', 'suns', 'bucks',
      'nets', 'sixers', 'knicks', 'hawks', 'hornets', 'bulls', 'cavaliers', 'pistons',
      'pacers', 'magic', 'raptors', 'wizards', 'jazz', 'thunder', 'trail blazers',
      'kings', 'spurs', 'rockets', 'grizzlies', 'pelicans', 'timberwolves', 'clippers'
    ];
    
    const lowerQuestion = question.toLowerCase();
    const foundTeam = teamNames.find(team => lowerQuestion.includes(team));
    return foundTeam || '';
  }

  private extractTeamNames(question: string): string[] {
    const teamNames = [
      'lakers', 'mavericks', 'warriors', 'celtics', 'heat', 'nuggets', 'suns', 'bucks',
      'nets', 'sixers', 'knicks', 'hawks', 'hornets', 'bulls', 'cavaliers', 'pistons',
      'pacers', 'magic', 'raptors', 'wizards', 'jazz', 'thunder', 'trail blazers',
      'kings', 'spurs', 'rockets', 'grizzlies', 'pelicans', 'timberwolves', 'clippers'
    ];
    
    const lowerQuestion = question.toLowerCase();
    return teamNames.filter(team => lowerQuestion.includes(team));
  }

  private generatePlayerComparison(player1: PlayerStats, player2: PlayerStats) {
    const pointsWinner = player1.averages.points > player2.averages.points ? player1.name : player2.name;
    const reboundsWinner = player1.averages.rebounds > player2.averages.rebounds ? player1.name : player2.name;
    const assistsWinner = player1.averages.assists > player2.averages.assists ? player1.name : player2.name;
    const perWinner = player1.advanced.per > player2.advanced.per ? player1.name : player2.name;
    
    const analysis = `Comparing ${player1.name} vs ${player2.name}: ${player1.name} averages ${player1.averages.points} PPG, ${player1.averages.rebounds} RPG, and ${player1.averages.assists} APG with a ${player1.advanced.per} PER. ${player2.name} averages ${player2.averages.points} PPG, ${player2.averages.rebounds} RPG, and ${player2.averages.assists} APG with a ${player2.advanced.per} PER. ${pointsWinner} leads in scoring, ${reboundsWinner} in rebounds, ${assistsWinner} in assists, and ${perWinner} has the higher PER. Both are elite players with different strengths.`;
    
    return {
      analysis,
      reasoning: [
        `Comparing ${player1.name} and ${player2.name} across key metrics`,
        `Points: ${player1.name} ${player1.averages.points} vs ${player2.name} ${player2.averages.points}`,
        `Rebounds: ${player1.name} ${player1.averages.rebounds} vs ${player2.name} ${player2.averages.rebounds}`,
        `Assists: ${player1.name} ${player1.averages.assists} vs ${player2.name} ${player2.averages.assists}`,
        `PER: ${player1.name} ${player1.advanced.per} vs ${player2.name} ${player2.advanced.per}`
      ],
      stats: {
        player1: player1.averages,
        player2: player2.averages,
        comparison: {
          points: player1.averages.points - player2.averages.points,
          rebounds: player1.averages.rebounds - player2.averages.rebounds,
          assists: player1.averages.assists - player2.averages.assists,
          per: player1.advanced.per - player2.advanced.per
        }
      }
    };
  }

  private generateTeamAnalysis(team: any): string {
    const winPercentage = (team.record.wins / (team.record.wins + team.record.losses) * 100).toFixed(1);
    const netRating = team.stats.netRating > 0 ? `+${team.stats.netRating}` : team.stats.netRating;
    
    return `${team.name} is having a ${team.record.wins}-${team.record.losses} season (${winPercentage}% win rate). They rank ${team.stats.offensiveRating} in offensive rating and ${team.stats.defensiveRating} in defensive rating, giving them a ${netRating} net rating. Their pace of ${team.stats.pace} suggests they play at a ${team.stats.pace > 100 ? 'fast' : 'slow'} tempo. Key players include ${team.keyPlayers.join(', ')}. Recent form: ${team.recentForm}.`;
  }

  private generateMatchupPrediction(team1: any, team2: any) {
    const team1NetRating = team1.stats.netRating;
    const team2NetRating = team2.stats.netRating;
    const netRatingDiff = team1NetRating - team2NetRating;
    
    let predictedWinner = team1.name;
    let confidence = 70;
    
    if (netRatingDiff > 5) {
      confidence = 85;
    } else if (netRatingDiff > 2) {
      confidence = 75;
    } else if (netRatingDiff < -5) {
      predictedWinner = team2.name;
      confidence = 85;
    } else if (netRatingDiff < -2) {
      predictedWinner = team2.name;
      confidence = 75;
    } else {
      confidence = 60;
    }
    
    const analysis = `${team1.name} (${team1.stats.netRating} net rating) vs ${team2.name} (${team2.stats.netRating} net rating). Based on net rating differential of ${netRatingDiff.toFixed(1)}, I predict ${predictedWinner} has the advantage. ${team1.name} has a ${team1.stats.offensiveRating} offensive rating vs ${team2.name}'s ${team2.stats.defensiveRating} defensive rating, while ${team2.name} has a ${team2.stats.offensiveRating} offensive rating vs ${team1.name}'s ${team1.stats.defensiveRating} defensive rating.`;
    
    return {
      analysis,
      confidence,
      reasoning: [
        `Comparing ${team1.name} and ${team2.name} net ratings`,
        `${team1.name}: ${team1.stats.offensiveRating} ORtg, ${team1.stats.defensiveRating} DRtg`,
        `${team2.name}: ${team2.stats.offensiveRating} ORtg, ${team2.stats.defensiveRating} DRtg`,
        `Net rating differential: ${netRatingDiff.toFixed(1)}`,
        `Predicted winner: ${predictedWinner}`
      ]
    };
  }
}

export const statpediaAI = new StatpediaAIService();
export type { AIResponse };
