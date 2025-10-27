// Advanced Prediction Display Component
// Shows comprehensive predictions with all advanced features

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Cloud,
  Wind,
  Clock,
  Target,
  Zap,
  Shield,
  Activity,
} from "lucide-react";
import { ComprehensivePrediction } from "@/services/advanced-prediction-service";
import { evCalculatorService } from "@/services/ev-calculator";

interface AdvancedPredictionDisplayProps {
  prediction: ComprehensivePrediction;
  onClose?: () => void;
}

export const AdvancedPredictionDisplay: React.FC<AdvancedPredictionDisplayProps> = ({
  prediction,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [evCalculation, setEvCalculation] = useState<any>(null);

  useEffect(() => {
    // Calculate EV when component mounts
    const calculateEV = async () => {
      try {
        const propData = {
          id: prediction.playerId,
          playerName: prediction.playerName,
          propType: prediction.propType,
          line: prediction.line,
          odds: "-110", // Default odds
          sport: "nfl",
          team: prediction.advancedPrediction.advancedFactors.contextual.homeTeam || "Unknown",
          opponent: prediction.advancedPrediction.advancedFactors.contextual.awayTeam || "Unknown",
          gameDate: prediction.lastUpdated,
        };

        const ev = await evCalculatorService.calculateAIRating(propData);
        setEvCalculation(ev);
      } catch (error) {
        console.error("Error calculating EV:", error);
      }
    };

    calculateEV();
  }, [prediction]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEVColor = (ev: number) => {
    if (ev > 5) return "text-green-600";
    if (ev > 0) return "text-green-500";
    if (ev > -5) return "text-yellow-500";
    return "text-red-500";
  };

  const getPredictionColor = (direction: string) => {
    return direction === "over" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl font-bold">Advanced Prediction Analysis</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Prediction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Prediction</h3>
                </div>
                <div className={`text-2xl font-bold ${getPredictionColor(prediction.prediction)}`}>
                  {prediction.prediction.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">
                  {prediction.propType} {prediction.line}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Confidence</h3>
                </div>
                <div className={`text-2xl font-bold ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence.toFixed(1)}%
                </div>
                <Progress value={prediction.confidence} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-violet-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Expected Value</h3>
                </div>
                <div className={`text-2xl font-bold ${getEVColor(prediction.expectedValue)}`}>
                  {prediction.expectedValue > 0 ? "+" : ""}
                  {prediction.expectedValue.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {evCalculation?.recommendation && (
                    <Badge
                      variant={
                        evCalculation.recommendation === "strong_bet" ? "default" : "secondary"
                      }
                    >
                      {evCalculatorService.getRecommendationText(evCalculation.recommendation)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contextual">Contextual</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Consensus */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5" />
                      <span>Model Consensus</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Advanced Model</span>
                      <span className="font-semibold">
                        {(prediction.modelConsensus.advancedModel * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ML Model</span>
                      <span className="font-semibold">
                        {(prediction.modelConsensus.mlModel * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-semibold">Ensemble</span>
                      <span className="font-bold text-lg">
                        {(prediction.modelConsensus.ensemble * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5" />
                      <span>Key Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prediction.keyInsights.map((insight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Data Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Data Sources</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${prediction.dataSources.nflfastr ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="text-sm">NFLfastR</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${prediction.dataSources.pff ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="text-sm">PFF</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${prediction.dataSources.dvoa ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="text-sm">DVOA</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${prediction.dataSources.nextGen ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="text-sm">Next Gen</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contextual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weather Conditions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cloud className="h-5 w-5" />
                      <span>Weather Impact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Temperature</span>
                      <span>
                        {
                          prediction.advancedPrediction.advancedFactors.contextual.weatherConditions
                            .temperature
                        }
                        °F
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Wind Speed</span>
                      <span className="flex items-center space-x-1">
                        <Wind className="h-4 w-4" />
                        <span>
                          {
                            prediction.advancedPrediction.advancedFactors.contextual
                              .weatherConditions.windSpeed
                          }{" "}
                          mph
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Precipitation</span>
                      <span>
                        {prediction.advancedPrediction.advancedFactors.contextual.weatherConditions.precipitation.toFixed(
                          2,
                        )}
                        "
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Field Surface</span>
                      <Badge variant="outline">
                        {
                          prediction.advancedPrediction.advancedFactors.contextual.weatherConditions
                            .fieldSurface
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Rest & Travel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Rest & Travel</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Rest Differential</span>
                      <span
                        className={
                          prediction.advancedPrediction.advancedFactors.contextual
                            .restDifferential > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {prediction.advancedPrediction.advancedFactors.contextual.restDifferential >
                        0
                          ? "+"
                          : ""}
                        {prediction.advancedPrediction.advancedFactors.contextual.restDifferential}{" "}
                        days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Travel Distance</span>
                      <span>
                        {prediction.advancedPrediction.advancedFactors.contextual.travelFatigue.distanceMiles.toFixed(
                          0,
                        )}{" "}
                        miles
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Time Zone Change</span>
                      <span>
                        {
                          prediction.advancedPrediction.advancedFactors.contextual.travelFatigue
                            .timeZoneChange
                        }{" "}
                        hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Altitude</span>
                      <span>
                        {prediction.advancedPrediction.advancedFactors.contextual.altitude} ft
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Situational Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Situational Factors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {prediction.advancedPrediction.advancedFactors.situational.restAdvantage.toFixed(
                          2,
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Rest Advantage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {prediction.advancedPrediction.advancedFactors.situational.matchupStrength.toFixed(
                          2,
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Matchup Strength</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {prediction.advancedPrediction.advancedFactors.situational.motivationFactor.toFixed(
                          2,
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Motivation Factor</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EPA Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>EPA Per Play</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Home Offense</span>
                      <span
                        className={
                          prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay
                            .homeOffense > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay.homeOffense.toFixed(
                          3,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Home Defense</span>
                      <span
                        className={
                          prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay
                            .homeDefense < 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay.homeDefense.toFixed(
                          3,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Away Offense</span>
                      <span
                        className={
                          prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay
                            .awayOffense > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay.awayOffense.toFixed(
                          3,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Away Defense</span>
                      <span
                        className={
                          prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay
                            .awayDefense < 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {prediction.advancedPrediction.advancedFactors.contextual.epaPerPlay.awayDefense.toFixed(
                          3,
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Success Rate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Success Rate</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Home Offense</span>
                      <span>
                        {(
                          prediction.advancedPrediction.advancedFactors.contextual.successRate
                            .homeOffense * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Home Defense</span>
                      <span>
                        {(
                          prediction.advancedPrediction.advancedFactors.contextual.successRate
                            .homeDefense * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Away Offense</span>
                      <span>
                        {(
                          prediction.advancedPrediction.advancedFactors.contextual.successRate
                            .awayOffense * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Away Defense</span>
                      <span>
                        {(
                          prediction.advancedPrediction.advancedFactors.contextual.successRate
                            .awayDefense * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pace Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Pace Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {prediction.advancedPrediction.advancedFactors.contextual.pace.homeTeam.toFixed(
                          1,
                        )}
                        s
                      </div>
                      <div className="text-sm text-gray-600">Home Team Pace</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {prediction.advancedPrediction.advancedFactors.contextual.pace.awayTeam.toFixed(
                          1,
                        )}
                        s
                      </div>
                      <div className="text-sm text-gray-600">Away Team Pace</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {prediction.advancedPrediction.advancedFactors.contextual.pace.leagueAverage.toFixed(
                          1,
                        )}
                        s
                      </div>
                      <div className="text-sm text-gray-600">League Average</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Advanced Model Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5" />
                      <span>Advanced Model</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Prediction</span>
                      <Badge
                        variant={
                          prediction.advancedPrediction.prediction === "over"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {prediction.advancedPrediction.prediction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Confidence</span>
                      <span className="font-semibold">
                        {prediction.advancedPrediction.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expected Value</span>
                      <span className={getEVColor(prediction.advancedPrediction.expectedValue)}>
                        {prediction.advancedPrediction.expectedValue > 0 ? "+" : ""}
                        {prediction.advancedPrediction.expectedValue.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {prediction.advancedPrediction.reasoning}
                    </div>
                  </CardContent>
                </Card>

                {/* ML Model Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>ML Model</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Prediction</span>
                      <Badge
                        variant={
                          prediction.mlPrediction.prediction === "over" ? "default" : "destructive"
                        }
                      >
                        {prediction.mlPrediction.prediction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Confidence</span>
                      <span className="font-semibold">
                        {prediction.mlPrediction.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expected Value</span>
                      <span className={getEVColor(prediction.mlPrediction.expectedValue)}>
                        {prediction.mlPrediction.expectedValue > 0 ? "+" : ""}
                        {prediction.mlPrediction.expectedValue.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Risk Score</span>
                      <span
                        className={
                          prediction.mlPrediction.riskScore > 70 ? "text-red-600" : "text-green-600"
                        }
                      >
                        {prediction.mlPrediction.riskScore.toFixed(0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature Importance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Feature Importance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(prediction.mlPrediction.featureImportance)
                      .slice(0, 10)
                      .map(([feature, importance]) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <div className="w-24 text-sm text-gray-600 truncate">{feature}</div>
                          <Progress value={importance * 100} className="flex-1" />
                          <div className="w-12 text-sm text-right">
                            {(importance * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Risk Factors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prediction.riskFactors.length > 0 ? (
                      prediction.riskFactors.map((risk, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-yellow-800">{risk}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Shield className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>No significant risk factors identified</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Model Version Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Model Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Model Version</span>
                    <Badge variant="outline">{prediction.modelVersion}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm text-gray-600">
                      {new Date(prediction.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Data Freshness</span>
                    <span className="text-sm text-gray-600">
                      {new Date(prediction.dataFreshness.externalData).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
