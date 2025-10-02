# ChatGPT Debug Analysis Request

## Problem Summary
We're debugging two critical issues in our sports betting app's Player Props feature:

1. **UNK vs UNK Issue**: Team names showing as "UNK vs UNK" instead of real team names like "Buffalo Bills vs Miami Dolphins"
2. **Identical Odds Issue**: Over/under odds showing as identical +100/+100 instead of realistic spreads like +132 over, -281 under

## Current Architecture
- **Frontend**: React TypeScript app
- **Backend**: Supabase Edge Functions (Deno)
- **API**: SportGameOdds API for player props data
- **Data Flow**: SportGameOdds API → Edge Function → Frontend

## Debugging System Deployed
We've implemented comprehensive logging at every step:

### Backend Edge Function Debugging:
```typescript
// Raw API response analysis
console.log(`📊 Raw Event Structure:`, JSON.stringify(event, null, 2));

// Team extraction debugging
console.log(`🏠 Home Team Analysis:`, {
  raw: event.homeTeam,
  extracted: homeTeam,
  hasName: !!event.homeTeam?.name,
  hasDisplayName: !!event.homeTeam?.displayName,
  hasAbbreviation: !!event.homeTeam?.abbreviation
});

// Prop creation debugging
console.log(`🎲 CREATING PROP: ${playerName} - ${propType}:`);
console.log(`📊 Full Prop Object:`, propDetails);

// Odds parsing debugging
console.log(`Over odds parsing:`, {
  rawBookmaker: bookmaker,
  rawOdds: bookmaker.odds,
  parsedOdds: newOverOdds
});
```

### Frontend Analysis:
```typescript
// Complete prop analysis
console.log(`🎯 FRONTEND PLAYER PROPS ANALYSIS:`);
console.log(`📊 Total Props Received: ${props.length}`);
console.log(`🏠 Team Data:`, { team, opponent, teamAbbr, opponentAbbr });
console.log(`💰 Odds Data:`, { overOdds, underOdds, line });

// Issue detection
console.log(`⚠️ UNK Issues Found: ${unkProps.length} props have UNK values`);
console.log(`⚠️ Identical Odds Issues: ${identicalOddsProps.length} props`);
```

## Code Context

### Current Team Extraction:
```typescript
const homeTeam = event.homeTeam?.name || 
                 event.homeTeam?.displayName || 
                 event.homeTeam?.abbreviation || 
                 event.homeTeam?.shortName || 
                 event.homeTeam?.city || 
                 'UNK';
```

### Current Odds Parsing:
```typescript
private parseAmericanOdds(odds: any): number {
  if (typeof odds === 'number') return odds;
  
  if (typeof odds === 'string') {
    const cleaned = odds.replace(/[^\d+-]/g, '');
    const parsed = parseInt(cleaned);
    if (!isNaN(parsed)) return parsed;
  }
  
  if (typeof odds === 'object' && odds !== null) {
    if (odds.american) return this.parseAmericanOdds(odds.american);
    if (odds.decimal) {
      const decimal = parseFloat(odds.decimal);
      return decimal >= 2.0 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
    }
  }
  
  return 100; // Default fallback
}
```

## Questions for Analysis

1. **API Response Structure**: What are the most common ways sports APIs structure team and odds data that we might be missing?

2. **Data Parsing Strategies**: What robust parsing approaches would handle various API response formats?

3. **Debugging Approach**: Are there additional debugging techniques we should implement to identify the exact issue?

4. **Error Handling**: What edge cases in sports data APIs should we account for?

5. **Alternative Solutions**: If the current approach fails, what are alternative strategies for getting reliable team names and odds?

## Expected Console Output Format
When we run the app and check console, we expect to see detailed logs showing:
- Raw API response structure
- Team extraction attempts and results
- Odds parsing attempts and results
- Final prop objects sent to frontend
- Frontend analysis of received data

## Request
Please analyze this debugging approach and provide:
1. Additional debugging strategies we might have missed
2. Common API response patterns that could cause these issues
3. Robust parsing solutions for team names and odds
4. Alternative data sources or approaches if current method fails
5. Specific code improvements for our parsing logic
