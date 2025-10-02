/**
 * Test Smart Prop Optimizer
 * Shows the intelligent prop count system in action
 */

const fs = require('fs');

// Mock the console logger for testing
const mockLogger = {
  logAPI: (service, message) => console.log(`📡 [${service}] ${message}`),
  logSuccess: (service, message) => console.log(`✅ [${service}] ${message}`),
  logError: (service, message) => console.log(`❌ [${service}] ${message}`),
  logWarning: (service, message) => console.log(`⚠️ [${service}] ${message}`),
  logInfo: (service, message) => console.log(`ℹ️ [${service}] ${message}`)
};

// Mock the smart prop optimizer (simplified version for testing)
class MockSmartPropOptimizer {
  constructor() {
    const now = new Date();
    this.currentHour = now.getHours();
    this.currentDay = now.getDay();
    this.isWeekend = this.currentDay === 0 || this.currentDay === 6;
    
    console.log('🧠 Smart Prop Optimizer Test Initialized');
    console.log(`⏰ Current time: ${now.toLocaleString()}`);
    console.log(`📅 ${this.isWeekend ? 'Weekend' : 'Weekday'}, Hour: ${this.currentHour}`);
  }

  calculateOptimalPropCount(sport) {
    const baseCounts = {
      NFL: 75,  // High engagement, prime betting sport
      NBA: 60,  // High volume, many games
      MLB: 45,  // Lower engagement, many games
      NHL: 40,  // Moderate engagement, fewer bettors
    };

    const baseCount = baseCounts[sport.toUpperCase()] || 50;
    let adjustedCount = baseCount;
    const reasoning = [];
    const timeFactors = [];

    // Peak hours adjustment (6PM-11PM)
    if (this.currentHour >= 18 && this.currentHour <= 23) {
      adjustedCount *= 1.2;
      timeFactors.push('Peak betting hours (6PM-11PM)');
      reasoning.push('+20% for peak engagement hours');
    }

    // Weekend adjustment
    if (this.isWeekend) {
      adjustedCount *= 1.15;
      timeFactors.push('Weekend increased activity');
      reasoning.push('+15% for weekend engagement');
    }

    // Sport-specific adjustments
    if (sport.toUpperCase() === 'NFL') {
      // NFL gets boost on Sundays, Mondays, Thursdays
      if (this.currentDay === 0 || this.currentDay === 1 || this.currentDay === 4) {
        adjustedCount *= 1.3;
        timeFactors.push('NFL game day');
        reasoning.push('+30% for NFL game day');
      }
    }

    const recommendedCount = Math.round(adjustedCount);
    const apiCallsRequired = Math.ceil(recommendedCount / 10); // Estimate
    const userSatisfactionScore = this.calculateSatisfactionScore(recommendedCount);
    const efficiencyScore = this.calculateEfficiencyScore(apiCallsRequired);

    return {
      sport,
      recommendedCount: Math.max(30, recommendedCount),
      apiCallsRequired,
      userSatisfactionScore,
      efficiencyScore,
      reasoning,
      timeFactors
    };
  }

  calculateSatisfactionScore(propCount) {
    if (propCount < 30) return Math.max(0, (propCount / 30) * 60);
    if (propCount >= 50 && propCount <= 80) return 85 + ((propCount - 50) / 30) * 15;
    if (propCount > 80 && propCount < 120) return 85 - ((propCount - 80) / 40) * 25;
    return Math.max(30, 60 - ((propCount - 120) * 0.5));
  }

  calculateEfficiencyScore(apiCalls) {
    if (apiCalls <= 15) return 100;
    if (apiCalls <= 30) return 85;
    if (apiCalls <= 40) return 70;
    if (apiCalls <= 50) return 50;
    return Math.max(10, 50 - ((apiCalls - 50) * 2));
  }

  getAllSportRecommendations() {
    const sports = ['NFL', 'NBA', 'MLB', 'NHL'];
    const recommendations = {};
    
    sports.forEach(sport => {
      recommendations[sport] = this.calculateOptimalPropCount(sport);
    });
    
    return recommendations;
  }

