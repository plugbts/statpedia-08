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

export interface CrossReferenceAnalysis {
  totalPropsAnalyzed: number;
  propsWithDiscrepancies: number;
  averageLineDifference: number;
  averageOddsDifference: number;
  recommendations: string[];
  lastUpdated: string;
}

class CrossReferenceService {
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
    logAPI('CrossReferenceService', `Analyzing ${ourProps.length} props for discrepancies`);
    
    let totalLineDifference = 0;
    let totalOddsDifference = 0;
    let propsWithDiscrepancies = 0;

    for (const prop of ourProps) {
      try {
        const sportsbookData = this.getMockSportsbookData(prop.playerName, prop.propType);
        
        const averageLine = sportsbookData.reduce((sum, sb) => sum + sb.line, 0) / sportsbookData.length;
        const averageOverOdds = sportsbookData.reduce((sum, sb) => sum + sb.overOdds, 0) / sportsbookData.length;
        const averageUnderOdds = sportsbookData.reduce((sum, sb) => sum + sb.underOdds, 0) / sportsbookData.length;
        
        const lineVariance = Math.abs(prop.line - averageLine);
        const overOddsVariance = Math.abs(prop.overOdds - averageOverOdds);
        const underOddsVariance = Math.abs(prop.underOdds - averageUnderOdds);
        const oddsVariance = (overOddsVariance + underOddsVariance) / 2;
        
        totalLineDifference += lineVariance;
        totalOddsDifference += oddsVariance;
        
        if (lineVariance > 1 || oddsVariance > 15) {
          propsWithDiscrepancies++;
        }
        
      } catch (error) {
        logWarning('CrossReferenceService', `Error analyzing prop for ${prop.playerName}:`, error);
      }
    }
    
    const recommendations = this.generateRecommendations(propsWithDiscrepancies, ourProps.length, totalLineDifference / ourProps.length, totalOddsDifference / ourProps.length);
    
    const analysis: CrossReferenceAnalysis = {
      totalPropsAnalyzed: ourProps.length,
      propsWithDiscrepancies,
      averageLineDifference: totalLineDifference / ourProps.length,
      averageOddsDifference: totalOddsDifference / ourProps.length,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
    
    logSuccess('CrossReferenceService', `Analysis complete: ${propsWithDiscrepancies} props with discrepancies found`);
    return analysis;
  }

  private generateRecommendations(discrepancies: number, total: number, avgLineDiff: number, avgOddsDiff: number): string[] {
    const recommendations: string[] = [];
    
    if (avgLineDiff > 1.5) {
      recommendations.push(`📊 Average line difference is ${avgLineDiff.toFixed(2)} points. Our lines may be using outdated statistical models.`);
    }
    
    if (avgOddsDiff > 15) {
      recommendations.push(`💰 Average odds difference is ${avgOddsDiff.toFixed(0)} points. Consider reviewing our odds calculation algorithm.`);
    }
    
    if (discrepancies > total * 0.3) {
      recommendations.push(`⚠️ ${discrepancies} props show significant discrepancies. Our prediction models may need recalibration.`);
    }
    
    recommendations.push('🔧 Suggested fixes:');
    recommendations.push('• Replace mock data with real sportsbook APIs');
    recommendations.push('• Implement proper vig/juice calculations (4-5% house edge)');
    recommendations.push('• Use more recent statistical data (last 10 games)');
    recommendations.push('• Add real-time odds synchronization with major sportsbooks');
    
    return recommendations;
  }
}

export const crossReferenceService = new CrossReferenceService();