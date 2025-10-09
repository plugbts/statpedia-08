import fetch from "node-fetch";

async function debugApiResponse() {
  const url = `https://api.sportsgameodds.com/v2/events?leagueID=NHL&dateFrom=2025-10-09&dateTo=2025-10-09&oddsAvailable=true&apiKey=f05c244cbea5222d806f91c412350940`;
  
  console.log("🔍 Fetching NHL events for 2025-10-09...");
  
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ API error ${res.status}`);
    return;
  }
  
  const data = await res.json();
  console.log("📊 API Response structure:");
  console.log("- success:", data.success);
  console.log("- data length:", data.data?.length || 0);
  
  if (data.data && data.data.length > 0) {
    const event = data.data[0];
    console.log("\n📊 Sample Event Structure:");
    console.log("- eventID:", event.eventID);
    console.log("- players keys:", Object.keys(event.players || {}));
    console.log("- odds keys:", Object.keys(event.odds || {}));
    
    if (event.odds) {
      const firstOddsKey = Object.keys(event.odds)[0];
      const firstOdds = event.odds[firstOddsKey];
      console.log("\n📊 Sample Odds Structure:");
      console.log("- key:", firstOddsKey);
      console.log("- odds data:", JSON.stringify(firstOdds, null, 2));
    }
    
    if (event.players) {
      const firstPlayerKey = Object.keys(event.players)[0];
      const firstPlayer = event.players[firstPlayerKey];
      console.log("\n📊 Sample Player Structure:");
      console.log("- key:", firstPlayerKey);
      console.log("- player data:", JSON.stringify(firstPlayer, null, 2));
    }
  }
}

debugApiResponse().catch(console.error);