  getTotalAPIUsageEstimate() {
    const allRecommendations = this.getAllSportRecommendations();
    const totalHourlyCalls = Object.values(allRecommendations)
      .reduce((sum, metrics) => sum + metrics.apiCallsRequired, 0);
    
    const dailyEstimate = totalHourlyCalls * 4; // 15min cache = 4 refreshes per hour
    
    const recommendations = [];
    if (totalHourlyCalls > 50) {
      recommendations.push('Consider increasing cache duration to reduce API calls');
    } else {
      recommendations.push('API usage within efficient limits');
    }
    
    return {
      hourlyEstimate: totalHourlyCalls,
      dailyEstimate,
      recommendations
    };
  }
}

// Run the test
function testSmartPropOptimizer() {
  console.log('🚀 Testing Smart Prop Count Optimization System\n');
  
  const optimizer = new MockSmartPropOptimizer();
  
  console.log('📊 Smart Prop Count Recommendations:\n');
  
  const allRecommendations = optimizer.getAllSportRecommendations();
  
  Object.entries(allRecommendations).forEach(([sport, metrics]) => {
    console.log(`🏈 ${sport.toUpperCase()}:`);
    console.log(`   📈 Recommended Props: ${metrics.recommendedCount}`);
    console.log(`   📞 API Calls Required: ${metrics.apiCallsRequired}`);
    console.log(`   😊 User Satisfaction: ${Math.round(metrics.userSatisfactionScore)}/100`);
    console.log(`   ⚡ API Efficiency: ${Math.round(metrics.efficiencyScore)}/100`);
    
    if (metrics.timeFactors.length > 0) {
      console.log(`   ⏰ Time Factors: ${metrics.timeFactors.join(', ')}`);
    }
    
    if (metrics.reasoning.length > 0) {
      console.log(`   🧠 Reasoning: ${metrics.reasoning.join(', ')}`);
    }
    
    console.log('');
  });
  
  const usage = optimizer.getTotalAPIUsageEstimate();
  
  console.log('📈 Total API Usage Estimate:');
  console.log(`   ⏱️ Hourly: ${usage.hourlyEstimate} calls`);
  console.log(`   📅 Daily: ${usage.dailyEstimate} calls`);
  console.log(`   💡 Recommendations: ${usage.recommendations.join(', ')}`);
  
  console.log('\n🎯 UX vs Efficiency Analysis:');
  
  const totalProps = Object.values(allRecommendations)
    .reduce((sum, metrics) => sum + metrics.recommendedCount, 0);
  
  const avgSatisfaction = Object.values(allRecommendations)
    .reduce((sum, metrics) => sum + metrics.userSatisfactionScore, 0) / 4;
  
  const avgEfficiency = Object.values(allRecommendations)
    .reduce((sum, metrics) => sum + metrics.efficiencyScore, 0) / 4;
  
  console.log(`   📊 Total Props Across All Sports: ${totalProps}`);
  console.log(`   😊 Average User Satisfaction: ${Math.round(avgSatisfaction)}/100`);
  console.log(`   ⚡ Average API Efficiency: ${Math.round(avgEfficiency)}/100`);
  
  // Compare with old system
  console.log('\n📈 Comparison with Previous System (200 props per sport):');
  console.log(`   📊 Old System: 800 total props (200 × 4 sports)`);
  console.log(`   📊 New System: ${totalProps} total props (${Math.round(((totalProps - 800) / 800) * 100)}% change)`);
  console.log(`   📞 Old API Calls: ~80 calls/hour`);
  console.log(`   📞 New API Calls: ~${usage.hourlyEstimate} calls/hour (${Math.round(((usage.hourlyEstimate - 80) / 80) * 100)}% change)`);
  
  if (totalProps < 800) {
    console.log(`   ✅ Reduced props by ${800 - totalProps} while maintaining user satisfaction`);
  }
  
  if (usage.hourlyEstimate < 80) {
    console.log(`   ✅ Reduced API calls by ${80 - usage.hourlyEstimate} per hour`);
  }
  
  console.log('\n🎉 Smart Optimization Benefits:');
  console.log('   ✅ Dynamic prop counts based on user engagement patterns');
  console.log('   ✅ Time-aware adjustments for peak betting hours');
  console.log('   ✅ Sport-specific optimization for different user behaviors');
  console.log('   ✅ API efficiency balanced with user experience');
  console.log('   ✅ Prevents choice paralysis while ensuring sufficient options');
  
  return allRecommendations;
}

// Run the test
if (require.main === module) {
  testSmartPropOptimizer();
}

module.exports = { testSmartPropOptimizer };
