// Streak Calculator - Compute streaks in TypeScript to avoid SQL complexity

export interface GameResult {
  player_id: string;
  player_name: string;
  team: string;
  prop_type: string;
  league: string;
  date: string;
  hit_result: number; // 1 for hit, 0 for miss
}

export interface StreakInfo {
  player_id: string;
  player_name: string;
  team: string;
  prop_type: string;
  league: string;
  current_streak: number;
  streak_direction: 'hit' | 'miss';
  streak_quality: string;
  betting_signal: string;
  total_games: number;
  hit_rate: number;
}

export function calculateStreaks(games: GameResult[]): StreakInfo[] {
  // Group games by player + prop_type + league
  const playerGroups = new Map<string, GameResult[]>();
  
  games.forEach(game => {
    const key = `${game.player_id}|${game.prop_type}|${game.league}`;
    if (!playerGroups.has(key)) {
      playerGroups.set(key, []);
    }
    playerGroups.get(key)!.push(game);
  });

  const streaks: StreakInfo[] = [];

  playerGroups.forEach((playerGames, key) => {
    // Sort games by date descending (most recent first)
    playerGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (playerGames.length === 0) return;

    const firstGame = playerGames[0];
    const currentResult = firstGame.hit_result;
    
    // Calculate current streak
    let currentStreak = 1;
    for (let i = 1; i < playerGames.length; i++) {
      if (playerGames[i].hit_result === currentResult) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate overall stats
    const totalGames = playerGames.length;
    const totalHits = playerGames.filter(g => g.hit_result === 1).length;
    const hitRate = totalHits / totalGames;

    // Determine streak quality
    let streakQuality: string;
    if (currentStreak >= 7) {
      streakQuality = currentResult === 1 ? 'Extreme Hot' : 'Extreme Cold';
    } else if (currentStreak >= 5) {
      streakQuality = currentResult === 1 ? 'Very Hot' : 'Very Cold';
    } else if (currentStreak >= 3) {
      streakQuality = currentResult === 1 ? 'Hot' : 'Cold';
    } else if (currentStreak >= 2) {
      streakQuality = 'Building';
    } else {
      streakQuality = 'Single Game';
    }

    // Determine betting signal
    let bettingSignal: string;
    if (currentStreak >= 5 && currentResult === 1 && hitRate > 0.6) {
      bettingSignal = 'Fade Candidate';
    } else if (currentStreak >= 5 && currentResult === 0 && hitRate > 0.5) {
      bettingSignal = 'Buy Low Candidate';
    } else if (currentStreak >= 3 && currentResult === 1 && hitRate > 0.7) {
      bettingSignal = 'Ride the Wave';
    } else if (currentStreak >= 3 && currentResult === 0 && hitRate < 0.4) {
      bettingSignal = 'Avoid';
    } else {
      bettingSignal = 'Neutral';
    }

    streaks.push({
      player_id: firstGame.player_id,
      player_name: firstGame.player_name,
      team: firstGame.team,
      prop_type: firstGame.prop_type,
      league: firstGame.league,
      current_streak: currentStreak,
      streak_direction: currentResult === 1 ? 'hit' : 'miss',
      streak_quality: streakQuality,
      betting_signal: bettingSignal,
      total_games: totalGames,
      hit_rate: Math.round(hitRate * 100) / 100
    });
  });

  // Sort by streak length descending
  return streaks.sort((a, b) => b.current_streak - a.current_streak);
}
