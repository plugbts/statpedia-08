import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

export interface SportsbookComparison {
  sportsbook: string;
  line: number;
  overOdds: number;
  underOdds: number;
  lastUpdated: string;
}

export interface PropComparison {
  playerName: string;
  propType: string;
  ourLine: number;
  ourOverOdds: number;
  ourUnderOdds: number;
  sportsbookComparisons: SportsbookComparison[];
  averageLine: number;
  averageOverOdds: number;
  averageUnderOdds: number;
  lineVariance: number;
  oddsVariance: number;
}

export interface DiscrepancyDetail {
  playerName: string;
  propType: string;
  ourLine: number;
  ourOverOdds: number;
  ourUnderOdds: number;
  sportsbookLine: number;
  sportsbookOverOdds: number;
  sportsbookUnderOdds: number;
  lineDifference: number;
  oddsDifference: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
  sportsbook: string;
}

export interface CrossReferenceAnalysis {
  totalPropsAnalyzed: number;
  propsWithDiscrepancies: number;
  averageLineDifference: number;
  averageOddsDifference: number;
  recommendations: string[];
  detailedDiscrepancies: DiscrepancyDetail[];
  debugInfo: {
    totalVariance: number;
    maxVariance: number;
    sportsbookConsistency: number;
    ourAccuracy: number;
    syncStatus: 'synced' | 'partial' | 'outdated';
  };
  lastUpdated: string;
}

