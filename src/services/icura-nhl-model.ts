/**
 * Icura — SUPER SUPER ADVANCED NHL Prediction Model
 *
 * A comprehensive NHL prediction system designed to analyze player props
 * with deep contextual factors including ice time, linemates, goalie matchups,
 * rest days, travel, special teams, shot quality, and more.
 */

export type IcuraRecommendedSide = "over" | "under";

export interface IcuraNhlModelInput {
  playerName: string;
  playerId?: string;
  teamAbbr: string;
  opponentAbbr: string;
  propType: string;
  line: number;
  gameDateISO: string;
  overOdds?: number;
  underOdds?: number;
  // Context will be enriched by the model
  context?: Record<string, unknown>;
}

export interface IcuraNhlModelOutput {
  model: "Icura";
  sport: "NHL";
  version: string;
  recommended: IcuraRecommendedSide;
  confidence: number; // 0..1
  expectedValue: number; // -1..1
  probability: number; // 0..1 (probability of hitting over)
  keyInsights: string[];
  factorsUsed: string[];
  factorBreakdown: {
    factor: string;
    weight: number;
    impact: number; // -1 to 1, positive favors over
    description: string;
  }[];
  debug?: Record<string, unknown>;
}

/**
 * NHL-specific factors that Icura will analyze
 */
export interface IcuraNhlFactors {
  // Player factors
  iceTime: {
    average: number; // minutes per game
    recent: number[]; // last 5 games
    trend: "up" | "down" | "stable";
    projected: number;
  };
  linemates: {
    current: string[]; // current line mates
    quality: number; // 0-1, quality of line
    chemistry: number; // 0-1, how well they play together
  };
  recentForm: {
    last5Games: number[]; // actual values for prop type
    average: number;
    trend: "hot" | "cold" | "neutral";
    consistency: number; // 0-1
  };

  // Team factors
  teamScoring: {
    goalsPerGame: number;
    recentForm: number[]; // last 5 games goals
    homeAway: "home" | "away";
    homeAwayScoring: {
      home: number;
      away: number;
    };
  };
  specialTeams: {
    powerPlayPercentage: number;
    penaltyKillPercentage: number;
    powerPlayOpportunities: number; // per game
  };

  // Opponent factors
  opponentDefense: {
    goalsAllowedPerGame: number;
    shotsAllowedPerGame: number;
    savePercentage: number;
    rank: number; // 1-32, 1 = best defense
  };
  opponentGoalie: {
    name: string;
    savePercentage: number;
    goalsAgainstAverage: number;
    recentForm: number[]; // last 5 games goals allowed
    vsPlayerTeam: {
      games: number;
      goalsAllowed: number;
      savePercentage: number;
    };
  };

  // Situational factors
  restDays: {
    player: number;
    team: number;
    opponent: number;
  };
  travel: {
    teamTraveled: boolean;
    opponentTraveled: boolean;
    timeZoneChange: number; // hours
  };
  backToBack: {
    team: boolean;
    opponent: boolean;
  };

  // Matchup factors
  headToHead: {
    games: number;
    playerAverage: number; // player's average vs this opponent
    teamAverage: number; // team's average vs this opponent
  };
  pace: {
    teamShotsPerGame: number;
    opponentShotsPerGame: number;
    combinedPace: number;
  };

  // Shot quality factors
  shotQuality: {
    highDangerChances: number; // per game
    expectedGoals: number; // xG per game
    shootingPercentage: number;
  };

  // Contextual factors
  gameImportance: {
    playoffRace: boolean;
    rivalry: boolean;
    mustWin: boolean;
  };
  injuryContext: {
    keyTeammatesOut: string[];
    keyOpponentsOut: string[];
    impact: number; // -1 to 1
  };
}

/**
 * Fetch NHL player game logs for analysis
 */
export async function fetchNhlPlayerLogs(
  playerId: string,
  playerName: string,
  limit: number = 10,
): Promise<
  Array<{
    date: string;
    team: string;
    opponent: string;
    propValue: number;
    iceTime?: number;
  }>
