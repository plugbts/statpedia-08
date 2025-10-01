import React from 'react';

interface AdvancedPrediction {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  headshotUrl?: string;
  confidence: number;
  expectedValue: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
  valueRating: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  lastUpdated: Date;
  isLive: boolean;
  isBookmarked?: boolean;
  advancedReasoning: string;
  injuryImpact: string;
  weatherImpact: string;
  matchupAnalysis: string;
  historicalTrends: string;
  keyInsights: string[];
}

interface PropFinderAnalysisOverlayProps {
  prediction: AdvancedPrediction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PropFinderAnalysisOverlay({ prediction, isOpen, onClose }: PropFinderAnalysisOverlayProps) {
  console.log('🔍 PropFinderAnalysisOverlay rendered:', { prediction: prediction?.playerName, isOpen, hasPrediction: !!prediction });
  
  if (!prediction) {
    console.log('❌ No prediction provided to PropFinderAnalysisOverlay');
    return null;
  }
  
  if (!isOpen) {
    console.log('❌ PropFinderAnalysisOverlay is not open');
    return null;
  }
  
  console.log('✅ PropFinderAnalysisOverlay should be visible now!');
  
  // SIMPLE TEST - Just return a basic div to see if component renders at all
  console.log('🚀 RENDERING TEST MODAL for:', prediction.playerName);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">TEST: PropFinder Analysis Overlay</h2>
        <p className="mb-4">Player: {prediction.playerName}</p>
        <p className="mb-4">Prop: {prediction.propType} {prediction.line}</p>
        <button 
          onClick={onClose}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}