class CrossReferenceService {
  private appliedSuggestions: Set<string> = new Set();
  private suggestionHistory: Array<{ suggestion: string; appliedAt: string; result: string }> = [];
  private getMockSportsbookData(playerName: string, propType: string): SportsbookComparison[] {
    const baseLine = this.getBaseLineForProp(propType);
    const baseOdds = -110;
    
    return [
      {
        sportsbook: 'FanDuel',
        line: baseLine + (Math.random() - 0.5) * 2,
        overOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        underOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        lastUpdated: new Date().toISOString()
      },
      {
        sportsbook: 'DraftKings',
        line: baseLine + (Math.random() - 0.5) * 2,
        overOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        underOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        lastUpdated: new Date().toISOString()
      },
      {
        sportsbook: 'BetMGM',
        line: baseLine + (Math.random() - 0.5) * 2,
        overOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        underOdds: baseOdds + Math.floor((Math.random() - 0.5) * 20),
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  private getBaseLineForProp(propType: string): number {
    const baseLines: { [key: string]: number } = {
      'Points': 20,
      'Rebounds': 8,
      'Assists': 5,
      'Steals': 1.5,
      'Blocks': 1.5,
      'Threes': 2.5,
      'Passing Yards': 250,
      'Rushing Yards': 80,
      'Receiving Yards': 60,
      'Touchdowns': 0.5,
      'Hits': 1.5,
      'Home Runs': 0.5,
      'RBIs': 1.5,
      'Strikeouts': 6.5,
      'Goals': 0.5,
      'Assists': 0.5,
      'Saves': 25
    };
    
    return baseLines[propType] || 10;
  }

  async analyzePropDiscrepancies(ourProps: any[]): Promise<CrossReferenceAnalysis> {
    logAPI('CrossReferenceService', `🔍 Starting detailed analysis of ${ourProps.length} props for discrepancies`);
    
    let totalLineDifference = 0;
    let totalOddsDifference = 0;
    let propsWithDiscrepancies = 0;
    let maxVariance = 0;
    let totalVariance = 0;
    const detailedDiscrepancies: DiscrepancyDetail[] = [];
    const sportsbookConsistency: number[] = [];

    for (const prop of ourProps) {
      try {
        const sportsbookData = this.getMockSportsbookData(prop.playerName, prop.propType);
        
        // Calculate averages across sportsbooks
        const averageLine = sportsbookData.reduce((sum, sb) => sum + sb.line, 0) / sportsbookData.length;
        const averageOverOdds = sportsbookData.reduce((sum, sb) => sum + sb.overOdds, 0) / sportsbookData.length;
        const averageUnderOdds = sportsbookData.reduce((sum, sb) => sum + sb.underOdds, 0) / sportsbookData.length;
        
        // Calculate variances
        const lineVariance = Math.abs(prop.line - averageLine);
        const overOddsVariance = Math.abs(prop.overOdds - averageOverOdds);
        const underOddsVariance = Math.abs(prop.underOdds - averageUnderOdds);
        const oddsVariance = (overOddsVariance + underOddsVariance) / 2;
        const totalPropVariance = lineVariance + oddsVariance;
        
        totalLineDifference += lineVariance;
        totalOddsDifference += oddsVariance;
        totalVariance += totalPropVariance;
        maxVariance = Math.max(maxVariance, totalPropVariance);
        
        // Check sportsbook consistency (how much they agree with each other)
        const sportsbookLineVariance = this.calculateSportsbookVariance(sportsbookData.map(sb => sb.line));
        const sportsbookOddsVariance = this.calculateSportsbookVariance(sportsbookData.map(sb => sb.overOdds));
        const consistency = 100 - ((sportsbookLineVariance + sportsbookOddsVariance) / 2);
        sportsbookConsistency.push(consistency);
        
        if (lineVariance > 1 || oddsVariance > 15) {
          propsWithDiscrepancies++;
          
          // Create detailed discrepancy record
          const severity = this.calculateSeverity(lineVariance, oddsVariance);
          const suggestedAction = this.generateDetailedAction(prop, averageLine, averageOverOdds, averageUnderOdds, lineVariance, oddsVariance);
          
          detailedDiscrepancies.push({
            playerName: prop.playerName,
            propType: prop.propType,
            ourLine: prop.line,
            ourOverOdds: prop.overOdds,
            ourUnderOdds: prop.underOdds,
            sportsbookLine: averageLine,
            sportsbookOverOdds: averageOverOdds,
            sportsbookUnderOdds: averageUnderOdds,
            lineDifference: lineVariance,
            oddsDifference: oddsVariance,
            severity,
            suggestedAction,
            sportsbook: 'Average of all sportsbooks'
          });
          
          logWarning('CrossReferenceService', `🚨 Discrepancy found for ${prop.playerName} (${prop.propType}):`, {
            ourLine: prop.line,
            sportsbookLine: averageLine,
            lineDiff: lineVariance,
            ourOdds: `${prop.overOdds}/${prop.underOdds}`,
            sportsbookOdds: `${averageOverOdds}/${averageUnderOdds}`,
            oddsDiff: oddsVariance,
            severity
          });
        }
        
      } catch (error) {
        logError('CrossReferenceService', `❌ Error analyzing prop for ${prop.playerName}:`, error);
      }
    }
    
    const recommendations = this.generateSmartRecommendations(propsWithDiscrepancies, ourProps.length, totalLineDifference / ourProps.length, totalOddsDifference / ourProps.length, detailedDiscrepancies);
    
    const analysis: CrossReferenceAnalysis = {
      totalPropsAnalyzed: ourProps.length,
      propsWithDiscrepancies,
      averageLineDifference: totalLineDifference / ourProps.length,
      averageOddsDifference: totalOddsDifference / ourProps.length,
      recommendations,
      detailedDiscrepancies,
      debugInfo: {
        totalVariance,
        maxVariance,
        sportsbookConsistency: sportsbookConsistency.reduce((sum, c) => sum + c, 0) / sportsbookConsistency.length,
        ourAccuracy: 100 - (totalVariance / ourProps.length),
        syncStatus: this.determineSyncStatus(propsWithDiscrepancies, ourProps.length)
      },
      lastUpdated: new Date().toISOString()
    };
    
    logSuccess('CrossReferenceService', `✅ Analysis complete: ${propsWithDiscrepancies} props with discrepancies found`, {
      totalVariance: totalVariance.toFixed(2),
      maxVariance: maxVariance.toFixed(2),
      averageConsistency: analysis.debugInfo.sportsbookConsistency.toFixed(1) + '%',
      ourAccuracy: analysis.debugInfo.ourAccuracy.toFixed(1) + '%',
      syncStatus: analysis.debugInfo.syncStatus
    });
    
    return analysis;
  }

  private calculateSportsbookVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateSeverity(lineVariance: number, oddsVariance: number): 'low' | 'medium' | 'high' | 'critical' {
    const totalVariance = lineVariance + oddsVariance;
    if (totalVariance < 5) return 'low';
    if (totalVariance < 15) return 'medium';
    if (totalVariance < 30) return 'high';
    return 'critical';
  }

  private generateDetailedAction(prop: any, avgLine: number, avgOverOdds: number, avgUnderOdds: number, lineVariance: number, oddsVariance: number): string {
    const actions: string[] = [];
    
    if (lineVariance > 2) {
      actions.push(`Adjust line from ${prop.line} to ${avgLine.toFixed(1)} (${lineVariance > 0 ? '+' : ''}${(avgLine - prop.line).toFixed(1)})`);
    }
    
    if (oddsVariance > 20) {
      actions.push(`Update odds from ${prop.overOdds}/${prop.underOdds} to ${avgOverOdds}/${avgUnderOdds}`);
    }
    
    if (lineVariance > 1 && oddsVariance > 15) {
      actions.push('Consider updating statistical model for this player/prop combination');
    }
    
    return actions.length > 0 ? actions.join('; ') : 'Minor adjustment needed';
  }

  private determineSyncStatus(discrepancies: number, total: number): 'synced' | 'partial' | 'outdated' {
    const discrepancyRate = discrepancies / total;
    if (discrepancyRate < 0.1) return 'synced';
    if (discrepancyRate < 0.3) return 'partial';
    return 'outdated';
  }

  private generateSmartRecommendations(discrepancies: number, total: number, avgLineDiff: number, avgOddsDiff: number, detailedDiscrepancies: DiscrepancyDetail[]): string[] {
    const recommendations: string[] = [];
    
    // Only suggest fixes that haven't been applied recently
    const recentSuggestions = this.suggestionHistory.filter(s => 
      new Date().getTime() - new Date(s.appliedAt).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    if (avgLineDiff > 1.5 && !this.appliedSuggestions.has('line-calibration')) {
      recommendations.push(`📊 Line Calibration: Average line difference is ${avgLineDiff.toFixed(2)} points. Our lines may be using outdated statistical models.`);
      recommendations.push(`🔧 Action: Update statistical models with recent player performance data (last 10 games)`);
    }
    
    if (avgOddsDiff > 15 && !this.appliedSuggestions.has('odds-calculation')) {
      recommendations.push(`💰 Odds Calculation: Average odds difference is ${avgOddsDiff.toFixed(0)} points. Consider reviewing our odds calculation algorithm.`);
      recommendations.push(`🔧 Action: Implement proper vig/juice calculations (4-5% house edge) and real-time odds synchronization`);
    }
    
    if (discrepancies > total * 0.3 && !this.appliedSuggestions.has('model-recalibration')) {
      recommendations.push(`⚠️ Model Recalibration: ${discrepancies} props show significant discrepancies. Our prediction models may need recalibration.`);
      recommendations.push(`🔧 Action: Recalibrate models using weighted recent performance data`);
    }
    
    // Add specific debugging information
    if (detailedDiscrepancies.length > 0) {
      const criticalDiscrepancies = detailedDiscrepancies.filter(d => d.severity === 'critical');
      const highDiscrepancies = detailedDiscrepancies.filter(d => d.severity === 'high');
      
      if (criticalDiscrepancies.length > 0) {
        recommendations.push(`🚨 Critical Issues Found: ${criticalDiscrepancies.length} props need immediate attention`);
        recommendations.push(`🔧 Priority Actions: ${criticalDiscrepancies.map(d => `${d.playerName} (${d.propType})`).join(', ')}`);
      }
      
      if (highDiscrepancies.length > 0) {
        recommendations.push(`⚠️ High Priority Issues: ${highDiscrepancies.length} props need review`);
      }
    }
    
    // Add sync status recommendations
    const syncStatus = this.determineSyncStatus(discrepancies, total);
    if (syncStatus === 'outdated' && !this.appliedSuggestions.has('sync-update')) {
      recommendations.push(`🔄 Sync Status: ${syncStatus.toUpperCase()} - Implement real-time sportsbook synchronization`);
      recommendations.push(`🔧 Action: Set up automated odds updates every 30 seconds from major sportsbooks`);
    }
    
    // Add specific technical recommendations
    if (!this.appliedSuggestions.has('api-integration')) {
      recommendations.push(`🌐 API Integration: Replace mock data with real sportsbook APIs`);
      recommendations.push(`🔧 Action: Integrate with FanDuel, DraftKings, BetMGM, Caesars, and PointsBet APIs`);
    }
    
    return recommendations;
  }

  // Method to mark suggestions as applied
  markSuggestionApplied(suggestion: string, result: string): void {
    this.appliedSuggestions.add(suggestion);
    this.suggestionHistory.push({
      suggestion,
      appliedAt: new Date().toISOString(),
      result
    });
    
    // Keep only last 50 suggestions to prevent memory bloat
    if (this.suggestionHistory.length > 50) {
      this.suggestionHistory = this.suggestionHistory.slice(-50);
    }
    
    logInfo('CrossReferenceService', `✅ Suggestion applied: ${suggestion}`, { result });
  }

  // Method to get suggestion history
  getSuggestionHistory(): Array<{ suggestion: string; appliedAt: string; result: string }> {
    return [...this.suggestionHistory];
  }
}

export const crossReferenceService = new CrossReferenceService();