> {
  try {
    const base = `${window.location.protocol}//${window.location.hostname}:3001`;
    const qs = new URLSearchParams({
      player_uuid: playerId,
      propType: "points", // Will be adjusted based on propType
      limit: limit.toString(),
    });

    const res = await fetch(`${base}/api/player-game-logs?${qs.toString()}`);
    const json = await res.json();

    if (!json?.success || !Array.isArray(json.items)) {
      return [];
    }

    return json.items.map((item: any) => ({
      date: item.game_date,
      team: "", // Will need to enrich
      opponent: item.opponent_abbr || "UNK",
      propValue: Number(item.actual_value) || 0,
    }));
  } catch (error) {
    console.error("[Icura] Failed to fetch player logs:", error);
    return [];
  }
}

/**
 * Calculate ice time factor
 */
function calculateIceTimeFactor(factors: IcuraNhlFactors): number {
  const { iceTime } = factors;
  const avg = iceTime.average;
  const projected = iceTime.projected;

  // More ice time = higher chance of hitting props
  const iceTimeScore = Math.min(1, projected / 20); // Normalize to 20 min max

  // Trend bonus
  let trendBonus = 0;
  if (iceTime.trend === "up") trendBonus = 0.1;
  if (iceTime.trend === "down") trendBonus = -0.1;

  return iceTimeScore + trendBonus;
}

/**
 * Calculate linemate quality factor
 */
function calculateLinemateFactor(factors: IcuraNhlFactors): number {
  const { linemates } = factors;
  // Better linemates = better production
  return linemates.quality * 0.6 + linemates.chemistry * 0.4;
}

/**
 * Calculate recent form factor
 */
function calculateRecentFormFactor(factors: IcuraNhlFactors, line: number): number {
  const { recentForm } = factors;
  const avg = recentForm.average;
  const consistency = recentForm.consistency;

  // How much above/below the line
  const aboveLine = (avg - line) / line; // Percentage above line

  // Consistency bonus
  const consistencyBonus = consistency * 0.2;

  // Trend impact
  let trendImpact = 0;
  if (recentForm.trend === "hot") trendImpact = 0.15;
  if (recentForm.trend === "cold") trendImpact = -0.15;

  return Math.max(-1, Math.min(1, aboveLine + consistencyBonus + trendImpact));
}

/**
 * Calculate opponent defense factor
 */
function calculateOpponentDefenseFactor(factors: IcuraNhlFactors): number {
  const { opponentDefense } = factors;
  // Better defense (lower rank) = harder to score
  // Rank 1 = best defense, rank 32 = worst
  const defenseScore = (33 - opponentDefense.rank) / 32; // 0-1, higher = better defense
  return -defenseScore * 0.5; // Negative because good defense hurts production
}

/**
 * Calculate goalie matchup factor
 */
function calculateGoalieFactor(factors: IcuraNhlFactors): number {
  const { opponentGoalie } = factors;
  // Better goalie = harder to score
  const savePct = opponentGoalie.savePercentage / 100; // 0-1
  const gaa = opponentGoalie.goalsAgainstAverage;

  // Combine save % and GAA (lower GAA = better goalie)
  const goalieQuality = savePct * 0.6 + ((3.0 - gaa) / 3.0) * 0.4;

  return -goalieQuality * 0.4; // Negative because good goalie hurts production
}

/**
 * Calculate rest and travel factors
 */
function calculateRestTravelFactor(factors: IcuraNhlFactors): number {
  const { restDays, travel, backToBack } = factors;

  let score = 0;

  // Rest days (more rest = better)
  if (restDays.team >= 2) score += 0.1;
  if (restDays.team === 1) score += 0.05;
  if (restDays.team === 0) score -= 0.1; // Back to back

  // Travel impact
  if (travel.teamTraveled) {
    score -= 0.05;
    if (travel.timeZoneChange >= 2) score -= 0.05;
  }

  // Back to back penalty
  if (backToBack.team) score -= 0.15;

  return Math.max(-0.3, Math.min(0.2, score));
}

/**
 * Calculate head-to-head factor
 */
function calculateH2HFactor(factors: IcuraNhlFactors, line: number): number {
  const { headToHead } = factors;
  if (headToHead.games === 0) return 0;

  const playerAvg = headToHead.playerAverage;
  const aboveLine = (playerAvg - line) / line;

  return Math.max(-0.5, Math.min(0.5, aboveLine * 0.3));
}

/**
 * Calculate pace factor
 */
function calculatePaceFactor(factors: IcuraNhlFactors): number {
  const { pace } = factors;
  // Higher pace = more opportunities
  const normalizedPace = Math.min(1, pace.combinedPace / 70); // Normalize to 70 shots/game max
  return normalizedPace * 0.2;
}

