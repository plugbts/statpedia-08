// Web scraping service for sports reference websites
// This service scrapes historical box score data from public sports reference sites

interface ScrapedBoxScore {
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  gameDate: string;
  season: number;
  league: string;
  propType: string;
  statValue: number;
  gameId: string;
}

interface ScrapedDefensiveRanking {
  team: string;
  league: string;
  season: number;
  propType: string;
  position?: string;
  rank: number;
  statValue: number;
}

class SportsReferenceScraper {
  private readonly baseUrls = {
    nba: 'https://www.basketball-reference.com',
    nfl: 'https://www.pro-football-reference.com',
    mlb: 'https://www.baseball-reference.com',
    nhl: 'https://www.hockey-reference.com'
  };

  // Scrape NBA box scores from Basketball Reference
  async scrapeNBABoxScores(playerName: string, season: number = 2025): Promise<ScrapedBoxScore[]> {
    try {
      // Construct URL for player's game log
      const playerSlug = this.generatePlayerSlug(playerName);
      const url = `${this.baseUrls.nba}/players/${playerSlug[0]}/${playerSlug}.html`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch NBA data for ${playerName}: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseNBAGameLog(html, playerName, season);
    } catch (error) {
      console.error(`Error scraping NBA data for ${playerName}:`, error);
      return [];
    }
  }

  // Scrape NFL box scores from Pro Football Reference
  async scrapeNFLBoxScores(playerName: string, season: number = 2025): Promise<ScrapedBoxScore[]> {
    try {
      const playerSlug = this.generatePlayerSlug(playerName);
      const url = `${this.baseUrls.nfl}/players/${playerSlug[0]}/${playerSlug}.htm`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch NFL data for ${playerName}: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseNFLGameLog(html, playerName, season);
    } catch (error) {
      console.error(`Error scraping NFL data for ${playerName}:`, error);
      return [];
    }
  }

  // Scrape MLB box scores from Baseball Reference
  async scrapeMLBBoxScores(playerName: string, season: number = 2025): Promise<ScrapedBoxScore[]> {
    try {
      const playerSlug = this.generatePlayerSlug(playerName);
      const url = `${this.baseUrls.mlb}/players/${playerSlug[0]}/${playerSlug}.shtml`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch MLB data for ${playerName}: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseMLBGameLog(html, playerName, season);
    } catch (error) {
      console.error(`Error scraping MLB data for ${playerName}:`, error);
      return [];
    }
  }

  // Generate player slug for URL construction
  private generatePlayerSlug(playerName: string): string {
    // Convert "Jalen Hurts" to "HurtsJa01" format
    const parts = playerName.toLowerCase().split(' ');
    if (parts.length < 2) return playerName.toLowerCase();
    
    const lastName = parts[parts.length - 1];
    const firstName = parts[0];
    
    // Take first 2 letters of last name + first 2 letters of first name + "01"
    return `${lastName.substring(0, 2)}${firstName.substring(0, 2)}01`;
  }