/**
 * Main Icura NHL Model function
 *
 * This is the core prediction engine. It analyzes all factors and produces
 * a recommendation with confidence and expected value.
 */
export async function runIcuraNhlModel(input: IcuraNhlModelInput): Promise<IcuraNhlModelOutput> {
  const startTime = Date.now();

  try {
    // TODO: Fetch and enrich factors
    // For now, we'll use placeholder factors structure
    const factors: Partial<IcuraNhlFactors> = {
      iceTime: {
        average: 18,
        recent: [17, 19, 18, 20, 18],
        trend: "stable",
        projected: 18.5,
      },
      linemates: {
        current: [],
        quality: 0.6,
        chemistry: 0.65,
      },
      recentForm: {
        last5Games: [1, 2, 0, 1, 2],
        average: 1.2,
        trend: "neutral",
        consistency: 0.6,
      },
      opponentDefense: {
        goalsAllowedPerGame: 2.8,
        shotsAllowedPerGame: 30,
        savePercentage: 0.91,
        rank: 15,
      },
      opponentGoalie: {
        name: "Unknown",
        savePercentage: 0.91,
        goalsAgainstAverage: 2.8,
        recentForm: [2, 3, 2, 1, 3],
        vsPlayerTeam: {
          games: 0,
          goalsAllowed: 0,
          savePercentage: 0,
        },
      },
      restDays: {
        player: 1,
        team: 1,
        opponent: 2,
      },
      travel: {
        teamTraveled: false,
        opponentTraveled: false,
        timeZoneChange: 0,
      },
      backToBack: {
        team: false,
        opponent: false,
      },
      headToHead: {
        games: 0,
        playerAverage: 0,
        teamAverage: 0,
      },
      pace: {
        teamShotsPerGame: 32,
        opponentShotsPerGame: 30,
        combinedPace: 62,
      },
    };

    // Calculate factor impacts
    const factorBreakdown = [
      {
        factor: "Ice Time",
        weight: 0.2,
        impact: calculateIceTimeFactor(factors as IcuraNhlFactors),
        description: `Projected ${factors.iceTime?.projected.toFixed(1)} min (avg: ${factors.iceTime?.average.toFixed(1)} min)`,
      },
      {
        factor: "Linemates",
        weight: 0.15,
        impact: calculateLinemateFactor(factors as IcuraNhlFactors),
        description: `Quality: ${((factors.linemates?.quality || 0) * 100).toFixed(0)}%, Chemistry: ${((factors.linemates?.chemistry || 0) * 100).toFixed(0)}%`,
      },
      {
        factor: "Recent Form",
        weight: 0.25,
        impact: calculateRecentFormFactor(factors as IcuraNhlFactors, input.line),
        description: `Avg: ${factors.recentForm?.average.toFixed(1)} (${factors.recentForm?.trend})`,
      },
      {
        factor: "Opponent Defense",
        weight: 0.15,
        impact: calculateOpponentDefenseFactor(factors as IcuraNhlFactors),
        description: `Rank: #${factors.opponentDefense?.rank}, ${factors.opponentDefense?.goalsAllowedPerGame.toFixed(1)} GA/G`,
      },
      {
        factor: "Goalie Matchup",
        weight: 0.15,
        impact: calculateGoalieFactor(factors as IcuraNhlFactors),
        description: `SV%: ${((factors.opponentGoalie?.savePercentage || 0) * 100).toFixed(1)}%, GAA: ${factors.opponentGoalie?.goalsAgainstAverage.toFixed(2)}`,
      },
      {
        factor: "Rest & Travel",
        weight: 0.05,
        impact: calculateRestTravelFactor(factors as IcuraNhlFactors),
        description: `Team rest: ${factors.restDays?.team} days`,
      },
      {
        factor: "Head-to-Head",
        weight: 0.03,
        impact: calculateH2HFactor(factors as IcuraNhlFactors, input.line),
        description: `${factors.headToHead?.games} games vs opponent`,
      },
      {
        factor: "Pace",
        weight: 0.02,
        impact: calculatePaceFactor(factors as IcuraNhlFactors),
        description: `Combined: ${factors.pace?.combinedPace.toFixed(0)} shots/game`,
      },
    ];

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;

    factorBreakdown.forEach((f) => {
      totalScore += f.impact * f.weight;
      totalWeight += f.weight;
    });

    // Normalize
    const normalizedScore = totalScore / totalWeight;

    // Convert to probability (0-1)
    // Score of 0 = 50% probability, score of 1 = ~75%, score of -1 = ~25%
    const probability = 0.5 + normalizedScore * 0.25;
    const clampedProbability = Math.max(0.1, Math.min(0.9, probability));

    // Calculate expected value if odds are provided
    let expectedValue = 0;
    if (input.overOdds && input.underOdds) {
      const overImplied =
        input.overOdds < 0
          ? Math.abs(input.overOdds) / (Math.abs(input.overOdds) + 100)
          : 100 / (input.overOdds + 100);

      const evOver =
        clampedProbability * (overImplied > 0 ? 1 / overImplied - 1 : 0) -
        (1 - clampedProbability) * 1;
      const evUnder =
        (1 - clampedProbability) * (overImplied < 1 ? 1 / (1 - overImplied) - 1 : 0) -
        clampedProbability * 1;

      expectedValue = Math.max(evOver, evUnder);
    }

    // Determine recommendation
    const recommended: IcuraRecommendedSide = clampedProbability > 0.5 ? "over" : "under";

    // Calculate confidence based on how far from 50/50 and factor agreement
    const distanceFrom50 = Math.abs(clampedProbability - 0.5) * 2; // 0-1
    const factorAgreement =
      1 -
      factorBreakdown.reduce((sum, f) => sum + Math.abs(f.impact), 0) / factorBreakdown.length / 2;
    const confidence = distanceFrom50 * 0.7 + factorAgreement * 0.3;

    // Generate insights
    const insights: string[] = [];

    if (factors.iceTime && factors.iceTime.trend === "up") {
      insights.push(
        `📈 Ice time trending up (${factors.iceTime.projected.toFixed(1)} min projected)`,
      );
    }

    if (factors.recentForm && factors.recentForm.trend === "hot") {
      insights.push(
        `🔥 Player in hot form (avg ${factors.recentForm.average.toFixed(1)} last 5 games)`,
      );
    } else if (factors.recentForm && factors.recentForm.trend === "cold") {
      insights.push(
        `❄️ Player in cold streak (avg ${factors.recentForm.average.toFixed(1)} last 5 games)`,
      );
    }

    if (factors.opponentDefense && factors.opponentDefense.rank <= 10) {
      insights.push(`🛡️ Tough opponent defense (ranked #${factors.opponentDefense.rank})`);
    } else if (factors.opponentDefense && factors.opponentDefense.rank >= 25) {
      insights.push(
        `🎯 Favorable matchup vs weak defense (ranked #${factors.opponentDefense.rank})`,
      );
    }

    if (factors.opponentGoalie && factors.opponentGoalie.savePercentage > 0.92) {
      insights.push(
        `🥅 Elite goalie matchup (${(factors.opponentGoalie.savePercentage * 100).toFixed(1)}% SV)`,
      );
    }

    if (factors.restDays && factors.restDays.team === 0) {
      insights.push(`⚠️ Back-to-back game (fatigue factor)`);
    }

    if (insights.length === 0) {
      insights.push("📊 Analysis based on multiple factors");
    }

    return {
      model: "Icura",
      sport: "NHL",
      version: "0.1.0-alpha",
      recommended,
      confidence: Math.max(0.3, Math.min(0.95, confidence)),
      expectedValue,
      probability: clampedProbability,
      keyInsights: insights.slice(0, 5),
      factorsUsed: factorBreakdown.map((f) => f.factor),
      factorBreakdown,
      debug: {
        normalizedScore,
        totalWeight,
        processingTime: Date.now() - startTime,
        input: {
          playerName: input.playerName,
          propType: input.propType,
          line: input.line,
        },
      },
    };
  } catch (error) {
    console.error("[Icura] Model error:", error);

    // Fallback output
    return {
      model: "Icura",
      sport: "NHL",
      version: "0.1.0-alpha",
      recommended: "over",
      confidence: 0.5,
      expectedValue: 0,
      probability: 0.5,
      keyInsights: ["Model error - using fallback"],
      factorsUsed: [],
      factorBreakdown: [],
      debug: {
        error: String(error),
      },
    };
  }
}