  // Parse NBA game log HTML
  private parseNBAGameLog(html: string, playerName: string, season: number): ScrapedBoxScore[] {
    const boxScores: ScrapedBoxScore[] = [];
    
    // This is a simplified parser - in production, you'd use a proper HTML parser
    // For now, we'll extract basic patterns from the HTML
    
    // Look for game log table rows
    const gameLogRegex = /<tr[^>]*class="[^"]*game_log[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    
    while ((match = gameLogRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      // Extract game date
      const dateMatch = rowHtml.match(/<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>/);
      if (!dateMatch) continue;
      
      const gameDate = dateMatch[1];
      
      // Extract opponent
      const opponentMatch = rowHtml.match(/<td[^>]*><a[^>]*>([^<]+)<\/a><\/td>/);
      if (!opponentMatch) continue;
      
      const opponent = opponentMatch[1];
      
      // Extract stats (simplified - you'd need to parse each stat column)
      const stats = this.extractNBAStats(rowHtml);
      
      // Create box score entries for each stat
      Object.entries(stats).forEach(([propType, value]) => {
        if (value !== null && value !== undefined) {
          boxScores.push({
            playerId: this.generatePlayerId(playerName, 'nba'),
            playerName,
            team: 'UNKNOWN', // Would need to extract from context
            opponent,
            gameDate,
            season,
            league: 'nba',
            propType,
            statValue: parseFloat(value.toString()),
            gameId: `${gameDate}-${opponent}`
          });
        }
      });
    }
    
    return boxScores;
  }

  // Parse NFL game log HTML
  private parseNFLGameLog(html: string, playerName: string, season: number): ScrapedBoxScore[] {
    const boxScores: ScrapedBoxScore[] = [];
    
    // Similar parsing logic for NFL
    const gameLogRegex = /<tr[^>]*class="[^"]*game_log[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    
    while ((match = gameLogRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      const dateMatch = rowHtml.match(/<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>/);
      if (!dateMatch) continue;
      
      const gameDate = dateMatch[1];
      
      const opponentMatch = rowHtml.match(/<td[^>]*><a[^>]*>([^<]+)<\/a><\/td>/);
      if (!opponentMatch) continue;
      
      const opponent = opponentMatch[1];
      
      const stats = this.extractNFLStats(rowHtml);
      
      Object.entries(stats).forEach(([propType, value]) => {
        if (value !== null && value !== undefined) {
          boxScores.push({
            playerId: this.generatePlayerId(playerName, 'nfl'),
            playerName,
            team: 'UNKNOWN',
            opponent,
            gameDate,
            season,
            league: 'nfl',
            propType,
            statValue: parseFloat(value.toString()),
            gameId: `${gameDate}-${opponent}`
          });
        }
      });
    }
    
    return boxScores;
  }

  // Parse MLB game log HTML
  private parseMLBGameLog(html: string, playerName: string, season: number): ScrapedBoxScore[] {
    const boxScores: ScrapedBoxScore[] = [];
    
    // Similar parsing logic for MLB
    const gameLogRegex = /<tr[^>]*class="[^"]*game_log[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    
    while ((match = gameLogRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      const dateMatch = rowHtml.match(/<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>/);
      if (!dateMatch) continue;
      
      const gameDate = dateMatch[1];
      
      const opponentMatch = rowHtml.match(/<td[^>]*><a[^>]*>([^<]+)<\/a><\/td>/);
      if (!opponentMatch) continue;
      
      const opponent = opponentMatch[1];
      
      const stats = this.extractMLBStats(rowHtml);
      
      Object.entries(stats).forEach(([propType, value]) => {
        if (value !== null && value !== undefined) {
          boxScores.push({
            playerId: this.generatePlayerId(playerName, 'mlb'),
            playerName,
            team: 'UNKNOWN',
            opponent,
            gameDate,
            season,
            league: 'mlb',
            propType,
            statValue: parseFloat(value.toString()),
            gameId: `${gameDate}-${opponent}`
          });
        }
      });
    }
    
    return boxScores;
  }

  // Extract NBA stats from game log row
  private extractNBAStats(rowHtml: string): Record<string, number | null> {
    const stats: Record<string, number | null> = {};
    
    // Extract common NBA stats
    const statPatterns = {
      'points': /<td[^>]*>(\d+)<\/td>/,
      'rebounds': /<td[^>]*>(\d+)<\/td>/,
      'assists': /<td[^>]*>(\d+)<\/td>/,
      'steals': /<td[^>]*>(\d+)<\/td>/,
      'blocks': /<td[^>]*>(\d+)<\/td>/,
      'three_pointers': /<td[^>]*>(\d+)<\/td>/
    };
    
    // This is simplified - you'd need to parse the actual table structure
    Object.entries(statPatterns).forEach(([stat, pattern]) => {
      const match = rowHtml.match(pattern);
      stats[stat] = match ? parseInt(match[1]) : null;
    });
    
    return stats;
  }

  // Extract NFL stats from game log row
  private extractNFLStats(rowHtml: string): Record<string, number | null> {
    const stats: Record<string, number | null> = {};
    
    const statPatterns = {
      'passing_yards': /<td[^>]*>(\d+)<\/td>/,
      'passing_touchdowns': /<td[^>]*>(\d+)<\/td>/,
      'passing_interceptions': /<td[^>]*>(\d+)<\/td>/,
      'rushing_yards': /<td[^>]*>(\d+)<\/td>/,
      'rushing_touchdowns': /<td[^>]*>(\d+)<\/td>/,
      'receiving_yards': /<td[^>]*>(\d+)<\/td>/,
      'receiving_touchdowns': /<td[^>]*>(\d+)<\/td>/,
      'receptions': /<td[^>]*>(\d+)<\/td>/
    };
    
    Object.entries(statPatterns).forEach(([stat, pattern]) => {
      const match = rowHtml.match(pattern);
      stats[stat] = match ? parseInt(match[1]) : null;
    });
    
    return stats;
  }

  // Extract MLB stats from game log row
  private extractMLBStats(rowHtml: string): Record<string, number | null> {
    const stats: Record<string, number | null> = {};
    
    const statPatterns = {
      'hits': /<td[^>]*>(\d+)<\/td>/,
      'home_runs': /<td[^>]*>(\d+)<\/td>/,
      'rbis': /<td[^>]*>(\d+)<\/td>/,
      'strikeouts': /<td[^>]*>(\d+)<\/td>/,
      'total_bases': /<td[^>]*>(\d+)<\/td>/
    };
    
    Object.entries(statPatterns).forEach(([stat, pattern]) => {
      const match = rowHtml.match(pattern);
      stats[stat] = match ? parseInt(match[1]) : null;
    });
    
    return stats;
  }

  // Generate consistent player ID
  private generatePlayerId(playerName: string, league: string): string {
    const normalizedName = playerName.replace(/\s+/g, '_').toUpperCase();
    return `${normalizedName}_1_${league.toUpperCase()}`;
  }

  // Scrape defensive rankings
  async scrapeDefensiveRankings(league: string, season: number = 2025): Promise<ScrapedDefensiveRanking[]> {
    try {
      let url: string;
      
      switch (league) {
        case 'nfl':
          url = `${this.baseUrls.nfl}/years/${season}/opp.htm`;
          break;
        case 'nba':
          url = `${this.baseUrls.nba}/leagues/NBA_${season}.html`;
          break;
        case 'mlb':
          url = `${this.baseUrls.mlb}/leagues/MLB/${season}.shtml`;
          break;
        default:
          throw new Error(`Unsupported league: ${league}`);
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch defensive rankings for ${league}: ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseDefensiveRankings(html, league, season);
    } catch (error) {
      console.error(`Error scraping defensive rankings for ${league}:`, error);
      return [];
    }
  }

  // Parse defensive rankings from HTML
  private parseDefensiveRankings(html: string, league: string, season: number): ScrapedDefensiveRanking[] {
    const rankings: ScrapedDefensiveRanking[] = [];
    
    // This would parse the defensive rankings table
    // Implementation depends on the specific table structure for each league
    
    return rankings;
  }
}

export { SportsReferenceScraper, type ScrapedBoxScore, type ScrapedDefensiveRanking };
